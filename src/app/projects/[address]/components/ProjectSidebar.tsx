// app/projects/[address]/components/ProjectSidebar.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, FileText, Clock, ExternalLink } from 'lucide-react';
import { ProjectData } from '@/types/project';

interface ProjectSidebarProps {
  project: ProjectData;
}

const getContractTemplateBadge = (template: string) => {
  const templates: { [key: string]: string } = {
    wakalah: "Wakālah",
    jualah: "Juʿālah",
    istisna: "Istisnāʿ",
  };
  return templates[template] || template;
};

const formatDate = (timestamp: bigint) => {
    // console.log("Formatting date for timestamp:", timestamp);
    if (timestamp === BigInt(0)) return "No Deadline";
  return new Date(Number(timestamp) * 1000).toLocaleDateString();
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

export default function ProjectSidebar({ project }: ProjectSidebarProps) {
    // console.log("Project data in sidebar:", project);
  const viewOnExplorer = (address: string) => {
    window.open(`https://amoy.polygonscan.com/address/${address}`, "_blank");
  };

  return (
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
              {project.metadata?.type || (project.zakatMode ? "zakat" : "sadaqah") || "Unknown"}
            </Badge>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Template</span>
            <Badge variant="outline">
              {project.metadata
                ? getContractTemplateBadge(project.metadata.contractTemplate)
                : getContractTemplateBadge(project.contractTemplate || "Unknown")}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}