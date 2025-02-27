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
        return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
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
    },
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
