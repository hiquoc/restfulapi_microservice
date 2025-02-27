module.exports = function(app) {
    let accountController = require('./app/controllers/accountController');
    let getInfo = require('./app/middleware/getInfo');

    app.route('/login')
      .post(accountController.login)

    app.route('/signup')
      .post(accountController.signup);
    
    app.route('/address')
      .post(getInfo,accountController.addressPost)
      .get(getInfo,accountController.addressGet);
    
    app.route('/password')
      .get(getInfo,accountController.infoGet);

    app.route('')
      .get(getInfo, accountController.infoGet)
      .post(getInfo,accountController.infoPost)
  };