// backend/tg_bot/db.js
// PostgreSQL database connection and queries

const { Pool } = require('pg');
const { DATABASE_URL } = require('./config');

let pool;

// Initialize database connection
function initDB() {
  if (!DATABASE_URL) {
    console.warn('⚠️  No DATABASE_URL found - wallet storage will not persist!');
    return null;
  }

  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('railway.app') ? { rejectUnauthorized: false } : false,
  });

  pool.on('error', (err) => {
    console.error('❌ Unexpected database error:', err);
  });

  console.log('✅ Database connection pool initialized');
  return pool;
}

// Create tables if they don't exist
async function createTables() {
  if (!pool) {
    console.warn('⚠️  Database not initialized, skipping table creation');
    return;
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS wallets (
        telegram_id BIGINT PRIMARY KEY,
        sol_address TEXT NOT NULL,
        privy_user_id TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_sol_address ON wallets(sol_address);
    `);
    
    console.log('✅ Database tables ready');
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  }
}

// Save or update wallet info
async function saveWallet(telegramId, solAddress, privyUserId = null) {
  if (!pool) {
    console.warn('⚠️  Database not available, wallet not saved');
    return false;
  }

  try {
    await pool.query(`
      INSERT INTO wallets (telegram_id, sol_address, privy_user_id, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (telegram_id) 
      DO UPDATE SET 
        sol_address = EXCLUDED.sol_address,
        privy_user_id = EXCLUDED.privy_user_id,
        updated_at = NOW()
    `, [telegramId, solAddress, privyUserId]);
    
    console.log(`✅ Saved wallet for Telegram user ${telegramId}`);
    return true;
  } catch (error) {
    console.error('❌ Error saving wallet:', error);
    return false;
  }
}

// Get wallet by Telegram ID
async function getWallet(telegramId) {
  if (!pool) {
    console.warn('⚠️  Database not available');
    return null;
  }

  try {
    const result = await pool.query(
      'SELECT * FROM wallets WHERE telegram_id = $1',
      [telegramId]
    );
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ Error fetching wallet:', error);
    return null;
  }
}

// Get wallet by Solana address
async function getWalletByAddress(solAddress) {
  if (!pool) {
    console.warn('⚠️  Database not available');
    return null;
  }

  try {
    const result = await pool.query(
      'SELECT * FROM wallets WHERE sol_address = $1',
      [solAddress]
    );
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ Error fetching wallet by address:', error);
    return null;
  }
}

// Close database connection (for graceful shutdown)
async function closeDB() {
  if (pool) {
    await pool.end();
    console.log('✅ Database connection closed');
  }
}

module.exports = {
  initDB,
  createTables,
  saveWallet,
  getWallet,
  getWalletByAddress,
  closeDB,
};

