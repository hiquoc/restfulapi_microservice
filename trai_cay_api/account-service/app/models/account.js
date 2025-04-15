class Account {
  constructor({ id, username, password, fullname, phone, email, role }) {
    this.id = id;
    this.username = username;
    this.password = password;
    this.fullname = fullname;
    this.phone = phone;
    this.email = email;
    this.role = role || "user";
  }

  // Phương thức validate dữ liệu
  validate() {
    const errors = [];

    if (!this.username || this.username.length < 3) {
      errors.push("Username phải có ít nhất 3 ký tự");
    }

    if (!this.password || this.password.length < 6) {
      errors.push("Mật khẩu phải có ít nhất 6 ký tự");
    }

    if (!this.fullname) {
      errors.push("Họ và tên không được để trống");
    }

    if (!this.phone || !/^[0-9]{10}$/.test(this.phone)) {
      errors.push("Số điện thoại không hợp lệ");
    }

    if (!this.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
      errors.push("Email không hợp lệ");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
  createAccount(data) {}
}
module.exports = Account;
