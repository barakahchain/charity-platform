// hooks/useDonationHandler.ts
import { useState } from 'react';
import { useAccount, useWriteContract } from 'wagmi';
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

    setIsConfirmed(false);
    setConfirmationError(null);

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
    setIsConfirming(true);
    
    try {
      const receipt = await waitForTransactionReceipt(config, {
        hash: hash as `0x${string}`,
        confirmations: 1,
      });

      if (receipt.status === "success") {
        await saveDonationToDB(hash, donationAmount);
        setIsConfirmed(true);
        toast.success("✅ Donation confirmed!");
      } else {
        setConfirmationError("❌ Donation failed on chain");
        toast.error("Donation failed");
      }
    } catch (error) {
      console.error("Confirmation error:", error);
      setConfirmationError("Failed to confirm donation");
    } finally {
      setIsConfirming(false);
    }
  };

  const saveDonationToDB = async (txHash: string, amount: string) => {
    // Your existing saveDonationToDB logic
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
        return { success: true, wasDuplicate: result.warning ? true : false };
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
  };

  return {
    donationAmount,
    setDonationAmount,
    donationHash,
    isDonating,
    isConfirming,
    isConfirmed,
    confirmationError,
    handleDonate,
    canDonate,
    showSuccessPopup: isConfirmed && !confirmationError,
    successData: isConfirmed ? { 
      amount: donationAmount, 
      hash: donationHash! 
    } : null,
    resetSuccess,
  };
}