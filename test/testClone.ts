import {
  createWalletClient,
  createPublicClient,
  http,
  parseEther,
  decodeEventLog,
} from "viem";
import { polygonAmoy } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import * as dotenv from "dotenv";

import ProjectAbi from "../artifacts/contracts/Project.sol/Project.json" assert { type: "json" };

dotenv.config();

interface MilestoneReleasedEvent {
  index: bigint;
  amount: bigint;
}

async function main() {
  const cloneAddress = "0x164374295659ef538b563dc805afd97347d7cf45"; // use your clone address

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

  // 1. Read initial state
  const info = (await publicClient.readContract({
    address: cloneAddress as `0x${string}`,
    abi: ProjectAbi.abi,
    functionName: "getProjectInfo",
  })) as [string, string, string, bigint, bigint, boolean];
  console.log("Project Info:", info);

  const milestoneCount = (await publicClient.readContract({
    address: cloneAddress as `0x${string}`,
    abi: ProjectAbi.abi,
    functionName: "milestoneCount",
  })) as bigint;
  console.log("Milestone count:", milestoneCount.toString());

  const [m0_amount, m0_released] = (await publicClient.readContract({
    address: cloneAddress as `0x${string}`,
    abi: ProjectAbi.abi,
    functionName: "getMilestone",
    args: [0],
  })) as [bigint, boolean];
  console.log("Milestone 0:", m0_amount.toString(), "released:", m0_released);

  // 2. Donate
  const donateValue = parseEther("0.01");
  const txHashDonate = await walletClient.writeContract({
    address: cloneAddress as `0x${string}`,
    abi: ProjectAbi.abi,
    functionName: "donate",
    args: [],
    value: donateValue,
  });
  console.log("Donating, tx:", txHashDonate);
  const receiptDonate = await publicClient.waitForTransactionReceipt({
    hash: txHashDonate,
  });
  console.log("Donate logs:", receiptDonate.logs);

  // 3. Check donation accounting
  const totalDonated = (await publicClient.readContract({
    address: cloneAddress as `0x${string}`,
    abi: ProjectAbi.abi,
    functionName: "totalDonated",
  })) as bigint;
  console.log("Total Donated:", totalDonated.toString());

  const donorAddress = account.address;
  const donationOfDonor = (await publicClient.readContract({
    address: cloneAddress as `0x${string}`,
    abi: ProjectAbi.abi,
    functionName: "donations",
    args: [donorAddress as `0x${string}`],
  })) as bigint;
  console.log("Donation of this account:", donationOfDonor.toString());

  // 4. Release milestone (must be called by charity account)
//   const txHashRelease = await walletClient.writeContract({
//     address: cloneAddress as `0x${string}`,
//     abi: ProjectAbi.abi,
//     functionName: "releaseMilestone",
//     args: [0],
//   });
//   console.log("Releasing milestone 0, tx:", txHashRelease);
//   const receiptRelease = await publicClient.waitForTransactionReceipt({
//     hash: txHashRelease,
//   });
//   console.log("Release logs:", receiptRelease.logs);

//   for (const log of receiptRelease.logs) {
//     try {
//       const decoded = decodeEventLog({
//         abi: ProjectAbi.abi,
//         data: log.data,
//         topics: log.topics,
//       });

//       if (decoded.eventName === "MilestoneReleased" && decoded.args) {
//         const rawArgs = decoded.args as unknown;
//         let args: MilestoneReleasedEvent;
//         if (Array.isArray(rawArgs)) {
//           args = {
//             index: rawArgs[0] as bigint,
//             amount: rawArgs[1] as bigint,
//           };
//         } else {
//           args = rawArgs as MilestoneReleasedEvent;
//         }
//         console.log(
//           `MilestoneReleased: index = ${args.index.toString()}, amount = ${args.amount.toString()}`
//         );
//       }
//     } catch (error) {
//       console.error("Failed to decode log:", error);
//     }
//   }

  // Continue with further tests...
}

main().catch((err) => {
  console.error("Error in test:", err);
  process.exit(1);
});
