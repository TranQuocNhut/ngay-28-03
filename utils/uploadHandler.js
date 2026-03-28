let multer = require("multer");
let path = require("path");
let fs = require("fs");

// Đảm bảo thư mục 'uploads/' tồn tại
const uploadDir = "uploads/";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
//luu o dau? ten la gi
let storageSetting = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: function (req, file, cb) {
    let ext = path.extname(file.originalname);
    let filename =
      Date.now() + "-" + Math.round(Math.random() * 1000_000_000) + ext;
    cb(null, filename);
  },
});
let filterImage = function (req, file, cb) {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new Error("file sai dinh dang"));
  }
};
let filterExcel = function (req, file, cb) {
  const allowedMimeTypes = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
    "application/vnd.ms-excel", // .xls
  ];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("file sai dinh dang. Chỉ chấp nhận file Excel (.xlsx, .xls)"));
  }
};
module.exports = {
  uploadImage: multer({
    storage: storageSetting,
    limits: { fileSize: 5 * 1024 * 1024 }, // Sửa lỗi cú pháp limits
    fileFilter: filterImage,
  }),
  uploadExcel: multer({
    storage: storageSetting,
    limits: { fileSize: 5 * 1024 * 1024 }, // Sửa lỗi cú pháp limits
    fileFilter: filterExcel,
  }),
};
