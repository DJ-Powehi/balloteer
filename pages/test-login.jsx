// pages/test-login.jsx
// Simple page to test Privy Telegram login

import { usePrivy } from "@privy-io/react-auth";

export default function TestLogin() {
  const { ready, authenticated, user, login, logout } = usePrivy();

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <p>Loading Privy...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-white p-6">
      <div className="max-w-md w-full rounded-xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-2xl font-bold mb-4">Privy Login Test</h1>
        
        {authenticated ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4">
              <p className="text-emerald-300 font-medium mb-2">✅ Authenticated!</p>
              <div className="text-sm text-white/70 space-y-1">
                <p><strong>User ID:</strong> {user?.id}</p>
                <p><strong>Telegram ID:</strong> {user?.telegram?.subject || "Not found"}</p>
                <p><strong>Username:</strong> {user?.telegram?.username || "Not found"}</p>
              </div>
            </div>
            
            <button
              onClick={logout}
              className="w-full rounded-lg bg-red-500/20 border border-red-500/30 px-4 py-2 text-red-300 hover:bg-red-500/30"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-white/70">Click the button below to test Telegram login:</p>
            
            <button
              onClick={() => {
                console.log("Login button clicked");
                login();
              }}
              className="w-full rounded-lg bg-cyan-500 px-4 py-3 font-medium text-white hover:bg-cyan-400"
            >
              Login with Telegram
            </button>
          </div>
        )}

        <div className="mt-6 text-xs text-white/40">
          <p>Privy Ready: {ready ? "✅" : "❌"}</p>
          <p>Authenticated: {authenticated ? "✅" : "❌"}</p>
        </div>
      </div>
    </div>
  );
}

