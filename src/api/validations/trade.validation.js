const _ = require('lodash');
const DotaItem = require('../models/dotaItem.model');

exports.isValidOffer = async (playerItems, botItems) => {
  const userItemsInfo = await DotaItem.getMultiItemsInfoByName(_.map(playerItems, i => i.marketHashName));
  const botItemsInfo = await DotaItem.getMultiItemsInfoByName(_.map(botItems, i => i.marketHashName));
  return (
    _.sumBy(userItemsInfo, i => i.priceLast7d * i.marketRate) >=
    _.sumBy(botItemsInfo, i => i.priceLast7d)
  );
};
