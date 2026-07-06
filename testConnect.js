require('dotenv').config();
const { MongoClient } = require('mongodb');
const uri = process.env.MONGO_URI;
(async () => {
  try {
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    console.log('Connection succeeded');
    await client.db().admin().ping();
    console.log('Ping succeeded');
    await client.close();
  } catch (e) {
    console.error('Connection failed', e);
  }
})();
