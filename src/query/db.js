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

const dotaItemsInfo = db.collection('dota-items-info');

export const getSteamItem = id =>
  new Promise((resolve) =>
    dotaItemsInfo
      .get()
      .then(snapshot => {
        const doc = snapshot.doc(id);
        if (doc.exists) {
          return resolve(doc.data());
        }
        return resolve(undefined);
      })
      .catch(() => resolve(null))
  );
