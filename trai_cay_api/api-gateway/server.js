require('dotenv').config();
const express = require('express');
const {createProxyMiddleware} = require('http-proxy-middleware');
const cors = require("cors");

const app= express();
const PORT= 5000;

app.use(cors({
    origin: "http://localhost:9000",  // Cho phép frontend truy cập
    methods: "GET,POST,PUT,DELETE",
    allowedHeaders: "Content-Type,Authorization"
}));

// Proxy tới Account Service
app.use('/account',createProxyMiddleware({
    target:'http://localhost:5001',
    changeOrigin:true
}));

app.listen(PORT, () => {
    console.log(`🚀 API Gateway đang chạy tại http://localhost:${PORT}`);
});