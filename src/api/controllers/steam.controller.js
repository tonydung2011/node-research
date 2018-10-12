const config = require('../../config/vars');
const fetch = require('node-fetch');
const _ = require('lodash');

exports.getUserInventory = async (req, res, next) => {
  try {
    const steamId = req.params.steamid;
    const dataFromComunity = await fetch(config.API.steam.getInventoryUrl(steamId));
    const dataFromSteamPowered = await fetch(config.API.steam.getInventoryUrl2(steamId));
    if (dataFromComunity.ok &&
      dataFromComunity.status === 200 &&
      dataFromSteamPowered.ok &&
      dataFromSteamPowered.status === 200
    ) {
      const dataFromComunityJson = await dataFromComunity.json();
      const dataFromSteamPoweredJson = await dataFromSteamPowered.json();
      /* eslint-disable-next-line */
      const result = _.map(dataFromSteamPoweredJson.result.items, ({ id, quantity }) => {
        const foundAssetItem = _.find(dataFromComunityJson.assets, comunityItem => comunityItem.assetid === id.toString());
        if (foundAssetItem) {
          const fonudDescriptionsItem = _.find(dataFromComunityJson.descriptions, comunityItem => comunityItem.classid === foundAssetItem.classid && comunityItem.instanceid === foundAssetItem.instanceid);
          return {
            ...fonudDescriptionsItem,
            quantity,
            icon_url: config.API.steam.getImgUrl(fonudDescriptionsItem.icon_url),
            icon_url_large: config.API.steam.getImgUrl(fonudDescriptionsItem.icon_url_large),
          };
        }
      });
      return res.status(200).json(result);
    }
    return res.status(400).send('Bad request');
  } catch (error) {
    return res.status(500).send('Internal server error');
  }
};
