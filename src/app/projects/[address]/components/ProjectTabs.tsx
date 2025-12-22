// app/projects/[address]/components/ProjectTabs.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FileText, Wallet, Users, Calendar } from 'lucide-react';
import { Check, X } from 'lucide-react';
import { ProjectData } from '@/types/project';

interface ProjectTabsProps {
  project: ProjectData;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const getContractTemplateBadge = (template: string) => {
  const templates: { [key: string]: string } = {
    wakalah: "Wakālah",
    jualah: "Juʿālah",
    istisna: "Istisnāʿ",
  };
  return templates[template] || template;
};

// Use this updated formatAmount function
const formatAmount = (amount: bigint | number | string) => {
  // Convert to number if it's bigint
  const numAmount = typeof amount === 'bigint' 
    ? Number(amount) 
    : typeof amount === 'string'
      ? parseFloat(amount)
      : amount;
  
  return (numAmount / 1e18).toFixed(2);
};

export default function ProjectTabs({ project, activeTab, onTabChange }: ProjectTabsProps) {
  // Helper function to get milestones array
  // console.log("Project data in ProjectTabs:", project);
  const getMilestones = () => {
    if (project.milestones && project.milestones.length > 0) {
      return project.milestones;
    }
    if (project.contractMilestones && project.contractMilestones.length > 0) {
      return project.contractMilestones;
    }
    return [];
  };

  // Check if we have any milestones
  const hasMilestones = () => {
    return (
      (project.milestones && project.milestones.length > 0) ||
      (project.contractMilestones && project.contractMilestones.length > 0)
    );
  };

  // Get milestone source badge text
  // const getMilestoneSource = () => {
  //   if (project.milestones && project.milestones.length > 0) {
  //     return "From Database";
  //   }
  //   if (project.contractMilestones && project.contractMilestones.length > 0) {
  //     return "From Contract";
  //   }
  //   return "No Milestones";
  // };

  // Get milestone source description
  // const getMilestoneDescription = () => {
  //   if (project.milestones && project.milestones.length > 0) {
  //     return "Persisted milestone data";
  //   }
  //   if (project.contractMilestones && project.contractMilestones.length > 0) {
  //     return "Real-time milestone status";
  //   }
  //   return "No milestone data available";
  // };

  // Format individual milestone amount
const formatMilestoneAmount = (milestone: any) => {
//   console.log("Milestone data:", milestone);
//   console.log("Milestone amount type:", typeof milestone.amount);
//   console.log("Milestone amount value:", milestone.amount);
  
  if (milestone.amount === undefined || milestone.amount === null) {
    return "0.00";
  }
  
  // Handle bigint (contract milestone)
  if (typeof milestone.amount === 'bigint') {
    return formatAmount(milestone.amount);
  }
  
  // Handle number (database milestone)
  if (typeof milestone.amount === 'number') {
    // Check if it's already in MATIC or in wei
    if (milestone.amount < 1e9) { // If less than 1e9, assume it's in MATIC
      return milestone.amount.toFixed(2);
    } else { // Otherwise assume it's in wei
      return formatAmount(milestone.amount);
    }
  }
  
  // Handle string
  if (typeof milestone.amount === 'string') {
    const num = parseFloat(milestone.amount);
    if (!isNaN(num)) {
      if (num < 1e9) { // Assume MATIC
        return num.toFixed(2);
      } else { // Assume wei
        return formatAmount(num);
      }
    }
  }
  
  return "0.00";
};

  // Check if milestone is released/paid
  const isMilestoneReleased = (milestone: any) => {
    if (milestone.released !== undefined) {
      return milestone.released;
    }
    if (milestone.status !== undefined) {
      return milestone.status === 'paid' || milestone.status === 'released';
    }
    return false;
  };

  // Get milestone description
  const getMilestoneDescriptionText = (milestone: any, index: number) => {
    if (milestone.description) {
      return milestone.description;
    }
    if (project.metadata?.milestones?.[index]?.description) {
      return project.metadata.milestones[index].description;
    }
    return "";
  };

  // Get milestone beneficiary
  const getMilestoneBeneficiary = (milestone: any) => {
    if (milestone.beneficiaryAddress) {
      return milestone.beneficiaryAddress;
    }
    return project.builder || "Unknown";
  };

  return (
    <div className="space-y-6">
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
              onClick={() => onTabChange(tab)}
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
                  project.description ||
                  "No detailed description available."}
              </p>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Contract Type</p>
                  <p className="font-semibold">
                    {project.metadata
                      ? getContractTemplateBadge(project.metadata.contractTemplate)
                      : "Unknown"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Wallet className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Project Type</p>
                  <p className="font-semibold capitalize">
                    {project.metadata?.type || (project.zakatMode ? "zakat" : "sadaqah") || "Unknown"}
                  </p>
                </div>
              </div>

              {(project.metadata?.asnafCategory || project.asnafTag) && (
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Asnaf Category</p>
                    <p className="font-semibold">
                      {project.metadata?.asnafCategory || project.asnafTag}
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
                      ? new Date(project.metadata.createdAt).toLocaleDateString()
                      : project.createdAt
                      ? new Date(project.createdAt).toLocaleDateString()
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
              {/* <div className="mt-2 text-sm text-muted-foreground">
                <Badge variant="outline" className="mr-2">
                  {getMilestoneSource()}
                </Badge>
                {getMilestoneDescription()}
              </div> */}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasMilestones() ? (
              <div className="space-y-4">
                {getMilestones().map((milestone: any, index: number) => {
                  const isReleased = isMilestoneReleased(milestone);
                  const milestoneDescription = getMilestoneDescriptionText(milestone, index);
                  const beneficiary = getMilestoneBeneficiary(milestone);
                  
                  return (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold">Milestone {index + 1}</h4>
                          {milestoneDescription && (
                            <p className="text-muted-foreground text-sm mt-1">
                              {milestoneDescription}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {formatMilestoneAmount(milestone)} MATIC
                          </Badge>
                          <Badge
                            variant={isReleased ? "default" : "outline"}
                            className={
                              isReleased
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }
                          >
                            {isReleased ? (
                              <Check className="h-3 w-3 mr-1" />
                            ) : (
                              <X className="h-3 w-3 mr-1" />
                            )}
                            {isReleased ? "Released" : "Pending"}
                          </Badge>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        <div className="flex justify-between">
                          <span title={beneficiary} className="truncate max-w-[200px]">
                            Beneficiary: {beneficiary}
                          </span>
                          <span>
                            Status: {isReleased ? "Paid" : "Awaiting release"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
              No updates available yet. Check back later for project progress reports.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}