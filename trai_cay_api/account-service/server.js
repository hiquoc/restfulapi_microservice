require('dotenv').config();
const express=require('express');
const cors = require("cors");

const app= express();
const PORT= process.env.PORT || 5001;

app.use(cors({
    origin: "http://localhost:9000",  // Cho phép frontend truy cập
    methods: "GET,POST,PUT,DELETE",
    allowedHeaders: "Content-Type,Authorization"
}));
app.use(express.json());
app.use(express.urlencoded({extended: true}));

const route = require("./router");
route(app);

app.listen(PORT, () => {
    console.log(`✅ User Service chạy tại http://localhost:${PORT}`);
});