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
    // Wallets table
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

    // Communities (Telegram groups)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS communities (
        chat_id BIGINT PRIMARY KEY,
        title TEXT NOT NULL,
        admin_id BIGINT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Voters (members with voting rights in specific communities)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS voters (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT NOT NULL,
        chat_id BIGINT NOT NULL REFERENCES communities(chat_id) ON DELETE CASCADE,
        username TEXT,
        first_name TEXT,
        weight INTEGER DEFAULT 1,
        approved BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(telegram_id, chat_id)
      );
      CREATE INDEX IF NOT EXISTS idx_voters_chat ON voters(chat_id);
      CREATE INDEX IF NOT EXISTS idx_voters_telegram ON voters(telegram_id);
    `);

    // Proposals (votes/ballots)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS proposals (
        id TEXT PRIMARY KEY,
        chat_id BIGINT NOT NULL REFERENCES communities(chat_id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        options JSONB NOT NULL,
        status TEXT DEFAULT 'open',
        created_by BIGINT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        closed_at TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_proposals_chat ON proposals(chat_id);
      CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
    `);

    // Individual votes
    await pool.query(`
      CREATE TABLE IF NOT EXISTS votes (
        id SERIAL PRIMARY KEY,
        proposal_id TEXT NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
        telegram_id BIGINT NOT NULL,
        option_index INTEGER NOT NULL,
        weight_at_vote_time INTEGER NOT NULL,
        voted_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(proposal_id, telegram_id)
      );
      CREATE INDEX IF NOT EXISTS idx_votes_proposal ON votes(proposal_id);
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

// ============================================
// COMMUNITY FUNCTIONS
// ============================================

async function createCommunity(chatId, title, adminId = null) {
  if (!pool) return null;
  try {
    const result = await pool.query(`
      INSERT INTO communities (chat_id, title, admin_id, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (chat_id) 
      DO UPDATE SET 
        title = EXCLUDED.title,
        admin_id = COALESCE(EXCLUDED.admin_id, communities.admin_id),
        updated_at = NOW()
      RETURNING *
    `, [chatId, title, adminId]);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error creating/updating community:', error);
    return null;
  }
}

async function getCommunity(chatId) {
  if (!pool) return null;
  try {
    const result = await pool.query('SELECT * FROM communities WHERE chat_id = $1', [chatId]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ Error fetching community:', error);
    return null;
  }
}

async function updateCommunityAdmin(chatId, adminId) {
  if (!pool) return false;
  try {
    await pool.query(
      'UPDATE communities SET admin_id = $1, updated_at = NOW() WHERE chat_id = $2',
      [adminId, chatId]
    );
    return true;
  } catch (error) {
    console.error('❌ Error updating admin:', error);
    return false;
  }
}

async function getAllCommunitiesForAdmin(adminId) {
  if (!pool) return [];
  try {
    const result = await pool.query('SELECT * FROM communities WHERE admin_id = $1', [adminId]);
    return result.rows;
  } catch (error) {
    console.error('❌ Error fetching admin communities:', error);
    return [];
  }
}

// ============================================
// VOTER FUNCTIONS
// ============================================

async function addVoter(chatId, telegramId, username = null, firstName = null) {
  if (!pool) return null;
  try {
    const result = await pool.query(`
      INSERT INTO voters (chat_id, telegram_id, username, first_name, updated_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (telegram_id, chat_id) 
      DO UPDATE SET 
        username = EXCLUDED.username,
        first_name = EXCLUDED.first_name,
        updated_at = NOW()
      RETURNING *
    `, [chatId, telegramId, username, firstName]);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error adding voter:', error);
    return null;
  }
}

async function getVoter(chatId, telegramId) {
  if (!pool) return null;
  try {
    const result = await pool.query(
      'SELECT * FROM voters WHERE chat_id = $1 AND telegram_id = $2',
      [chatId, telegramId]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ Error fetching voter:', error);
    return null;
  }
}

async function approveVoter(chatId, telegramId) {
  if (!pool) return false;
  try {
    await pool.query(
      'UPDATE voters SET approved = true, updated_at = NOW() WHERE chat_id = $1 AND telegram_id = $2',
      [chatId, telegramId]
    );
    return true;
  } catch (error) {
    console.error('❌ Error approving voter:', error);
    return false;
  }
}

async function setVoterWeight(chatId, telegramId, weight) {
  if (!pool) return false;
  try {
    await pool.query(
      'UPDATE voters SET weight = $1, updated_at = NOW() WHERE chat_id = $2 AND telegram_id = $3',
      [weight, chatId, telegramId]
    );
    return true;
  } catch (error) {
    console.error('❌ Error setting voter weight:', error);
    return false;
  }
}

async function getAllVotersInCommunity(chatId) {
  if (!pool) return [];
  try {
    const result = await pool.query(
      'SELECT * FROM voters WHERE chat_id = $1 ORDER BY created_at ASC',
      [chatId]
    );
    return result.rows;
  } catch (error) {
    console.error('❌ Error fetching voters:', error);
    return [];
  }
}

async function getApprovedVotersInCommunity(chatId) {
  if (!pool) return [];
  try {
    const result = await pool.query(
      'SELECT * FROM voters WHERE chat_id = $1 AND approved = true ORDER BY created_at ASC',
      [chatId]
    );
    return result.rows;
  } catch (error) {
    console.error('❌ Error fetching approved voters:', error);
    return [];
  }
}

// ============================================
// PROPOSAL FUNCTIONS
// ============================================

async function createProposal(proposalId, chatId, title, description, options, createdBy) {
  if (!pool) return null;
  try {
    const result = await pool.query(`
      INSERT INTO proposals (id, chat_id, title, description, options, created_by, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'open')
      RETURNING *
    `, [proposalId, chatId, title, description, JSON.stringify(options), createdBy]);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error creating proposal:', error);
    return null;
  }
}

async function getProposal(proposalId) {
  if (!pool) return null;
  try {
    const result = await pool.query('SELECT * FROM proposals WHERE id = $1', [proposalId]);
    if (result.rows[0]) {
      // Parse JSONB options back to array
      result.rows[0].options = result.rows[0].options;
    }
    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ Error fetching proposal:', error);
    return null;
  }
}

async function getOpenProposalsForCommunity(chatId) {
  if (!pool) return [];
  try {
    const result = await pool.query(
      "SELECT * FROM proposals WHERE chat_id = $1 AND status = 'open' ORDER BY created_at DESC",
      [chatId]
    );
    return result.rows;
  } catch (error) {
    console.error('❌ Error fetching open proposals:', error);
    return [];
  }
}

async function getAllProposalsForCommunity(chatId) {
  if (!pool) return [];
  try {
    const result = await pool.query(
      'SELECT * FROM proposals WHERE chat_id = $1 ORDER BY created_at DESC',
      [chatId]
    );
    return result.rows;
  } catch (error) {
    console.error('❌ Error fetching proposals:', error);
    return [];
  }
}

async function closeProposal(proposalId) {
  if (!pool) return false;
  try {
    await pool.query(
      "UPDATE proposals SET status = 'closed', closed_at = NOW() WHERE id = $1",
      [proposalId]
    );
    return true;
  } catch (error) {
    console.error('❌ Error closing proposal:', error);
    return false;
  }
}

// ============================================
// VOTE FUNCTIONS
// ============================================

async function castVote(proposalId, telegramId, optionIndex, weight) {
  if (!pool) return false;
  try {
    await pool.query(`
      INSERT INTO votes (proposal_id, telegram_id, option_index, weight_at_vote_time)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (proposal_id, telegram_id)
      DO UPDATE SET 
        option_index = EXCLUDED.option_index,
        weight_at_vote_time = EXCLUDED.weight_at_vote_time,
        voted_at = NOW()
    `, [proposalId, telegramId, optionIndex, weight]);
    return true;
  } catch (error) {
    console.error('❌ Error casting vote:', error);
    return false;
  }
}

async function getVote(proposalId, telegramId) {
  if (!pool) return null;
  try {
    const result = await pool.query(
      'SELECT * FROM votes WHERE proposal_id = $1 AND telegram_id = $2',
      [proposalId, telegramId]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ Error fetching vote:', error);
    return null;
  }
}

async function getAllVotesForProposal(proposalId) {
  if (!pool) return [];
  try {
    const result = await pool.query(
      'SELECT * FROM votes WHERE proposal_id = $1',
      [proposalId]
    );
    return result.rows;
  } catch (error) {
    console.error('❌ Error fetching votes:', error);
    return [];
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

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
  // Wallet functions
  saveWallet,
  getWallet,
  getWalletByAddress,
  // Community functions
  createCommunity,
  getCommunity,
  updateCommunityAdmin,
  getAllCommunitiesForAdmin,
  // Voter functions
  addVoter,
  getVoter,
  approveVoter,
  setVoterWeight,
  getAllVotersInCommunity,
  getApprovedVotersInCommunity,
  // Proposal functions
  createProposal,
  getProposal,
  getOpenProposalsForCommunity,
  getAllProposalsForCommunity,
  closeProposal,
  // Vote functions
  castVote,
  getVote,
  getAllVotesForProposal,
  // Utility
  closeDB,
};

