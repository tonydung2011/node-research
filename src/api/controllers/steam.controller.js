const config = require('../../config/vars');
const fetch = require('node-fetch');
const _ = require('lodash');
const SteamUser = require('steam-user');
const SteamTotp = require('steam-totp');
const SteamCommunity = require('steamcommunity');
const moment = require('moment');
const TradeOfferManager = require('steam-tradeoffer-manager');
const joi = require('joi');
const steamGuardCredentials = require('../../../botCredentials.json');
const DotaItem = require('../models/dotaItem.model');
const configs = require('../../config/vars');

const schema = joi.object().keys({
  market_hash_name: joi.string().required(),
  tradable: joi.boolean().required(),
  marketRate: [joi.number(), joi.string()],
});


exports.getUserInfo = async (req, res, next) => {
  try {
    const steamId = req.params.steamid;
    const responseFromAPI = await fetch(config.API.steam.getUserInfo(steamId));
    if (responseFromAPI.ok && responseFromAPI.status === 200) {
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
    const inventoryResponse = await fetch(
      config.API.steam.getInventoryUrl(steamId)
    );
    if (inventoryResponse.ok && inventoryResponse.status === 200) {
      const inventory = await inventoryResponse.json();
      const result = [];
      await _.each(inventory.descriptions, async skin => {
        const doc = await DotaItem.findByName(skin.market_hash_name).exec();
        if (doc) {
          result.push({
            ...doc,
            descriptions: doc.descriptions,
            tags: doc.tags,
            assetid: _.find(
              inventory.assets,
              asset =>
                asset.classid === skin.classid &&
                asset.instanceid === skin.instanceid
            ).assetid,
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
    const inventoryResponse = await fetch(
      config.API.steam.getInventoryUrl(config.botList[botId])
    );
    if (inventoryResponse.ok && inventoryResponse.status === 200) {
      const inventory = await inventoryResponse.json();
      const result = [];
      await _.each(inventory.descriptions, async skin => {
        const doc = await DotaItem.findByName(skin.market_hash_name).exec();
        if (doc) {
          if (doc.tradable) {
            result.push({
              ...doc,
              descriptions: doc.descriptions,
              tags: doc.tags,
              assetid: _.find(
                inventory.assets,
                asset =>
                  asset.classid === skin.classid &&
                  asset.instanceid === skin.instanceid
              ).assetid,
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
    limit, page, tradable, minPrice, maxPrice
  } = req.query;
  const {
    rarity = '',
    hero = '',
    market_hash_name = '',
    sort = 'price',
  } = req.query;
  try {
    limit = !isNaN(parseInt(limit, 10)) /* eslint-disable-line */
      ? parseInt(limit, 10)
      : 10;
    page = !isNaN(parseInt(page, 10)) /* eslint-disable-line */
      ? parseInt(page, 10)
      : 1;
    minPrice = !isNaN(parseInt(minPrice, 10)) /* eslint-disable-line */
      ? parseInt(minPrice, 10)
      : 0;
    maxPrice = !isNaN(parseInt(maxPrice, 10)) /* eslint-disable-line */
      ? parseInt(maxPrice, 10)
      : parseInt(configs.maxPrice, 10);

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
        order = 'marketHashName';
        break;
      case 'hero':
        order = 'hero';
        break;
      case 'rarity':
        order = 'rarity';
        break;
      default:
        order = 'marketHashName';
        break;
    }

    const data = await DotaItem.searchDocWithFilter({
      order,
      search: market_hash_name,
      limit,
      page,
      rarity,
      hero,
      minPrice,
      maxPrice,
    }).exec();

    return res.status(200).json({
      success: true,
      page,
      limit,
      data,
      total: data.length,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        'Internal server error, This probaly come from some misconfig in server',
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
    const schemaTest =
      _.findIndex(
        _.map(data, doc => schema.validate(doc).error === null),
        false
      ) !== -1;
    if (schemaTest) {
      return res.status(400).json({
        success: false,
        message: "Contain invalid object's schema in data field of body",
      });
    }
    await _.each(data, async doc => {
      await DotaItem.findOneAndUpdate(doc.market_hash_name, {
        tradable: doc.tradable,
        marketRate: doc.marketRate,
        overstock: doc.overstock,
      }, {
        new: true,
      }).exec();
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

exports.updateDatabase = async (req, res, next) => {
  try {
    const responseFromAPI = await fetch(config.API.steam.getAllSkinInGame());
    if (responseFromAPI.ok && responseFromAPI.status === 200) {
      const dotaItemsStore = await responseFromAPI.json();
      await _.each(dotaItemsStore.data, doc => {
        DotaItem.findOneAndUpdate({
          marketHashName: doc.market_hash_name
        }, {
          hero: doc.hero,
          image: doc.image_url,
          marketHashName: doc.market_hash_name,
          marketName: doc.market_name,
          priceLast24h: doc.prices.safe_ts.last_24h,
          priceLast7d: doc.prices.safe_ts.last_7d,
          priceLast30d: doc.prices.safe_ts.last_30d,
          priceLatest: doc.prices.latest,
          priceMax: doc.prices.max,
          priceMin: doc.prices.min,
          priceSafe: doc.prices.safe,
          sold24h: doc.prices.sold.last_24h,
          sold7d: doc.prices.sold.last_7d,
          sold30d: doc.prices.sold.last_30d,
          unstable: doc.unstable,
          unstableReason: doc.unstable_reason,
          quality: doc.quality,
          rarity: doc.rarity,
        }, {
          upsert: true,
        }).exec();
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
    const { tradeUrl, playerItems, botItems } = req.body;
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
      twoFactorCode: SteamTotp.getAuthCode(
        steamGuardCredentials.value[botId].shared_secret
      ),
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
      _.each(playerItems, item => {
        offer.addTheirItem({
          assetid: item.assetid,
          appid: 570,
          contextid: 2,
        });
      });
      _.each(botItems, item => {
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
          community.acceptConfirmationForObject(
            steamGuardCredentials.value[botId].identity_secret,
            offer.id,
            error => {
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
            }
          );
        }
      }
      offer.setMessage(`This is an offer come from tradewithme.online. Offer created time:
          ${moment()
    .utc()
    .format('dddd, MMMM Do YYYY, h:mm:ss a')}`);
      offer.send(onSendSuccess);
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'invalid trade request',
    });
  }
};
