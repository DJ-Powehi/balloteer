// backend/state.js
// TEMPORARY workflow state (not persisted)
// All persistent data (communities, voters, proposals, votes, wallets) is now in PostgreSQL (see db.js)

// Temporary state for multi-step workflows
const pendingCustomWeight = {}; // Admin choosing custom weight during approval
const draftProposal = {}; // Admin creating a new proposal (title, options, etc.)
const waitingMyVoteSelection = {}; // User selecting which proposal to vote on
const pendingSetWeight = {}; // Admin changing voter weight (multi-step)

// Wallet creation state tokens (Map for better expiration handling)
const pendingWalletStates = new Map();

module.exports = {
  pendingCustomWeight,
  draftProposal,
  waitingMyVoteSelection,
  pendingSetWeight,
  pendingWalletStates,
};
