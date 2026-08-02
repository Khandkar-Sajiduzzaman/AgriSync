// This file's ONLY job is to open a connection to MongoDB.
// Think of it like the mysqli_connect() call you'd put in a db.php file,
// except Mongoose manages the connection pool for you.

const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1); // stop the server if the DB won't connect
  }
};

module.exports = connectDB;
