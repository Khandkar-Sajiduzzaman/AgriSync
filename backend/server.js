// This is the entry point - the equivalent of starting up Apache/php-fpm,
// except here WE write the server itself using Express.

const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);


require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const userRoutes = require("./routes/userRoutes");

connectDB(); // open the MongoDB connection

const app = express();

app.use(cors()); // allow the React frontend (different port) to call this API
app.use(express.json()); // parse incoming JSON bodies, like reading php://input
app.use("/uploads", express.static("uploads")); // serve uploaded images as static files

// any request to /api/users/* is handled by userRoutes.js
app.use("/api/users", userRoutes);

app.get("/", (req, res) => {
  res.send("AgriSync API is running");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
