const Firestore = require('@google-cloud/firestore');
const path = require('path');

const db = new Firestore({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  keyFilename: path.join(__dirname, '../../../credentials.json'),
});

const settings = {
  timestampsInSnapshots: true,
};
db.settings(settings);

const dotaItems = db.collection('dota-items');

export const getItems = (index, limit) => new Promise((resolve, reject) =>
  dotaItems.orderBy('market_hash_name').startAt(index).limit(limit).get()
    .then(snapshot => resolve(snapshot.docs))
    .catch(() => reject()));
