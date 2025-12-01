import { parseEventLogs, type TransactionReceipt } from "viem";
import * as factoryJSON from "@/../artifacts/contracts/ProjectFactory.sol/ProjectFactory.json";

export function getProjectCreatedAddress(receipt: TransactionReceipt) {
  const ProjectFactoryABI = factoryJSON.abi;
  
  try {
    const logs = parseEventLogs({
      abi: ProjectFactoryABI,
      logs: receipt.logs,
    });

    // Type-safe approach - check for the event name and args
    const event = logs.find((log: any) => 
      'eventName' in log && log.eventName === "ProjectCreated"
    );

    // If found, return the clone contract address
    if (event && 'args' in event && event.args) {
      return (event.args as any).projectAddress as string | undefined;
    }
    
    return undefined;
  } catch (err) {
    console.error("Failed to parse ProjectCreated logs:", err);
    return undefined;
  }
}