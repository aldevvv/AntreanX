// pages/_app.tsx
import { SessionProvider } from "next-auth/react";
import type { AppProps } from "next/app";
import Head from "next/head";
import "@/styles/globals.css"; // atau "../styles/globals.css"
import { Toaster } from "react-hot-toast";


export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    <>
      <Head>
        <title>AntreanX - Frontdesk Platform</title>
        <link rel="icon" href="/Indibiz.png" />
      </Head>
      <SessionProvider session={session}>
        <Component {...pageProps} />
        <Toaster />
      </SessionProvider>
    </>
  );
}
