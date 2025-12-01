export const ProjectFactoryABI = [
  {
    inputs: [
      {
        internalType: "address",
        name: "_implementation",
        type: "address"
      }
    ],
    stateMutability: "nonpayable",
    type: "constructor"
  },
  {
    inputs: [],
    name: "allProjects",
    outputs: [
      {
        internalType: "address[]", // Note: This should be address[] not address
        name: "",
        type: "address[]"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  // ADD THIS FUNCTION:
  {
    inputs: [],
    name: "getAllProjects",
    outputs: [
      {
        internalType: "address[]",
        name: "",
        type: "address[]"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "charity",
        type: "address"
      },
      {
        internalType: "address payable",
        name: "builder",
        type: "address"
      },
      {
        internalType: "uint256",
        name: "goal",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "deadline",
        type: "uint256"
      },
      {
        internalType: "string",
        name: "metaCid",
        type: "string"
      },
      {
        internalType: "uint256[]",
        name: "milestoneAmounts",
        type: "uint256[]"
      }
    ],
    name: "createProject",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address"
      }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "getProjectsCount",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "implementation",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_newImplementation",
        type: "address"
      }
    ],
    name: "upgradeImplementation",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "projectAddress",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "platform",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "charity",
        type: "address"
      },
      {
        indexed: false,
        internalType: "address",
        name: "builder",
        type: "address"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "goal",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "deadline",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "string",
        name: "metaCid",
        type: "string"
      },
      {
        indexed: false,
        internalType: "bool",
        name: "deadlineEnabled",
        type: "bool"
      }
    ],
    name: "ProjectCreated",
    type: "event"
  }
] as const;