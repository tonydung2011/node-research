const fetch = require('node-fetch');
const _ = require('lodash');
const SteamUser = require('steam-user');
const SteamTotp = require('steam-totp');
const SteamCommunity = require('steamcommunity');
const moment = require('moment');
const TradeOfferManager = require('steam-tradeoffer-manager');
const Queue = require('better-queue');
const configs = require('../../config/vars');
const steamGuardCredentials = require('../../../botCredentials.json');
const {
  addToQueue,
  proccessOffer,
  offerSendSuccess,
  offerSendFail,
} = require('./memcache');

const botList = {};

function TradeBot(props) {
  this.botClient = new SteamUser();
  this.botManager = undefined;
  this.botCommunity = undefined;
  this.isEmpty = true;

  this.createOffer = ({
    tradeUrl, playerItems, botItems, userId
  }, cb = () => {}) => {
    const offer = this.botManager.createOffer(tradeUrl);
    _.each(playerItems, item => {
      offer.addTheirItem({
        assetid: item.assetid,
        appid: 570,
        contextid: 2,
      });
    });
    _.each(botItems, item => {
      offer.addMyItem({
        assetid: item.assetid,
        appid: 570,
        contextid: 2,
      });
    });
    offer.setMessage(`This is an offer come from tradewithme.online. Offer created time: ${moment()
      .utc()
      .format('dddd, MMMM Do YYYY, h:mm:ss a')}`);
    offer.send((err) => {
      if (err) {
        offerSendFail(userId);
        cb(err);
      } else {
        this.botCommunity.acceptConfirmationForObject(
          steamGuardCredentials.value[props.index].identity_secret,
          offer.id,
          errConfirm => {
            if (errConfirm) {
              cb(errConfirm);
              offerSendFail(userId);
            } else {
              cb();
              offerSendSuccess(userId);
            }
          }
        );
      }
    });
  };

  this.offerProccess = async (input, cb = () => {}) => {
    proccessOffer(input.userId);
    try {
      let botInventory = [];
      let userInventory = [];
      const botInventoryResponse = await fetch(
        configs.API.steam.getInventoryUrl(configs.botList[props.index])
      );
      const userInventoryResponse = await fetch(
        configs.API.steam.getInventoryUrl(input.userId),
      );
      if (botInventoryResponse.ok && botInventoryResponse.status === 200) {
        botInventory = await botInventoryResponse.json();
      }
      if (userInventoryResponse.ok && userInventoryResponse.status === 200) {
        userInventory = await userInventoryResponse.json();
      }
      if (_.differenceBy(input.playerItems, userInventory.assets, 'assetid').length > 0) {
        offerSendFail(input.userId);
        cb(new Error('There are some items of user no longer owned'));
        return;
      }
      if (_.differenceBy(input.botItems, botInventory.assets, 'assetid').length > 0) {
        offerSendFail(input.userId);
        cb(new Error('There are some items of bot no longer owned'));
        return;
      }
      if (this.isEmpty) {
        this.isEmpty = false;
        const logOnOption = {
          accountName: configs.botCredentials.botNames[props.index],
          password: configs.botCredentials.botPasswords[props.index],
          twoFactorCode: SteamTotp.getAuthCode(
            steamGuardCredentials.value[props.index].shared_secret
          ),
        };
        this.botClient.logOff();
        this.botClient.logOn(logOnOption);
        this.botClient.on('webSession', (webSession, cookies) => {
          this.botCommunity = new SteamCommunity();
          this.botCommunity.setCookies(cookies);
          this.botManager = new TradeOfferManager({
            community: this.botCommunity,
            steam: this.botClient,
            domain: configs.domain,
            language: 'en',
          });
          this.createOffer(input, cb);
        });
      } else {
        this.createOffer(input, cb);
      }
    } catch (error) {
      cb(error);
    }
  };

  this.logout = () => {
    if (this.botManager instanceof TradeOfferManager) {
      this.botManager.shutdown();
    }
    this.botClient.logOff();
    this.isEmpty = true;
  };

  this.botQueue = new Queue(this.offerProccess, {
    afterProcessDelay: configs.tradeBot.afterProcessDelay,
    id: 'userId',
  });
  this.botQueue.on('drain', this.logout);


  this.addOfferToQueue = (input, cb = () => {}) => {
    this.botQueue.push(input, cb);
    addToQueue(input.userId);
  };

  return this;
}

_.each(configs.botList, (id, index) => {
  botList[index] = new TradeBot({ index });
});

module.exports = botList;
