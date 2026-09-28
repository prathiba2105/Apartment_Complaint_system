const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({path:path.resolve(__dirname, '../.env')});

const connectDB = async () => {
  try {
    console.log('MONGO_URI loaded:',process.env.MONGO_URI ? 'Yes' : 'No');
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 30000,
    });
    console.log(`MongoDB Atlas Connected: ${conn.connection.host}`);
    console.log('MongoDB Host:', mongoose.connection.host);
    console.log('MongoDB Database:', mongoose.connection.name);
    return conn;
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
