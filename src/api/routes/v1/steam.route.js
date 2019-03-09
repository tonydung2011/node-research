const express = require('express');
const controller = require('../../controllers/steam.controller');
const { authorize, ADMIN } = require('../../middlewares/auth');

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
  .route('/offer/:steamid')
  .get(controller.getUserOfferStatus);

router
  .route('/store')
  .get(authorize(ADMIN), controller.searchSkin);

router
  .route('/store')
  .put(authorize(ADMIN), controller.updateDataInGame);

router
  .route('/trade')
  .post(controller.createOffer);

router
  .route('/update')
  .put(controller.updateDatabase);


module.exports = router;
