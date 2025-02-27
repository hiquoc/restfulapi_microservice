const express = require("express");
const { engine } = require("express-handlebars");
const cookieParser = require("cookie-parser");
const path = require("path");
const app = express();

//////
app.use(cookieParser());
var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.engine(
  ".hbs",
  engine({
    extname: ".hbs",
  })
);

app.set("view engine", ".hbs");
app.set("views", path.join(__dirname, "resources\\views"));
app.use(express.static(path.join(__dirname, "public")));
const route = require("./routes/index");
route(app);
///////

const port=9000;
app.listen(port,()=>{
    console.log("listening on port "+port);
});
