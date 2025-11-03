// pages/_app.jsx
import Head from "next/head";
import "@/styles/globals.css";
import { PrivyProvider } from "@privy-io/react-auth";

const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

export default function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>Balloteer</title>
      </Head>

      <PrivyProvider
        appId={appId}
        config={{
          loginMethods: ["telegram"],
          appearance: {
            theme: "dark",
            accentColor: "#22d3ee",
            logo: "/edited.png",
          },
          // Embedded wallet configuration for Solana
          // IMPORTANT: Use "users-without-wallets" to prevent duplicates
          embeddedWallets: {
            createOnLogin: "users-without-wallets",
            noPromptOnSignature: true,
          },
        }}
      >
        <Component {...pageProps} />
      </PrivyProvider>
    </>
  );
}
