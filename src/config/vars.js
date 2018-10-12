const path = require('path');

// import .env variables
require('dotenv-safe').load({
  path: path.join(__dirname, '../../.env'),
  sample: path.join(__dirname, '../../.env.example'),
});

module.exports = {
  env: process.env.NODE_ENV,
  port: process.env.PORT,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpirationInterval: process.env.JWT_EXPIRATION_MINUTES,
  mongo: {
    uri: process.env.NODE_ENV === 'test'
      ? process.env.MONGO_URI_TESTS
      : process.env.MONGO_URI,
  },
  logs: process.env.NODE_ENV === 'production' ? 'combined' : 'dev',
  API: {
    steam: {
      getImgUrl: pathFile => `https://steamcommunity-a.akamaihd.net/economy/image/${pathFile}`,
      getInventoryUrl: steamid => `http://steamcommunity.com/inventory/${steamid}/570/2`,
      getInventoryUrl2: steamid => `http://api.steampowered.com/IEconItems_570/GetPlayerItems/v1/?key=${process.env.STEAM_API_KEY}&language=english&steamid=${steamid}`,
    },
  },
};
