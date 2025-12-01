"use client";

import React, { useEffect, useState, useCallback } from "react";
import { createPublicClient, http, parseEther } from "viem";
import { polygonAmoy } from "viem/chains";
import { useAccount, useWalletClient } from "wagmi";
import { abi as ProjectAbi } from "../../artifacts/contracts/Project.sol/Project.json";
import { WalletConnect } from "./WalletConnect";

const publicClient = createPublicClient({
  chain: polygonAmoy,
  transport: http("https://rpc-amoy.polygon.technology"),
});

export function ProjectViewer2({
  cloneAddress,
}: {
  cloneAddress: `0x${string}`;
}) {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [readyClient, setReadyClient] = useState<any>(null);
  const [projectInfo, setProjectInfo] = useState<any>(null);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [totalDonated, setTotalDonated] = useState<string>("0");
  const [donation, setDonation] = useState<string>("0.01");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // 🔹 Track wallet readiness
  useEffect(() => {
    if (walletClient) setReadyClient(walletClient);
  }, [walletClient]);

  // 🔹 Fetch project data
  const fetchProjectData = useCallback(async () => {
    try {
      setRefreshing(true);
      const info = (await publicClient.readContract({
        address: cloneAddress,
        abi: ProjectAbi,
        functionName: "getProjectInfo",
      })) as [string, string, string, bigint, bigint, boolean];
      setProjectInfo(info);

      const milestoneCount = (await publicClient.readContract({
        address: cloneAddress,
        abi: ProjectAbi,
        functionName: "milestoneCount",
      })) as bigint;

      const milestoneData = [];
      for (let i = 0; i < Number(milestoneCount); i++) {
        const [amount, released] = (await publicClient.readContract({
          address: cloneAddress,
          abi: ProjectAbi,
          functionName: "getMilestone",
          args: [BigInt(i)],
        })) as [bigint, boolean];
        milestoneData.push({ index: i, amount: amount.toString(), released });
      }
      setMilestones(milestoneData);

      const donated = (await publicClient.readContract({
        address: cloneAddress,
        abi: ProjectAbi,
        functionName: "totalDonated",
      })) as bigint;
      setTotalDonated(donated.toString());
    } catch (err) {
      console.error("Error loading project:", err);
    } finally {
      setRefreshing(false);
    }
  }, [cloneAddress]);

  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  // 🔹 Donation handler
  const handleDonate = async () => {
  console.log("Initiating donation...");
  if (!isConnected || !readyClient) {
    alert("Please connect your wallet first.");
    return;
  }

  try {
    console.log("Sending donation transaction...");
    setLoading(true);

    // 1️⃣ Send the donation transaction
    const txHash = await readyClient.writeContract({
      address: cloneAddress,
      abi: ProjectAbi,
      functionName: "donate",
      value: parseEther(donation),
    });

    console.log("Donation tx hash:", txHash);

    // 2️⃣ Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    console.log("Transaction receipt:", receipt);

    // 3️⃣ Show full transaction info
    const explorerUrl = `https://amoy.polygonscan.com/tx/${txHash}`;
    alert(`✅ Donation confirmed!\n\nTx Hash: ${txHash}\n\nView on PolygonScan:\n${explorerUrl}`);

    // 4️⃣ Refresh project info
    await fetchProjectData();
  } catch (err) {
    console.error("Donation failed:", err);
    alert("❌ Transaction failed. Check console for details.");
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 rounded-2xl shadow-md bg-gray-900 text-white">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Project Info</h1>
        <WalletConnect />
      </div>

      {!projectInfo ? (
        <p>Loading project...</p>
      ) : (
        <>
          <p>
            <strong>Charity:</strong> {projectInfo[1]}
          </p>
          <p>
            <strong>Builder:</strong> {projectInfo[0]}
          </p>
          <p>
            <strong>Goal:</strong> {(Number(projectInfo[3]) / 1e18).toFixed(2)}{" "}
            MATIC
          </p>
          <p>
            <strong>Deadline:</strong>{" "}
            {new Date(Number(projectInfo[4]) * 1000).toLocaleString()}
          </p>
          <p>
            <strong>Completed:</strong> {projectInfo[5] ? "✅ Yes" : "❌ No"}
          </p>
        </>
      )}

      <h2 className="text-xl font-semibold mt-6 mb-2">Milestones</h2>
      {milestones.length === 0 ? (
        <p>No milestones found</p>
      ) : (
        <ul className="space-y-1">
          {milestones.map((m) => (
            <li key={m.index}>
              #{m.index}: {(Number(m.amount) / 1e18).toFixed(2)} MATIC —{" "}
              {m.released ? "✅ Released" : "❌ Pending"}
            </li>
          ))}
        </ul>
      )}

      <h2 className="text-xl font-semibold mt-6 mb-2">Donations</h2>
      <div className="flex items-center gap-3">
        <p>Total Donated: {(Number(totalDonated) / 1e18).toFixed(4)} MATIC</p>
        {refreshing && (
          <span className="text-sm text-gray-400 animate-pulse">
            Refreshing...
          </span>
        )}
      </div>

      {isConnected ? (
        <div className="flex items-center gap-2 mt-4">
          <input
            type="number"
            step="0.01"
            min="0.001"
            value={donation}
            onChange={(e) => setDonation(e.target.value)}
            className="bg-gray-800 border border-gray-700 px-3 py-2 rounded-lg w-32"
          />
          <button
            onClick={handleDonate}
            disabled={loading || !readyClient}
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg"
          >
            {loading ? "Donating..." : "Donate"}
          </button>
        </div>
      ) : (
        <p className="mt-4 text-gray-400">Connect your wallet to donate.</p>
      )}
    </div>
  );
}
