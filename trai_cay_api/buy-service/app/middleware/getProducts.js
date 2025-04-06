const axios = require("axios");

const getProduct = async (req, res, next) => {
  try {
    const products = await axios.get(`http://product-service:3002/productsAll`, {});
    req.products = products.data;
    next();
  } catch (e) {
    console.error("Lỗi server:", e.response ? e.response.data : e.message);
    res.status(500).json({
      message: "Lỗi server",
      error: e.response ? e.response.data : e.message,
    });
  }
};

module.exports = getProduct;
