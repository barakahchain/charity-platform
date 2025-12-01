// config.ts
import { createConfig, http } from 'wagmi'
import { polygonAmoy } from 'wagmi/chains'
import { injected, metaMask, walletConnect } from 'wagmi/connectors'

export const config = createConfig({
  chains: [polygonAmoy],
  connectors: [
    injected(),
    metaMask(),
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id',
    }),
  ],
  transports: {
    [polygonAmoy.id]: http(),
  },
  ssr: true, // Important for Next.js
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}