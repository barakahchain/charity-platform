// services/projectService.ts
import { ProjectData } from "../types/project";

const API_BASE = "/api";

export const projectService = {
  // Primary: Fetch from database
  async fetchFromDatabase(
    contractAddress: string
  ): Promise<ProjectData | null> {
    try {
      const response = await fetch(`/api/projects/${contractAddress}`);

      if (!response.ok) {
        if (response.status === 404) {
          console.log("Project not found in database, will use fallback");
          return null;
        }
        throw new Error(`Database fetch failed: ${response.status}`);
      }

      const result = await response.json();

      // Extract data from API response if needed
      const data = result.data || result;

      // Transform database format to ProjectData
      return {
        address: data.contractAddress,
        dbId: data.id,
        title: data.title,
        description: data.description,
        metaCid: data.metaCid,
        zakatMode: data.zakatMode,
        asnafTag: data.asnafTag,
        contractTemplate: data.contractTemplate,
        totalAmount: data.totalAmount,
        fundedBalance: data.fundedBalance,
        status: data.status,
        charity: data.walletAddress,
        builder: data.builder || data.walletAddress, // Fallback
        goal: BigInt(Math.floor(data.totalAmount * 1e18)),
        totalDonated: BigInt(Math.floor(data.fundedBalance * 1e18)),
        deadline: data.deadline
          ? BigInt(Math.floor(new Date(data.deadline).getTime() / 1000))
          : BigInt(0),
        deadlineEnabled: data.deadlineEnabled || false,
        completed: data.status === "completed",
        createdAt: data.createdAt,
        milestones: data.milestones || [],
        // Default values for blockchain fields
        metadata: {
          title: data.title,
          description: data.description,
          type: data.zakatMode ? "zakat" : "sadaqah",
          asnafCategory: data.asnafTag,
          contractTemplate: data.contractTemplate,
          milestones:
            data.milestones?.map((m: any) => ({
              description: m.description,
              amount: m.amount.toString(),
              beneficiaryAddress: m.beneficiaryAddress,
            })) || [],
          createdAt: data.createdAt,
          createdBy: data.walletAddress,
        },
        contractMilestones:
          data.milestones?.map((m: any) => ({
            amount: BigInt(Math.floor(m.amount * 1e18)),
            released: m.status === "paid" || m.status === "released",
          })) || [],
      };
    } catch (error) {
      console.error("Database fetch error:", error);
      return null;
    }
  },

  // Fallback: Fetch from blockchain
  async fetchFromBlockchain(
    contractAddress: string
  ): Promise<ProjectData | null> {
    try {
      // existing blockchain/IPFS fetching logic
      // This would be extracted from current fetchProjectData function
      const response = await fetch(
        `${API_BASE}/projects/blockchain/${contractAddress}`
      );

      if (!response.ok) {
        throw new Error(`Blockchain fetch failed: ${response.status}`);
      }

      const result = await response.json();

      // Extract data from API response
      const data = result.data || result;

      // Convert string values back to BigInt
      return {
        ...data,
        goal: typeof data.goal === "string" ? BigInt(data.goal) : data.goal,
        deadline:
          typeof data.deadline === "string"
            ? BigInt(data.deadline)
            : data.deadline,
        totalDonated:
          typeof data.totalDonated === "string"
            ? BigInt(data.totalDonated)
            : data.totalDonated,
        milestones: Array.isArray(data.milestones)
          ? data.milestones.map((m: any) => ({
              ...m,
              amount:
                typeof m.amount === "string" ? BigInt(m.amount) : m.amount,
            }))
          : [],
      };
    } catch (error) {
      console.error("Blockchain fetch error:", error);
      return null;
    }
  },

 

  // Update project data (for real-time updates)
  // async updateProject(contractAddress: string, updates: Partial<ProjectData>) {
  //   console.log(
  //     `Updating project ${contractAddress} with data:`,
  //     JSON.stringify(updates)
  //   );
  //   const response = await fetch(`${API_BASE}/projects/${contractAddress}`, {
  //     method: "PATCH",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify(updates),
  //   });

  //   if (!response.ok) throw new Error("Update failed");
  //   return response.json();
  // },
};
