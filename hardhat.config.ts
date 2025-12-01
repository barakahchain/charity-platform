import type { HardhatUserConfig } from "hardhat/config";
import hardhatTypechain from "@nomicfoundation/hardhat-typechain";
import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { configVariable } from "hardhat/config";
import dotenv from "dotenv";
import path from "path";
import hardhatMocha from "@nomicfoundation/hardhat-mocha";
import hardhatNetworkHelpers from "@nomicfoundation/hardhat-network-helpers";

// Load from .env.local instead of .env
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// Helper function to get env variables with error messages
function getEnvVariable(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Please set the ${key} environment variable`);
  }
  return value;
}

const config: HardhatUserConfig = {
  plugins: [hardhatToolboxViemPlugin, hardhatTypechain, hardhatMocha, hardhatNetworkHelpers],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },

    // sepolia: {
    //   type: "http",
    //   chainType: "l1",
    //   url: getEnvVariable("SEPOLIA_RPC_URL"),
    //   accounts: [getEnvVariable("PRIVATE_KEY")],
    // },
    amoy: {
      type: "http",
      url: getEnvVariable("AMOY_RPC_URL"),
      accounts: [getEnvVariable("PRIVATE_KEY")],
    },
  },
  
  test: {
    mocha: {
      timeout: 20_000, // set the timeout for tests to 20 seconds
    },
  },
};

export default config;
