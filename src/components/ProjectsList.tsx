"use client";

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

// Minimal ABI - only functions that DEFINITELY exist in your current contract
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

  const FACTORY_CONTRACT_ADDRESS =
    process.env.NEXT_PUBLIC_FACTORY_CONTRACT_ADDRESS;

    // console.log("Factory Contract Address:", FACTORY_CONTRACT_ADDRESS);
    
 // 1. Get all project addresses from factory - USE THE CORRECT APPROACH
const { data: projectAddresses, error: addressesError } = useReadContracts({
  contracts: [{
    address: FACTORY_CONTRACT_ADDRESS as `0x${string}`,
    abi: ProjectFactoryABI,
    functionName: "getAllProjects",
  }],
});

// console.log("Project Addresses:", projectAddresses);

// 2. Access the addresses correctly
const addresses = projectAddresses?.[0]?.result as string[] || [];
// console.log("Addresses:", addresses);

  // 2. Batch read all project data
  const projectContracts = ((projectAddresses?.[0]?.result as string[]) || [])
    .map((address) =>
      PROJECT_ABI.map((abiItem) => ({
        address: address as `0x${string}`,
        abi: PROJECT_ABI,
        functionName: abiItem.name,
      }))
    )
    .flat();

  const { data: projectsRawData } = useReadContracts({
    contracts: projectContracts,
  });

  // 3. Fetch IPFS metadata and combine with contract data
  useEffect(() => {
    const fetchProjectsWithMetadata = async () => {
      if (!projectAddresses?.[0]?.result || !projectsRawData) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const addresses = projectAddresses[0].result as string[];
      const projectsPerAddress = PROJECT_ABI.length;

      try {
        const projectsData: ProjectData[] = [];

        for (let i = 0; i < addresses.length; i++) {
          const address = addresses[i];
          const baseIndex = i * projectsPerAddress;

          // Extract contract data
          const goal = projectsRawData[baseIndex]?.result as bigint;
          const deadline = projectsRawData[baseIndex + 1]?.result as bigint;
          const completed = projectsRawData[baseIndex + 2]?.result as boolean;
          const charity = projectsRawData[baseIndex + 3]?.result as string;
          const builder = projectsRawData[baseIndex + 4]?.result as string;
          const totalDonated = projectsRawData[baseIndex + 5]?.result as bigint;
          const deadlineEnabled = projectsRawData[baseIndex + 6]
            ?.result as boolean;
          const metaCid = projectsRawData[baseIndex + 7]?.result as string;

          // Fetch IPFS metadata
          let metadata: ProjectMetadata | undefined;
          if (metaCid) {
            try {
              metadata = await fetchMetadataFromIPFS(metaCid);
            } catch (error) {
              // console.warn(`Could not fetch metadata for ${address}:`, error);
            }
          }

          projectsData.push({
            address,
            goal: goal || BigInt(0),
            deadline: deadline || BigInt(0),
            completed: completed || false,
            charity: charity || "",
            builder: builder || "",
            totalDonated: totalDonated || BigInt(0),
            deadlineEnabled: deadlineEnabled || false,
            metadata,
          });
        }

        setProjects(projectsData);
        setFilteredProjects(projectsData);
      } catch (error) {
        console.error("Error processing projects:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjectsWithMetadata();
  }, [projectAddresses, projectsRawData]);

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
        const response = await fetch(gateway);
        if (response.ok) {
          return await response.json();
        }
      } catch (error) {
        continue; // Try next gateway
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
          project.metadata?.title
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          project.metadata?.description
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          project.address.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((project) => {
        if (statusFilter === "active") return !project.completed;
        if (statusFilter === "completed") return project.completed;
        if (statusFilter === "expired") {
          return (
            project.deadlineEnabled &&
            Number(project.deadline) * 1000 < Date.now() &&
            !project.completed
          );
        }
        return true;
      });
    }

    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter(
        (project) => project.metadata?.type === typeFilter
      );
    }

    setFilteredProjects(filtered);
  }, [projects, searchTerm, statusFilter, typeFilter]);

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

  const navigateToProject = (address: string) => {
    window.location.href = `/projects/${address}`;
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-6xl">
        <Card className="border-2">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
            <CardTitle>Connect Your Wallet</CardTitle>
            <CardDescription>
              Please connect your wallet to view charity projects
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Charity Projects</h1>
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
      {loading ? (
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <Card
              key={project.address}
              className="hover:shadow-lg transition-shadow duration-200"
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between mb-2">
                  <CardTitle className="text-lg line-clamp-2 leading-tight">
                    {project.metadata?.title || "Untitled Project"}
                  </CardTitle>
                  {getStatusBadge(project)}
                </div>

                <CardDescription className="line-clamp-3 text-sm">
                  {project.metadata?.description || "No description available"}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 pt-0">
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Raised: {formatAmount(project.totalDonated)} MATIC
                    </span>
                    <span className="font-semibold">
                      Goal: {formatAmount(project.goal)} MATIC
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${getProgressPercentage(project.totalDonated, project.goal)}%`,
                      }}
                    />
                  </div>
                </div>

                <Separator />

                {/* Project Details */}
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Deadline:
                    </span>
                    <span className="font-semibold text-right">
                      {formatDate(project.deadline)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      Contract:
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {project.metadata
                        ? getContractTemplateBadge(
                            project.metadata.contractTemplate
                          )
                        : "Unknown"}
                    </Badge>
                  </div>

                  {project.metadata?.asnafCategory && (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        Asnaf:
                      </span>
                      <span className="text-xs font-medium text-right">
                        {project.metadata.asnafCategory.split(" (")[0]}
                      </span>
                    </div>
                  )}

                  {project.metadata?.type && (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Wallet className="h-4 w-4" />
                        Type:
                      </span>
                      <Badge variant="outline" className="capitalize text-xs">
                        {project.metadata.type}
                      </Badge>
                    </div>
                  )}
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
                  <Button
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={() => navigateToProject(project.address)}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    View Project
                  </Button>
                </div>

                {/* Contract Address */}
                <div className="text-xs text-muted-foreground font-mono truncate text-center">
                  {project.address.slice(0, 8)}...{project.address.slice(-6)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Stats */}
      {!loading && projects.length > 0 && (
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Showing {filteredProjects.length} of {projects.length} projects
            {searchTerm && ` matching "${searchTerm}"`}
          </p>
        </div>
      )}
    </div>
  );
}
