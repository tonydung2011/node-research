const express = require('express');
const controller = require('../../controllers/steam.controller');

const router = express.Router();

router
  .route('/inventory/:steamid')
  .get(controller.getUserInventoryFromSteamapis);

router
  .route('/bot')
  .get(controller.getBotInventoryFromSteamapis);

router
  .route('/user/:steamid')
  .get(controller.getUserInfo);

router
  .route('/store')
  .get(controller.searchSkin);

router
  .route('/store')
  .put(controller.updateDataInGame);

router
  .route('/trade')
  .post(controller.createOffer);

router
  .route('/update')
  .post(controller.updateDatabase);


module.exports = router;
