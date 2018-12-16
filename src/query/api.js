const fetch = require('node-fetch');
const config = require('../config/vars');

export const getAllItems = () => new Promise(resolve =>
  fetch(config.API.steam.getAllSkinInGame())
    .then(res => res.json())
    .then(data => resolve(data)));

export const getInventory = steamid => new Promise(resolve =>
  fetch(config.API.steam.getInventoryUrl(steamid))
    .then(res => res.json())
    .then(data => resolve(data)));
