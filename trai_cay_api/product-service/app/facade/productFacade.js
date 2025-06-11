const gtcProduct = require("../models/gtcProduct");
const tcProduct = require("../models/tcProduct");
const rcProduct = require("../models/rcProduct");
const axios = require("axios");
const ProductFacade = {
  create: (data) => {
    switch (data.category) {
      case '1':
        return gtcProduct.createProduct(data);
      case '2':
        return tcProduct.createProduct(data);
      case '3':
        return rcProduct.createProduct(data);
      default:
        return tcProduct.createProduct(data);
    }
  },

  // Phân tích public_id từ URL của Cloudinary
  extractPublicIdFromUrl: (imageUrl) => {
    const match = imageUrl.match(/\/uploads\/(.+?)\./);
    return match ? `uploads/${match[1]}` : null;
  },

  getProducts: (products, images) => {
    // Map ảnh theo product_id
    const imageMap = {};
    images.forEach((image) => {
      const pid = image.product_id;
      if (!imageMap[pid]) {
        imageMap[pid] = {
          mainImg: null,
          images: [],
        };
      }
      if (image.image_url.includes("/uploads/main")||image.image_url.match(/\/main(-|_|\.)?/i)) {
        imageMap[pid].mainImg = image.image_url;
      }
      else{
        imageMap[pid].images.push(image.image_url);
      }
    });

    // Tạo danh sách sản phẩm với ảnh kết hợp
    return products.map((product) => ({
      ...product,
      mainImg: imageMap[product.product_id]?.mainImg || null,
      images: imageMap[product.product_id]?.images || [],
      afterDiscount: Math.round(product.price * (1 - product.discount / 100)),
    }));
  },

  // Xóa ảnh trên Cloudinary
  deleteImageFromCloudinary: async (public_id, cloudinary) => {
    try {
      const result = await cloudinary.uploader.destroy(public_id);
      return {
        success: result.result === "ok",
        public_id,
      };
    } catch (error) {
      console.log(`Lỗi xóa ảnh trên Cloudinary: ${error}`);
      return {
        success: false,
        public_id,
        error: error.message,
      };
    }
  },
  getRole: async (headers) => {
    let role = "user";
    if (headers) {
      try {
        const token = headers;
        const response = await axios.get("http://account-service:3001/admin", {
          headers: { Authorization: `${token}` },
        });
        if (response.status != 401 || response.status != 403) {
          role = "admin";
        }
      } catch (e) {
        console.error("Lỗi server:", e.response ? e.response.data : e.message);
      }
    }
    return role;
  },
};

module.exports = ProductFacade;
