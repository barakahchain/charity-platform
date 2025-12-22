// types/project.ts
export interface ProjectMetadata {
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

export interface ContractMilestone {
  amount: bigint;
  released: boolean;
}

export interface ProjectData {
  address: string;
  goal: bigint;
  deadline: bigint;
  completed: boolean;
  charity: string;
  builder: string;
  totalDonated: bigint;
  deadlineEnabled: boolean;
  metadata?: ProjectMetadata;
  contractTemplate: string;
  contractMilestones: ContractMilestone[];
  // Database fields
  dbId?: number;
  title?: string;
  description?: string;
  metaCid?: string;
  zakatMode?: boolean;
  asnafTag?: string;
  totalAmount?: number;
  fundedBalance?: number;
  status?: string;
  blockchainTxHash?: string;
  createdAt?: string;
  milestones?: Array<{
    id: number;
    description: string;
    amount: number;
    beneficiaryAddress: string;
    status: string;
  }>;
}