"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig } from "wagmi";
import { mainnet, polygon, polygonMumbai } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";
import { http } from "viem";
import { config } from '../../config';

// const config = createConfig({
//   chains: [mainnet, polygon, polygonMumbai],
//   connectors: [
//     injected(),
//     walletConnect({
//       projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "default-project-id",
//     }),
//   ],
//   transports: {
//     [mainnet.id]: http(),
//     [polygon.id]: http(),
//     [polygonMumbai.id]: http(),
//   },
// });

const queryClient = new QueryClient();

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}