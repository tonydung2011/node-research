// make bluebird default Promise
Promise = require('bluebird'); // eslint-disable-line no-global-assign
const { port, env, admin } = require('./config/vars');
const app = require('./config/express');
const mongoose = require('./config/mongoose');
const User = require('./api/models/user.model');

// open mongoose connection
mongoose.connect();

// add default admin

User.findOne({ email: admin.defaultEmail }, (err, doc) => {
  if (err || !doc) {
    new User({
      email: admin.defaultEmail,
      password: admin.defaultPassword,
      role: 'admin',
    }).save();
  }
});

// listen to requests
app.listen(port, '0.0.0.0', () => console.info(`server started on port ${port} (${env})`));

/**
* Exports express
* @public
*/
module.exports = app;
