"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAccount } from "wagmi";
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ExternalLink,
  Image as ImageIcon,
  FileText,
  XCircle,
  Shield,
  Loader2
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
// import { useCreateProject } from "@/lib/contracts - not working/useEscrowContract";

interface Evidence {
  type: string;
  cid: string;
  url: string;
  timestamp: string;
}

interface Milestone {
  id: number;
  projectId: number;
  projectTitle: string;
  projectDescription: string;
  charity: string;
  description: string;
  amount: number;
  beneficiary: string;
  status: "pending" | "submitted" | "verified" | "rejected" | "paid";
  evidenceCid: string | null;
  submittedAt: string | null;
  verifiedAt: string | null;
  notes?: string;
}

export default function VerifierDashboard() {
  const { address, isConnected } = useAccount();
  const { verifyMilestone } = useCreateProject();
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [verificationNotes, setVerificationNotes] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [stats, setStats] = useState({ pending: 0, verified: 0, rejected: 0 });

  useEffect(() => {
    if (isConnected && address) {
      fetchMilestones();
    }
  }, [isConnected, address]);

  const fetchMilestones = async () => {
    setIsLoading(true);
    try {
      // Fetch pending milestones
      const pendingRes = await fetch("/api/milestones/pending");
      if (pendingRes.ok) {
        const pendingData = await pendingRes.json();
        setMilestones(pendingData);
        
        // Calculate stats
        const pending = pendingData.filter((m: Milestone) => m.status === "submitted").length;
        const verified = pendingData.filter((m: Milestone) => m.status === "verified" || m.status === "paid").length;
        const rejected = pendingData.filter((m: Milestone) => m.status === "rejected").length;
        
        setStats({ pending, verified, rejected });
      }
    } catch (error) {
      console.error("Error fetching milestones:", error);
      toast.error("Failed to load milestones");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (milestone: Milestone, approved: boolean) => {
    if (!address) {
      toast.error("Please connect your wallet");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Call smart contract to verify milestone
      if (approved) {
        toast.info("Verifying milestone on blockchain...");
        const txHash = await verifyMilestone(milestone.projectId, milestone.id);
        
        if (!txHash) {
          throw new Error("Blockchain verification failed");
        }
        
        toast.success("Blockchain verification successful!");
      }

      // 2. Update backend database
      toast.info("Updating milestone status...");
      const response = await fetch(`/api/milestones/${milestone.id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verifierWallet: address,
          approved,
          notes: verificationNotes,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update milestone status");
      }

      toast.success(
        approved 
          ? "Milestone verified and funds released!" 
          : "Milestone rejected"
      );
      
      // Reset state
      setIsDialogOpen(false);
      setVerificationNotes("");
      setSelectedMilestone(null);
      
      // Refresh milestones
      await fetchMilestones();
      
    } catch (error: any) {
      console.error("Verification error:", error);
      toast.error(error.message || "Failed to verify milestone");
    } finally {
      setIsSubmitting(false);
    }
  };

  const pendingMilestones = milestones.filter((m) => m.status === "submitted");
  const verifiedMilestones = milestones.filter((m) => m.status === "verified" || m.status === "paid");
  const rejectedMilestones = milestones.filter((m) => m.status === "rejected");

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-4xl">
        <Card className="border-2">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
            <CardTitle>Connect Your Wallet</CardTitle>
            <CardDescription>
              Please connect your wallet to access the verifier dashboard
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
            <p className="text-muted-foreground">Loading milestones...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Shield className="h-8 w-8 text-primary" />
          Verifier Dashboard
        </h1>
        <p className="text-muted-foreground">
          Review evidence and verify milestone completion
        </p>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Awaiting verification</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Verified</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.verified}</div>
            <p className="text-xs text-muted-foreground">Approved & released</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.rejected}</div>
            <p className="text-xs text-muted-foreground">Not approved</p>
          </CardContent>
        </Card>
      </div>

      {/* Milestones List */}
      <Card>
        <CardHeader>
          <CardTitle>Milestone Submissions</CardTitle>
          <CardDescription>Review evidence and approve fund releases</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="pending" className="gap-2">
                Pending
                {stats.pending > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {stats.pending}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="verified">Verified</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4">
              {pendingMilestones.map((milestone) => (
                <MilestoneCard
                  key={milestone.id}
                  milestone={milestone}
                  onVerify={() => {
                    setSelectedMilestone(milestone);
                    setIsDialogOpen(true);
                  }}
                />
              ))}
              {pendingMilestones.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No pending milestones to review</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="verified" className="space-y-4">
              {verifiedMilestones.map((milestone) => (
                <MilestoneCard key={milestone.id} milestone={milestone} />
              ))}
              {verifiedMilestones.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No verified milestones yet</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="rejected" className="space-y-4">
              {rejectedMilestones.map((milestone) => (
                <MilestoneCard key={milestone.id} milestone={milestone} />
              ))}
              {rejectedMilestones.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No rejected milestones</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Verification Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Verify Milestone</DialogTitle>
            <DialogDescription>
              Review the evidence and approve or reject this milestone submission
            </DialogDescription>
          </DialogHeader>

          {selectedMilestone && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg border bg-muted/30">
                <h4 className="font-semibold mb-2">{selectedMilestone.description}</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  {selectedMilestone.projectTitle}
                </p>
                <div className="flex items-center gap-4 text-sm">
                  <span className="font-medium">
                    Amount: ${selectedMilestone.amount.toLocaleString()} USDC
                  </span>
                  <span className="text-muted-foreground">
                    Beneficiary: {selectedMilestone.beneficiary}
                  </span>
                </div>
                {selectedMilestone.evidenceCid && (
                  <div className="mt-3 p-2 bg-muted rounded text-xs">
                    <span className="font-semibold">Evidence CID:</span> {selectedMilestone.evidenceCid}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Verification Notes</Label>
                <Textarea
                  placeholder="Add notes about your verification decision..."
                  rows={4}
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                setVerificationNotes("");
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedMilestone && handleVerify(selectedMilestone, false)}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Reject
            </Button>
            <Button
              onClick={() => selectedMilestone && handleVerify(selectedMilestone, true)}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Approve & Release Funds
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MilestoneCard({
  milestone,
  onVerify,
}: {
  milestone: Milestone;
  onVerify?: () => void;
}) {
  const getStatusBadge = () => {
    switch (milestone.status) {
      case "submitted":
        return (
          <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">
            <Clock className="h-3 w-3 mr-1" />
            Pending Review
          </Badge>
        );
      case "verified":
      case "paid":
        return (
          <Badge variant="secondary" className="bg-green-500/10 text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Verified
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="secondary" className="bg-red-500/10 text-red-700 dark:text-red-400">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
    }
  };

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex items-start gap-2 flex-wrap">
              <CardTitle className="text-lg">{milestone.description}</CardTitle>
              {getStatusBadge()}
            </div>
            <CardDescription>{milestone.projectTitle}</CardDescription>
            <div className="text-sm text-muted-foreground">
              {milestone.projectDescription}
            </div>
          </div>
          <div className="text-right space-y-1">
            <div className="text-2xl font-bold">
              ${milestone.amount.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">USDC</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Evidence */}
        {milestone.evidenceCid && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Submitted Evidence</h4>
            <div className="p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">Evidence Document</div>
                  <div className="text-xs text-muted-foreground truncate">
                    IPFS: {milestone.evidenceCid}
                  </div>
                </div>
                <a
                  href={`https://ipfs.io/ipfs/${milestone.evidenceCid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </a>
              </div>
            </div>
          </div>
        )}

        {milestone.notes && (
          <div className="p-3 rounded-lg bg-muted/50 border">
            <div className="text-xs font-semibold text-muted-foreground mb-1">
              Verification Notes
            </div>
            <p className="text-sm">{milestone.notes}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button variant="outline" size="sm" className="gap-2" asChild>
            <a
              href={`https://mumbai.polygonscan.com/address/${milestone.beneficiary}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4" />
              View Beneficiary
            </a>
          </Button>
          {milestone.status === "submitted" && onVerify && (
            <Button size="sm" onClick={onVerify} className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Review & Verify
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}