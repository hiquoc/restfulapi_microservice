const Account = require("./account");

class AdminAccount extends Account {
  constructor(data) {
    super({ ...data, role: "user" });
  }
  static createAccount(data) {
    return new AdminAccount(data);
  }
}

module.exports = AdminAccount;
