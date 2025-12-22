// app/projects/[address]/components/ProjectHeader.tsx
import { Badge } from '@/components/ui/badge';
import { ProjectData } from '@/types/project';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Building2 } from 'lucide-react';

interface ProjectHeaderProps {
  project: ProjectData;
  source: 'database' | 'blockchain' | null;
}

export default function ProjectHeader({ project, source }: ProjectHeaderProps) {
  // console.log("Rendering ProjectHeader with project:", project);
  // console.log("ProjectHeader source:", source);
  const formatAmount = (amount: bigint) => {
    return (Number(amount) / 1e18).toFixed(2);
  };

  const getProgressPercentage = (donated: bigint, goal: bigint) => {
    if (goal === BigInt(0)) return 0;
    return Math.min(100, (Number(donated) / Number(goal)) * 100);
  };

  const getStatusBadge = (project: ProjectData) => {
    if (project.completed) {
      return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
    }
    if (project.deadlineEnabled && Number(project.deadline) * 1000 < Date.now()) {
      return <Badge className="bg-red-100 text-red-800">Expired</Badge>;
    }
    return <Badge className="bg-blue-100 text-blue-800">Active</Badge>;
  };

  const progressPercentage = getProgressPercentage(project.totalDonated, project.goal);

  return (
    <>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            {project.metadata?.title || project.title || "Untitled Project"}
          </h1>
          <p className="text-muted-foreground text-lg">
            {project.metadata?.description || project.description || "No description available"}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {getStatusBadge(project)}
          {source && (
            <Badge variant="outline" className="text-xs">
              Source: {source}
            </Badge>
          )}
        </div>
      </div>
    </>
  );
}

// Sub-component for progress details
ProjectHeader.Details = function ProjectDetails({ project }: { project: ProjectData }) {
  const formatAmount = (amount: bigint) => {
    // Add validation
    if (typeof amount !== 'bigint') {
      console.warn('Invalid amount type:', typeof amount, amount);
      return '0.00';
    }
    return (Number(amount) / 1e18).toFixed(2);
  };

  const getProgressPercentage = (donated: bigint, goal: bigint) => {
    if (goal === BigInt(0)) return 0;
    // Validate inputs
    if (typeof donated !== 'bigint' || typeof goal !== 'bigint') {
      console.warn('Invalid BigInt inputs:', { donated, goal });
      return 0;
    }
    return Math.min(100, (Number(donated) / Number(goal)) * 100);
  };

  const progressPercentage = getProgressPercentage(project.totalDonated, project.goal);
  
  // Safe calculation for remaining amount
  const calculateRemaining = () => {
    try {
      // Validate both are BigInts
      if (typeof project.goal !== 'bigint' || typeof project.totalDonated !== 'bigint') {
        console.warn('Invalid BigInts for calculation:', {
          goal: project.goal,
          totalDonated: project.totalDonated,
          goalType: typeof project.goal,
          donatedType: typeof project.totalDonated
        });
        return '0.00';
      }
      
      const remaining = Number(project.goal) - Number(project.totalDonated);
      // Check if result is valid
      if (isNaN(remaining) || !isFinite(remaining)) {
        return '0.00';
      }
      return (remaining / 1e18).toFixed(2);
    } catch (error) {
      console.error('Error calculating remaining:', error);
      return '0.00';
    }
  };

  return (
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
              {calculateRemaining()} MATIC needed  {/* Use the safe function */}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};