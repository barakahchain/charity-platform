// scripts/upgradeFactory.ts
import { createWalletClient, createPublicClient, http, parseEther } from "viem";
import { polygonAmoy } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const factoryAddress = "0x66104d4a199df29f829af78cc9280505aeae302c";        // <- fill this in
  const newImplAddress = "0xb900fb95bb78226d5b15d27ab5b5b7431f3c5b98";       // <- fill this in
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("Missing PRIVATE_KEY in .env file");
  }

  const account = privateKeyToAccount(`0x${privateKey}`);
  const walletClient = createWalletClient({
    account,
    chain: polygonAmoy,
    transport: http("https://rpc-amoy.polygon.technology"),
  });

  // Note: You must know the ABI of your factory; assuming you have it in artifacts
  const factoryAbi = [
    {
      "inputs":[
        {"internalType":"address","name":"_newImplementation","type":"address"}
      ],
      "name":"upgradeImplementation",
      "outputs":[],
      "stateMutability":"nonpayable",
      "type":"function"
    }
  ];

  const txHash = await walletClient.writeContract({
    address: factoryAddress as `0x${string}`,
    abi: factoryAbi,
    functionName: "upgradeImplementation",
    args: [newImplAddress as `0x${string}`],
  });

  console.log("Upgrade tx submitted:", txHash);

  const publicClient = createPublicClient({
    chain: polygonAmoy,
    transport: http("https://rpc-amoy.polygon.technology"),
  });

  // Wait for confirmation
  await publicClient.waitForTransactionReceipt({ hash: txHash });
  console.log("✅ Factory upgraded to new implementation:", newImplAddress);
}

main()
  .catch(err => {
    console.error("Error in upgrade script:", err);
    process.exit(1);
  });
