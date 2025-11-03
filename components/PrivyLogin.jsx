// components/PrivyLogin.jsx
"use client";

import { usePrivy, useLogin } from "@privy-io/react-auth";

export default function PrivyLogin() {
  const { ready, authenticated, user, logout } = usePrivy();
  const { login } = useLogin();

  if (!ready) return null;

  if (authenticated) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-white/50">
          {user?.telegram?.username
            ? `@${user.telegram.username}`
            : "logged in"}
        </span>
        <button
          onClick={logout}
          className="rounded-lg bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/20 transition"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={login}
      className="rounded-lg bg-cyan-500/90 px-3 py-1.5 text-xs font-medium text-white shadow hover:bg-cyan-400 transition"
    >
      Connect with Privy
    </button>
  );
}
