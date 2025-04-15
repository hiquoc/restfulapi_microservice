const Account = require("./account");

class UserAccount extends Account {
  constructor(data) {
    super({ ...data, role: "user" });
  }
  static createAccount(data) {
    return new UserAccount(data);
  }
}

module.exports = UserAccount;
