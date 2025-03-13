const axios = require("axios");

const getProductPrice = async (req, res, next) => {
  try {
    const product = await axios.get(`http://localhost:3002/${req.body.product_id}`, {});
    req.product = product.data[0];
    next();
  } catch (e) {
    console.error("Lỗi server:", e.response ? e.response.data : e.message);
    res.status(500).json({
      message: "Lỗi server",
      error: e.response ? e.response.data : e.message,
    });
  }
};

module.exports = getProductPrice;
