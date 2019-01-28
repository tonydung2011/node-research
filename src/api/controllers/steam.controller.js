const config = require('../../config/vars');
const fetch = require('node-fetch');
const _ = require('lodash');
const Firestore = require('@google-cloud/firestore');
const path = require('path');
const joi = require('joi');
const SteamUser = require('steam-user');
const SteamTotp = require('steam-totp');
const SteamCommunity = require('steamcommunity');
const moment = require('moment');
const TradeOfferManager = require('steam-tradeoffer-manager');
const steamGuardCredentials = require('../../../botCredentials.json');

const db = new Firestore({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  keyFilename: path.join(__dirname, '../../../credentials.json'),
});
const settings = {
  timestampsInSnapshots: true,
};
db.settings(settings);
const dotaItemsInfo = db.collection('dota-items-info');
const adminDB = db.collection('admin');

const schema = joi.object().keys({
  market_hash_name: joi.string().required(),
  tradable: joi.boolean().required(),
  marketRate: [joi.number(), joi.string()],
});

exports.getUserInfo = async (req, res, next) => {
  try {
    const steamId = req.params.steamid;
    const responseFromAPI = await fetch(config.API.steam.getUserInfo(steamId));
    if (responseFromAPI.ok &&
      responseFromAPI.status === 200
    ) {
      const user = await responseFromAPI.json();
      return res.status(200).json(user);
    }
    return res.status(400).send('Bad request');
  } catch (error) {
    return res.status(500).send('Internal server error');
  }
};

