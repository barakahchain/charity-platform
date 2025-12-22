// hooks/useDonationHandler.ts
import { useState, useRef } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { toast } from 'sonner';
import { ProjectData } from '@/types/project';
import { waitForTransactionReceipt } from '@wagmi/core';
import { config } from '@/../config';
import ProjectAbi from "@/lib/abis/Project.json";

export function useDonationHandler(project: ProjectData | null, user: any) {
  const { isConnected, address: donorWalletAddress } = useAccount();
  const { writeContract, isPending: isDonating } = useWriteContract();
  
  const [donationAmount, setDonationAmount] = useState('');
  const [donationHash, setDonationHash] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [confirmationError, setConfirmationError] = useState<string | null>(null);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successData, setSuccessData] = useState<{
    amount: string;
    hash: string;
  } | null>(null);

  // Use ref to track processed hashes
  const processedHashes = useRef<Set<string>>(new Set());

  const validateDonation = (): string | null => {
    if (!isConnected) return 'Please connect your wallet first';
    if (!user) return 'Please log in to make a donation';
    if (!donationAmount || parseFloat(donationAmount) <= 0) return 'Please enter a valid donation amount';
    if (!project) return 'Project data not loaded';
    if (project.completed) return 'This project has been completed';
    if (project.deadlineEnabled && Number(project.deadline) * 1000 < Date.now()) {
      return 'This project deadline has passed';
    }
    return null;
  };

  // Calculate canDonate
  const canDonate = !validateDonation() && !isDonating && !isConfirming;

  const handleDonate = async () => {
    const error = validateDonation();
    if (error) {
      toast.error(error);
      return;
    }

    if (!donorWalletAddress) {
      toast.error("Wallet not connected");
      return;
    }

    setIsConfirmed(false);
    setConfirmationError(null);
    setShowSuccessPopup(false);

    try {
      const amountInWei = BigInt(Math.floor(parseFloat(donationAmount) * 1e18));

      writeContract(
        {
          address: project!.address as `0x${string}`,
          abi: ProjectAbi.abi,
          functionName: "donate",
          value: amountInWei,
        },
        {
          onSuccess: (hash) => {
            toast.success("Donation submitted! Waiting for confirmation...");
            setDonationHash(hash);
            // Start confirmation process
            processDonationConfirmation(hash);
          },
          onError: (error) => {
            toast.error(`Donation failed: ${error.message}`);
            console.error("Donation error:", error);
          },
        }
      );
      
    } catch (error: any) {
      toast.error(`Donation failed: ${error.message}`);
      console.error("Donation exception:", error);
    }
  };

  const processDonationConfirmation = async (hash: string) => {
    if (processedHashes.current.has(hash)) {
      console.log("Already processed this donation hash, skipping");
      return;
    }

    processedHashes.current.add(hash);
    setIsConfirming(true);
    setConfirmationError(null);

    try {
      console.log("⏳ Waiting for donation confirmation...", hash);

      const receipt = await waitForTransactionReceipt(config, {
        hash: hash as `0x${string}`,
        confirmations: 1,
        pollingInterval: 2_000,
        timeout: 120_000,
        retryCount: 3,
        retryDelay: 1000,
      });

      console.log("✅ Donation receipt received:", receipt);
      setIsConfirmed(true);

      if (receipt.status === "success") {
        const saveResult = await saveDonationToDB(
          hash,
          donationAmount,
          Number(receipt.blockNumber)
        );

        if (saveResult.success) {
          setSuccessData({
            amount: donationAmount,
            hash: hash,
          });
          setShowSuccessPopup(true);

          if (saveResult.wasDuplicate) {
            toast.success("✅ Donation was already recorded!");
          } else {
            toast.success("✅ Donation confirmed and recorded successfully!");
          }
        } else {
          toast.warning(
            "✅ Donation confirmed on chain, but could not save record to database."
          );
          setSuccessData({
            amount: donationAmount,
            hash: hash,
          });
          setShowSuccessPopup(true);
        }
      } else {
        const errorMsg = "❌ Donation failed on chain";
        console.error(errorMsg);
        setConfirmationError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (error: any) {
      console.error("❌ Error waiting for donation:", error);

      let errorMessage = "Failed to confirm donation";
      let shouldContinue = false;

      if (error?.name === "TimeoutError") {
        errorMessage =
          "Donation taking longer than expected. Check your wallet for status.";
        toast.warning(errorMessage);
      } else if (error?.message?.includes("not found")) {
        errorMessage = "Donation not found. It may have been dropped.";
        toast.error(errorMessage);
      } else {
        console.log("Assuming donation might be successful despite errors");
        shouldContinue = true;
        toast.success(
          "Donation submitted! Check your wallet for confirmation."
        );
        setIsConfirmed(true);
        await saveDonationToDB(hash, donationAmount);
      }

      if (shouldContinue) {
        setSuccessData({
          amount: donationAmount,
          hash: hash,
        });
        setShowSuccessPopup(true);
      } else {
        setConfirmationError(errorMessage);
      }
    } finally {
      setIsConfirming(false);
      setDonationHash(null);
    }
  };

  const saveDonationToDB = async (
    txHash: string,
    amount: string,
    blockNumber?: number
  ) => {
    try {
      let token: string | null = null;

      if (typeof window !== "undefined") {
        token =
          localStorage.getItem("token") || localStorage.getItem("auth-token");
      }

      if (!token && typeof document !== "undefined") {
        const cookieMatch = document.cookie.match(/token=([^;]+)/);
        token = cookieMatch ? cookieMatch[1] : null;
      }

      const requestBody = {
        projectAddress: project?.address,
        donorId: user?.id,
        donorWalletAddress,
        amount: parseFloat(amount),
        txHash,
        blockNumber,
      };

      console.log("Saving donation to DB:", {
        ...requestBody,
        hasToken: !!token,
      });

      const response = await fetch("/api/donations/record", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (response.ok) {
        console.log("✅ Donation recorded in database:", result);

        if (response.status === 200 && result.warning) {
          console.log("⚠️ Donation was already recorded previously");
          return { success: true, wasDuplicate: true };
        }

        return { success: true, wasDuplicate: false };
      } else {
        console.warn("⚠️ Could not record donation in database:", result.error);
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      console.error("Failed to save donation to database:", error);
      return { success: false, error: error.message };
    }
  };

  const resetSuccess = () => {
    setIsConfirmed(false);
    setConfirmationError(null);
    setDonationHash(null);
    setDonationAmount('');
    setShowSuccessPopup(false);
    setSuccessData(null);
  };

  return {
    donationAmount,
    setDonationAmount,
    donationHash,
    isDonating: isDonating || isConfirming, // Combine both states
    isConfirming,
    isConfirmed,
    confirmationError,
    showSuccessPopup,
    successData,
    handleDonate,
    canDonate,
    resetSuccess,
  };
}