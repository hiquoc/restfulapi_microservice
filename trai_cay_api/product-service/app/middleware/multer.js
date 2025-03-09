const multer = require("multer");
const path = require("path");
// Cấu hình nơi lưu file
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.resolve(__dirname, "../../uploads/");
    cb(null, uploadPath); // Lưu vào thư mục "uploads"
  },
  filename: function (req, file, cb) {
    if (file.fieldname === "mainImage") {
      cb(null, `main-${Date.now()}${path.extname(file.originalname)}`);
    } else {
      cb(null, `${Date.now()}${path.extname(file.originalname)}`);
    }
  },
});

// Bộ lọc chỉ chấp nhận ảnh
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Chỉ chấp nhận ảnh có định dạng JPG, PNG, hoặc WEBP"), false);
  }
};

// Cấu hình Multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // Giới hạn 5MB mỗi ảnh
});

module.exports = upload;