exports.getUserInventoryFromSteamapis = async (req, res, next) => {
  try {
    const steamId = req.params.steamid;
    const inventoryResponse = await fetch(config.API.steam.getInventoryUrl(steamId));
    if (inventoryResponse.ok &&
        inventoryResponse.status === 200
    ) {
      const inventory = await inventoryResponse.json();
      const databaseSnapshot = await dotaItemsInfo.get();
      const result = [];
      _.each(inventory.descriptions, (skin) => {
        const doc = databaseSnapshot.doc(skin.market_hash_name);
        if (doc.exists) {
          const jsonDoc = doc.data();
          result.push({
            ...jsonDoc,
            assetid: _.find(inventory.assets, asset => asset.classid === skin.classid && asset.instanceid === skin.instanceid).assetid,
            icon_url: config.API.steam.getImgUrl(skin.icon_url),
            price: jsonDoc.prices.safe_ts.last_7d * (jsonDoc.marketRate - 0.05),
          });
        }
      });
      return res.status(200).json(result);
    }
    return res.status(400).json({
      success: false,
      message: 'Error while fetching data',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

exports.getBotInventoryFromSteamapis = async (req, res, next) => {
  try {
    const botId = req.query.bot || 0;
    const inventoryResponse = await fetch(config.API.steam.getInventoryUrl(config.botList[botId]));
    if (inventoryResponse.ok &&
        inventoryResponse.status === 200
    ) {
      const inventory = await inventoryResponse.json();
      const databaseSnapshot = await dotaItemsInfo.get();
      const result = [];
      _.each(inventory.descriptions, (skin) => {
        const doc = databaseSnapshot.doc(skin.market_hash_name);
        if (doc.exists) {
          const jsonDoc = doc.data();
          if (doc.tradable) {
            result.push({
              ...jsonDoc,
              assetid: _.find(inventory.assets, asset => asset.classid === skin.classid && asset.instanceid === skin.instanceid).assetid,
              icon_url: config.API.steam.getImgUrl(skin.icon_url),
              price: jsonDoc.prices.safe_ts.last_7d * (jsonDoc.marketRate - 0.05),
            });
          }
        }
      });
      return res.status(200).json(result);
    }
    return res.status(400).json({
      success: false,
      message: 'Error while fetching data',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error in logic',
    });
  }
};

exports.searchSkin = async (req, res, next) => {
  let {
    limit, page, min_price: minPrice, max_price: maxPrice, tradable,
  } = req.query;
  const {
    rarity = '', hero = '', market_hash_name = '', sort = 'price',
  } = req.query;
  try {
    const databaseSnapshot = await dotaItemsInfo.get();

    limit = !isNaN(parseInt(limit, 10)) ? parseInt(limit, 10) : 10; /* eslint-disable-line */
    page = !isNaN(parseInt(page, 10)) ? parseInt(page, 10) : 1; /* eslint-disable-line */
    minPrice = !isNaN(parseInt(minPrice, 10)) ? parseInt(minPrice, 10) : 0; /* eslint-disable-line */
    maxPrice = !isNaN(parseInt(maxPrice, 10)) ? parseInt(maxPrice, 10) : 1000; /* eslint-disable-line */

    if (!tradable || tradable !== 'yes' || tradable !== 'no') {
      tradable = 'all';
    }

    let order;

    switch (sort) {
      case 'price-24h':
        order = 'priceLast24h';
        break;
      case 'price-7d':
        order = 'priceLast7d';
        break;
      case 'price-30d':
        order = 'priceLast30d';
        break;
      case 'name':
        order = 'market_hash_name';
        break;
      case 'hero':
        order = 'hero';
        break;
      case 'rarity':
        order = 'rarity';
        break;
      default:
        order = 'market_hash_name';
        break;
    }

    const query = databaseSnapshot
      .where('hero', '>=', hero)
      .where('rarity', '>=', rarity)
      .where('priceLast7d', '>=', minPrice)
      .where('priceLast7d', '<=', maxPrice)
      .where('market_hash_name', '>=', market_hash_name);

    return res.status(200).json({
      success: true,
      page,
      limit,
      total: query.size,
      data: query.orderBy(order).limit(limit).startAfter(limit * (page - 1)),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error, This probaly come from some misconfig in server',
    });
  }
};

exports.updateDataInGame = async (req, res, next) => {
  try {
    const { data } = req.body;
    // const { data, password } = req.body;
    // let secure = false;
    // const databaseSnapshot = await adminDB.get();
    // databaseSnapshot.forEach((doc) => {
    //   if (password === doc.data().password) {
    //     secure = true;
    //   }
    // });
    // if (!secure) {
    //   return res.status(403).json({
    //     error: 'No permission',
    //   });
    // }
    if (!data) {
      return res.status(400).json({
        success: false,
        message: 'No valid data field appear in request',
      });
    }
    if (!_.isArray(data)) {
      return res.status(400).json({
        success: false,
        message: 'Valid data field must be an array',
      });
    }
    const schemaTest = _.findIndex(_.map(data, doc => schema.validate(doc).error === null), false) !== -1;
    if (schemaTest) {
      return res.status(400).json({
        success: false,
        message: 'Contain invalid object\'s schema in data field of body',
      });
    }
    _.each(data, (doc) => {
      const docDb = dotaItemsInfo.doc(doc.market_hash_name);
      docDb.set({
        tradable: doc.tradable,
        marketRate: doc.marketRate,
        overstock: doc.overstock,
      });
    });
    return res.status(200).json({
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

exports.authenticateAdmin = async (req, res, next) => {
  let success = false;
  try {
    const databaseSnapshot = await adminDB.get();
    databaseSnapshot.forEach((doc) => {
      if (req.body.password === doc.data().password) {
        success = true;
      }
    });
    return res.status(200).json({
      success,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

exports.updateDatabase = async (req, res, next) => {
  try {
    const responseFromAPI = await fetch(config.API.steam.getAllSkinInGame());
    if (responseFromAPI.ok &&
      responseFromAPI.status === 200
    ) {
      const dotaItemsStore = await responseFromAPI.json();
      _.each(dotaItemsStore.data, (doc) => {
        const docDb = dotaItemsInfo.doc(doc.market_hash_name);
        if (!docDb.exists) {
          docDb.set({
            ...doc,
            tradable: true,
            marketRate: 1,
            overstock: null,
            priceLast24h: doc.prices.safe_ts.last_24h,
            priceLast7d: doc.prices.safe_ts.last_7d,
            priceLast30d: doc.prices.safe_ts.last_30d,
          });
        } else {
          dotaItemsInfo.update({
            ...doc,
            priceLast24h: doc.prices.safe_ts.last_24h,
            priceLast7d: doc.prices.safe_ts.last_7d,
            priceLast30d: doc.prices.safe_ts.last_30d,
          });
        }
      });
      return res.status(200).json({
        success: true,
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Error while fetching API',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

exports.createOffer = async (req, res) => {
  try {
    const botId = req.body.botId || 0;
    const {
      tradeUrl, playerItems, botItems,
    } = req.body;
    if (!tradeUrl || typeof tradeUrl !== 'string') {
      res.status(400).json({
        success: false,
        messages: 'Trade Url must be provided',
      });
    }
    const client = new SteamUser();
    const logOnOption = {
      accountName: config.botCredentials.botNames[botId],
      password: config.botCredentials.botPasswords[botId],
      twoFactorCode: SteamTotp.getAuthCode(steamGuardCredentials.value[botId].shared_secret),
    };
    client.logOff();
    client.logOn(logOnOption);
    client.on('webSession', (webSession, cookies) => {
      const community = new SteamCommunity();
      community.setCookies(cookies);
      const manager = new TradeOfferManager({
        community,
        steam: client,
        domain: config.domain,
        language: 'en',
      });
      const offer = manager.createOffer(tradeUrl);
      _.each(playerItems, (item) => {
        offer.addTheirItem({
          assetid: item.assetid,
          appid: 570,
          contextid: 2,
        });
      });
      _.each(botItems, (item) => {
        offer.addMyItem({
          assetid: item.assetid,
          appid: 570,
          contextid: 2,
        });
      });

      function clearSession() {
        manager.shutdown();
        client.logOff();
      }

      function onSendSuccess(err) {
        if (err) {
          res.status(400).json({
            success: false,
            message: err.message,
          });
        } else {
          community.acceptConfirmationForObject(steamGuardCredentials.value[botId].identity_secret, offer.id, (error) => {
            if (!error) {
              res.status(200).json({
                success: true,
              });
            } else {
              res.status(400).json({
                success: false,
                message: err.message,
              });
            }
            clearSession();
          });
        }
      }
      offer.setMessage(`This is an offer come from tradewithme.online. Offer created time:
          ${moment().utc().format('dddd, MMMM Do YYYY, h:mm:ss a')}`);
      offer.send(onSendSuccess);
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'invalid trade request',
    });
  }
};
