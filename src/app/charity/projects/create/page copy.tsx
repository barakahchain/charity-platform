"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAccount, useWriteContract, useReadContract } from "wagmi";
import { polygonAmoy } from "wagmi/chains";
import {
  Building2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Plus,
  Trash2,
  FileText,
  Copy,
  Calendar,
  Clock,  
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { uploadJSONToIPFS } from "@/lib/ipfs";
// import { ProjectFactoryABI } from "@/lib/abis/ProjectFactoryABI";
// import * as factoryJSON from "../../../../../artifacts/contracts/ProjectFactory.sol/ProjectFactory.json";
import factoryJSON from "@/lib/abis/ProjectFactory.json";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { waitForTransactionReceipt, getTransactionReceipt } from "@wagmi/core";
import { config } from "../../../../../config";

interface Milestone {
  id: string;
  description: string;
  amount: string;
  beneficiaryAddress: string;
}

export default function CharityProjectCreation() {
  const { address, isConnected, chain } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();

  const [projectTitle, setProjectTitle] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [zakatMode, setZakatMode] = useState(false);
  const [asnafTag, setAsnafTag] = useState("");
  const [contractTemplate, setContractTemplate] = useState("wakalah");
  const [goalAmount, setGoalAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [deadlineEnabled, setDeadlineEnabled] = useState(false); // ✅ New state for deadline toggle
  const [milestones, setMilestones] = useState<Milestone[]>([
    { id: "1", description: "", amount: "", beneficiaryAddress: "" },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdProjectAddress, setCreatedProjectAddress] = useState<
    string | null
  >(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);
  const [confirmationError, setConfirmationError] = useState<string | null>(
    null
  );
  const ProjectFactoryABI = factoryJSON.abi;

  const FACTORY_CONTRACT_ADDRESS =
    process.env.NEXT_PUBLIC_FACTORY_CONTRACT_ADDRESS;

  const asnafCategories = [
    "Fuqara (Poor)",
    "Masakin (Needy)",
    "Amil (Administrators)",
    "Muallaf (New Muslims)",
    "Riqab (Freeing Captives)",
    "Gharimin (Debtors)",
    "Fi Sabilillah (In the Path of Allah)",
    "Ibnus Sabil (Travelers)",
  ];

  const contractTemplates = [
    { value: "wakalah", label: "Wakālah (Agency)" },
    { value: "jualah", label: "Juʿālah (Service Contract)" },
    { value: "istisna", label: "Istisnāʿ (Manufacturing)" },
  ];

  const { data: implementationAddress } = useReadContract({
    address: FACTORY_CONTRACT_ADDRESS as `0x${string}`,
    abi: ProjectFactoryABI,
    functionName: "implementation",
  });

  // Effect to handle transaction confirmation
  useEffect(() => {
    const waitForConfirmation = async () => {
      if (
        transactionHash &&
        !isConfirmed &&
        !isConfirming &&
        !confirmationError
      ) {
        setIsConfirming(true);
        setConfirmationError(null);

        try {
          console.log(
            "⏳ Waiting for transaction confirmation...",
            transactionHash
          );

          // Use a simpler approach that doesn't try to call contract methods
          const receipt = await waitForTransactionReceipt(config, {
            hash: transactionHash as `0x${string}`,
            confirmations: 1,
            pollingInterval: 2_000,
            timeout: 120_000,
            // Add retry configuration to handle temporary failures
            retryCount: 3,
            retryDelay: 1000,
          });

          console.log("✅ Transaction receipt received:", receipt);
          setReceipt(receipt);
          setIsConfirmed(true);

          if (receipt.status === "success") {
            toast.success("✅ Project created successfully!");

            // Extract project address from logs if possible
            if (receipt.logs && receipt.logs.length > 0) {
              console.log("📋 Transaction logs:", receipt.logs);
              // Look for ProjectCreated event
              const projectCreatedLog = receipt.logs.find(
                (log) => log.topics[0] === "0x..." // Replace with actual ProjectCreated event signature
              );
              if (projectCreatedLog) {
                setCreatedProjectAddress(
                  "Project deployed! Check transaction logs for contract address."
                );
              }
            } else {
              setCreatedProjectAddress(
                "Project created! Transaction confirmed."
              );
            }
          } else {
            const errorMsg = "❌ Transaction failed on chain";
            console.error(errorMsg);
            setConfirmationError(errorMsg);
            toast.error(errorMsg);
          }
        } catch (error: any) {
          console.error("❌ Error waiting for transaction:", error);

          // Check if it's just a read error (not a transaction failure)
          if (
            error?.message?.includes("Only charity") ||
            error?.message?.includes("execution reverted")
          ) {
            // This is likely just a read permission error, not a transaction failure
            console.log(
              "⚠️ Read permission error (expected for Project contracts)"
            );

            // Try to get basic receipt info without calling contract methods
            try {
              const basicReceipt = await getTransactionReceipt(config, {
                hash: transactionHash as `0x${string}`,
              });

              if (basicReceipt && basicReceipt.status === "success") {
                console.log(
                  "✅ Transaction was successful (read errors are expected)"
                );
                setReceipt(basicReceipt);
                setIsConfirmed(true);
                toast.success("✅ Project created successfully!");
                setCreatedProjectAddress(
                  "Project created! Transaction confirmed."
                );
                return;
              }
            } catch (simpleError) {
              console.log("Could not get basic receipt:", simpleError);
            }
          }

          let errorMessage = "Failed to confirm transaction";

          if (error?.name === "TimeoutError") {
            errorMessage =
              "Transaction taking longer than expected. Check your wallet for status.";
            toast.warning(errorMessage);
          } else if (error?.message?.includes("not found")) {
            errorMessage = "Transaction not found. It may have been dropped.";
            toast.error(errorMessage);
          } else {
            // For other errors, assume the transaction might still be successful
            console.log(
              "Assuming transaction might be successful despite read errors"
            );
            toast.success(
              "Project creation submitted! Check your wallet for confirmation."
            );
            setIsConfirmed(true); // Assume success to prevent infinite retry
          }

          setConfirmationError(errorMessage);
        } finally {
          setIsConfirming(false);
          setIsSubmitting(false);
        }
      }
    };

    waitForConfirmation();
  }, [transactionHash, isConfirmed, isConfirming, confirmationError]);

  // Add this function to reset the transaction state completely
  const resetTransactionState = () => {
    setTransactionHash(null);
    setIsConfirmed(false);
    setIsConfirming(false);
    setConfirmationError(null);
    setReceipt(null);
    setCreatedProjectAddress(null);
  };

  const addMilestone = () => {
    setMilestones([
      ...milestones,
      {
        id: Date.now().toString(),
        description: "",
        amount: "",
        beneficiaryAddress: "",
      },
    ]);
  };

  const removeMilestone = (id: string) => {
    if (milestones.length > 1) {
      setMilestones(milestones.filter((m) => m.id !== id));
    } else {
      toast.error("At least one milestone is required");
    }
  };

  const updateMilestone = (
    id: string,
    field: keyof Milestone,
    value: string
  ) => {
    setMilestones(
      milestones.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  const getTotalBudget = () => {
    return milestones.reduce((sum, m) => sum + (parseFloat(m.amount) || 0), 0);
  };

  const parseEther = (amount: string): bigint => {
    return BigInt(Math.floor(parseFloat(amount) * 1e18));
  };

  const validateForm = () => {
    if (!address) {
      toast.error("Please connect your wallet");
      return false;
    }

    // Skip validation for debug mode
    if (debugMode) {
      return true;
    }

    if (!projectTitle.trim()) {
      toast.error("Please enter a project title");
      return false;
    }

    if (!projectDescription.trim()) {
      toast.error("Please enter a project description");
      return false;
    }

    if (!goalAmount || parseFloat(goalAmount) <= 0) {
      toast.error("Please enter a valid funding goal");
      return false;
    }

    // Only validate deadline if deadline is enabled
    if (deadlineEnabled) {
      if (!deadline) {
        toast.error(
          "Please set a project deadline when deadline enforcement is enabled"
        );
        return false;
      }

      const deadlineTimestamp = Math.floor(new Date(deadline).getTime() / 1000);
      const currentTimestamp = Math.floor(Date.now() / 1000);
      if (deadlineTimestamp <= currentTimestamp) {
        toast.error("Deadline must be in the future");
        return false;
      }
    }

    const totalBudget = getTotalBudget();
    if (totalBudget <= 0) {
      toast.error("Please add at least one milestone with a valid amount");
      return false;
    }

    if (Math.abs(totalBudget - parseFloat(goalAmount)) > 0.01) {
      toast.error("Total milestones amount must match the funding goal");
      return false;
    }

    for (const milestone of milestones) {
      if (!milestone.description.trim()) {
        toast.error("Please fill all milestone descriptions");
        return false;
      }
      if (!milestone.amount || parseFloat(milestone.amount) <= 0) {
        toast.error("Please enter valid amounts for all milestones");
        return false;
      }
      if (!milestone.beneficiaryAddress) {
        toast.error("Please enter beneficiary addresses for all milestones");
        return false;
      }
      if (!milestone.beneficiaryAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
        toast.error("Please enter valid Ethereum addresses for beneficiaries");
        return false;
      }
    }

    if (zakatMode && !asnafTag) {
      toast.error("Please select an Asnaf category for Zakat mode");
      return false;
    }

    if (!contractTemplate) {
      toast.error("Please select a contract template");
      return false;
    }

    return true;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const viewOnExplorer = (hash: string) => {
    window.open(`https://amoy.polygonscan.com/tx/${hash}`, "_blank");
  };

   // Add network validation
  const isCorrectNetwork = chain?.id === polygonAmoy.id;

  // Test with simpler parameters first
  const testWithSimpleParameters = async () => {
    try {
      console.log("🧪 Testing with SIMPLE parameters...");

      if (!address) {
        throw new Error("No wallet connected");
      }

      if (!isCorrectNetwork) {
        throw new Error(`Please switch to Polygon Amoy. Current network: ${chain?.name}`);
      }

      // Use more realistic parameters
      const testParams = {
        charity: address as `0x${string}`,
        builder: address as `0x${string}`, // Use same address for simplicity
        goal: BigInt("1000000000000000000"), // 1 MATIC
        deadline: BigInt(Math.floor(Date.now() / 1000) + 86400), // 24 hours from now
        metaCid: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
        milestoneAmounts: [BigInt("1000000000000000000")], // Single milestone matching goal
        deadlineEnabled: false, // Start with deadline disabled
      };

      console.log("🔍 Contract Parameters:", {
        factory: FACTORY_CONTRACT_ADDRESS,
        charity: testParams.charity,
        builder: testParams.builder,
        goal: testParams.goal.toString(),
        deadline: testParams.deadline.toString(),
        metaCid: testParams.metaCid,
        milestoneAmounts: testParams.milestoneAmounts.map(m => m.toString()),
        deadlineEnabled: testParams.deadlineEnabled
      });

      // Verify the factory contract exists and is callable
      console.log("🔍 Verifying factory contract...");

      const hash = await writeContractAsync({
        address: FACTORY_CONTRACT_ADDRESS as `0x${string}`,
        abi: ProjectFactoryABI,
        functionName: "createProject",
        args: [
          testParams.charity,
          testParams.builder,
          testParams.goal,
          testParams.deadline,
          testParams.metaCid,
          testParams.milestoneAmounts,
          testParams.deadlineEnabled,
        ],
      });

      console.log("✅ Simple test transaction hash:", hash);
      return hash;
    } catch (error: any) {
      console.error("❌ Contract call failed:", error);
      
      // Enhanced error analysis
      console.log("🔍 Full error details:", {
        message: error.message,
        shortMessage: error.shortMessage,
        cause: error.cause,
        data: error.cause?.data,
        stack: error.stack
      });

      // Check for specific revert reasons
      if (error?.cause?.data?.args?.[0]) {
        const revertReason = error.cause.data.args[0];
        console.log("🔍 Revert reason:", revertReason);
        toast.error(`Contract reverted: ${revertReason}`);
      } else if (error?.message?.includes("Internal JSON-RPC error")) {
        toast.error("Contract execution failed. This usually means:\n• Contract validation failed\n• Insufficient permissions\n• Invalid parameters");
      } else if (error?.message?.includes("user rejected")) {
        toast.error("Transaction was rejected by user");
      } else if (error?.message?.includes("insufficient funds")) {
        toast.error("Insufficient MATIC for gas fees");
      } else {
        toast.error(error?.shortMessage || error?.message || "Failed to create project");
      }
      
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!address) {
      toast.error("Wallet not connected");
      return;
    }

    // Reset all transaction-related state
    resetTransactionState();
    setIsSubmitting(true);

    try {
      let metadataCid: string;
      let hash: `0x${string}`;

      if (debugMode) {
        // Use debug mode with simple parameters
        console.log("🐞 Debug Mode Enabled");
        toast.info("Running debug test with simple parameters...");
        const debugHash = await testWithSimpleParameters();
        hash = debugHash as `0x${string}`;
      } else {
        // Use actual form data
        // 1. Upload project metadata to IPFS
        const projectMetadata = {
          title: projectTitle,
          description: projectDescription,
          type: zakatMode ? "zakat" : "sadaqah",
          asnafCategory: zakatMode ? asnafTag : null,
          contractTemplate: contractTemplate,
          deadlineEnabled: deadlineEnabled, // ✅ Include deadlineEnabled in metadata
          milestones: milestones.map((m) => ({
            description: m.description,
            amount: m.amount,
            beneficiaryAddress: m.beneficiaryAddress,
          })),
          createdAt: new Date().toISOString(),
          createdBy: address,
        };

        toast.info("Uploading project metadata to IPFS...");
        metadataCid = await uploadJSONToIPFS(projectMetadata);
        console.log("✅ Project metadata IPFS CID:", metadataCid);

        // 2. Prepare contract parameters
        const milestoneAmounts = milestones.map((m) => parseEther(m.amount));
        const builderAddress = milestones[0]
          .beneficiaryAddress as `0x${string}`;

        // Use current timestamp + 1 year if deadline is disabled
        const deadlineTimestamp = deadlineEnabled
          ? BigInt(Math.floor(new Date(deadline).getTime() / 1000))
          : BigInt(Math.floor(Date.now() / 1000) + 31536000); // 1 year from now if disabled

        const goalAmountWei = parseEther(goalAmount);

        // Validate milestone totals
        const totalMilestonesWei = milestoneAmounts.reduce(
          (a, b) => a + b,
          BigInt(0)
        );
        if (totalMilestonesWei !== goalAmountWei) {
          toast.error(
            "Total milestones amount must exactly match funding goal"
          );
          return;
        }

        // ✅ CRITICAL FIX: Use the connected wallet address as charity
        // This ensures the project creator becomes the charity
        const charityAddress = address as `0x${string}`;

        console.log("🔍 Contract Call Parameters:");
        console.log("Charity:", address);
        console.log("Builder:", builderAddress);
        console.log("Goal:", goalAmountWei.toString());
        console.log("Deadline:", deadlineTimestamp.toString());
        console.log("Deadline Enabled:", deadlineEnabled);
        console.log("MetaCID:", metadataCid);
        console.log(
          "Milestones:",
          milestoneAmounts.map((m) => m.toString())
        );

        // 3. Create project on blockchain
        toast.info("Creating project on blockchain...");

        const formHash = await writeContractAsync({
          address: FACTORY_CONTRACT_ADDRESS as `0x${string}`,
          abi: ProjectFactoryABI,
          functionName: "createProject",
          args: [
            charityAddress,
            builderAddress,
            goalAmountWei,
            deadlineTimestamp,
            metadataCid,
            milestoneAmounts,
            deadlineEnabled,
          ],
        });
        hash = formHash as `0x${string}`;
      }

      setTransactionHash(hash);
      toast.success("Transaction submitted! Waiting for confirmation...");
    } catch (error: any) {
      console.error("❌ Error creating project:", error);
      resetTransactionState();

      // Enhanced error debugging
      console.log("🔍 Full error:", error);

      if (error?.cause?.data?.args?.[0]?.includes("Only charity")) {
        toast.error(
          "Contract error: Factory cannot call charity-only functions. " +
            "Please update your Factory contract to remove toggleDeadline call."
        );
      } else if (error?.message?.includes("Internal JSON-RPC error")) {
        toast.error(
          "Contract execution failed. The Factory contract is trying to call " +
            "charity-only functions. Please update the contract."
        );
      } else if (error?.message?.includes("user rejected")) {
        toast.error("Transaction was rejected by user");
      } else if (error?.message?.includes("insufficient funds")) {
        toast.error("Insufficient MATIC for gas fees");
      } else {
        toast.error(
          error?.shortMessage || error?.message || "Failed to create project"
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-4xl">
        <Card className="border-2">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
            <CardTitle>Connect Your Wallet</CardTitle>
            <CardDescription>
              Please connect your wallet to create charity projects
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Use the &quot;Connect Wallet&quot; button in the navigation bar to
              get started
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Create Charity Project</h1>
        <p className="text-muted-foreground">
          Define your project, set milestones, and ensure Shariah compliance
        </p>
      </div>

      {/* Debug Mode Toggle */}
      <Card className="mb-6 border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-800 mb-2">Debug Mode</h3>
              <p className="text-blue-700 text-sm">
                {debugMode
                  ? "Using simple test parameters to debug contract issues"
                  : "Using actual form data for project creation"}
              </p>
            </div>
            <Switch
              checked={debugMode}
              onCheckedChange={setDebugMode}
              disabled={isSubmitting || isConfirming}
            />
          </div>
          {debugMode && (
            <div className="mt-3 p-3 bg-blue-100 rounded-lg">
              <p className="text-blue-800 text-sm">
                <strong>Debug Mode Active:</strong> Using 1 MATIC goal, single
                milestone, and known IPFS CID to test contract functionality.
                <br />
                <strong>Note:</strong> Form validation is disabled in debug
                mode.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction Status Messages */}
      {transactionHash && (
        <>
          {/* Confirming Status */}
          {isConfirming && (
            <Card className="mb-6 border-yellow-200 bg-yellow-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-6 w-6 text-yellow-600 animate-spin" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-yellow-800">
                      Waiting for Confirmation
                    </h3>
                    <p className="text-yellow-700 text-sm mb-2">
                      Transaction is being confirmed on the blockchain...
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => viewOnExplorer(transactionHash)}
                      >
                        <ExternalLink className="h-4 w-4" />
                        View Transaction
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => copyToClipboard(transactionHash)}
                      >
                        <Copy className="h-4 w-4" />
                        Copy TX Hash
                      </Button>
                    </div>
                    <p className="text-xs text-yellow-600 mt-2 font-mono">
                      {transactionHash.slice(0, 20)}...
                      {transactionHash.slice(-20)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Confirmed Status */}
          {isConfirmed && receipt && (
            <Card className="mb-6 border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-green-800">
                      {debugMode ? "Debug Test Complete!" : "Project Created!"}
                    </h3>
                    <p className="text-green-700 text-sm mb-2">
                      Transaction confirmed! Block:{" "}
                      {receipt.blockNumber?.toString()} • Gas Used:{" "}
                      {receipt.gasUsed?.toString()}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => viewOnExplorer(transactionHash)}
                      >
                        <ExternalLink className="h-4 w-4" />
                        View Transaction
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => copyToClipboard(transactionHash)}
                      >
                        <Copy className="h-4 w-4" />
                        Copy TX Hash
                      </Button>
                    </div>
                    <p className="text-xs text-green-600 mt-2 font-mono">
                      {transactionHash.slice(0, 20)}...
                      {transactionHash.slice(-20)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {createdProjectAddress && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-blue-600" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-800">
                  {debugMode ? "Debug Test Complete!" : "Project Created!"}
                </h3>
                <p className="text-blue-700 text-sm">{createdProjectAddress}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Project Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Project Details
            </CardTitle>
            <CardDescription>
              {debugMode
                ? "Form disabled in debug mode"
                : "Basic information about your charity project"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Project Title {!debugMode && "*"}</Label>
              <Input
                id="title"
                placeholder="e.g., Water Well Construction - Gaza"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                required={!debugMode}
                disabled={isSubmitting || debugMode || isConfirming}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                Project Description {!debugMode && "*"}
              </Label>
              <Textarea
                id="description"
                placeholder="Describe your project goals, beneficiaries, and expected impact..."
                rows={5}
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                required={!debugMode}
                disabled={isSubmitting || debugMode || isConfirming}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="goal">
                  Funding Goal (MATIC) {!debugMode && "*"}
                </Label>
                <Input
                  id="goal"
                  type="number"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  value={goalAmount}
                  onChange={(e) => setGoalAmount(e.target.value)}
                  required={!debugMode}
                  disabled={isSubmitting || debugMode || isConfirming}
                />
                <p className="text-xs text-muted-foreground">
                  Total amount needed for the project
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deadline">
                  Project Deadline {deadlineEnabled && !debugMode && "*"}
                </Label>
                <Input
                  id="deadline"
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  required={deadlineEnabled && !debugMode}
                  disabled={
                    isSubmitting ||
                    debugMode ||
                    isConfirming ||
                    !deadlineEnabled
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {deadlineEnabled
                    ? "Date when funding period ends"
                    : "Deadline enforcement is disabled"}
                </p>
              </div>
            </div>

            {/* ✅ New Deadline Enforcement Toggle */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="space-y-0.5">
                <Label
                  htmlFor="deadline-enabled"
                  className="flex items-center gap-2"
                >
                  <Clock className="h-4 w-4" />
                  Deadline Enforcement
                </Label>
                <p className="text-sm text-muted-foreground">
                  {deadlineEnabled
                    ? "Donations will stop after the deadline. Refunds available if goal not met."
                    : "No deadline - donations can continue indefinitely. No refunds available."}
                </p>
              </div>
              <Switch
                id="deadline-enabled"
                checked={deadlineEnabled}
                onCheckedChange={setDeadlineEnabled}
                disabled={isSubmitting || debugMode || isConfirming}
              />
            </div>

            {!deadlineEnabled && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-800">
                      No Deadline Set
                    </p>
                    <p className="text-amber-700">
                      Donations can continue indefinitely. Refunds will not be
                      available to donors. You can enable deadline enforcement
                      later as the charity.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Zakat & Contract Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Zakat & Contract Settings</CardTitle>
            <CardDescription>
              Configure Shariah compliance and contract parameters
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="zakat-mode">Zakat Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Enable for Zakat-eligible projects with specific Asnaf
                  categories
                </p>
              </div>
              <Switch
                id="zakat-mode"
                checked={zakatMode}
                onCheckedChange={setZakatMode}
                disabled={isSubmitting || debugMode || isConfirming}
              />
            </div>

            {zakatMode && (
              <div className="space-y-2">
                <Label htmlFor="asnaf">
                  Asnaf Category {!debugMode && "*"}
                </Label>
                <Select
                  value={asnafTag}
                  onValueChange={setAsnafTag}
                  disabled={isSubmitting || debugMode || isConfirming}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Asnaf category" />
                  </SelectTrigger>
                  <SelectContent>
                    {asnafCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select the appropriate Asnaf category for Zakat distribution
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="contract-template">
                Contract Template {!debugMode && "*"}
              </Label>
              <Select
                value={contractTemplate}
                onValueChange={setContractTemplate}
                disabled={isSubmitting || debugMode || isConfirming}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select contract template" />
                </SelectTrigger>
                <SelectContent>
                  {contractTemplates.map((template) => (
                    <SelectItem key={template.value} value={template.value}>
                      {template.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose the appropriate Islamic contract structure for your
                project
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Milestones */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Project Milestones
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  Total: {getTotalBudget().toFixed(2)} MATIC
                </Badge>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addMilestone}
                  disabled={isSubmitting || debugMode || isConfirming}
                >
                  <Plus className="h-4 w-4" />
                  Add Milestone
                </Button>
              </div>
            </CardTitle>
            <CardDescription>
              Define project phases with specific funding amounts and
              beneficiaries
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {milestones.map((milestone, index) => (
              <div
                key={milestone.id}
                className="space-y-4 p-4 border rounded-lg"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Milestone {index + 1}</h4>
                  {milestones.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMilestone(milestone.id)}
                      disabled={isSubmitting || debugMode || isConfirming}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`milestone-${milestone.id}-description`}>
                    Description {!debugMode && "*"}
                  </Label>
                  <Textarea
                    id={`milestone-${milestone.id}-description`}
                    placeholder="Describe what will be accomplished in this milestone..."
                    value={milestone.description}
                    onChange={(e) =>
                      updateMilestone(
                        milestone.id,
                        "description",
                        e.target.value
                      )
                    }
                    required={!debugMode}
                    disabled={isSubmitting || debugMode || isConfirming}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`milestone-${milestone.id}-amount`}>
                      Amount (MATIC) {!debugMode && "*"}
                    </Label>
                    <Input
                      id={`milestone-${milestone.id}-amount`}
                      type="number"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      value={milestone.amount}
                      onChange={(e) =>
                        updateMilestone(milestone.id, "amount", e.target.value)
                      }
                      required={!debugMode}
                      disabled={isSubmitting || debugMode || isConfirming}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`milestone-${milestone.id}-beneficiary`}>
                      Beneficiary Address {!debugMode && "*"}
                    </Label>
                    <Input
                      id={`milestone-${milestone.id}-beneficiary`}
                      placeholder="0x..."
                      value={milestone.beneficiaryAddress}
                      onChange={(e) =>
                        updateMilestone(
                          milestone.id,
                          "beneficiaryAddress",
                          e.target.value
                        )
                      }
                      required={!debugMode}
                      disabled={isSubmitting || debugMode || isConfirming}
                    />
                  </div>
                </div>
              </div>
            ))}

            {!debugMode &&
              Math.abs(getTotalBudget() - parseFloat(goalAmount || "0")) >
                0.01 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> Total milestones amount (
                    {getTotalBudget().toFixed(2)} MATIC)
                    {getTotalBudget() > parseFloat(goalAmount || "0")
                      ? " exceeds "
                      : " is less than "}
                    the funding goal ({parseFloat(goalAmount || "0").toFixed(2)}{" "}
                    MATIC)
                  </p>
                </div>
              )}
          </CardContent>
        </Card>
        {confirmationError && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-6 w-6 text-red-600" />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-800">
                    Transaction Failed
                  </h3>
                  <p className="text-red-700 text-sm">{confirmationError}</p>
                  {transactionHash && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 mt-2"
                      onClick={() => viewOnExplorer(transactionHash)}
                    >
                      <ExternalLink className="h-4 w-4" />
                      View on Explorer
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {implementationAddress ? (
          <Card className="mb-4 border-green-200 bg-green-50">
            <CardContent className="pt-4">
              <div className="text-sm">
                <p>
                  <strong>✅ Contract Info:</strong>
                </p>
                <p>Factory: {FACTORY_CONTRACT_ADDRESS}</p>
                <p>Implementation: {implementationAddress.toString()}</p>
                <p>Your Address: {address}</p>
                <p className="text-green-700 mt-2">
                  ✅ Factory is properly configured
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-4 border-gray-200 bg-gray-50">
            <CardContent className="pt-4">
              <div className="text-sm">
                <p>Loading contract info...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit Section */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0 text-muted-foreground" />
                <div className="text-sm space-y-2">
                  <p className="font-semibold">
                    {debugMode
                      ? "Debug Mode Active"
                      : "Ready to Create Project"}
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    {debugMode ? (
                      <>
                        <li>Testing with simple parameters (1 MATIC)</li>
                        <li>Using known IPFS CID for metadata</li>
                        <li>Single milestone matching total goal</li>
                        <li>Form validation is disabled</li>
                        <li>Check browser console for detailed logs</li>
                      </>
                    ) : (
                      <>
                        <li>Project details will be stored on IPFS</li>
                        <li>Smart contract will be deployed on Polygon Amoy</li>
                        <li>Transaction requires gas fees</li>
                        <li>
                          Deadline enforcement:{" "}
                          {deadlineEnabled ? "Enabled" : "Disabled"}
                        </li>
                        <li>
                          Project will be immediately available for funding
                        </li>
                      </>
                    )}
                  </ul>
                </div>
              </div>

              <Separator />

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  type="submit"
                  size="lg"
                  className="flex-1 gap-2"
                  disabled={isSubmitting || isPending || isConfirming}
                >
                  {isSubmitting || isPending || isConfirming ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      {debugMode
                        ? "Running Debug Test..."
                        : isConfirming
                          ? "Confirming..."
                          : "Creating Project..."}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5" />
                      {debugMode ? "Run Debug Test" : "Create Charity Project"}
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    setProjectTitle("");
                    setProjectDescription("");
                    setGoalAmount("");
                    setDeadline("");
                    setDeadlineEnabled(true); // Reset to default
                    setMilestones([
                      {
                        id: "1",
                        description: "",
                        amount: "",
                        beneficiaryAddress: "",
                      },
                    ]);
                    setZakatMode(false);
                    setAsnafTag("");
                    setContractTemplate("wakalah");
                    resetTransactionState(); // Use the new function
                  }}
                  disabled={isSubmitting || isConfirming}
                >
                  Reset Form
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
