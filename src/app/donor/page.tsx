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
  Loader2,
  User
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuthStore } from "@/app/stores/auth-store"; // Assuming you have a Zustand store

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
  charityName?: string; // Added for better display
  totalAmount: number;
  fundedBalance: number;
  zakatMode: boolean;
  asnafTag: string | null;
  status: string;
  milestones: Milestone[];
  contractAddress?: string;
}

interface Donation {
  id: number;
  projectId: number;
  amount: number;
  txHash: string;
  timestamp: string;
  donorId: number | null;
  donorWalletAddress: string;
}

interface Stats {
  totalContributed: number;
  activeProjects: number;
  completedProjects: number;
}

export default function DonorDashboard() {
  const { user, isAuthenticated } = useAuthStore(); // Get user from Zustand
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState("all");
  const [projects, setProjects] = useState<Project[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [stats, setStats] = useState<Stats>({ totalContributed: 0, activeProjects: 0, completedProjects: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchDonorData();
    }
  }, [isAuthenticated, user]);

  const fetchDonorData = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      // Fetch donor data using user ID
      const response = await fetch(`/api/donations/donor/user/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`, // Include JWT if needed
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDonations(data.donations || []);
        setProjects(data.projects || []);
        setStats(data.stats || { totalContributed: 0, activeProjects: 0, completedProjects: 0 });
      } else {
        console.error("Failed to fetch donor data");
        toast.error("Failed to load donor data");
      }
    } catch (error) {
      console.error("Error fetching donor data:", error);
      toast.error("Failed to load donor data");
    } finally {
      setIsLoading(false);
    }
  };

  // Alternative: Fetch data using API route that gets user from session
  const fetchDonorDataWithSession = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/donor/dashboard', {
        credentials: 'include', // Include cookies for session
      });

      if (response.ok) {
        const data = await response.json();
        setDonations(data.donations || []);
        setProjects(data.projects || []);
        setStats(data.stats || { totalContributed: 0, activeProjects: 0, completedProjects: 0 });
      } else {
        console.error("Failed to fetch donor data");
        toast.error("Failed to load donor data");
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
      const response = await fetch(`/api/receipts/${donationId}/pdf`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        }
      });
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

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-4xl">
        <Card className="border-2">
          <CardHeader className="text-center">
            <User className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              Please log in to view your donor dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/login">
              <Button className="mt-4">Log In</Button>
            </Link>
            <p className="text-sm text-muted-foreground mt-4">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-primary hover:underline">
                Sign up here
              </Link>
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome, {user?.name || 'Donor'}!</h1>
            <p className="text-muted-foreground">
              Track your contributions and project impact in real-time
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4" />
            <span>{user?.email}</span>
            {user?.role && (
              <Badge variant="outline" className="ml-2">
                {user.role}
              </Badge>
            )}
          </div>
        </div>
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
          <CardDescription>
            {donations.length > 0 
              ? `You've contributed to ${projects.length} project${projects.length !== 1 ? 's' : ''}`
              : "You haven't donated to any projects yet"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {donations.length > 0 ? (
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
                              <Badge variant="outline" className="text-xs">
                                {project.charityName || "Charity"}
                              </Badge>
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

                        {/* Donation Transactions */}
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold">Your Donations</h4>
                          <div className="space-y-1">
                            {myDonations.map((donation) => (
                              <div key={donation.id} className="flex items-center justify-between py-2 px-3 rounded border text-sm">
                                <div>
                                  <span className="font-medium">${donation.amount.toLocaleString()}</span>
                                  <span className="text-muted-foreground text-xs ml-2">
                                    {new Date(donation.timestamp).toLocaleDateString()}
                                  </span>
                                </div>
                                <div className="flex gap-2">
                                  {isConnected && (
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-7 px-2" 
                                      asChild
                                    >
                                      <a
                                        href={`https://mumbai.polygonscan.com/tx/${donation.txHash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                      </a>
                                    </Button>
                                  )}
                                  {project.zakatMode && (
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-7 px-2"
                                      onClick={() => handleDownloadReceipt(donation.id)}
                                    >
                                      <Download className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </TabsContent>
            </Tabs>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p className="mb-4">You haven't made any donations yet</p>
              <Link href="/projects">
                <Button>Explore Projects to Donate</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Discover More Projects */}
      {donations.length > 0 && (
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
      )}
    </div>
  );
}