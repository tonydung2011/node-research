const configs = require('../../config/vars');
const _ = require('lodash');
const mongoose = require('mongoose');
const moment = require('moment-timezone');
const { combineDescriptionAndAssets } = require('../utils/utils');

/**
 * Dota Item Schema
 * @private
 */
const dotaItemSchema = new mongoose.Schema({
  hero: String,
  image: String,
  marketRate: {
    type: Number,
    default: 1,
  },
  marketHashName: {
    type: String,
    required: true,
  },
  marketName: {
    type: String,
    required: true,
  },
  overstock: {
    type: Number,
    default: null,
  },
  priceLast24h: Number,
  priceLast7d: Number,
  priceLast30d: Number,
  priceLatest: Number,
  priceMax: Number,
  priceMin: Number,
  priceSafe: Number,
  sold4h: Number,
  sold7d: Number,
  sold30d: Number,
  unstable: Boolean,
  unstableReason: String,
  quality: String,
  rarity: String,
  tradable: {
    type: Boolean,
    default: true,
  },
  updateAt: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

/**
 * Add your
 * - pre-save hooks
 * - validations
 * - virtuals
 */
dotaItemSchema.pre('save', async function (next) {
  this.updateAt = moment().toString();
  next();
});
dotaItemSchema.pre('findOneAndUpdate', async function (next) {
  this.updateAt = moment().toString();
  next();
});
dotaItemSchema.pre('update', async function (next) {
  this.updateAt = moment().toString();
  next();
});

/**
 * Statics
 */
dotaItemSchema.statics.searchDocWithFilter = function (filter = {}) {
  const defaultFilter = {
    search: '',
    limit: 10,
    page: 1,
    rarity: '',
    hero: '',
    minPrice: 0,
    maxPrice: configs.maxPrice,
    order: 'marketHashName',
  };
  const newFilter = _.merge(defaultFilter, filter);
  return this.find({
    priceLast7d: { $gte: newFilter.minPrice, $lte: newFilter.maxPrice },
  })
    .where('marketHashName')
    .regex(new RegExp(newFilter.search))
    .where('rarity')
    .regex(new RegExp(newFilter.rarity))
    .where('hero')
    .regex(new RegExp(newFilter.hero))
    .sort(newFilter.order)
    .limit(newFilter.limit)
    .skip((newFilter.page - 1) * newFilter.limit);
};
dotaItemSchema.statics.countDocWithFilter = function (filter = {}) {
  const defaultFilter = {
    search: '',
    rarity: '',
    hero: '',
    minPrice: 0,
    maxPrice: configs.maxPrice,
  };
  const newFilter = _.merge(defaultFilter, filter);
  return this.count({
    priceLast7d: { $gte: newFilter.minPrice, $lte: newFilter.maxPrice },
  })
    .where('marketHashName')
    .regex(new RegExp(newFilter.search))
    .where('rarity')
    .regex(new RegExp(newFilter.rarity))
    .where('hero')
    .regex(new RegExp(newFilter.hero));
};

dotaItemSchema.statics.findByName = function (name) {
  return this.findOne({ marketHashName: name });
};

dotaItemSchema.statics.getInfoMultiItems = async function (
  assets,
  descriptions
) {
  return _.filter(
    await Promise.all(
      _.map(combineDescriptionAndAssets(assets, descriptions), skin =>
        this.findByName(skin.market_hash_name).then(found =>
          (found
            ? {
              ...found._doc,
              tags: skin.tags,
              assetid: skin.assetid,
              marketMarketableRestriction: skin.market_marketable_restriction,
              price: found._doc.priceLast7d * found._doc.marketRate,
            }
            : null)
        )
      )
    ),
    d => d
  );
};

dotaItemSchema.statics.getMultiItemsInfoByName = async function (
  marketHashNames
) {
  return _.filter(
    await Promise.all(
      _.map(marketHashNames, name =>
        this.findByName(name).then(found =>
          (found
            ? {
              ...found._doc,
              price: found._doc.priceLast7d * found._doc.marketRate,
            }
            : null)
        )
      )
    ),
    d => d
  );
};

dotaItemSchema.index({
  marketHashName: 1,
});
dotaItemSchema.index({
  priceLast7d: 1,
  marketHashName: 'text',
  rarity: 'text',
  hero: 'text',
});

/**
 * @typedef DotaItem
 */
module.exports = mongoose.model('DotaItem', dotaItemSchema);
