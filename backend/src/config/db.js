const { Pool } = require('pg');
require('dotenv').config();

console.log("DB URL:", process.env.DATABASE_URL ? "Set (Hidden for security)" : "NOT SET");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000, // Increased for Neon cold start
});

const connectWithRetry = async (retries = 5, delay = 2000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect();
      console.log('PostgreSQL Connected ✅');
      client.release();
      return;
    } catch (err) {
      console.error(`PostgreSQL Connection Error ❌ (Attempt ${i + 1}/${retries}):`, err.message);
      if (i < retries - 1) {
        console.log(`Retrying in ${delay / 1000} seconds...`);
        await new Promise(res => setTimeout(res, delay));
      } else {
        console.error('Max retries reached. Exiting...');
        process.exit(1);
      }
    }
  }
};

connectWithRetry();

// Graceful shutdown
process.on('SIGINT', async () => {
  await pool.end();
  console.log('PostgreSQL pool closed.');
  process.exit(0);
});

module.exports = pool;

