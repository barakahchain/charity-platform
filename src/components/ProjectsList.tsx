"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useAccount, useReadContracts } from "wagmi";
import { polygonAmoy } from "wagmi/chains";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Filter,
  Search,
  FileText,
  Database,
  Shield,
} from "lucide-react";
import { ProjectFactoryABI } from "@/lib/abis/ProjectFactoryABI";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Project } from "@/db/types";

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
  // Database fields
  id?: number;
  title?: string;
  description?: string;
  totalAmount?: number;
  fundedBalance?: number;
  status?: string;
  contractTemplate?: string;
  zakatMode?: boolean;
  asnafTag?: string | null;
  createdAt?: string;
  blockchainTxHash?: string | null;
  contractAddress?: string | null;
}

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

// Minimal ABI for on-chain fallback
const PROJECT_ABI = [
  {
    name: "goal",
    type: "function",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    name: "deadline",
    type: "function",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    name: "completed",
    type: "function",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    name: "charity",
    type: "function",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    name: "builder",
    type: "function",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    name: "totalDonated",
    type: "function",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    name: "deadlineEnabled",
    type: "function",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    name: "metaCid",
    type: "function",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
] as const;

export default function ProjectsList() {
  const { address, isConnected, chain } = useAccount();
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dbOnlyProjects, setDbOnlyProjects] = useState<Project[]>([]);
  const [onChainOnlyAddresses, setOnChainOnlyAddresses] = useState<string[]>(
    []
  );

  const FACTORY_CONTRACT_ADDRESS =
    process.env.NEXT_PUBLIC_FACTORY_CONTRACT_ADDRESS;

  // Add this function inside your component
  const syncProjectToDB = async (project: ProjectData) => {
    try {
      const response = await fetch("/api/projects/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address: project.address,
          goal: project.goal.toString(),
          deadline: project.deadline.toString(),
          completed: project.completed,
          charity: project.charity,
          builder: project.builder,
          totalDonated: project.totalDonated.toString(),
          deadlineEnabled: project.deadlineEnabled,
          metadata: project.metadata,
        }),
      });

      const result = await response.json();
      if (result.success) {
        console.log("Project synced to DB:", result.project);
        // Optionally update local state if needed
        return result.project;
      }
    } catch (error) {
      console.error("Error syncing project to DB:", error);
    }
    return null;
  };

  // 1. FIRST: Fetch from database (fast, no wallet needed)
  useEffect(() => {
    const fetchFromDatabase = async () => {
      try {
        setLoading(true);

        // Fetch all projects from your API endpoint
        const response = await fetch("/api/projects/public", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const dbProjects: Project[] = await response.json();
          setDbOnlyProjects(dbProjects);

          // Transform database projects to ProjectData format
          const initialProjects: ProjectData[] = dbProjects.map((project) => ({
            address: project.contractAddress || project.walletAddress,
            goal: BigInt(project.totalAmount * 1e18), // Convert to wei
            deadline: project.deadline
              ? BigInt(Math.floor(new Date(project.deadline).getTime() / 1000))
              : BigInt(0),
            completed: project.status === "completed",
            charity: "", // Will be filled from on-chain if needed
            builder: "", // Will be filled from on-chain if needed
            totalDonated: BigInt(project.fundedBalance * 1e18),
            deadlineEnabled: !!project.deadline,
            // Database fields
            id: project.id,
            title: project.title,
            description: project.description,
            totalAmount: project.totalAmount,
            fundedBalance: project.fundedBalance,
            status: project.status,
            contractTemplate: project.contractTemplate,
            zakatMode: project.zakatMode,
            asnafTag: project.asnafTag,
            createdAt: project.createdAt,
            blockchainTxHash: project.blockchainTxHash,
            contractAddress: project.contractAddress,
          }));

          setProjects(initialProjects);
          setFilteredProjects(initialProjects);
        }
      } catch (error) {
        console.error("Error fetching from database:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFromDatabase();
  }, []);

  // 2. SECOND: Get all project addresses from factory for comparison
  const { data: projectAddresses, error: addressesError } = useReadContracts({
    contracts: [
      {
        address: FACTORY_CONTRACT_ADDRESS as `0x${string}`,
        abi: ProjectFactoryABI,
        functionName: "getAllProjects",
      },
    ],
    query: {
      enabled: isConnected && !!FACTORY_CONTRACT_ADDRESS,
    },
  });

  // 3. Identify projects that exist on-chain but not in our database
  useEffect(() => {
    if (projectAddresses?.[0]?.result && dbOnlyProjects.length > 0) {
      const onChainAddresses = projectAddresses[0].result as string[];
      const dbAddresses = dbOnlyProjects
        .map((p) => p.contractAddress || p.walletAddress)
        .filter(Boolean);

      // Find addresses that exist on-chain but not in our database
      const missingAddresses = onChainAddresses.filter(
        (addr) => !dbAddresses.includes(addr)
      );

      if (missingAddresses.length > 0) {
        setOnChainOnlyAddresses(missingAddresses);
        console.log(
          `Found ${missingAddresses.length} projects on-chain that aren't in DB`
        );
        console.log('missingAddresses:', missingAddresses);
        console.log( 'dbOnlyProjects', dbOnlyProjects);
      }
    }
  }, [projectAddresses, dbOnlyProjects]);

  // 4. Fetch on-chain data for projects missing from database
  const missingProjectContracts = onChainOnlyAddresses
    .map((address) =>
      PROJECT_ABI.map((abiItem) => ({
        address: address as `0x${string}`,
        abi: PROJECT_ABI,
        functionName: abiItem.name,
      }))
    )
    .flat();

  const { data: onChainData } = useReadContracts({
    contracts: missingProjectContracts,
    query: {
      enabled: missingProjectContracts.length > 0,
    },
  });

  // 5. Combine database data with on-chain fallback data
  useEffect(() => {
    const fetchAndCombineOnChainData = async () => {
      if (!onChainData || onChainOnlyAddresses.length === 0) return;

      const projectsPerAddress = PROJECT_ABI.length;
      const onChainProjects: ProjectData[] = [];

      for (let i = 0; i < onChainOnlyAddresses.length; i++) {
        const address = onChainOnlyAddresses[i];
        const baseIndex = i * projectsPerAddress;

        // Extract contract data
        const goal = (onChainData[baseIndex]?.result as bigint) || BigInt(0);
        const deadline =
          (onChainData[baseIndex + 1]?.result as bigint) || BigInt(0);
        const completed =
          (onChainData[baseIndex + 2]?.result as boolean) || false;
        const charity = (onChainData[baseIndex + 3]?.result as string) || "";
        const builder = (onChainData[baseIndex + 4]?.result as string) || "";
        const totalDonated =
          (onChainData[baseIndex + 5]?.result as bigint) || BigInt(0);
        const deadlineEnabled =
          (onChainData[baseIndex + 6]?.result as boolean) || false;
        const metaCid = onChainData[baseIndex + 7]?.result as string;

        // Fetch IPFS metadata if available
        let metadata: ProjectMetadata | undefined;
        if (metaCid) {
          try {
            metadata = await fetchMetadataFromIPFS(metaCid);
          } catch (error) {
            console.warn(`Could not fetch metadata for ${address}:`, error);
          }
        }

        const projectData: ProjectData = {
          address,
          goal,
          deadline,
          completed,
          charity,
          builder,
          totalDonated,
          deadlineEnabled,
          metadata,
          // Fallback to on-chain data for missing fields
          title: metadata?.title || `On-Chain Project ${address.slice(0, 8)}`,
          description:
            metadata?.description || "Project created directly on-chain",
          totalAmount: Number(goal) / 1e18,
          fundedBalance: Number(totalDonated) / 1e18,
          status: completed
            ? "completed"
            : deadlineEnabled && Number(deadline) * 1000 < Date.now()
              ? "expired"
              : "active",
          contractTemplate: metadata?.contractTemplate || "unknown",
          zakatMode: metadata?.type === "zakat",
          asnafTag: metadata?.asnafCategory,
        };

        // Sync this project to the database
        const syncedProject = await syncProjectToDB(projectData);
        if (syncedProject) {
          // If sync was successful, use the DB data (with ID)
          projectData.id = syncedProject.id;
          projectData.title = syncedProject.title;
          projectData.description = syncedProject.description;
          projectData.status = syncedProject.status;
          projectData.contractTemplate = syncedProject.contractTemplate;
          projectData.zakatMode = syncedProject.zakatMode;
          projectData.asnafTag = syncedProject.asnafTag;
        }

        onChainProjects.push(projectData);
      }

      // Combine database projects with on-chain only projects
      setProjects((prev) => {
        const combined = [...prev, ...onChainProjects];
        setFilteredProjects(combined);
        return combined;
      });
    };

    fetchAndCombineOnChainData();
  }, [onChainData, onChainOnlyAddresses]);

  // Optional: Periodically refresh on-chain data for all projects
  useEffect(() => {
    if (!isConnected || projects.length === 0) return;

    const refreshInterval = setInterval(
      async () => {
        // You could implement selective refresh here
        // For example, only refresh active projects
        console.log("Refreshing on-chain data...");

        // This would re-fetch on-chain data periodically
        // You might want to implement this more selectively
      },
      10 * 60 * 1000
    ); // Every 10 minutes

    return () => clearInterval(refreshInterval);
  }, [isConnected, projects.length]);

  // IPFS metadata fetcher
  const fetchMetadataFromIPFS = async (
    cid: string
  ): Promise<ProjectMetadata> => {
    // Try multiple IPFS gateways for reliability
    const gateways = [
      `https://ipfs.io/ipfs/${cid}`,
      `https://cloudflare-ipfs.com/ipfs/${cid}`,
      `https://gateway.pinata.cloud/ipfs/${cid}`,
      `https://${cid}.ipfs.dweb.link/`,
    ];

    for (const gateway of gateways) {
      try {
        const response = await fetch(gateway, {
          headers: { Accept: "application/json" },
        });
        if (response.ok) {
          return await response.json();
        }
      } catch (error) {
        continue;
      }
    }

    throw new Error(
      `Could not fetch metadata from any gateway for CID: ${cid}`
    );
  };

  // Apply filters
  useEffect(() => {
    let filtered = projects;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (project) =>
          project.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          project.description
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          project.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
          project.asnafTag?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((project) => {
        if (statusFilter === "active") return project.status === "active";
        if (statusFilter === "completed") return project.status === "completed";
        if (statusFilter === "expired") {
          return (
            project.status === "expired" ||
            (project.deadlineEnabled &&
              Number(project.deadline) * 1000 < Date.now() &&
              project.status !== "completed")
          );
        }
        return true;
      });
    }

    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter((project) => {
        if (typeFilter === "zakat") return project.zakatMode === true;
        if (typeFilter === "sadaqah") return project.zakatMode === false;
        return true;
      });
    }

    setFilteredProjects(filtered);
  }, [projects, searchTerm, statusFilter, typeFilter]);

  // Helper functions
  const formatAmount = (amount: number | bigint) => {
    const numAmount =
      typeof amount === "bigint" ? Number(amount) / 1e18 : amount;
    return numAmount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (timestamp: bigint | string | undefined) => {
    if (!timestamp) return "Not set";

    const date =
      typeof timestamp === "bigint"
        ? new Date(Number(timestamp) * 1000)
        : new Date(timestamp);

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getProgressPercentage = (
    donated: number | bigint,
    goal: number | bigint
  ) => {
    const donatedNum = typeof donated === "bigint" ? Number(donated) : donated;
    const goalNum = typeof goal === "bigint" ? Number(goal) : goal;

    if (goalNum === 0) return 0;
    return Math.min(100, (donatedNum / goalNum) * 100);
  };

  const getStatusBadge = (project: ProjectData) => {
    if (project.status === "completed") {
      return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
    }

    if (project.status === "expired") {
      return <Badge className="bg-red-100 text-red-800">Expired</Badge>;
    }

    if (project.status === "paused") {
      return <Badge className="bg-yellow-100 text-yellow-800">Paused</Badge>;
    }

    return <Badge className="bg-blue-100 text-blue-800">Active</Badge>;
  };

  const getContractTemplateBadge = (template: string | undefined) => {
    if (!template) return "Unknown";

    const templates: Record<string, string> = {
      wakalah: "Wakālah",
      jualah: "Juʿālah",
      istisna: "Istisnāʿ",
      Wakālah: "Wakālah",
      Juʿālah: "Juʿālah",
      Istisnāʿ: "Istisnāʿ",
    };
    return templates[template] || template;
  };

  const getDataSourceBadge = (project: ProjectData) => {
    if (project.id) {
      return (
        <Badge variant="outline" className="text-xs gap-1">
          <Database className="h-3 w-3" />
          Database
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-xs gap-1">
        <Shield className="h-3 w-3" />
        On-Chain Only
      </Badge>
    );
  };

  const viewOnExplorer = (address: string) => {
    window.open(`https://amoy.polygonscan.com/address/${address}`, "_blank");
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-6xl">
        <Card className="border-2">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
            <CardTitle>Connect Your Wallet</CardTitle>
            <CardDescription>
              Please connect your wallet to view all charity projects
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header with data source info */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold">Charity Projects</h1>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Database className="h-3 w-3" />
              {dbOnlyProjects.length} in DB
            </Badge>
            {onChainOnlyAddresses.length > 0 && (
              <Badge variant="outline" className="gap-1">
                <Shield className="h-3 w-3" />
                {onChainOnlyAddresses.length} on-chain
              </Badge>
            )}
          </div>
        </div>
        <p className="text-muted-foreground">
          Discover and support transparent, Shariah-compliant charity projects
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects by title, description, or address..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="zakat">Zakat</SelectItem>
                  <SelectItem value="sadaqah">Sadaqah</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Projects Grid */}
      {loading && projects.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3 mb-4" />
                <div className="flex justify-between">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Projects Found</h3>
            <p className="text-muted-foreground">
              {projects.length === 0
                ? "No projects have been created yet. Be the first to create one!"
                : "No projects match your current filters."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <Card
                key={project.address}
                className="hover:shadow-lg transition-shadow duration-200"
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-lg line-clamp-2 leading-tight">
                      {project.title || "Untitled Project"}
                    </CardTitle>
                    <div className="flex flex-col items-end gap-1">
                      {getStatusBadge(project)}
                      {getDataSourceBadge(project)}
                    </div>
                  </div>

                  <CardDescription className="line-clamp-3 text-sm">
                    {project.description || "No description available"}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 pt-0">
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Raised:{" "}
                        {formatAmount(
                          project.fundedBalance || project.totalDonated
                        )}{" "}
                        USDC
                      </span>
                      <span className="font-semibold">
                        Goal:{" "}
                        {formatAmount(project.totalAmount || project.goal)} USDC
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${getProgressPercentage(
                            project.fundedBalance || project.totalDonated,
                            project.totalAmount || project.goal
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Project Details */}
                  <div className="space-y-3 text-sm">
                    {project.deadlineEnabled && project.deadline && (
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          Deadline:
                        </span>
                        <span className="font-semibold text-right">
                          {formatDate(project.deadline)}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        Contract:
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {getContractTemplateBadge(project.contractTemplate)}
                      </Badge>
                    </div>

                    {project.asnafTag && (
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <Users className="h-4 w-4" />
                          Asnaf:
                        </span>
                        <span className="text-xs font-medium text-right">
                          {project.asnafTag}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Wallet className="h-4 w-4" />
                        Type:
                      </span>
                      <Badge variant="outline" className="capitalize text-xs">
                        {project.zakatMode ? "Zakat" : "Sadaqah"}
                      </Badge>
                    </div>
                  </div>

                  <Separator />

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-2"
                      onClick={() => viewOnExplorer(project.address)}
                    >
                      <ExternalLink className="h-4 w-4" />
                      Explorer
                    </Button>
                    <Link
                      href={`/projects/${project.address}`}
                      className="flex-1"
                    >
                      <Button size="sm" className="w-full gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        View Project
                      </Button>
                    </Link>
                  </div>

                  {/* Contract Address */}
                  <div className="text-xs text-muted-foreground font-mono truncate text-center">
                    {project.address.slice(0, 8)}...{project.address.slice(-6)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Stats */}
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-4 bg-muted px-4 py-2 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Showing {filteredProjects.length} of {projects.length} projects
                {searchTerm && ` matching "${searchTerm}"`}
              </p>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                  <span className="text-xs">
                    {projects.filter((p) => p.id).length} from database
                  </span>
                </div>
                {onChainOnlyAddresses.length > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-purple-500"></div>
                    <span className="text-xs">
                      {onChainOnlyAddresses.length} from blockchain
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
