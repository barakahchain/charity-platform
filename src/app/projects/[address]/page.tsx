"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  useAccount,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { waitForTransactionReceipt, getTransactionReceipt } from "@wagmi/core";
import { polygonAmoy } from "wagmi/chains";
import { config } from "../../../../config";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  ExternalLink,
  Calendar,
  Target,
  Users,
  Wallet,
  AlertCircle,
  CheckCircle2,
  FileText,
  User,
  Clock,
  HandCoins,
  ArrowLeft,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import Link from "next/link";
import { useUser } from "@/app/stores/auth-store";
// import { abi as ProjectAbi } from "@/lib/abis/Project.json";
import ProjectAbi from "@/lib/abis/Project.json";

// Reuse your existing interfaces
interface ProjectMetadata {
  title: string;
  description: string;
  type: "zakat" | "sadaqah";
  asnafCategory?: string;
  contractTemplate: string;
  milestones: Array<{
    description: string;
    amount: string;
    beneficiaryAddress: string;
  }>;
  createdAt: string;
  createdBy: string;
}

interface ProjectData {
  address: string;
  goal: bigint;
  deadline: bigint;
  completed: boolean;
  charity: string;
  builder: string;
  totalDonated: bigint;
  deadlineEnabled: boolean;
  metadata?: ProjectMetadata;
}

// Use the imported ABI from Project.json
const PROJECT_ABI = ProjectAbi.abi;

