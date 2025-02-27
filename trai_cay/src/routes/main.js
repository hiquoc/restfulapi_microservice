const express = require('express');
const router=express.Router();
let mainController = require('../app/controllers/mainController')

router.post('/logout',mainController.logout)
router.get('/', mainController.main);


module.exports = router;