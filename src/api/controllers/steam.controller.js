const config = require('../../config/vars');
const fetch = require('node-fetch');
const _ = require('lodash');
const Firestore = require('@google-cloud/firestore');
const path = require('path');
const joi = require('joi');

const db = new Firestore({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  keyFilename: path.join(__dirname, '../../../credentials.json'),
});
const settings = {
  timestampsInSnapshots: true,
};
db.settings(settings);
const dotaItems = db.collection('dota-items');
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
    const dotaSkins = await fetch(config.API.steam.getAllSkinInGame());
    if (
      dotaSkins.ok &&
      dotaSkins.status === 200
    ) {
      const dotaItemsStore = await dotaSkins.json();
      const inventoryResponse = await fetch(config.API.steam.getInventoryUrlFromSteamApis(steamId));
      if (inventoryResponse.ok &&
        inventoryResponse.status === 200
      ) {
        const inventory = await inventoryResponse.json();
        const dotaItemsDB = [];
        const databaseSnapshot = await dotaItems.get();
        databaseSnapshot.forEach(doc => dotaItemsDB.push(doc.data()));
        const result = [];
        _.each(inventory.descriptions, (skin) => {
          const {
            marketRate,
            tradable,
            overstock,
          } = _.find(dotaItemsDB, i => i.market_hash_name === skin.market_hash_name) || {
            marketRate: 1,
            tradable: true,
          };
          const skinFromSteam = _.find(dotaItemsStore.data, i => i.market_hash_name === skin.market_hash_name) || {
            prices: {
              safe_ts: {
                last_7d: 0,
              },
            },
          };
          if (tradable) {
            result.push({
              ...skin,
              assetid: _.find(inventory.assets, asset => asset.classid === skin.classid && asset.instanceid === skin.instanceid).assetid,
              icon_url: config.API.steam.getImgUrl(skin.icon_url),
              price: skinFromSteam.prices.safe_ts.last_7d * (marketRate - 0.05),
              overstock,
            });
          }
        });
        return res.status(200).json(result);
      }
    }
    return res.status(400).send('Bad request');
  } catch (error) {
    return res.status(500).send('Internal server error');
  }
};

