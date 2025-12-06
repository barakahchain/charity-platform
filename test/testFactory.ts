import { createWalletClient, createPublicClient, http, parseEther } from "viem";
import { polygonAmoy } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import * as dotenv from "dotenv";
// import ProjectFactoryAbi from "../artifacts/contracts/ProjectFactory.sol/ProjectFactory.json" assert { type: "json" };
import ProjectFactoryAbi from "../src/lib/abis/ProjectFactory.json" assert { type: "json" };

dotenv.config();

async function main() {
  // ---- Setup ----
  const factoryAddress = "0x66104d4a199df29f829af78cc9280505aeae302c"; // Replace with your deployed ProjectFactory
  const account = privateKeyToAccount(`0x${process.env.PRIVATE_KEY}`);

  const publicClient = createPublicClient({
    chain: polygonAmoy,
    transport: http("https://rpc-amoy.polygon.technology"),
  });

  const walletClient = createWalletClient({
    account,
    chain: polygonAmoy,
    transport: http("https://rpc-amoy.polygon.technology"),
  });

  // ---- Parameters ----
  const charity = "0x66104d4a199df29f829af78cc9280505aeae302c";
  const builder = "0x66104d4a199df29f829af78cc9280505aeae302c";
  const goal = parseEther("10");
  const deadline = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60; // 7 days
  const metaCid = "bafy...";
  const milestoneAmounts = [parseEther("3"), parseEther("3"), parseEther("4")];

  console.log("Creating project...");

  // ---- Send transaction ----
  const txHash = await walletClient.writeContract({
    address: factoryAddress as `0x${string}`,
    abi: ProjectFactoryAbi.abi,
    functionName: "createProject",
    args: [charity, builder, goal, deadline, metaCid, milestoneAmounts],
  });

  console.log("⏳ Waiting for confirmation...");
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

  // ---- Extract project address from logs ----
  const log = receipt.logs.find((log) =>
    log.topics[0]?.toLowerCase().includes("projectcreated")
  );

  console.log("✅ Transaction hash:", txHash);
  console.log("📦 Project created, logs:", receipt.logs);

  // ---- Read all projects ----
  const projects = await publicClient.readContract({
    address: factoryAddress as `0x${string}`,
    abi: ProjectFactoryAbi.abi,
    functionName: "getAllProjects",
  });

  console.log("All projects:", projects);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
