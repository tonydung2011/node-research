const _ = require('lodash');

exports.combineDescriptionAndAssets = (assets, descriptions) => _.map(descriptions, item => {
  const find = _.find(assets, i => i.instanceid === item.instanceid && i.classid === item.classid);
  return {
    ...item,
    assetid: find.assetid,
  };
});
