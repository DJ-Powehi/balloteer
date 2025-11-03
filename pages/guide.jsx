// pages/guide.jsx
import React from "react";

const Tag = ({ children }) => (
  <span className="inline-flex items-center rounded-full bg-slate-800/50 px-3 py-1 text-xs font-medium text-slate-100 border border-slate-700/40">
    {children}
  </span>
);

const Step = ({ title, desc }) => (
  <div className="rounded-2xl bg-slate-900/30 border border-slate-800 p-4">
    <p className="text-xs text-slate-400 mb-1">{title}</p>
    <p className="text-sm text-slate-50 leading-relaxed">{desc}</p>
  </div>
);

export default function GuidePage() {
  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-50 px-6 py-10">
      {/* header com logo (mesmo da home) */}
      <header className="absolute right-8 top-6 flex items-center gap-2 rounded-full bg-black/20 px-4 py-2 backdrop-blur">
        <img
          src="/edited.png"
          alt="Balloteer"
          className="h-9 w-9 rounded-full object-cover"
        />
        <span className="text-sm font-medium tracking-tight text-white/90">
          Balloteer
        </span>
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/60">
          beta
        </span>
      </header>

      <div className="max-w-5xl mx-auto space-y-10">
        {/* Header */}
        <div className="flex items-center justify-between gap-6">
          <div>
            <button
              onClick={() => history.back()}
              className="text-sm text-slate-400 hover:text-slate-100 transition"
            >
              ← Back
            </button>
            <h1 className="text-3xl font-semibold mt-2 tracking-tight">
              Balloteer Guide
            </h1>
            <p className="text-slate-300 mt-2 text-sm leading-relaxed max-w-2xl">
              Telegram voting bot for groups and DAOs. Admins create proposals in DM, voters
              receive private ballots, and the group only sees the final result (quorum +
              weighted).
            </p>
          </div>
          <div className="hidden md:flex gap-2">
            <Tag>Private ballots</Tag>
            <Tag>Weighted voters</Tag>
            <Tag>Quorum</Tag>
            <Tag>Final result posted</Tag>
          </div>
        </div>

        {/* Flow */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-50">
            How it works (5 steps)
          </h2>
          <div className="grid gap-4 md:grid-cols-5">
            <Step
              title="1. Add bot"
              desc="Add @balloteer_bot to your Telegram group and send /start in the group. First person = admin."
            />
            <Step
              title="2. Members join"
              desc="Members DM the bot and send /join. Admin gets an approval DM and can set weight (1, 3, custom)."
            />
            <Step
              title="3. Admin creates vote"
              desc="Admin (in DM) runs /new → title → options → quorum → duration → attachment → choose community."
            />
            <Step
              title="4. Private voting"
              desc="Bot DMs every approved voter with buttons (options). They can also run /myvote to change."
            />
            <Step
              title="5. Close & publish"
              desc="When deadline hits or admin runs /close, bot posts the final result to the group."
            />
          </div>
        </section>

        {/* Commands */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-50">
              Bot commands
            </h2>
            <p className="text-xs text-slate-400">
              real commands from your current bot code
            </p>
          </div>

          {/* /start */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5 space-y-3">
            <div className="flex justify-between items-start gap-4">
              <div>
                <p className="text-xs text-emerald-300 font-mono mb-1">
                  /start
                </p>
                <h3 className="text-slate-50 font-semibold">
                  Register community & greet users
                </h3>
              </div>
              <Tag>group + DM</Tag>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              <strong>In a group</strong>: creates/updates the community and sets the first user
              as admin. Also posts the “how it works” message. <strong>In DM</strong>: explains
              how to request access (/join) and what admins can do.
            </p>
            <p className="text-xs text-slate-500">
              Code: calls <code>ensureCommunity()</code>, links admin, initializes voter record.
            </p>
          </div>

          {/* /join */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5 space-y-3">
            <div className="flex justify-between items-start gap-4">
              <div>
                <p className="text-xs text-emerald-300 font-mono mb-1">
                  /join
                </p>
                <h3 className="text-slate-50 font-semibold">
                  Ask to become a voter
                </h3>
              </div>
              <Tag>DM only</Tag>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              User sends /join in private. The bot looks at <code>communities</code> and DMs
              every admin with an approval message. Admin can approve (1 weight, 3 weight,
              custom) or reject. Until the admin processes, <code>processed = false</code>.
            </p>
            <p className="text-xs text-slate-500">
              Admin sees inline buttons: <code>approve_..._1</code>, <code>approve_..._3</code>,{" "}
              <code>custom_...</code>, <code>reject_...</code>.
            </p>
          </div>

          {/* /new */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5 space-y-3">
            <div className="flex justify-between items-start gap-4">
              <div>
                <p className="text-xs text-emerald-300 font-mono mb-1">
                  /new
                </p>
                <h3 className="text-slate-50 font-semibold">
                  Create a proposal (multi-step)
                </h3>
              </div>
              <Tag>admin / DM</Tag>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              Starts a guided flow for admins: title → options → quorum → duration → attachment →
              choose community. At the end it sends an announcement to the group and DMs all
              approved voters with a ballot keyboard.
            </p>
            <p className="text-xs text-slate-500">
              Proposal object is saved in <code>communities[groupId].proposals</code> with{" "}
              <code>status = "open"</code>.
            </p>
            <pre className="bg-slate-950/60 rounded-xl p-3 text-xs text-slate-100 overflow-x-auto">
{`Example flow:
/new
→ "Budget approval Q4"
→ "Approve, Reject"
→ "30" (quorum) or "skip"
→ "60" (minutes)
→ "skip" (no file)
→ pick community → published`}
            </pre>
          </div>

          {/* /close */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5 space-y-3">
            <div className="flex justify-between items-start gap-4">
              <div>
                <p className="text-xs text-emerald-300 font-mono mb-1">
                  /close
                </p>
                <h3 className="text-slate-50 font-semibold">
                  Close an open proposal
                </h3>
              </div>
              <Tag>admin / DM</Tag>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              Lists all open proposals of the communities that the admin owns. Admin picks one,
              bot finalizes it and posts the result in the group using the same formatter as
              auto-close (with quorum + breakdown).
            </p>
            <p className="text-xs text-slate-500">
              Uses <code>finalizeProposal()</code> → calls{" "}
              <code>formatResultsSummaryForGroup()</code> and sends to the group.
            </p>
          </div>

          {/* /myvote */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5 space-y-3">
            <div className="flex justify-between items-start gap-4">
              <div>
                <p className="text-xs text-emerald-300 font-mono mb-1">
                  /myvote
                </p>
                <h3 className="text-slate-50 font-semibold">
                  See or change your vote
                </h3>
              </div>
              <Tag>DM / voter</Tag>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              Shows the user all open proposals where they are an approved voter with a weight.
              User taps the proposal and receives the same inline buttons to change the choice. If
              they already voted, the bot subtracts the old weight and adds the new one.
            </p>
            <p className="text-xs text-slate-500">
              Good for: “I didn’t get the DM”, “I want to update my vote”, “I joined later”.
            </p>
          </div>

          {/* /setweight */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5 space-y-3">
            <div className="flex justify-between items-start gap-4">
              <div>
                <p className="text-xs text-emerald-300 font-mono mb-1">
                  /setweight
                </p>
                <h3 className="text-slate-50 font-semibold">
                  Update a voter's weight (with reason)
                </h3>
              </div>
              <Tag>admin / DM</Tag>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              Interactive admin-only flow. Admin chooses the community → chooses the approved
              voter → sends the new weight → sends a reason. Bot updates the voter record and DMs
              the voter saying the weight changed.
            </p>
            <p className="text-xs text-slate-500">
              Stored in memory as <code>pendingSetWeight[adminId]</code> with steps{" "}
              <code>CHOOSE_COMMUNITY</code>, <code>CHOOSE_USER</code>, <code>ASK_WEIGHT</code>,{" "}
              <code>ASK_REASON</code>.
            </p>
          </div>

          {/* /help */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5 space-y-3">
            <div className="flex justify-between items-start gap-4">
              <div>
                <p className="text-xs text-emerald-300 font-mono mb-1">
                  /help
                </p>
                <h3 className="text-slate-50 font-semibold">Show available commands</h3>
              </div>
              <Tag>all users</Tag>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              Simple command to remind the group/admin/users what they can run. Useful for teams
              that won't open the web guide.
            </p>
          </div>

          {/* /connect */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5 space-y-3">
            <div className="flex justify-between items-start gap-4">
              <div>
                <p className="text-xs text-emerald-300 font-mono mb-1">
                  /connect
                </p>
                <h3 className="text-slate-50 font-semibold">
                  View or create your Solana wallet
                </h3>
              </div>
              <Tag>DM only</Tag>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              <strong>First time</strong>: Opens a secure link to create your private Solana wallet 
              via Privy (takes ~10 seconds). <strong>After creation</strong>: Shows your wallet 
              address. Your wallet is 100% private — only you have access. Required for future 
              on-chain voting features.
            </p>
            <p className="text-xs text-slate-500">
              Uses Privy authentication with Telegram. Wallet info stored securely. No private keys 
              are ever shared with the bot or stored on our servers.
            </p>
          </div>
        </section>

        {/* Notes */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-50">Notes</h2>
          <ul className="list-disc list-inside text-sm text-slate-300 space-y-1">
            <li>Votes are never shown in the group — only final aggregate.</li>
            <li>Quorum is optional (admin can “skip” when creating).</li>
            <li>Auto-close runs when a proposal’s time is passed.</li>
            <li>Tie/no-vote handling in results.</li>
            <li>Voters can change their vote until the proposal is closed.</li>
            <li>Admin can update a voter's weight (with reason) in DM.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
