const config = require('../../config/vars');
const fetch = require('node-fetch');
const _ = require('lodash');
const Firestore = require('@google-cloud/firestore');
const path = require('path');

const db = new Firestore({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  keyFilename: path.join(__dirname, '../../../credentials.json'),
});
const settings = {
  timestampsInSnapshots: true,
};
db.settings(settings);
const dotaItems = db.collection('dota-items');

exports.getUserstore = async (req, res, next) => {
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

exports.getUserInventoryFromSteamapis = async (req, res, next) => {
  try {
    const steamId = req.params.steamid;
    const responseFromAPI = await fetch(config.API.steam.getInventoryUrlFromSteamApis(steamId));
    if (responseFromAPI.ok &&
      responseFromAPI.status === 200
    ) {
      const inventory = await responseFromAPI.json();
      const result = inventory.description.map(skin => ({
        ...skin,
        icon_url: config.API.steam.getImgUrl(skin.icon_url),
        icon_url_large: config.API.steam.getImgUrl(skin.icon_url_large),
      }));
      return res.status(200).json(result);
    }
    return res.status(400).send('Bad request');
  } catch (error) {
    return res.status(500).send('Internal server error');
  }
};

exports.getAllSkinInGame = async (req, res, next) => {
  try {
    const responseFromAPI = await fetch(config.API.steam.getAllSkinInGame());
    if (responseFromAPI.ok &&
      responseFromAPI.status === 200
    ) {
      const dotaItemsStore = await responseFromAPI.json();
      const dotaItemsDB = [];
      const databaseSnapshot = await dotaItems.get();
      databaseSnapshot.forEach(doc => dotaItemsDB.push(doc.data()));
      const dotaItemsBussiness = _.map(_.take(dotaItemsStore.data, 20), (item) => {
        const itemFromDB = _.find(dotaItemsDB, doc => doc.market_hash_name === item.market_hash_name);
        if (itemFromDB) {
          return {
            ...item,
            marketRate: itemFromDB.marketRate,
            tradable: itemFromDB.tradable,
          };
        }
        return {
          ...item,
          marketRate: 1,
          tradable: true,
        };
      });
      return res.status(200).json({
        appId: responseFromAPI.appID,
        context: responseFromAPI.part,
        success: true,
        data: dotaItemsBussiness,
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
