module.exports = function(app) {
    let accountController = require('./app/controllers/accountController');
    let getInfo = require('./app/middleware/getInfo');

    app.route('/login')
      .post(accountController.login)

    app.route('/signup')
      .post(accountController.signup);
      
    app.route('/logout')
      .post(accountController.logout);
    
    app.route('/address')
      .get(getInfo,accountController.addressGet)
      .post(getInfo,accountController.addressPost)
    
    app.route('/password')
      .get(getInfo,accountController.infoGet);

    app.route('/accounts')
      .get(getInfo,accountController.accounts);

    app.route('/addresses')
      .get(getInfo,accountController.addresses);

    app.route('')
      .get(getInfo, accountController.infoGet)
      .post(getInfo,accountController.infoPost)
  };