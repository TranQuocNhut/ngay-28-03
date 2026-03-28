var express = require("express");
var router = express.Router();
let {
  validatedResult,
  CreateAnUserValidator,
  ModifyAnUserValidator,
} = require("../utils/validator");
let userModel = require("../schemas/users");
let userController = require("../controllers/users");
let { CheckLogin, CheckRole } = require("../utils/authHandler");
let { uploadExcel } = require("../utils/uploadHandler");
let exceljs = require("exceljs");
let path = require("path");
let crypto = require("crypto");
let { sendPasswordMail } = require("../utils/mailHandler");

router.get(
  "/",
  CheckLogin,
  CheckRole("ADMIN", "USER"),
  async function (req, res, next) {
    let users = await userModel.find({ isDeleted: false });
    res.send(users);
  },
);

router.get("/:id", async function (req, res, next) {
  try {
    let result = await userModel.find({ _id: req.params.id, isDeleted: false });
    if (result.length > 0) {
      res.send(result);
    } else {
      res.status(404).send({ message: "id not found" });
    }
  } catch (error) {
    res.status(404).send({ message: "id not found" });
  }
});

router.post(
  "/",
  CreateAnUserValidator,
  validatedResult,
  async function (req, res, next) {
    try {
      let newItem = await userController.CreateAnUser(
        req.body.username,
        req.body.password,
        req.body.email,
        req.body.role,
        req.body.fullName,
        req.body.avatarUrl,
        req.body.status,
        req.body.loginCount,
      );
      res.send(newItem);
    } catch (err) {
      res.status(400).send({ message: err.message });
    }
  },
);

router.post(
  "/import",
  uploadExcel.single("file"),
  async function (req, res, next) {
    console.log("Request Headers:", req.headers);
    console.log("Request File:", req.file);
    // --- B1: KIỂM TRA FILE ---
    // Nếu không có file nào được tải lên, trả về lỗi 400.
    if (!req.file) {
      return res
        .status(400)
        .send({ message: "Vui lòng tải lên một file Excel." });
    }

    // --- B2: KHỞI TẠO BIẾN KẾT QUẢ ---
    // Object này sẽ chứa kết quả cuối cùng của quá trình import.
    const results = {
      successCount: 0,
      failCount: 0,
      errors: [],
    };

    // --- B3: ĐỌC VÀ XỬ LÝ FILE EXCEL ---
    try {
      const workbook = new exceljs.Workbook();
      // Chuyển đổi đường dẫn tương đối thành đường dẫn tuyệt đối trước khi đọc file
      const absoluteFilePath = path.join(__dirname, "..", req.file.path);
      await workbook.xlsx.readFile(absoluteFilePath);
      const worksheet = workbook.worksheets[0]; // Lấy worksheet đầu tiên

      // --- B3.1: Lấy tất cả user/email hiện có để kiểm tra trùng lặp hiệu quả ---
      // Thay vì query DB trong vòng lặp (rất chậm), ta lấy hết dữ liệu cần thiết một lần
      // và lưu vào Set để tra cứu với tốc độ O(1).
      const allUsers = await userModel.find({}, "username email").lean();
      const existingUsernames = new Set(allUsers.map((u) => u.username));
      const existingEmails = new Set(allUsers.map((u) => u.email));

      // --- B3.2: LẶP QUA TỪNG DÒNG TRONG EXCEL ---
      // Bỏ qua dòng tiêu đề (dòng 1), bắt đầu từ dòng 2
      for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex++) {
        const row = worksheet.getRow(rowIndex);
        const username = row.getCell(1).value?.toString().trim();
        const email = row.getCell(2).value?.toString().trim();
        const errorReasons = [];

        // --- B3.2.1: VALIDATION DỮ LIỆU TỪNG DÒNG ---
        if (!username) {
          errorReasons.push("Username không được để trống.");
        }
        if (!email) {
          errorReasons.push("Email không được để trống.");
        } else if (!email.endsWith("@haha.com")) {
          errorReasons.push("Email không đúng định dạng (phải là @haha.com).");
        }

        // Kiểm tra trùng lặp với DB và với các dòng đã xử lý thành công trước đó trong file
        if (username && existingUsernames.has(username)) {
          errorReasons.push(`Username '${username}' đã tồn tại.`);
        }
        if (email && existingEmails.has(email)) {
          errorReasons.push(`Email '${email}' đã tồn tại.`);
        }

        // --- B3.2.2: XỬ LÝ KẾT QUẢ VALIDATION ---
        if (errorReasons.length > 0) {
          // Nếu có lỗi, gom lại và tăng số lượng thất bại
          results.failCount++;
          results.errors.push({
            row: rowIndex,
            reason: errorReasons.join(" "),
          });
        } else {
          // Nếu không có lỗi, tiến hành tạo user
          try {
            // Mật khẩu ngẫu nhiên 16 ký tự ("A@1z" + 12 ký tự hex ngẫu nhiên)
            const defaultPassword =
              "A@1z" + crypto.randomBytes(6).toString("hex");
            // Role mặc định, lấy từ logic của chức năng register để đảm bảo tính nhất quán
            const defaultRole = "69b1265c33c5468d1c85aad8";

            await userController.CreateAnUser(
              username,
              defaultPassword,
              email,
              defaultRole,
            );

            // Gửi email thông báo password cho người dùng
            await sendPasswordMail(email, defaultPassword);

            // Thêm user mới vào Set để kiểm tra các dòng tiếp theo trong cùng file
            existingUsernames.add(username);
            existingEmails.add(email);

            results.successCount++;
          } catch (dbError) {
            // Bắt lỗi nếu quá trình lưu vào DB có vấn đề (ví dụ: lỗi kết nối)
            results.failCount++;
            results.errors.push({
              row: rowIndex,
              reason: `Lỗi khi lưu vào database: ${dbError.message}`,
            });
          }
        }
      }

      // --- B4: TRẢ VỀ KẾT QUẢ ---
      res.status(200).send(results);
    } catch (error) {
      // Xử lý lỗi chung (ví dụ: file không đọc được, sai định dạng,...)
      res.status(500).send({
        message: "Đã có lỗi xảy ra trong quá trình xử lý file.",
        error: error.message,
      });
    }
  },
);

router.put(
  "/:id",
  ModifyAnUserValidator,
  validatedResult,
  async function (req, res, next) {
    try {
      let id = req.params.id;
      let updatedItem = await userModel.findByIdAndUpdate(id, req.body, {
        new: true,
      });

      if (!updatedItem)
        return res.status(404).send({ message: "id not found" });

      let populated = await userModel.findById(updatedItem._id);
      res.send(populated);
    } catch (err) {
      res.status(400).send({ message: err.message });
    }
  },
);

router.delete("/:id", async function (req, res, next) {
  try {
    let id = req.params.id;
    let updatedItem = await userModel.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true },
    );
    if (!updatedItem) {
      return res.status(404).send({ message: "id not found" });
    }
    res.send(updatedItem);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

module.exports = router;
