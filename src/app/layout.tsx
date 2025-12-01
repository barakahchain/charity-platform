import type { Metadata } from "next";
import "./globals.css";
import ErrorReporter from "@/components/ErrorReporter";
import Script from "next/script";
import { Web3Provider } from "@/providers/Web3Provider";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Shariah Escrow - Transparent Charity Funding",
  description: "Blockchain-based charity platform with Shariah-compliant milestone escrow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <ErrorReporter />
        <Script
          src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/scripts//route-messenger.js"
          strategy="afterInteractive"
          data-target-origin="*"
          data-message-type="ROUTE_CHANGE"
          data-include-search-params="true"
          data-only-in-iframe="true"
          data-debug="true"
          data-custom-data='{"appName": "YourApp", "version": "1.0.0", "greeting": "hi"}'
        />
        <Web3Provider>
          <Navbar />
          {children}
        </Web3Provider>
        {/* <VisualEditsMessenger /> */}
      </body>
    </html>
  );
}