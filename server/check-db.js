const mongoose = require('mongoose');

async function checkDB() {
  await mongoose.connect('mongodb://localhost:27017/fraud_db');
  console.log('Connected to MongoDB');
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  console.log('Collections:', collections.map(c => c.name));
  
  if (collections.some(c => c.name === 'users')) {
    const users = await db.collection('users').find({}).toArray();
    console.log('Users in DB:', users.map(u => ({ id: u._id, username: u.username, role: u.role })));
  } else {
    console.log('No users collection found.');
  }

  if (collections.some(c => c.name === 'transactions')) {
    const count = await db.collection('transactions').countDocuments();
    const sample = await db.collection('transactions').find({}).sort({ timestamp: -1 }).limit(3).toArray();
    console.log(`Transactions in DB: total ${count}, latest 3:`, sample);
  } else {
    console.log('No transactions collection found.');
  }

  if (collections.some(c => c.name === 'alertlogs')) {
    const alertCount = await db.collection('alertlogs').countDocuments();
    console.log(`AlertLogs in DB: total ${alertCount}`);
  }
  
  await mongoose.disconnect();
}

checkDB().catch(console.error);
