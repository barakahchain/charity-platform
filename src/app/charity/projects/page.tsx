"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@/app/stores/auth-store";
import ProtectedPage from "@/components/auth/ProtectedRoute";
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
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  ExternalLink,
  Calendar,
  FileText,
  Users,
  Wallet,
  CheckCircle2,
  PlusCircle,
  TrendingUp,
  AlertCircle,
} from "lucide-react";

interface Project {
  id: number;
  title: string;
  description: string;
  totalAmount: number;
  fundedBalance: number;
  status: string;
  createdAt: string;
  contractTemplate: string;
  zakatMode: boolean;
  asnafTag: string | null;
}

export default function CharityProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get user from Zustand
  const user = useUser();

  useEffect(() => {
    if (!user) return; // Don't fetch if no user

    async function loadProjects() {
      try {
        setLoading(true);
        setError(null);

        // Fetch projects WITH credentials to include cookies
        const projectsRes = await fetch(`/api/projects`, {
          credentials: "include", // This is crucial!
        });
        const projectsData = await projectsRes.json();

        if (!projectsRes.ok) {
          throw new Error(projectsData.error || "Failed to fetch projects");
        }

        setProjects(projectsData);
      } catch (err: any) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadProjects();
  }, [user]); // Only fetch when user changes

  // Helper functions
  const formatAmount = (amount: number) => {
    return amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getProgressPercentage = (funded: number, total: number) => {
    if (total === 0) return 0;
    return Math.min(100, (funded / total) * 100);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case "paused":
        return <Badge className="bg-yellow-100 text-yellow-800">Paused</Badge>;
      case "completed":
        return <Badge className="bg-blue-100 text-blue-800">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getContractTemplateBadge = (template: string) => {
    const templates: { [key: string]: string } = {
      Wakālah: "Wakālah",
      Juʿālah: "Juʿālah",
      Istisnāʿ: "Istisnāʿ",
    };
    return templates[template] || template;
  };

  const getAverageProgress = () => {
    if (projects.length === 0) return 0;

    const totalProgress = projects.reduce((sum, project) => {
      return (
        sum + getProgressPercentage(project.fundedBalance, project.totalAmount)
      );
    }, 0);

    return Math.round(totalProgress / projects.length);
  };

  // Wrap everything in ProtectedPage
  return (
    <ProtectedPage allowedRoles={["charity", "admin"]}>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Charity Projects</h1>
            <p className="text-muted-foreground">
              Manage and track all your Shariah-compliant charity projects
            </p>
          </div>

          {user && (
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground bg-white border-1 px-4 py-2 rounded-lg">
                <div className="font-medium text-black">{user.name}</div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs capitalize">
                    {user.role}
                  </Badge>
                  <span>ID: {user.id}</span>
                </div>
              </div>

              <Link href="/charity/projects/create">
                <Button className="gap-2">
                  <PlusCircle className="h-4 w-4" />
                  Create New Project
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Loading State */}
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
                  <div className="space-y-2">
                    <Skeleton className="h-2 w-full" />
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Skeleton className="h-9 flex-1" />
                    <Skeleton className="h-9 flex-1" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
              <h3 className="text-lg font-semibold mb-2 text-red-600">
                Error Loading Projects
              </h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        ) : projects.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Projects Found</h3>
              <p className="text-muted-foreground mb-6">
                You haven't created any projects yet. Start your first
                Shariah-compliant project today!
              </p>
              <Link href="/charity/projects/create">
                <Button className="gap-2">
                  <PlusCircle className="h-4 w-4" />
                  Create Your First Project
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Stats Summary - Only show if we have projects */}
            {projects.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Total Projects
                        </p>
                        <h3 className="text-2xl font-bold">
                          {projects.length}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {projects.filter((p) => p.status === "active").length}{" "}
                          active
                        </p>
                      </div>
                      <Building2 className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Funds Raised
                        </p>
                        <h3 className="text-2xl font-bold">
                          $
                          {formatAmount(
                            projects.reduce(
                              (sum, p) => sum + p.fundedBalance,
                              0
                            )
                          )}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          of $
                          {formatAmount(
                            projects.reduce((sum, p) => sum + p.totalAmount, 0)
                          )}{" "}
                          target
                        </p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Avg. Progress
                        </p>
                        <h3 className="text-2xl font-bold">
                          {getAverageProgress()}%
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Across all projects
                        </p>
                      </div>
                      <div className="relative">
                        <div className="h-12 w-12 rounded-full border-4 border-gray-700 flex items-center justify-center">
                          <span className="text-sm font-bold">
                            {getAverageProgress()}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Projects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <Card
                  key={project.id}
                  className="hover:shadow-lg transition-shadow duration-200 border bg-white"
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between mb-2">
                      <CardTitle className="text-lg line-clamp-2 leading-tight">
                        {project.title}
                      </CardTitle>
                      {getStatusBadge(project.status)}
                    </div>

                    <CardDescription className="line-clamp-3 text-sm text-gray-400">
                      {project.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-0">
                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Funded: ${formatAmount(project.fundedBalance)} USDC
                        </span>
                        <span className="font-semibold">
                          Goal: ${formatAmount(project.totalAmount)} USDC
                        </span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${getProgressPercentage(project.fundedBalance, project.totalAmount)}%`,
                          }}
                        />
                      </div>
                    </div>

                    <Separator className="bg-gray-700" />

                    {/* Project Details */}
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          Created:
                        </span>
                        <span className="font-semibold text-right">
                          {formatDate(project.createdAt)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <FileText className="h-4 w-4" />
                          Contract:
                        </span>
                        <Badge variant="outline" className="text-xs bg-white">
                          {getContractTemplateBadge(project.contractTemplate)}
                        </Badge>
                      </div>

                      {project.asnafTag && (
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <Users className="h-4 w-4" />
                            Asnaf Category:
                          </span>
                          <span className="text-xs font-medium text-right">
                            {project.asnafTag}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <Wallet className="h-4 w-4" />
                          Zakat Mode:
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-xs ${project.zakatMode ? "bg-white text-green-400" : "bg-white"}`}
                        >
                          {project.zakatMode ? "Enabled" : "Disabled"}
                        </Badge>
                      </div>
                    </div>

                    <Separator className="bg-gray-700" />

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-2 border-gray-700 hover:bg-gray-300"
                        onClick={() =>
                          window.open(
                            `/charity/projects/${project.id}`,
                            "_blank"
                          )
                        }
                      >
                        <ExternalLink className="h-4 w-4" />
                        Details
                      </Button>
                      <Link
                        href={`/charity/projects/${project.id}`}
                        className="flex-1"
                      >
                        <Button
                          size="sm"
                          className="w-full gap-2 bg-gray-500 hover:bg-gray-700"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Manage Project
                        </Button>
                      </Link>
                    </div>

                    {/* Project ID */}
                    <div className="text-xs text-muted-foreground font-mono text-center pt-2 border-t border-gray-800">
                      ID: {project.id}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Create New Project Link */}
            <div className="mt-10 text-center border-t border-gray-800 pt-8">
              <Link href="/charity/projects/create">
                <Button
                  variant="outline"
                  className="gap-2 border-gray-700 hover:bg-gray-400"
                >
                  <PlusCircle className="h-4 w-4" />
                  Create New Project
                </Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </ProtectedPage>
  );
}
