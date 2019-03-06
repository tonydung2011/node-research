const LRU = require('lru-cache');
const joi = require('joi');
const configs = require('../../config/vars');

const options = {
  max: configs.cache.maxCache,
  length: (value, key) => key.length,
  maxAge: configs.cache.timeToLiveLong,
};
const cache = new LRU(options);
exports.validStatus = string =>
  joi
    .string()
    .regex('started|pending|success|fail', 'offer_status')
    .validate(string) === null;

exports.addToQueue = userId => {
  cache.set(userId, 'pending');
};
exports.proccessOffer = userId => {
  cache.set(userId, 'started');
};
exports.offerSendSuccess = userId => {
  cache.set(userId, 'success');
};
exports.offerSendFail = userId => {
  cache.set(userId, 'fail');
};
exports.getOfferStatus = userId => cache.get(userId);
exports.removeStatus = userId => cache.del(userId);
