const express = require('express');
const controller = require('../../controllers/steam.controller');

const router = express.Router();

router
  .route('/inventory/:steamid')
  .get(controller.getUserInventoryFromSteamapis);

router
  .route('/store')
  .get(controller.getAllSkinInGame);

router
  .route('/update')
  .post(controller.updateDataInGame);


module.exports = router;