exports.getBotInventoryFromSteamapis = async (req, res, next) => {
  try {
    const dotaSkins = await fetch(config.API.steam.getAllSkinInGame());
    const botId = req.query.bot || 0;
    if (
      dotaSkins.ok &&
      dotaSkins.status === 200
    ) {
      const dotaItemsStore = await dotaSkins.json();
      const inventoryResponse = await fetch(config.API.steam.getInventoryUrlFromSteamApis(config.botList[botId]));
      if (inventoryResponse.ok &&
        inventoryResponse.status === 200
      ) {
        const inventory = await inventoryResponse.json();
        const dotaItemsDB = [];
        const databaseSnapshot = await dotaItems.get();
        databaseSnapshot.forEach(doc => dotaItemsDB.push(doc.data()));
        const result = [];
        _.each(inventory.descriptions, (skin) => {
          const {
            marketRate,
            tradable,
            overstock,
          } = _.find(dotaItemsDB, i => i.market_hash_name === skin.market_hash_name) || {
            marketRate: 1,
            tradable: true,
          };
          const skinFromSteam = _.find(dotaItemsStore.data, i => i.market_hash_name === skin.market_hash_name) || {
            prices: {
              safe_ts: {
                last_7d: 0,
              },
            },
          };
          if (tradable) {
            result.push({
              ...skin,
              assetid: _.find(inventory.assets, asset => asset.classid === skin.classid && asset.instanceid === skin.instanceid).assetid,
              icon_url: config.API.steam.getImgUrl(skin.icon_url),
              price: skinFromSteam.prices.safe_ts.last_7d * marketRate,
              overstock,
            });
          }
        });
        return res.status(200).json(result);
      }
    }
    return res.status(400).send('Bad request');
  } catch (error) {
    return res.status(500).send('Internal server error');
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
    const responseFromAPI = await fetch(config.API.steam.getAllSkinInGame());
    if (responseFromAPI.ok &&
      responseFromAPI.status === 200
    ) {
      const dotaItemsStore = await responseFromAPI.json();
      const dotaItemsDB = [];
      const databaseSnapshot = await dotaItems.get();
      databaseSnapshot.forEach(doc => dotaItemsDB.push(doc.data()));
      let dotaItemsBussiness = _.map(dotaItemsStore.data, (item) => {
        const itemFromDB = _.find(dotaItemsDB, doc => doc.market_hash_name === item.market_hash_name);
        if (itemFromDB) {
          return {
            ...item,
            marketRate: itemFromDB.marketRate,
            tradable: itemFromDB.tradable,
            overstock: itemFromDB.overstock,
          };
        }
        return {
          ...item,
          marketRate: 1,
          tradable: true,
          overstock: null,
        };
      });

      limit = !isNaN(parseInt(limit, 10)) ? parseInt(limit, 10) : 10; /* eslint-disable-line */
      page = !isNaN(parseInt(page, 10)) ? parseInt(page, 10) : 1; /* eslint-disable-line */
      minPrice = !isNaN(parseInt(minPrice, 10)) ? parseInt(minPrice, 10) : 0; /* eslint-disable-line */
      maxPrice = !isNaN(parseInt(maxPrice, 10)) ? parseInt(maxPrice, 10) : 1000; /* eslint-disable-line */

      if (!tradable || tradable !== 'yes' || tradable !== 'no') {
        tradable = 'all';
      }
      const heroReg = new RegExp(hero, 'i');
      const rarityReg = new RegExp(rarity, 'i');
      const nameReg = new RegExp(market_hash_name, 'i');

      dotaItemsBussiness = _.filter(dotaItemsBussiness, item => (
        heroReg.test(item.hero) &&
        rarityReg.test(item.rarity) &&
        nameReg.test(item.market_hash_name) &&
        item.prices.safe_ts.last_24h >= minPrice &&
        item.prices.safe_ts.last_24h <= maxPrice &&
        (
          (
            tradable === 'yes' &&
            item.tradable
          ) || (
            tradable === 'no' &&
            !item.tradable
          ) || (
            tradable === 'all'
          )
        )
      ));

      switch (sort) {
        case 'price-24h':
          dotaItemsBussiness = _.sortBy(dotaItemsBussiness, i => i.prices.safe_ts.last_24h);
          break;
        case 'price-7d':
          dotaItemsBussiness = _.sortBy(dotaItemsBussiness, i => i.prices.safe_ts.last_7d);
          break;
        case 'price-30d':
          dotaItemsBussiness = _.sortBy(dotaItemsBussiness, i => i.prices.safe_ts.last_30d);
          break;
        case 'name':
          dotaItemsBussiness = _.sortBy(dotaItemsBussiness, i => i.market_hash_name);
          break;
        case 'hero':
          dotaItemsBussiness = _.sortBy(dotaItemsBussiness, i => i.hero);
          break;
        case 'rarity':
          dotaItemsBussiness = _.sortBy(dotaItemsBussiness, i => i.rarity);
          break;
        default:
          dotaItemsBussiness = _.sortBy(dotaItemsBussiness, i => i.market_hash_name);
          break;
      }

      const pagination = _.chunk(dotaItemsBussiness, limit);
      if (page > pagination.length) {
        page = pagination.length;
      }

      return res.status(200).json({
        page,
        limit,
        appId: responseFromAPI.appID,
        context: responseFromAPI.part,
        total: dotaItemsBussiness.length,
        success: true,
        data: pagination.length !== 0 ? pagination[page - 1] : [],
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Steam Service has fail',
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
    const { data, password } = req.body;
    let secure = false;
    const databaseSnapshot = await adminDB.get();
    databaseSnapshot.forEach((doc) => {
      if (password === doc.data().password) {
        secure = true;
      }
    });
    if (!secure) {
      return res.status(403).json({
        error: 'No permission',
      });
    }
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
      const docDb = dotaItems.doc(doc.market_hash_name);
      if (!docDb.exists) {
        docDb.set({
          market_hash_name: doc.market_hash_name,
          tradable: doc.tradable,
          marketRate: doc.marketRate,
          overstock: doc.overstock,
        });
      } else {
        dotaItems.update({
          market_hash_name: doc.market_hash_name,
          tradable: doc.tradable,
          marketRate: doc.marketRate,
          overstock: doc.overstock,
        });
      }
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
