require('dotenv').config();
const express=require('express');
const cors = require("cors");
const cookieParser = require("cookie-parser")
const app= express();
const PORT= process.env.PORT || 3002;

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

app.use(cors({
    origin: "http://localhost:9000",
    methods: "GET,POST,PATCH,PUT,DELETE",
    allowedHeaders: ["Authorization", "Content-Type"],
    credentials: true 
}));

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cookieParser());

const route = require("./router");
route(app);

app.listen(PORT, () => {
    console.log(`✅ User Service chạy tại http://localhost:${PORT}`);
});