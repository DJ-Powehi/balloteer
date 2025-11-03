// components/ComparisonCard.jsx
"use client";

export default function ComparisonCard() {
  const rows = [
    { L1: "10 minutes", L2: "manual tally", R1: "5 seconds", R2: "instant DM poll" },
    { L1: "Need wallet", L2: "onboards slow", R1: "Just Telegram", R2: "no crypto req" },
    { L1: "Public votes", L2: "group pressure", R1: "Private DMs", R2: "anonymous weight" },
    { L1: "No proof", L2: "trust me bro", R1: "On-chain", R2: "verifiable final" },
  ];

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_15px_60px_rgba(0,0,0,0.35)] backdrop-blur">
      <div className="mb-4 flex items-center justify-between text-[11px] uppercase tracking-[0.28em]">
        <span className="text-white/40">Traditional</span>
        <span className="text-white/25">vs</span>
        <span className="text-white">Balloteer</span>
      </div>
      <div className="space-y-3">
        {rows.map((r, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-xl border border-white/5 bg-black/10 px-3 py-2"
          >
            <div className="text-white/45">
              <p className="text-[13px] font-medium">{r.L1}</p>
              <p className="text-[11px] text-white/25">{r.L2}</p>
            </div>
            <div className="text-right">
              <p className="text-[13px] font-semibold text-emerald-300">{r.R1}</p>
              <p className="text-[11px] text-white/30">{r.R2}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

