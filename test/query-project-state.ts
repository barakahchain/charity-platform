import { createPublicClient, http } from "viem";
import { polygonAmoy } from "viem/chains";
import * as dotenv from "dotenv";
import ProjectABI from "../src/lib/abis/Project.json";

dotenv.config();

// Type definitions for better TypeScript support
interface ABIFunction {
  type: string;
  name?: string;
  stateMutability?: string;
  inputs?: Array<any>;
}

interface StateVariable {
  name: string;
  functionName: string;
}

async function main() {
  // ---- Setup ----
  const projectAddress = "0x8Ba08b1C3C1Def16880618F3919b1852B5Fa10F8"; // Replace with your Project contract address
  const projectABI = ProjectABI.abi as ABIFunction[];

  const publicClient = createPublicClient({
    chain: polygonAmoy,
    transport: http("https://rpc-amoy.polygon.technology"),
  });

  console.log(`🔍 Querying Project Contract: ${projectAddress}\n`);

  // ---- Helper function to read state variables ----
  async function readAllStateVariables() {
    const stateVariables: Record<string, any> = {};

    // Extract all public state variables from ABI
    const stateVariableReads: StateVariable[] = projectABI
      .filter((item: ABIFunction): item is ABIFunction & { name: string; stateMutability: string } => 
        item.type === "function" && 
        item.stateMutability === "view" &&
        item.name !== undefined
      )
      .filter((item: ABIFunction) => item.inputs && item.inputs.length === 0)
      .map((item: ABIFunction) => ({
        name: item.name!,
        functionName: item.name!,
      }));

    console.log("📊 Reading State Variables:");
    console.log("=".repeat(50));

    // Execute all read calls
    for (const variable of stateVariableReads) {
      try {
        const value = await publicClient.readContract({
          address: projectAddress as `0x${string}`,
          abi: projectABI,
          functionName: variable.functionName,
        });

        stateVariables[variable.name] = value;
        
        // Format output based on data type
        let displayValue = value;
        if (typeof value === "bigint") {
          // Convert from wei to MATIC for amount fields
          if (variable.name.toLowerCase().includes("amount") || 
              variable.name.toLowerCase().includes("goal") ||
              variable.name.toLowerCase().includes("balance")) {
            displayValue = `${Number(value) / 1e18} MATIC`;
          } else if (variable.name.toLowerCase().includes("deadline")) {
            // Convert timestamp to readable date
            const date = new Date(Number(value) * 1000);
            displayValue = `${date.toLocaleString()} (timestamp: ${value})`;
          } else {
            displayValue = value.toString();
          }
        }

        console.log(`✅ ${variable.name.padEnd(25)}: ${displayValue}`);
      } catch (error) {
        console.log(`❌ ${variable.name.padEnd(25)}: Failed to read`);
        stateVariables[variable.name] = null;
      }
    }

    return stateVariables;
  }

  // ---- Read all state variables ----
  const contractState = await readAllStateVariables();

  console.log("\n" + "=".repeat(50));
  console.log("📋 Summary:");
  console.log("=".repeat(50));
  
  // Display summary with important fields
  const importantFields = [
    "charity", "builder", "goal", "deadline", 
    "metaCid", "totalDonated", "completed", "deadlineEnabled"
  ];

  for (const field of importantFields) {
    if (contractState[field] !== undefined) {
      console.log(`📌 ${field.padEnd(20)}: ${contractState[field]}`);
    }
  }

  // ---- Read milestones using getMilestone() function ----
  console.log("\n" + "=".repeat(50));
  console.log("📈 Milestones:");
  console.log("=".repeat(50));

  try {
    // Get milestone count
    const milestoneCount = await publicClient.readContract({
      address: projectAddress as `0x${string}`,
      abi: projectABI,
      functionName: "milestoneCount",
    }) as bigint;

    console.log(`Total Milestones: ${milestoneCount}\n`);

    // Get builder address from contractState
    const builderAddress = contractState.builder || "Unknown";

    // Read each milestone using getMilestone()
    for (let i = 0; i < Number(milestoneCount); i++) {
      try {
        const milestone = await publicClient.readContract({
          address: projectAddress as `0x${string}`,
          abi: projectABI,
          functionName: "getMilestone",
          args: [BigInt(i)],
        }) as [bigint, boolean]; // Returns (amount, released)

        console.log(`Milestone ${i + 1}:`);
        console.log(`  Amount: ${Number(milestone[0]) / 1e18} MATIC`);
        console.log(`  Released: ${milestone[1]}`);
        console.log(`  Beneficiary: ${builderAddress}`);
        console.log();
      } catch (error) {
        console.log(`  Failed to read milestone ${i}:`, error);
      }
    }
  } catch (error) {
    console.log("Error reading milestones:", error);
  }
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});