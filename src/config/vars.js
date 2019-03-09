const path = require('path');

// import .env variables
require('dotenv-safe').load({
  path: path.join(__dirname, '../../.env'),
  sample: path.join(__dirname, '../../.env.example'),
});

module.exports = {
  domain: process.env.DOMAIN,
  env: process.env.NODE_ENV,
  port: process.env.PORT,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpirationInterval: process.env.JWT_EXPIRATION_MINUTES,
  maxPrice: process.env.MAX_PRICE,
  mongo: {
    uri: process.env.NODE_ENV === 'test'
      ? process.env.MONGO_URI_TESTS
      : process.env.MONGO_URI,
  },
  logs: process.env.NODE_ENV === 'production' ? 'combined' : 'dev',
  API: {
    steam: {
      getImgUrl: pathFile => `https://steamcommunity-a.akamaihd.net/economy/image/${pathFile}`,
      getInventoryUrl: steamid => `http://steamcommunity.com/inventory/${steamid}/${process.env.DOTA2_ID}/${process.env.DOTA2_CONTEXT}`,
      getInventoryUrl2: steamid => `http://api.steampowered.com/IEconItems_570/GetPlayerItems/v1/?key=${process.env.STEAM_API_KEY}&language=english&steamid=${steamid}`,
      getInventoryUrlFromSteamApis: steamid => `http://api.steamapis.com/steam/inventory/${steamid}/${process.env.DOTA2_ID}/${process.env.DOTA2_CONTEXT}?api_key=${process.env.STEAM_API_KEY}`,
      getAllSkinInGame: () => `http://api.steamapis.com/market/items/${process.env.DOTA2_ID}?api_key=${process.env.STEAM_API_KEY}`,
      getUserInfo: steamid => `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${process.env.STEAM_POWERED_API_KEY}&format=json&steamids=${steamid}`,
    },
  },
  whitelistOrigin: JSON.parse(process.env.WHITE_LIST_ORIGIN),
  botList: JSON.parse(process.env.BOTS),
  botCredentials: {
    botNames: JSON.parse(process.env.STEAM_BOT_NAME),
    botPasswords: JSON.parse(process.env.STEAM_BOT_PASSWORD),
  },
  cache: {
    maxCache: parseInt(process.env.MAX_CACHE, 10),
    timeToLiveShort: 1000 * 60 * 60 * 24,
    timeToLiveLong: 1000 * 60 * 60 * 24 * 30,
    keyFormat: {
      steamItem: 'steam_item',
      tradeId: 'trade_id',
    }
  },
  admin: {
    defaultEmail: process.env.ADMIN_NAME,
    defaultPassword: process.env.ADMIN_PASSWORD,
    jobSchedulerSecret: process.env.JOB_SCHEDULER_SECRET,
  }
};
