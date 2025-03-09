require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const app = express();
const PORT = process.env.PORT || 3001;


app.use(
  cors({
    origin: ["http://localhost:9000", "http://localhost:3002"], // Cho phép nhiều origin
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
    allowedHeaders: ["Authorization", "Content-Type"],
    credentials: true, // Cho phép cookie & xác thực
  })
);


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const route = require("./router");
route(app);

app.listen(PORT, () => {
  console.log(`✅ User Service chạy tại http://localhost:${PORT}`);
});
