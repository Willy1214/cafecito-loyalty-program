// config/squareClient.js
const { Client, Environment } = require("square");
require("dotenv").config();

const client = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  environment:
    process.env.SQUARE_ENV === "production"
      ? Environment.Production
      : Environment.Sandbox,
});

module.exports = client;