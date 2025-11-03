// pages/onboard.jsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets, useCreateWallet } from "@privy-io/react-auth/solana";

export default function Onboard() {
  const router = useRouter();
  const { state } = router.query || {};
  const { ready, authenticated, user, login } = usePrivy();
  const { wallets } = useWallets();
  const { createWallet } = useCreateWallet();
  
  const [status, setStatus] = useState("Preparing…");
  const [error, setError] = useState(null);
  const [walletAddress, setWalletAddress] = useState(null);
  const [countdown, setCountdown] = useState(5);
  
  // Locks to prevent multiple executions
  const loginAttempted = useRef(false);
  const processedAuth = useRef(false);
  const walletCreationAttempted = useRef(false);

  // Step 1: Trigger login if not authenticated
  useEffect(() => {
    if (!ready) return;
    
    if (!authenticated && !loginAttempted.current) {
      loginAttempted.current = true;
      setStatus("Opening Telegram login…");
      console.log("Triggering login...");
      login();
    }
  }, [ready, authenticated, login]);

  // Step 2: Process after authentication
  useEffect(() => {
    if (!ready || !authenticated || processedAuth.current) return;
    
    processedAuth.current = true;
    
    (async () => {
      try {
        console.log("Processing authenticated user...");
        console.log("Wallets available:", wallets);
        
        // Check if Solana wallet exists
        const solWallet = wallets?.find(w => w.chainType === "solana");
        
        if (solWallet?.address) {
          console.log("✅ Found existing Solana wallet:", solWallet.address);
          setWalletAddress(solWallet.address);
          
          // Save to backend directly (bypass state validation for existing wallets)
          console.log("User object (found in array):", user);
          console.log("User.telegram (found in array):", user?.telegram);
          const tgId = user?.telegram?.telegramUserId || user?.telegram?.subject || user?.telegram?.id;
          console.log("Telegram ID (found in array):", tgId);
          
          if (tgId) {
            try {
              const botBackendUrl = process.env.BOT_BACKEND_URL || 'http://localhost:8080';
              const saveResponse = await fetch(`${botBackendUrl}/save-wallet`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  telegramId: tgId,
                  solAddress: solWallet.address,
                  privyUserId: user?.id,
                }),
              });
              
              const result = await saveResponse.json();
              if (result.ok) {
                console.log("✅ Wallet saved to database!");
              } else {
                console.error("⚠️ Failed to save:", result.error);
              }
            } catch (e) {
              console.error("Failed to save to backend:", e);
            }
          }
          
          setStatus("done");
        } else {
          // Wallet doesn't exist - create it manually
          if (!walletCreationAttempted.current) {
            walletCreationAttempted.current = true;
            console.log("No Solana wallet found - creating...");
            setStatus("Creating your Solana wallet…");
            
            try {
              // createWallet() returns the wallet object directly!
              const newSolWallet = await createWallet();
              console.log("✅ Wallet created:", JSON.stringify(newSolWallet, null, 2));
              console.log("✅ Wallet object keys:", Object.keys(newSolWallet || {}));
              
              setStatus("Waiting for wallet to sync…");
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              // Check the wallets array (it should have updated)
              console.log("Wallets after creation:", wallets);
              const foundWallet = wallets?.find(w => w.chainType === "solana");
              
              setStatus("Saving to database…");
              
              const walletToSave = foundWallet || newSolWallet?.wallet || newSolWallet;
              const address = walletToSave?.address || walletToSave?.publicKey || walletToSave?.solAddress;
              
              if (address) {
                console.log("✅ Wallet address found:", address);
                setWalletAddress(address);
                
                // Save to backend directly
                console.log("User object:", user);
                console.log("User.telegram:", user?.telegram);
                const tgId = user?.telegram?.telegramUserId || user?.telegram?.subject || user?.telegram?.id;
                console.log("Telegram ID:", tgId);
                
                if (tgId) {
                  try {
                    const botBackendUrl = process.env.BOT_BACKEND_URL || 'http://localhost:8080';
                    const saveResponse = await fetch(`${botBackendUrl}/save-wallet`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          telegramId: tgId,
                          solAddress: address,
                          privyUserId: user?.id,
                        }),
                      });
                    
                    const result = await saveResponse.json();
                    if (result.ok) {
                      console.log("✅ Wallet saved to database!");
                      // Only mark as done AFTER successful save!
                      setStatus("done");
                    } else {
                      console.error("⚠️ Failed to save:", result.error);
                      setError("Failed to save wallet: " + result.error);
                      setStatus("Error");
                    }
                  } catch (e) {
                    console.error("Failed to save to backend:", e);
                    setError("Failed to save wallet. Please try /connect again.");
                    setStatus("Error");
                  }
                } else {
                  console.error("❌ No Telegram ID found!");
                  setError("Missing Telegram ID. Please try again.");
                  setStatus("Error");
                }
              } else {
                console.error("❌ Wallet not found after creation!");
                console.error("Tried to find address in:", walletToSave);
                setError("Wallet created but address not found. Check browser console and try /connect again.");
                setStatus("Error");
              }
              
            } catch (createError) {
              console.error("Error creating wallet:", createError);
              const errorMsg = createError?.message || String(createError);
              
              // If error is "already has wallet", fetch it and save it!
              if (errorMsg.toLowerCase().includes("already has")) {
                console.log("✅ Wallet already exists - fetching and saving...");
                setStatus("Saving existing wallet…");
                
                // Wait a moment for wallets to be available
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                // Find the existing wallet
                console.log("Current wallets array:", wallets);
                const existingWallet = wallets?.find(w => w.chainType === "solana");
                console.log("Found existing wallet object:", existingWallet);
                
                const address = existingWallet?.address || existingWallet?.publicKey || existingWallet?.solAddress;
                
                if (address) {
                  console.log("✅ Found existing wallet address:", address);
                  setWalletAddress(address);
                  
                  // Save to backend
                  console.log("User object (existing):", user);
                  console.log("User.telegram (existing):", user?.telegram);
                  const tgId = user?.telegram?.telegramUserId || user?.telegram?.subject || user?.telegram?.id;
                  console.log("Telegram ID (existing):", tgId);
                  
                  if (tgId) {
                    try {
                      const botBackendUrl = process.env.BOT_BACKEND_URL || 'http://localhost:8080';
                      const saveResponse = await fetch(`${botBackendUrl}/save-wallet`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          telegramId: tgId,
                          solAddress: address,
                          privyUserId: user?.id,
                        }),
                      });
                      
                      const result = await saveResponse.json();
                      if (result.ok) {
                        console.log("✅ Existing wallet saved to database!");
                        setStatus("done");
                      } else {
                        console.error("⚠️ Failed to save:", result.error);
                        setError("Failed to save wallet: " + result.error);
                        setStatus("Error");
                      }
                    } catch (e) {
                      console.error("Failed to save existing wallet:", e);
                      setError("Failed to save wallet.");
                      setStatus("Error");
                    }
                  } else {
                    setError("Missing Telegram ID.");
                    setStatus("Error");
                  }
                } else {
                  console.error("Existing wallet object has no address field:", existingWallet);
                  setError("Wallet exists but address not found. Check browser console and try /connect again.");
                  setStatus("Error");
                }
              } else {
                setError("Failed to create wallet: " + errorMsg);
                setStatus("Error");
              }
            }
          }
        }
        
      } catch (e) {
        console.error("Processing error:", e);
        setError(String(e?.message || e));
        setStatus("Error");
      }
    })();
  }, [ready, authenticated, wallets]);

  // Step 3: Auto-redirect after success
  useEffect(() => {
    if (status !== "done") return;
    
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          const backLink = `tg://resolve?domain=${process.env.NEXT_PUBLIC_TG_BOT_USERNAME || 'balloteer_bot'}&start=wallet_ok`;
          window.location.href = backLink;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status]);

  const backToBot = `tg://resolve?domain=${process.env.NEXT_PUBLIC_TG_BOT_USERNAME || 'balloteer_bot'}&start=wallet_ok`;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#04070b] text-white">
      {/* Same fog effect as homepage */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-black" />
        <div className="absolute inset-y-0 left-0 w-[60%] bg-gradient-to-r from-cyan-600/15 via-cyan-500/8 to-transparent" />
        <div className="absolute left-[-120px] top-[200px] h-[480px] w-[480px] rounded-full bg-cyan-400/28 blur-[120px]" />
        <div className="absolute left-[20px] top-[320px] h-[380px] w-[380px] rounded-full bg-blue-500/22 blur-[100px]" />
      </div>

      <div className="relative z-10 grid min-h-screen place-items-center px-6">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-black/40">
              <img src="/edited.png" alt="Balloteer" className="h-10 w-10 object-cover" />
            </div>
            <h1 className="text-xl font-semibold">Create Solana Wallet</h1>
          </div>

          <p className="text-sm text-white/70 mb-6">
            We'll connect your Telegram account and create a secure, private Solana wallet.
          </p>

          <div className="rounded-xl border border-white/5 bg-white/3 p-4">
            {status === "done" ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-emerald-300">
                  <span className="text-xl">✅</span>
                  <span className="font-medium">Wallet created successfully!</span>
                </div>
                
                {walletAddress && (
                  <div className="rounded-lg bg-black/20 p-3">
                    <p className="text-xs text-white/40 mb-1">Your Solana address:</p>
                    <p className="font-mono text-xs text-white/90 break-all">{walletAddress}</p>
                  </div>
                )}

                <div className="rounded-lg bg-cyan-500/10 border border-cyan-500/20 p-3 text-center">
                  <p className="text-sm text-cyan-200">
                    Returning to Telegram in <span className="font-bold text-cyan-100">{countdown}</span>s...
                  </p>
                </div>

                <a
                  href={backToBot}
                  className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-400 px-4 py-3 text-sm font-medium text-white shadow-lg transition hover:shadow-xl"
                >
                  <span>🚀</span>
                  <span>Back to Telegram Now</span>
                </a>
              </div>
            ) : error ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-red-300">
                  <span className="text-xl">❌</span>
                  <span className="font-medium">Error</span>
                </div>
                <p className="text-sm text-white/70">{error}</p>
                <button
                  onClick={() => router.reload()}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10"
                >
                  Try again
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-cyan-400"></div>
                <p className="text-sm text-white/70">{status}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
