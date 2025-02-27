const axios = require("axios");

class AccountController {
  async account(req, res) {
    let accounts = [], addresses = [];
    try {
        const token = req.cookies.token || "";
        const [responseAcc, responseAdd] = await Promise.all([
          axios.get("http://localhost:5000/account/accounts", {
              headers: { Cookie: `token=${token}` },
              withCredentials: true
          }),
          axios.get("http://localhost:5000/account/addresses", {
              headers: { Cookie: `token=${token}` },
              withCredentials: true
          })
      ]);
      accounts = responseAcc.data;
      addresses = responseAdd.data;

      const addressMap = new Map();
      addresses.forEach(addr => {
          addressMap.set(addr.account_id, addr);
      });

      accounts.forEach(acc => {
          if (addressMap.has(acc.account_id)) {
              Object.assign(acc, addressMap.get(acc.account_id)); // Merge address fields into account
          }
      });
    } catch (error) {
        console.error("Lỗi khi lấy thông tin tài khoản:", error.message);
        res.redirect("/");
    }
    res.render("admin/account", { accounts, addresses });
}

}

module.exports = new AccountController();
