const LRU = require('lru-cache');
const _ = require('lodash');
const config = require('../config/vars');

const steamItemOption = {
  length: (n, key) => n.length + key.length,
  maxAge: config.cache.timeToLiveShort,
};
const dbOption = {
  length: (n, key) => n.length + key.length,
  maxAge: config.cache.timeToLiveMedium,
};
const steamCache = new LRU(steamItemOption);
const dbCache = new LRU(dbOption);
const steamIndexCache = new LRU(steamItemOption);
const dbIndexCache = new LRU(dbOption);

export const getSteamItems = (index, limit = config.cache.limit) => {
  const key = `${config.cache.keyFormat.listItems}/${index}-${limit}`;
  const value = steamCache.get(key);
  if (value) {
    return JSON.parse(value);
  }
  return value;
};

export const setSteamItems = (index, value, limit = config.cache.limit) => {
  const itemKey = `${config.cache.keyFormat.listItems}/${index}-${limit}`;
  const indexKey = `${config.cache.keyFormat.listItemsIndex}/${index}-${limit}`;
  steamCache.set(itemKey, JSON.stringify(value));
  steamIndexCache.set(indexKey, value[0].market_hash_name);
};

export const isSteamCacheCover = (name) => {
  const keysArry = steamIndexCache.keys();
  return _.findIndex(keysArry, key => name >= steamIndexCache.get(key)) !== -1;
};

export const getDBItems = (index, limit = config.cache.limit) => {
  const key = `${config.cache.keyFormat.dbItems}/${index}-${limit}`;
  const value = dbCache.get(key);
  if (value) {
    return JSON.parse(value);
  }
  return value;
};

export const setDBItems = (index, value, limit = config.cache.limit) => {
  const itemKey = `${config.cache.keyFormat.dbItems}/${index}-${limit}`;
  const indexKey = `${config.cache.keyFormat.dbItemsIndex}/${index}-${limit}`;
  dbCache.set(itemKey, JSON.stringify(value));
  dbIndexCache.set(indexKey, value[0].market_hash_name);
};

export const isDBCacheCover = (name) => {
  const keysArry = dbIndexCache.keys();
  return _.findIndex(keysArry, key => name >= dbIndexCache.get(key)) !== -1;
};
