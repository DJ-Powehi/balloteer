// pages/index.jsx
import Link from "next/link";
import PrivyLogin from "@/components/PrivyLogin";
import CreateSolanaWallet from "@/components/CreateSolanaWallet";
import ComparisonCard from "@/components/ComparisonCard";

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#04070b] text-white">
      {/* FOG / BACKGROUND GLOWS */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* base solid black */}
        <div className="absolute inset-0 bg-black" />
        
        {/* blue foggy gradient (left side) - subtle */}
        <div className="absolute inset-y-0 left-0 w-[60%] bg-gradient-to-r from-cyan-600/15 via-cyan-500/8 to-transparent" />
        
        {/* blue glow orbs (esquerda) - balanced */}
        <div className="absolute left-[-120px] top-[200px] h-[480px] w-[480px] rounded-full bg-cyan-400/28 blur-[120px]" />
        <div className="absolute left-[20px] top-[320px] h-[380px] w-[380px] rounded-full bg-blue-500/22 blur-[100px]" />
        
        {/* green glow (direita/topo) */}
        <div className="absolute right-[-90px] top-[-50px] h-[360px] w-[360px] rounded-full bg-emerald-400/18 blur-[100px]" />
      </div>

      {/* header */}
      <header className="absolute right-8 top-6 z-20 flex items-center gap-2 rounded-full bg-black/20 px-4 py-2 backdrop-blur">
        {/* logo / nome */}
        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-black/40">
          <img src="/edited.png" alt="Balloteer logo" className="h-9 w-9 object-cover" />
        </div>
        <span className="text-sm font-medium tracking-tight text-white/90">Balloteer</span>
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/60">beta</span>
        <span className="h-6 w-px bg-white/5" />
        {/* botão privy */}
        <PrivyLogin />
      </header>

      {/* conteúdo - grid de 3 colunas */}
      <section className="relative z-10 grid grid-cols-1 gap-10 px-6 pt-28 lg:grid-cols-[minmax(0,520px)_minmax(0,380px)_minmax(0,380px)] lg:gap-14 lg:px-16">
        {/* coluna 1 — hero */}
        <div className="max-w-xl">
          <h1 className="text-[3.25rem] font-semibold leading-[0.95] tracking-[-0.04em] text-white drop-shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
            BALLOTEER
          </h1>

          <h2 className="mt-5 text-[1.7rem] font-medium leading-tight text-white/90">
            Private on-chain governance,
            <br />
            inside your Telegram group.
          </h2>

          <p className="mt-6 max-w-md text-[15px] leading-relaxed text-white/60">
            Weighted, anonymous voting with quorum and deadlines. Members vote
            privately in DM. Only the final result is posted. No crypto
            knowledge required.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <a
              href="https://t.me/balloteer_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-400 px-5 py-3 text-sm font-medium text-white shadow-[0_20px_60px_-15px_rgba(59,130,246,0.7)] transition hover:shadow-[0_25px_80px_-20px_rgba(59,130,246,0.8)]"
            >
              <span className="absolute inset-0 rounded-xl bg-white/30 opacity-0 blur-xl transition group-hover:opacity-40" />
              <span className="relative z-10 flex items-center gap-2">
                <span>🚀</span>
                <span>Launch Telegram Bot</span>
              </span>
            </a>

            <Link
              href="/guide"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/80 transition hover:border-white/30 hover:bg-white/10 hover:text-white"
            >
              <span>How it works</span>
              <span aria-hidden>→</span>
            </Link>
          </div>

          {/* Solana Wallet Creation */}
          <div className="mt-8 max-w-sm">
            <CreateSolanaWallet />
          </div>

          <p className="mt-16 text-[13px] text-white/30">
            Built for everyone — no crypto knowledge required.
          </p>
          <p className="mt-4 text-[12px] text-white/20">Balloteer © 2025</p>
        </div>

        {/* coluna 2 — comparação */}
        <div className="w-full">
          <ComparisonCard />
        </div>

        {/* coluna 3 — live vote preview */}
        <div className="relative w-full rounded-2xl border border-white/5 bg-gradient-to-b from-slate-900/50 to-slate-900/10 p-5 text-sm shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="flex items-center gap-2 text-[11px]">
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-200/90">
              live vote preview
            </span>
            <span className="text-white/20">• DM ballots</span>
          </div>

          <div className="mt-5 flex items-start justify-between gap-3 text-[13px] text-white/70">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-white/30">
                Proposal #12 · OPEN
              </p>
              <p className="mt-1 text-base text-white">
                Fund community marketing for Q1?
              </p>
            </div>
            <div className="text-right text-[11px] text-white/30">
              <p>time left</p>
              <p className="text-white/70">42m</p>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-[11px] text-white/50">Quorum reached</p>
            <div className="mt-2 h-2 w-full rounded-full bg-white/5">
              <div className="h-2 w-[61%] rounded-full bg-emerald-400" />
            </div>
            <p className="mt-1 text-right text-[11px] text-emerald-300">61%</p>
          </div>

          {[
            { label: "Increase budget", weight: "58%" },
            { label: "Keep same", weight: "33%" },
            { label: "Pause spend", weight: "9%" },
          ].map((opt) => (
            <div
              key={opt.label}
              className="mt-3 flex items-center justify-between rounded-xl border border-white/5 bg-white/3 px-3 py-2"
            >
              <div>
                <p className="text-white/90">{opt.label}</p>
                <p className="text-[11px] text-white/25">
                  anon weight: {opt.weight}
                </p>
              </div>
              <button className="rounded-lg border border-white/10 bg-white/0 px-4 py-1 text-[12px] text-white/60 transition hover:bg-white/10">
                Vote
              </button>
            </div>
          ))}

          <div className="mt-5 flex items-center justify-between text-[11px] text-white/15">
            <span>ballots stay private</span>
            <span>group sees final result →</span>
          </div>
        </div>
      </section>
    </main>
  );
}
