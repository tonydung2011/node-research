const LRU = require('lru-cache');
const config = require('../config/vars');

const steamItemOption = {
  length: (n, key) => n.length + key.length,
  maxAge: config.cache.timeToLiveShort,
};
const steamCache = new LRU(steamItemOption);

export const getSteamItem = id => {
  const key = `${config.cache.keyFormat.steamItem}/${id}`;
  const value = steamCache.get(key);
  if (value) {
    return JSON.parse(value);
  }
  return value;
};

export const setSteamItem = (id, value) => {
  const key = `${config.cache.keyFormat.steamItem}/${id}`;
  steamCache.set(key, JSON.stringify(value));
};
