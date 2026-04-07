require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const pemPath = path.join(__dirname, '../global-bundle.pem');

const sslConfig = fs.existsSync(pemPath)
  ? { ca: fs.readFileSync(pemPath) }
  : { rejectUnauthorized: true }; // fallback: validate using system CA bundle

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'family_game',
  ssl: sslConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;
