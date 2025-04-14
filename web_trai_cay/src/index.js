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
    helpers: {
      eq: function(a,b){
        return a===b;
      },
      ifEqual: function (arg1, arg2, options) {
        return arg1 === arg2 ? options.fn(this) : options.inverse(this);
      },
      ifInArray: function (value, array, options) {
        if (array && array.includes(value)) {
          return options.fn(this);
        }
        return options.inverse(this);
      },
      divide: (value, divisor) => {
        return value / divisor;
      },
      compare: function (arg1, operator, arg2, options) {
        let result;
        switch (operator) {
          case "==":
            result = arg1 == arg2;
            break;
          case "===":
            result = arg1 === arg2;
            break;
          case "!=":
            result = arg1 != arg2;
            break;
          case "<":
            result = arg1 < arg2;
            break;
          case ">":
            result = arg1 > arg2;
            break;
          case "<=":
            result = arg1 <= arg2;
            break;
          case ">=":
            result = arg1 >= arg2;
            break;
          default:
            result = false;
            break;
        }
        return result ? options.fn(this) : options.inverse(this);
      },
      default: function (value, defaultValue) {
        return value != null ? value : defaultValue;
      },
      formatPrice: function (price) {
        if (price == null) return "N/A";
        const numPrice = Number(price);
        if (isNaN(numPrice)) return "N/A";
        return numPrice.toLocaleString("vi-VN");
      },

      formatPricePerUnit: function (price, number) {
        const formattedPrice = (price / number).toLocaleString("vi-VN", {
          style: "currency",
          currency: "VND",
          minimumFractionDigits: 0,
        });
        return formattedPrice;
      },
      joinColors: function (colors) {
        return colors.join(", ");
      },
      range: function (start, end) {
        let result = [];
        for (let i = start; i < end; i++) {
          result.push(i);
        }
        return result;
      },
      lte: function (a, b) {
        return a <= b;
      },
      calcDiscount: function (price, discount) {
        if (discount && discount !== 0) {
          return Math.round((price * (100 - discount)) / 100);
        }
        return price;
      },
    },
  })
);

app.set("view engine", ".hbs");
app.set("views", path.join(__dirname, "resources\\views"));
app.use(express.static(path.join(__dirname, "public")));
const uploadsPath =
  "C:/Users/Quoc Huy/Desktop/trai_cay_api/product-service/uploads";
app.use("/uploads", express.static(uploadsPath));
const route = require("./routes/index");
route(app);
///////

const port = 9000;
app.listen(port, () => {
  console.log("listening on port " + port);
});
