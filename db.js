const mysql = require('mysql2/promise');
require('dotenv').config(); // Load environment variables from .env file

const pool = mysql.createPool({
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  ssl : {"rejectUnauthorized":true}});

module.exports = pool;
