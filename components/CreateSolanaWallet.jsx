// components/CreateSolanaWallet.jsx
"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useWallets, useCreateWallet } from "@privy-io/react-auth/solana";
import { useState } from "react";

export default function CreateSolanaWallet() {
  const { ready, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const { createWallet } = useCreateWallet();
  const [creating, setCreating] = useState(false);

  // 1. espera SDK
  if (!ready) return null;

  // 2. se não tá logado, nem mostra
  if (!authenticated) {
    return (
      <p className="text-xs text-white/40">
        Log in with Telegram to create a wallet.
      </p>
    );
  }

  // 3. vê se o user JÁ TEM solana
  const solWallets = wallets?.filter(
    (w) => w.walletClientType === "privy" && w.chainType === "solana"
  ) || [];
  const hasSolana = solWallets.length > 0;

  // 4. se já tem, só mostra o endereço e pronto
  if (hasSolana) {
    const main = solWallets[0];
    return (
      <div className="rounded-lg bg-white/5 px-4 py-3 text-sm text-white/80">
        <p className="text-xs text-white/40 mb-1">Solana wallet</p>
        <p className="font-mono text-xs break-all">{main.address}</p>
      </div>
    );
  }

  // 5. se NÃO tem, mostra o botão pra criar UMA vez
  async function handleCreate() {
    try {
      setCreating(true);
      // Create Solana wallet using the Solana-specific hook
      await createWallet();
    } catch (error) {
      console.error("Error creating wallet:", error);
    } finally {
      setCreating(false);
    }
  }

  return (
    <button
      onClick={handleCreate}
      disabled={creating}
      className="rounded-lg bg-emerald-500/90 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-400 transition disabled:cursor-not-allowed disabled:opacity-60"
    >
      {creating ? "Creating wallet..." : "Create Solana wallet"}
    </button>
  );
}
