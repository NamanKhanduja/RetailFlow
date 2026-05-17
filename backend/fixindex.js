require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  try {
    await mongoose.connection.collection('sales').dropIndexes();
    console.log('✅ Sales collection indexes dropped successfully.');
  } catch (e) {
    console.log('ℹ️  No stale indexes to drop:', e.message);
  }
  process.exit(0);
}).catch(e => {
  console.error('❌ Connection error:', e.message);
  process.exit(1);
});
