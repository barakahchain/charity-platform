// hooks/useProjectData.ts
import { useState, useEffect, useRef } from "react";
import { projectService } from "@/services/projectService";
import { ProjectData } from "@/types/project";

// Helper function to convert BigInts to strings for comparison
const normalizeProjectForComparison = (project: ProjectData | null) => {
  if (!project) return null;

  return {
    ...project,
    // Convert BigInts to strings
    goal: project.goal.toString(),
    deadline: project.deadline.toString(),
    totalDonated: project.totalDonated.toString(),
    // Handle contract milestones
    contractMilestones:
      project.contractMilestones?.map((milestone) => ({
        ...milestone,
        amount: milestone.amount.toString(),
      })) || [],
    // Handle metadata milestones
    metadata: project.metadata
      ? {
          ...project.metadata,
          milestones:
            project.metadata.milestones?.map((milestone) => ({
              ...milestone,
              amount: milestone.amount.toString(),
            })) || [],
        }
      : undefined,
  };
};

export function useProjectData(contractAddress: string) {
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"database" | "blockchain" | null>(null);

  // Use ref instead of closure variable
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const fetchData = async () => {
      if (!contractAddress) return;

      setLoading(true);
      setError(null);

      try {
        // console.log(`Fetching project data for ${contractAddress}...`);
        // console.log("mountedRef.current:", mountedRef.current);

        // 1. Try database first (fast, cached)
        let data = await projectService.fetchFromDatabase(contractAddress);
        console.log("Fetched project from database:", data);

        // Check ref instead of closure variable
        if (data && data.address && mountedRef.current) {
          console.log("✅ Successfully loaded from database");
          setProject(data);
          setSource("database");
          setLoading(false);
          return;
        } else {
          console.log("❌ Database fetch returned:", data);
          // console.log("mountedRef status:", mountedRef.current);
        }

        // 2. Fallback to blockchain (slower, fresh)
        console.log("Database fetch failed, using blockchain fallback");
        data = await projectService.fetchFromBlockchain(contractAddress);
        console.log("Fetched project from blockchain:", data);
        
        if (data && mountedRef.current) {
          setProject(data);
          setSource("blockchain");
          setLoading(false);
        } else if (mountedRef.current) {
          setError("Project not found");
          setLoading(false);
        }
      } catch (err: any) {
        if (mountedRef.current) {
          setError(err.message || "Failed to load project");
          console.error("Project fetch error:", err);
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      mountedRef.current = false;
    };
  }, [contractAddress]);

  // Real-time updates via polling or WebSocket
  useEffect(() => {
    if (!project || source !== "database") return;

    const interval = setInterval(async () => {
      try {
        const updated = await projectService.fetchFromDatabase(contractAddress);

        if (updated) {
          // Compare normalized versions (BigInts converted to strings)
          const currentNormalized = normalizeProjectForComparison(project);
          const updatedNormalized = normalizeProjectForComparison(updated);

          if (
            JSON.stringify(currentNormalized) !==
            JSON.stringify(updatedNormalized)
          ) {
            setProject(updated);
          }
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, [contractAddress, project, source]);

  return { project, loading, error, source, refresh: () => setProject(null) };
}
