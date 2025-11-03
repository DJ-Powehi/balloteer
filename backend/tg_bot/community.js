// backend/community.js
const bot = require("./bot");
const {
  communities,
  adminsCommunities,
} = require("./state");

function ensureCommunity(groupId, titleMaybe) {
  if (!communities[groupId]) {
    communities[groupId] = {
      title: titleMaybe || `Community ${groupId}`,
      adminId: null,
      voters: {},
      proposals: [],
      proposalCounter: 1,
    };
  } else {
    if (titleMaybe && titleMaybe !== communities[groupId].title) {
      communities[groupId].title = titleMaybe;
    }
  }
  return communities[groupId];
}

function linkAdminToCommunity(adminId, groupId, title) {
  if (!adminsCommunities[adminId]) {
    adminsCommunities[adminId] = new Map();
  }
  adminsCommunities[adminId].set(groupId, { title });
}

function getOrInitVoterRecord(comm, fromUser) {
  const uid = fromUser.id;
  if (!comm.voters[uid]) {
    comm.voters[uid] = {
      approved: false,
      weight: null,
      processed: false,
      username: fromUser.username
        ? `@${fromUser.username}`
        : (fromUser.first_name || "Unknown"),
      walletAddress: null,
      lastChangeReason: null,
      lastModifiedAt: null,
    };
  } else {
    comm.voters[uid].username = fromUser.username
      ? `@${fromUser.username}`
      : (fromUser.first_name || comm.voters[uid].username);

    if (comm.voters[uid].processed === undefined) {
      comm.voters[uid].processed = false;
    }
  }
  return comm.voters[uid];
}

function isAdmin(comm, userId) {
  return comm.adminId !== null && comm.adminId === userId;
}

// ---- proposals helpers ----
function calcTotalWeight(proposal) {
  let totalWeight = 0;
  for (const idx in proposal.votes) {
    totalWeight += proposal.votes[idx];
  }
  return totalWeight;
}

function calcWinnerInfo(proposal) {
  const total = calcTotalWeight(proposal);
  const weights = proposal.options.map((_, idx) => proposal.votes[idx] || 0);
  let maxWeight = 0;
  weights.forEach((w) => {
    if (w > maxWeight) maxWeight = w;
  });

  const tiedIndexes = [];
  weights.forEach((w, idx) => {
    if (w === maxWeight) tiedIndexes.push(idx);
  });

  const breakdown = proposal.options.map((opt, idx) => {
    const w = weights[idx];
    const pct = total === 0 ? 0 : Math.round((w / total) * 100);
    return { label: opt, weight: w, pct };
  });

  let outcomeType;
  let winnerIdx = null;
  let winnerPct = 0;

  if (total === 0) {
    outcomeType = "no_votes";
  } else if (tiedIndexes.length === 1) {
    outcomeType = "winner";
    winnerIdx = tiedIndexes[0];
    winnerPct = breakdown[winnerIdx].pct;
  } else {
    outcomeType = "tie";
  }

  return {
    outcomeType,
    winnerIdx,
    winnerPct,
    total,
    breakdown,
    tiedIndexes,
  };
}

function formatResultsSummaryForGroup(proposal) {
  const {
    outcomeType,
    winnerIdx,
    winnerPct,
    total,
    breakdown,
    tiedIndexes,
  } = calcWinnerInfo(proposal);

  const quorumReached =
    proposal.quorumWeight === null
      ? true
      : total >= proposal.quorumWeight;

  let headline;
  if (outcomeType === "no_votes") {
    headline = "No votes were cast. No outcome could be determined.";
  } else if (outcomeType === "tie") {
    const tiedLabels = tiedIndexes.map((i) => `"${proposal.options[i]}"`).join(" and ");
    headline = `It’s a tie between ${tiedLabels}.\nNo single winner.`;
  } else {
    const winnerLabel = proposal.options[winnerIdx];
    headline = `🥇 Winner: "${winnerLabel}" with ${winnerPct}% of total voting weight`;
  }

  const lines = breakdown
    .map((b) => `• ${b.label} — ${b.pct}% (${b.weight} weight)`)
    .join("\n");

  return (
    `🏁 Voting Closed for: "${proposal.title}"\n\n` +
    `${headline}\n\n` +
    `📊 Turnout: ${total} total weight\n` +
    (proposal.quorumWeight !== null
      ? `Quorum: ${quorumReached ? "✅ reached" : `⚠️ not reached (${total} < ${proposal.quorumWeight})`}\n`
      : "") +
    `\nFinal Breakdown:\n${lines}\n\n` +
    `🔒 This vote is now final.`
  );
}

function isProposalOpenForVoting(proposal) {
  if (proposal.status !== "open") return false;
  if (proposal.endsAt !== null && Date.now() > proposal.endsAt) return false;
  return true;
}

async function finalizeProposal(comm, groupId, proposal) {
  proposal.status = "closed";
  const msg = formatResultsSummaryForGroup(proposal);
  try {
    await bot.api.sendMessage(groupId, msg);
  } catch (e) {
    console.error("Failed to post final summary:", e);
  }
}

async function autoCloseExpiredProposals(groupId) {
  const comm = communities[groupId];
  if (!comm) return;
  for (const proposal of comm.proposals) {
    if (proposal.status === "open") {
      if (proposal.endsAt !== null && Date.now() > proposal.endsAt) {
        await finalizeProposal(comm, groupId, proposal);
      }
    }
  }
}

module.exports = {
  ensureCommunity,
  linkAdminToCommunity,
  getOrInitVoterRecord,
  isAdmin,
  autoCloseExpiredProposals,
  finalizeProposal,
  calcTotalWeight,
  isProposalOpenForVoting,
  formatResultsSummaryForGroup,
};
