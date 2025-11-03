// pages/_document.jsx
import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* força usar tua imagem */}
        <link rel="icon" type="image/png" href="/edited.png" />
        {/* fallback clássico "favicon.ico" se o browser preferir */}
        <link rel="shortcut icon" href="/edited.png" />
        {/* opcional: pra iPhone / PWA */}
        <link rel="apple-touch-icon" href="/edited.png" />
        <meta name="theme-color" content="#020617" />
      </Head>
      <body className="bg-[#04070b]">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
