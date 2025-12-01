// test/setup.js
// Contract addresses from your deployment
export const DEPLOYED_ADDRESSES = {
  FACTORY: "0x66104d4a199df29f829af78cc9280505aeae302c",
  IMPLEMENTATION: "0x43dF1e8F72327359F8069d5E0EB75Ef09E179E30",
  FACTORY_OWNER: "0x0cD829B7eC7BB0acb27770f4c589b2D5020F8f6b"
};

// Contract ABIs
export const PROJECT_FACTORY_ABI = [
  "function implementation() view returns (address)",
  "function createProject(address charity, address builder, uint256 goal, uint256 deadline, string memory metaCid, uint256[] memory milestoneAmounts) returns (address)",
  "function getProjectsCount() view returns (uint256)",
  "function getAllProjects() view returns (address[])",
  "function upgradeImplementation(address _newImplementation)",
  "event ProjectCreated(address indexed projectAddress, address indexed platform, address indexed charity, address builder, uint256 goal, uint256 deadline, string metaCid)"
];

export const PROJECT_ABI = [
  "function initialize(address _platform, address _charity, address _builder, uint256 _goal, uint256 _deadline, string memory _metaCid, uint256[] memory _milestoneAmounts)",
  "function donate() payable",
  "function releaseMilestone(uint256 index)",
  "function claimRefund()",
  "function pause()",
  "function unpause()",
  "function emergencyPause()",
  "function goal() view returns (uint256)",
  "function deadline() view returns (uint256)",
  "function totalDonated() view returns (uint256)",
  "function completed() view returns (bool)",
  "function charity() view returns (address)",
  "function builder() view returns (address)",
  "function platform() view returns (address)",
  "function milestoneCount() view returns (uint256)",
  "function getMilestone(uint256 index) view returns (uint256 amount, bool released)",
  "function donations(address donor) view returns (uint256)",
  "event Donated(address indexed donor, uint256 amount)",
  "event MilestoneReleased(uint256 indexed index, uint256 amount)",
  "event ProjectCompleted()",
  "event ProjectFailed()",
  "event EmergencyPaused(address indexed byPlatform)"
];