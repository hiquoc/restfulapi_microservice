const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;
const { v4: uuidv4 } = require('uuid');

// Cấu hình Cloudinary
cloudinary.config({
  cloud_name: "dtvs3rgbw",
  api_key: "624517127684593", 
  api_secret: "fm7VXb2cPfELubipKJ8wsNjmOBU", 
});

// Cấu hình Storage sử dụng Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {

      const fileName = file.fieldname === "mainImage" ? `main-${uuidv4()}` : `${uuidv4()}`;
  
      return {
        folder: "uploads", // Thư mục lưu trữ trên Cloudinary
        public_id: fileName, // Đặt tên file theo yêu cầu
        format: file.mimetype.split("/")[1], // Định dạng file (jpg, png, webp)
      };
    },
  });

const upload = multer({ storage: storage });

module.exports = upload;
