const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

pool.connect()
  .then(client => {
    console.log('Connected to PostgreSQL Database');
    client.release();
  })
  .catch(err => {
    console.error('Database connection error. Please ensure PostgreSQL is running and DATABASE_URL is correct.', err.message);
  });

module.exports = pool;
