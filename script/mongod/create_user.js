db = db.getSiblingDB('admin');
db.auth('root', 'root_password');
db = db.getSiblingDB('tradewithme_database');
db.createUser({
  user: 'tradewithme_server',
  pwd: 'tradewithme_password',
  roles: [
    {
      role: 'readWrite',
      db: 'tradewithme_database'
    }
  ]
});