// backend/state.js

// tudo EM MEMÓRIA por enquanto
const communities = {};
const adminsCommunities = {};
const pendingCustomWeight = {};
const draftProposal = {};
const waitingMyVoteSelection = {};
const pendingSetWeight = {};

// Wallet creation state tokens (Map for better expiration handling)
const pendingWalletStates = new Map();

// Note: User wallets are now stored in PostgreSQL (see db.js)

module.exports = {
  communities,
  adminsCommunities,
  pendingCustomWeight,
  draftProposal,
  waitingMyVoteSelection,
  pendingSetWeight,
  pendingWalletStates,
};
