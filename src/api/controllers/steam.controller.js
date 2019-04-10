const fetch = require('node-fetch');
const _ = require('lodash');
const joi = require('joi');
const DotaItem = require('../models/dotaItem.model');
const configs = require('../../config/vars');
const { getOfferStatus, removeStatus } = require('../utils/memcache');
const bots = require('../utils/tradebot');
const { isValidOffer } = require('../validations/trade.validation');

const schema = joi.object().keys({
  market_hash_name: joi.string().required(),
  tradable: joi.boolean().required(),
  marketRate: [joi.number(), joi.string()],
});

exports.getUserInfo = async (req, res, next) => {
  try {
    const steamId = req.params.steamid;
    const responseFromAPI = await fetch(configs.API.steam.getUserInfo(steamId));
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
      configs.API.steam.getInventoryUrl(steamId)
    );
    if (inventoryResponse.ok && inventoryResponse.status === 200) {
      const inventory = await inventoryResponse.json();
      const result = await DotaItem.getInfoMultiItems(inventory.assets, inventory.descriptions);
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
      configs.API.steam.getInventoryUrl(configs.botList[botId])
    );
    if (inventoryResponse.ok && inventoryResponse.status === 200) {
      const inventory = await inventoryResponse.json();
      const result = await DotaItem.getInfoMultiItems(inventory.assets, inventory.descriptions);
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
    minPrice = !isNaN(parseFloat(minPrice)) /* eslint-disable-line */
      ? parseFloat(minPrice)
      : 0;
    maxPrice = !isNaN(parseFloat(maxPrice)) /* eslint-disable-line */
      ? parseFloat(maxPrice)
      : parseFloat(configs.maxPrice);

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
    const total = await DotaItem.countDocWithFilter({
      search: market_hash_name,
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
      total,
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
      await DotaItem.findOneAndUpdate(
        {
          marketHashName: doc.marketHashName,
        },
        {
          tradable: doc.tradable,
          marketRate: doc.marketRate,
          overstock: doc.overstock,
          volumn: doc.volumn,
        },
        {
          new: true,
        }
      ).exec();
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
  if (req.body.secret !== configs.admin.jobSchedulerSecret) {
    return res.status(401).json({
      success: false,
    });
  }
  try {
    const responseFromAPI = await fetch(configs.API.steam.getAllSkinInGame());
    if (responseFromAPI.ok && responseFromAPI.status === 200) {
      const dotaItemsStore = await responseFromAPI.json();
      await _.each(dotaItemsStore.data, doc => {
        DotaItem.findOneAndUpdate(
          {
            marketHashName: doc.market_hash_name,
          },
          {
            hero: doc.hero || '',
            rarity: doc.rarity || '',
            image: doc.image,
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
            updateAt: Date.now(),
          },
          {
            setDefaultsOnInsert: true,
            upsert: true,
            new: true,
          }
        ).exec();
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
      tradeUrl, playerItems, botItems, userId,
    } = req.body;
    if (getOfferStatus(userId) === 'pending') {
      return res.status(400).json({
        success: false,
        message: 'You have 1 pending offer, please wait',
      });
    }
    if (getOfferStatus(userId) === 'started') {
      return res.status(400).json({
        success: false,
        message: 'You have 1 processing offer, please wait',
      });
    }
    if (!tradeUrl || typeof tradeUrl !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Trade Url must be provided',
      });
    }
    if (await isValidOffer(playerItems, botItems)) {
      bots[botId].addOfferToQueue({
        tradeUrl, playerItems, botItems, userId,
      });
      return res.status(200).json({
        success: true,
      });
    }
    return res.status(400).json({
      success: false,
      message: 'invalid trade offer value',
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getUserOfferStatus = async (req, res) => {
  const { steamid } = req.params;
  if (steamid) {
    const status = getOfferStatus(steamid) || 'empty';
    res.status(200).json({
      status,
      success: true,
    });
    if (status === 'success' || status === 'fail') {
      removeStatus(steamid);
    }
  } else {
    res.status(400).json({
      success: false,
    });
  }
};
