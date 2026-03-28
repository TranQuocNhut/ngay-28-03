import React, { useState } from "react";
import axios from "axios"; // Giả sử bạn đã cài đặt axios trong dự án React

// Component giao diện cho chức năng import user
function UserImport() {
  // State để lưu file người dùng chọn
  const [selectedFile, setSelectedFile] = useState(null);
  // State để lưu kết quả trả về từ API
  const [uploadResult, setUploadResult] = useState(null);
  // State để quản lý trạng thái loading khi đang upload
  const [isLoading, setIsLoading] = useState(false);
  // State để lưu lỗi nếu có lỗi mạng hoặc lỗi server 500
  const [error, setError] = useState("");

  /**
   * Xử lý sự kiện khi người dùng chọn file.
   * @param {Event} event - Sự kiện onchange của input file.
   */
  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    // Reset kết quả cũ và lỗi khi chọn file mới
    setUploadResult(null);
    setError("");
  };

  /**
   * Xử lý sự kiện khi người dùng nhấn nút "Upload".
   * Gửi file lên API backend.
   */
  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Vui lòng chọn một file .xlsx trước khi upload.");
      return;
    }

    // Tạo đối tượng FormData để đóng gói và gửi file
    const formData = new FormData();
    formData.append("file", selectedFile);

    setIsLoading(true); // Bắt đầu trạng thái loading
    setError("");
    setUploadResult(null);

    try {
      // Gọi API POST tới backend với endpoint /api/users/import
      const response = await axios.post("/api/users/import", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      // Lưu kết quả trả về từ API vào state để render ra giao diện
      setUploadResult(response.data);
    } catch (err) {
      // Xử lý các lỗi có thể xảy ra (lỗi mạng, server không phản hồi, lỗi 500...)
      const errorMessage =
        err.response?.data?.message || "Đã có lỗi xảy ra. Vui lòng thử lại.";
      setError(errorMessage);
    } finally {
      setIsLoading(false); // Kết thúc trạng thái loading
    }
  };

  // --- RENDER GIAO DIỆN ---
  return (
    <div
      style={{
        padding: "20px",
        fontFamily: "Arial, sans-serif",
        maxWidth: "800px",
        margin: "auto",
      }}
    >
      <h2>Import Users từ File Excel</h2>
      <p>Chọn file .xlsx có 2 cột theo đúng thứ tự: 'username' và 'email'.</p>

      {/* Khu vực chọn file và upload */}
      <div
        style={{ marginBottom: "20px", display: "flex", alignItems: "center" }}
      >
        <input type="file" accept=".xlsx, .xls" onChange={handleFileChange} />
        <button
          onClick={handleUpload}
          disabled={isLoading || !selectedFile}
          style={{ marginLeft: "10px", padding: "8px 15px", cursor: "pointer" }}
        >
          {isLoading ? "Đang xử lý..." : "Upload"}
        </button>
      </div>

      {/* Hiển thị lỗi chung nếu có */}
      {error && (
        <div style={{ color: "red", marginBottom: "20px" }}>Lỗi: {error}</div>
      )}

      {/* Khu vực hiển thị kết quả sau khi upload */}
      {uploadResult && (
        <div>
          <h3>Kết quả Upload</h3>
          <p style={{ color: "green" }}>
            <strong>Thành công:</strong> {uploadResult.successCount} dòng
          </p>
          <p style={{ color: "orange" }}>
            <strong>Thất bại:</strong> {uploadResult.failCount} dòng
          </p>

          {/* Bảng hiển thị chi tiết các dòng lỗi */}
          {uploadResult.errors && uploadResult.errors.length > 0 && (
            <div>
              <h4>Chi tiết lỗi:</h4>
              <table
                border="1"
                cellPadding="8"
                cellSpacing="0"
                style={{ width: "100%", borderCollapse: "collapse" }}
              >
                <thead style={{ backgroundColor: "#f2f2f2" }}>
                  <tr>
                    <th style={{ textAlign: "left" }}>Dòng số</th>
                    <th style={{ textAlign: "left" }}>Lý do lỗi</th>
                  </tr>
                </thead>
                <tbody>
                  {uploadResult.errors.map((err, index) => (
                    <tr key={index}>
                      <td>{err.row}</td>
                      <td>{err.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default UserImport;
