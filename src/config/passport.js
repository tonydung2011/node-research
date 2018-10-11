const JwtStrategy = require('passport-jwt').Strategy;
const BearerStrategy = require('passport-http-bearer');
const { ExtractJwt } = require('passport-jwt');
const { jwtSecret } = require('./vars');
const authProviders = require('../api/services/authProviders');
const User = require('../api/models/user.model');
const SteamStrategy = require('passport-steam');

const jwtOptions = {
  secretOrKey: jwtSecret,
  jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme('Bearer'),
};

const steamOption = {
  returnURL: `${process.env.DOMAIN || process.env.IP || 'http://127.0.0.1:3000'}/v1/auth/steam/return`,
  realm: process.env.DOMAIN || process.env.IP || 'http://127.0.0.1:3000',
  apiKey: process.env.STEAM_API_KEY,
};

const jwt = async (payload, done) => {
  try {
    const user = await User.findById(payload.sub);
    if (user) return done(null, user);
    return done(null, false);
  } catch (error) {
    return done(error, false);
  }
};

const oAuth = service => async (token, done) => {
  try {
    const userData = await authProviders[service](token);
    const user = await User.oAuthLogin(userData);
    return done(null, user);
  } catch (err) {
    return done(err);
  }
};

exports.jwt = new JwtStrategy(jwtOptions, jwt);
exports.facebook = new BearerStrategy(oAuth('facebook'));
exports.google = new BearerStrategy(oAuth('google'));
exports.steam = new SteamStrategy(steamOption, authProviders.steam);
