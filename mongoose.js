// mongoose.js
const mongoose = require('mongoose');

module.exports = async function connectMongoDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI not defined');
  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ MongoDB connection successful');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    throw err;
  }
};