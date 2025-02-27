require("dotenv").config();
const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const cors = require("cors");

const app = express();
const PORT = 5000;

app.use(
  cors({
    origin: "http://localhost:9000", // Cho phép frontend truy cập
    credentials: true,
  })
);

// Proxy tới Account Service
app.use(
  "/account",
  createProxyMiddleware({
    target: "http://localhost:5001",
    changeOrigin: true,
    cookieDomainRewrite: {
      "*": "localhost", // Chỉnh domain cookie để phù hợp với localhost
    },
    onProxyReq: (proxyReq, req, res) => {
      if (req.cookies.token) {
        proxyReq.setHeader("cookie", `token=${req.cookies.token}`); // Gửi cookie đi
      }
    },
  })
);

app.listen(PORT, () => {
  console.log(`🚀 API Gateway đang chạy tại http://localhost:${PORT}`);
});
