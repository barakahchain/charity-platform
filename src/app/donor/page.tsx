"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useAccount } from "wagmi";
import { 
  Wallet, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  Download, 
  ExternalLink,
  AlertCircle,
  Loader2
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface Milestone {
  id: number;
  description: string;
  status: string;
  amount: number;
}

interface Project {
  id: number;
  title: string;
  description: string;
  charity: string;
  totalAmount: number;
  fundedBalance: number;
  zakatMode: boolean;
  asnafTag: string | null;
  status: string;
  milestones: Milestone[];
}

interface Donation {
  id: number;
  projectId: number;
  amount: number;
  txHash: string;
  timestamp: string;
}

interface Stats {
  totalContributed: number;
  activeProjects: number;
  completedProjects: number;
}

export default function DonorDashboard() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState("all");
  const [projects, setProjects] = useState<Project[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [stats, setStats] = useState<Stats>({ totalContributed: 0, activeProjects: 0, completedProjects: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isConnected && address) {
      fetchDonorData();
    }
  }, [isConnected, address]);

  const fetchDonorData = async () => {
    if (!address) return;
    
    setIsLoading(true);
    try {
      // Fetch stats
      const statsRes = await fetch(`/api/stats/donor/${address}`);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // Fetch donations
      const donationsRes = await fetch(`/api/donations/donor/${address}`);
      if (donationsRes.ok) {
        const donationsData = await donationsRes.json();
        setDonations(donationsData);

        // Fetch project details for each donation
        const projectIds = [...new Set(donationsData.map((d: Donation) => d.projectId))];
        const projectsData = await Promise.all(
          projectIds.map(async (projectId) => {
            const res = await fetch(`/api/projects/${projectId}`);
            if (res.ok) {
              return await res.json();
            }
            return null;
          })
        );

        setProjects(projectsData.filter(Boolean));
      }
    } catch (error) {
      console.error("Error fetching donor data:", error);
      toast.error("Failed to load donor data");
    } finally {
      setIsLoading(false);
    }
  };

  const getMyContribution = (projectId: number) => {
    return donations
      .filter((d) => d.projectId === projectId)
      .reduce((sum, d) => sum + d.amount, 0);
  };

  const getMyDonations = (projectId: number) => {
    return donations.filter((d) => d.projectId === projectId);
  };

  const handleDownloadReceipt = async (donationId: number) => {
    try {
      const response = await fetch(`/api/receipts/${donationId}/pdf`);
      if (!response.ok) throw new Error("Failed to generate receipt");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `zakat-receipt-${donationId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success("Receipt downloaded successfully");
    } catch (error) {
      console.error("Error downloading receipt:", error);
      toast.error("Failed to download receipt");
    }
  };

  const getMilestoneStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-500";
      case "verified":
        return "bg-blue-500";
      case "submitted":
        return "bg-yellow-500";
      default:
        return "bg-gray-300";
    }
  };

  const getMilestoneStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
      case "verified":
        return <CheckCircle2 className="h-4 w-4" />;
      case "submitted":
      case "pending":
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const filteredProjects = projects.filter((p) => {
    if (activeTab === "all") return true;
    if (activeTab === "active") return p.status === "active";
    if (activeTab === "completed") return p.status === "completed";
    return true;
  });

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-4xl">
        <Card className="border-2">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
            <CardTitle>Connect Your Wallet</CardTitle>
            <CardDescription>
              Please connect your wallet to view your donor dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Use the &quot;Connect Wallet&quot; button in the navigation bar to get started
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-4xl">
        <Card className="border-2">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading your donor dashboard...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Donor Dashboard</h1>
        <p className="text-muted-foreground">
          Track your contributions and project impact in real-time
        </p>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Contributed</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalContributed.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">USDC on Polygon</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeProjects}</div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedProjects}</div>
            <p className="text-xs text-muted-foreground">Projects finished</p>
          </CardContent>
        </Card>
      </div>

      {/* Projects List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Funded Projects</CardTitle>
          <CardDescription>View milestone progress and download receipts</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All Projects</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-6">
              {filteredProjects.map((project) => {
                const myContribution = getMyContribution(project.id);
                const myDonations = getMyDonations(project.id);
                
                return (
                  <Card key={project.id} className="border-2">
                    <CardHeader>
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-start gap-2">
                            <CardTitle className="text-xl">{project.title}</CardTitle>
                            {project.status === "completed" && (
                              <Badge variant="default" className="bg-green-500">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Completed
                              </Badge>
                            )}
                          </div>
                          <CardDescription>{project.description}</CardDescription>
                          <div className="flex flex-wrap gap-2">
                            {project.zakatMode && (
                              <Badge variant="secondary" className="text-xs">
                                Zakat Eligible
                              </Badge>
                            )}
                            {project.asnafTag && (
                              <Badge variant="outline" className="text-xs">
                                {project.asnafTag}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right space-y-2">
                          <div>
                            <div className="text-2xl font-bold">
                              ${myContribution.toLocaleString()}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Your contribution
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Funding Progress */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Funding Progress</span>
                          <span className="font-medium">
                            ${project.fundedBalance.toLocaleString()} / ${project.totalAmount.toLocaleString()}
                          </span>
                        </div>
                        <Progress 
                          value={(project.fundedBalance / project.totalAmount) * 100} 
                          className="h-2" 
                        />
                      </div>

                      {/* Milestones */}
                      {project.milestones && project.milestones.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold">Milestones</h4>
                          <div className="space-y-2">
                            {project.milestones.map((milestone) => (
                              <div
                                key={milestone.id}
                                className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${getMilestoneStatusColor(
                                      milestone.status
                                    )}`}
                                  >
                                    {getMilestoneStatusIcon(milestone.status)}
                                  </div>
                                  <div>
                                    <div className="font-medium text-sm">
                                      {milestone.description}
                                    </div>
                                    <div className="text-xs text-muted-foreground capitalize">
                                      {milestone.status}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-semibold">
                                    ${milestone.amount.toLocaleString()}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 pt-2">
                        {myDonations.map((donation) => (
                          <Button 
                            key={donation.id}
                            variant="outline" 
                            size="sm" 
                            className="gap-2" 
                            asChild
                          >
                            <a
                              href={`https://mumbai.polygonscan.com/tx/${donation.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-4 w-4" />
                              View TX {donation.id}
                            </a>
                          </Button>
                        ))}
                        {project.zakatMode && myDonations.map((donation) => (
                          <Button 
                            key={`receipt-${donation.id}`}
                            variant="outline" 
                            size="sm" 
                            className="gap-2"
                            onClick={() => handleDownloadReceipt(donation.id)}
                          >
                            <Download className="h-4 w-4" />
                            Receipt #{donation.id}
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {filteredProjects.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No projects found in this category</p>
                  <Link href="/projects">
                    <Button className="mt-4">Explore Projects</Button>
                  </Link>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Discover More Projects */}
      <Card className="mt-8 bg-primary text-primary-foreground">
        <CardHeader>
          <CardTitle>Fund More Projects</CardTitle>
          <CardDescription className="text-primary-foreground/80">
            Discover active charity projects that need your support
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/projects">
            <Button variant="secondary" className="gap-2">
              Browse Projects
              <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}