const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',             // Your MySQL username
  password: 'your_password', // Your MySQL password
  database: 'tourism_db',
  waitForConnections: true,
  connectionLimit: 10
});

module.exports = pool;