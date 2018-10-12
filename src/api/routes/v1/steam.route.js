const express = require('express');
const controller = require('../../controllers/steam.controller');

const router = express.Router();

router
  .route('/inventory/:steamid')
  .get(controller.getUserInventory);


module.exports = router;