export default function ProjectPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  // Unwrap the params promise
  const { address } = React.use(params);
  const router = useRouter();
  // Get user from Zustand
  const user = useUser();

  const { isConnected } = useAccount();
  const { address: donorWalletAddress } = useAccount();

  const { writeContract, isPending: isDonating } = useWriteContract();
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [donationAmount, setDonationAmount] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  const [donationHash, setDonationHash] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [confirmationError, setConfirmationError] = useState<string | null>(
    null
  );
  const [dataVersion, setDataVersion] = useState(0);

  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successData, setSuccessData] = useState<{
    amount: string;
    hash: string;
  } | null>(null);

  // Fix the ABI type issue by filtering only function types
  const getViewFunctions = (abi: any[]) => {
    return abi.filter(
      (item) =>
        item.type === "function" &&
        (item.stateMutability === "view" || item.stateMutability === "pure")
    );
  };

  // Get all view functions from the ABI
  const viewFunctions = getViewFunctions(PROJECT_ABI);

  // Create contracts configuration with proper typing
  const contracts = viewFunctions.map((func) => ({
    address: address as `0x${string}`,
    abi: [func] as const, // Wrap in array and cast as const
    functionName: func.name,
  }));

  // Fetch project data using all view functions
  const { data: projectData } = useReadContracts({
    contracts,
  });

  // Update the fetchMetadataFromIPFS function to handle null/undefined
  const fetchMetadataFromIPFS = async (
    cid: string | null | undefined
  ): Promise<ProjectMetadata | undefined> => {
    if (!cid || cid === "null" || cid === "undefined") {
      console.warn("No metadata CID provided");
      return undefined;
    }

    const gateways = [
      `https://ipfs.io/ipfs/${cid}`,
      `https://cloudflare-ipfs.com/ipfs/${cid}`,
      `https://gateway.pinata.cloud/ipfs/${cid}`,
      `https://${cid}.ipfs.dweb.link/`,
    ];

    for (const gateway of gateways) {
      try {
        const response = await fetch(gateway);
        if (response.ok) {
          return await response.json();
        }
      } catch (error) {
        continue;
      }
    }

    console.warn(`Could not fetch metadata from any gateway for CID: ${cid}`);
    return undefined;
  };

  // Update the fetchProjectData function
  const fetchProjectData = async () => {
    if (!projectData) return;

    try {
      // Create a map of function names to results
      const resultMap: Record<string, any> = {};
      viewFunctions.forEach((func, index) => {
        if (projectData[index]?.status === "success") {
          resultMap[func.name] = projectData[index].result;
        }
      });

      // Extract values with defaults
      const goal = resultMap.goal || BigInt(0);
      const deadline = resultMap.deadline || BigInt(0);
      const completed = resultMap.completed || false;
      const charity = resultMap.charity || "";
      const builder = resultMap.builder || "";
      const totalDonated = resultMap.totalDonated || BigInt(0);
      const deadlineEnabled = resultMap.deadlineEnabled || false;
      const metaCid = resultMap.metaCid || "";

      // Fetch IPFS metadata (only if metaCid exists)
      let metadata: ProjectMetadata | undefined;
      if (metaCid && metaCid !== "null" && metaCid !== "undefined") {
        try {
          metadata = await fetchMetadataFromIPFS(metaCid as string);
        } catch (error) {
          console.warn("Could not fetch metadata:", error);
        }
      }

      setProject({
        address: address,
        goal: goal as bigint,
        deadline: deadline as bigint,
        completed: completed as boolean,
        charity: charity as string,
        builder: builder as string,
        totalDonated: totalDonated as bigint,
        deadlineEnabled: deadlineEnabled as boolean,
        metadata,
      });
    } catch (error) {
      console.error("Error processing project data:", error);
      toast.error("Failed to load project data");
    } finally {
      setLoading(false);
    }
  };

  // Use a ref to track processed hashes to prevent multiple confirmations
  const processedHashes = useRef<Set<string>>(new Set());

  useEffect(() => {
    const waitForConfirmation = async () => {
      if (donationHash && !isConfirmed && !isConfirming && !confirmationError) {
        // Check if we've already processed this hash
        if (processedHashes.current.has(donationHash)) {
          console.log("Already processed this donation hash, skipping");
          return;
        }

        // Mark this hash as being processed
        processedHashes.current.add(donationHash);
        setIsConfirming(true);
        setConfirmationError(null);

        try {
          console.log("⏳ Waiting for donation confirmation...", donationHash);

          const receipt = await waitForTransactionReceipt(config, {
            hash: donationHash as `0x${string}`,
            confirmations: 1,
            pollingInterval: 2_000,
            timeout: 120_000,
            retryCount: 3,
            retryDelay: 1000,
          });

          console.log("✅ Donation receipt received:", receipt);
          setIsConfirmed(true);

          if (receipt.status === "success") {
            // Save to database with user ID
            const saveResult = await saveDonationToDB(
              donationHash,
              donationAmount,
              Number(receipt.blockNumber)
            );

            if (saveResult.success) {
              // Show success popup instead of immediate reload
              setSuccessData({
                amount: donationAmount,
                hash: donationHash,
              });
              setShowSuccessPopup(true);

              if (saveResult.wasDuplicate) {
                toast.success("✅ Donation was already recorded!");
              } else {
                toast.success(
                  "✅ Donation confirmed and recorded successfully!"
                );
              }
            } else {
              toast.warning(
                "✅ Donation confirmed on chain, but could not save record to database."
              );
              // Still show success popup
              setSuccessData({
                amount: donationAmount,
                hash: donationHash,
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
            // For other errors, assume the transaction might still be successful
            console.log("Assuming donation might be successful despite errors");
            shouldContinue = true;
            toast.success(
              "Donation submitted! Check your wallet for confirmation."
            );
            setIsConfirmed(true);
            // Try to save anyway (it will handle duplicates)
            await saveDonationToDB(donationHash, donationAmount);
          }

          if (shouldContinue) {
            setSuccessData({
              amount: donationAmount,
              hash: donationHash,
            });
            setShowSuccessPopup(true);
          } else {
            setConfirmationError(errorMessage);
          }
        } finally {
          setIsConfirming(false);
          setDonationHash(null);
          // Note: We keep the hash in processedHashes to prevent re-processing
        }
      }
    };

    waitForConfirmation();
  }, [
    donationHash,
    isConfirmed,
    isConfirming,
    confirmationError,
    donationAmount,
    donorWalletAddress,
    user,
    address,
  ]);

  const saveDonationToDB = async (
    txHash: string,
    amount: string,
    blockNumber?: number
  ) => {
    try {
      // Get the JWT token - check if using localStorage or cookies
      let token: string | null = null;

      // Try to get from localStorage
      if (typeof window !== "undefined") {
        token =
          localStorage.getItem("token") || localStorage.getItem("auth-token");
      }

      // If no token in localStorage, check cookies
      if (!token && typeof document !== "undefined") {
        const cookieMatch = document.cookie.match(/token=([^;]+)/);
        token = cookieMatch ? cookieMatch[1] : null;
      }

      // Include donorId from the logged-in user
      const requestBody = {
        projectAddress: address,
        donorId: user?.id, // Use the logged-in user's ID
        donorWalletAddress, // Still include wallet address for reference
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
          // Only add Authorization header if we have a token
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (response.ok) {
        console.log("✅ Donation recorded in database:", result);

        // Check if it was a duplicate
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

  // Update the donation button to check for user
  const handleDonate = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }

    // Check if user is logged in
    if (!user) {
      toast.error("Please log in to make a donation");
      // Optionally redirect to login
      // router.push('/login');
      return;
    }

    if (!donationAmount || parseFloat(donationAmount) <= 0) {
      toast.error("Please enter a valid donation amount");
      return;
    }

    if (!project) {
      toast.error("Project data not loaded");
      return;
    }

    // Check if project is still active
    if (project.completed) {
      toast.error(
        "This project has been completed and no longer accepts donations"
      );
      return;
    }

    if (
      project.deadlineEnabled &&
      Number(project.deadline) * 1000 < Date.now()
    ) {
      toast.error(
        "This project deadline has passed and no longer accepts donations"
      );
      return;
    }

    // Reset confirmation state
    setIsConfirmed(false);
    setConfirmationError(null);

    try {
      const amountInWei = BigInt(Math.floor(parseFloat(donationAmount) * 1e18));

      writeContract(
        {
          address: address as `0x${string}`,
          abi: PROJECT_ABI,
          functionName: "donate",
          value: amountInWei,
        },
        {
          onSuccess: (hash) => {
            toast.success("Donation submitted! Waiting for confirmation...");
            setDonationHash(hash); // This will trigger the useEffect
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

  // Helper functions
  const formatAmount = (amount: bigint) => {
    return (Number(amount) / 1e18).toFixed(2);
  };

  const formatDate = (timestamp: bigint) => {
    return new Date(Number(timestamp) * 1000).toLocaleDateString();
  };

  const getProgressPercentage = (donated: bigint, goal: bigint) => {
    if (goal === BigInt(0)) return 0;
    return Math.min(100, (Number(donated) / Number(goal)) * 100);
  };

  const getStatusBadge = (project: ProjectData) => {
    if (project.completed) {
      return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
    }
    if (
      project.deadlineEnabled &&
      Number(project.deadline) * 1000 < Date.now()
    ) {
      return <Badge className="bg-red-100 text-red-800">Expired</Badge>;
    }
    return <Badge className="bg-blue-100 text-blue-800">Active</Badge>;
  };

  const getContractTemplateBadge = (template: string) => {
    const templates: { [key: string]: string } = {
      wakalah: "Wakālah",
      jualah: "Juʿālah",
      istisna: "Istisnāʿ",
    };
    return templates[template] || template;
  };

  const viewOnExplorer = (address: string) => {
    window.open(`https://amoy.polygonscan.com/address/${address}`, "_blank");
  };

  useEffect(() => {
    fetchProjectData();
  }, [projectData, address, dataVersion]);

  // if (!isConnected) {
  //   return (
  //     <div className="container mx-auto px-4 py-20 max-w-6xl">
  //       <Card className="border-2">
  //         <CardHeader className="text-center">
  //           <AlertCircle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
  //           <CardTitle>Connect Your Wallet</CardTitle>
  //           <CardDescription>
  //             Please connect your wallet to view project details
  //           </CardDescription>
  //         </CardHeader>
  //       </Card>
  //     </div>
  //   );
  // }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-64 w-full" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-48 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-6xl">
        <Card className="border-2">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <CardTitle>Project Not Found</CardTitle>
            <CardDescription>
              The project you're looking for doesn't exist or couldn't be
              loaded.
            </CardDescription>
            <Button asChild className="mt-4">
              <Link href="/projects">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Projects
              </Link>
            </Button>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const progressPercentage = getProgressPercentage(
    project.totalDonated,
    project.goal
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Back Button */}
      <Button variant="ghost" asChild className="mb-6">
        <Link href="/projects">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Link>
      </Button>

      {/* Header Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                {project.metadata?.title || "Untitled Project"}
              </h1>
              <p className="text-muted-foreground text-lg">
                {project.metadata?.description || "No description available"}
              </p>
            </div>
            {getStatusBadge(project)}
          </div>

          {/* Progress Section */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Raised: {formatAmount(project.totalDonated)} MATIC
                  </span>
                  <span className="font-semibold">
                    Goal: {formatAmount(project.goal)} MATIC
                  </span>
                  <span className="text-muted-foreground">
                    {progressPercentage.toFixed(1)}% Funded
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-3" />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{Math.floor(progressPercentage)}% complete</span>
                  <span>
                    {formatAmount(
                      BigInt(
                        Number(project.goal) - Number(project.totalDonated)
                      )
                    )}{" "}
                    MATIC needed
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Donation Card */}
        <Card className="bg-gradient-to-br from-green-50 to-blue-50 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HandCoins className="h-5 w-5" />
              Support this Project
            </CardTitle>
            <CardDescription>
              Your donation helps make this project a reality
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="donationAmount">Donation Amount (MATIC)</Label>
              <Input
                id="donationAmount"
                type="number"
                placeholder="0.00"
                min="0"
                step="0.01"
                value={donationAmount}
                onChange={(e) => setDonationAmount(e.target.value)}
                disabled={
                  isDonating ||
                  project.completed ||
                  (project.deadlineEnabled &&
                    Number(project.deadline) * 1000 < Date.now())
                }
              />
            </div>
            <Button
              className="w-full gap-2"
              size="lg"
              onClick={handleDonate}
              disabled={
                !isConnected ||
                !user ||
                isDonating ||
                isConfirming ||
                !donationAmount ||
                parseFloat(donationAmount) <= 0 ||
                project.completed ||
                (project.deadlineEnabled &&
                  Number(project.deadline) * 1000 < Date.now()) ||
                showSuccessPopup // Disable while showing success popup
              }
            >
              {isDonating || isConfirming ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {isConfirming ? "Confirming..." : "Donating..."}
                </>
              ) : (
                <>
                  <HandCoins className="h-4 w-4" />
                  Donate Now
                </>
              )}
            </Button>

            {(project.completed ||
              (project.deadlineEnabled &&
                Number(project.deadline) * 1000 < Date.now())) && (
              <p className="text-sm text-red-600 text-center">
                {project.completed
                  ? "This project is completed and no longer accepts donations"
                  : "This project deadline has passed and no longer accepts donations"}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs Navigation */}
          <div className="border-b">
            <nav className="flex space-x-8">
              {["overview", "milestones", "updates"].map((tab) => (
                <button
                  key={tab}
                  className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                    activeTab === tab
                      ? "border-green-500 text-green-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === "overview" && (
            <Card>
              <CardHeader>
                <CardTitle>Project Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Project Description</h4>
                  <p className="text-muted-foreground">
                    {project.metadata?.description ||
                      "No detailed description available."}
                  </p>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Contract Type
                      </p>
                      <p className="font-semibold">
                        {project.metadata
                          ? getContractTemplateBadge(
                              project.metadata.contractTemplate
                            )
                          : "Unknown"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Wallet className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Project Type
                      </p>
                      <p className="font-semibold capitalize">
                        {project.metadata?.type || "Unknown"}
                      </p>
                    </div>
                  </div>

                  {project.metadata?.asnafCategory && (
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Asnaf Category
                        </p>
                        <p className="font-semibold">
                          {project.metadata.asnafCategory}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Created</p>
                      <p className="font-semibold">
                        {project.metadata?.createdAt
                          ? new Date(
                              project.metadata.createdAt
                            ).toLocaleDateString()
                          : "Unknown"}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "milestones" && (
            <Card>
              <CardHeader>
                <CardTitle>Project Milestones</CardTitle>
                <CardDescription>
                  Breakdown of project phases and funding allocation
                </CardDescription>
              </CardHeader>
              <CardContent>
                {project.metadata?.milestones &&
                project.metadata.milestones.length > 0 ? (
                  <div className="space-y-4">
                    {project.metadata.milestones.map((milestone, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold">
                            Milestone {index + 1}
                          </h4>
                          <Badge variant="outline">
                            {parseFloat(milestone.amount).toFixed(2)} MATIC
                          </Badge>
                        </div>
                        <p className="text-muted-foreground text-sm">
                          {milestone.description}
                        </p>
                        <div className="mt-2 text-xs text-muted-foreground">
                          Beneficiary: {milestone.beneficiaryAddress}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    No milestones defined for this project.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "updates" && (
            <Card>
              <CardHeader>
                <CardTitle>Project Updates</CardTitle>
                <CardDescription>
                  Latest news and progress updates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  No updates available yet. Check back later for project
                  progress reports.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Project Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Project Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Charity Address</p>
                <p
                  className="font-mono text-sm truncate"
                  title={project.charity}
                >
                  {project.charity}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Builder Address</p>
                <p
                  className="font-mono text-sm truncate"
                  title={project.builder}
                >
                  {project.builder}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Project Address</p>
                <p
                  className="font-mono text-sm truncate"
                  title={project.address}
                >
                  {project.address}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Deadline</p>
                <p className="font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {formatDate(project.deadline)}
                  {project.deadlineEnabled && (
                    <Badge variant="outline" className="text-xs">
                      Enforced
                    </Badge>
                  )}
                </p>
              </div>

              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => viewOnExplorer(project.address)}
              >
                <ExternalLink className="h-4 w-4" />
                View on Explorer
              </Button>
            </CardContent>
          </Card>

          {/* Contract Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Contract Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Status</span>
                {getStatusBadge(project)}
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Type</span>
                <Badge variant="outline" className="capitalize">
                  {project.metadata?.type || "Unknown"}
                </Badge>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Template</span>
                <Badge variant="outline">
                  {project.metadata
                    ? getContractTemplateBadge(
                        project.metadata.contractTemplate
                      )
                    : "Unknown"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Success Popup */}
      {showSuccessPopup && successData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md bg-gradient-to-br from-green-50 to-emerald-100 border-green-200">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-green-800">
                Donation Successful! 🎉
              </CardTitle>
              <CardDescription className="text-green-700">
                Thank you for your generous contribution
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <div className="bg-white rounded-lg p-4 border border-green-200">
                <p className="font-semibold text-lg text-green-800">
                  {successData.amount} MATIC
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Successfully donated to the project
                </p>
              </div>

              <div className="text-xs text-muted-foreground break-all bg-white/50 p-2 rounded">
                TX: {successData.hash}
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    window.open(
                      `https://amoy.polygonscan.com/tx/${successData.hash}`,
                      "_blank"
                    );
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View TX
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    setShowSuccessPopup(false);
                    setSuccessData(null);
                    // Reload the page after closing popup
                    window.location.reload();
                  }}
                >
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
