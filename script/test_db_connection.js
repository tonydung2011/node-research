const Firestore = require('@google-cloud/firestore');
const path = require('path');

const db = new Firestore({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  keyFilename: path.join(__dirname, '../credentials.json'),
});
const settings = {
  timestampsInSnapshots: true,
};
db.settings(settings);
const adminDB = db.collection('admin');

(async function () {
  const databaseSnapshot = await adminDB.get();
  databaseSnapshot.forEach((doc) => {
    console.log('doc', doc.data());
  });
}());
