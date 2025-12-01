# ShariahEscrow Smart Contract

## Overview

The ShariahEscrow smart contract implements a Shariah-compliant charity escrow system with milestone-based fund releases on Polygon blockchain.

## Features

- ✅ Milestone-based escrow (Pending → Submitted → Verified → Paid)
- ✅ Verifier-controlled fund release
- ✅ IPFS integration for evidence storage
- ✅ Zakat mode with Asnaf categorization
- ✅ Islamic contract templates (Wakālah, Juʿālah, Istisnāʿ)
- ✅ Pausable and emergency controls
- ✅ USDC stablecoin support
- ✅ Role-based access control
- ✅ Reentrancy protection

## Installation

```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox @openzeppelin/contracts
```

## Environment Variables

Create a `.env` file in the root directory:

```env
# Network RPC URLs
MUMBAI_RPC_URL=https://rpc-mumbai.maticvigil.com
POLYGON_RPC_URL=https://polygon-rpc.com

# Deployment
PRIVATE_KEY=your_private_key_here

# Contract Verification
POLYGONSCAN_API_KEY=your_polygonscan_api_key

# Contract Address (after deployment)
CONTRACT_ADDRESS=0x...

# Role Addresses
CHARITY_ADDRESS=0x...
VERIFIER_ADDRESS=0x...
```

## Compile

```bash
npx hardhat compile
```

## Test

```bash
npx hardhat test
```

## Deploy to Mumbai Testnet

```bash
npx hardhat run scripts/deploy.ts --network mumbai
```

## Setup Roles

After deployment, setup charity and verifier roles:

```bash
CONTRACT_ADDRESS=0x... CHARITY_ADDRESS=0x... VERIFIER_ADDRESS=0x... npx hardhat run scripts/setup-roles.ts --network mumbai
```

## Verify Contract

```bash
npx hardhat verify --network mumbai DEPLOYED_CONTRACT_ADDRESS USDC_TOKEN_ADDRESS
```

## Contract Architecture

### Main Components

1. **Project Management**
   - Create projects with Islamic contract templates
   - Define project metadata (title, description, IPFS CID)
   - Set Zakat mode and Asnaf categorization
   - Track funding and release balances

2. **Milestone System**
   - Add milestones with descriptions and budgets
   - Assign beneficiaries for each milestone
   - Submit evidence via IPFS CID
   - Verify and release funds upon completion

3. **Role-Based Access**
   - **Owner**: Platform administrator
   - **Charity**: Creates projects and milestones
   - **Verifier**: Reviews evidence and approves releases
   - **Donor**: Funds projects with USDC
   - **Builder**: Executes work and submits evidence

4. **Security Features**
   - Pausable contracts
   - Reentrancy protection
   - Emergency withdrawal
   - Project-level pause controls

### Contract Templates

- **Wakālah (Agency)**: Agent acts on behalf of principal
- **Juʿālah (Service Contract)**: Reward-based service agreement
- **Istisnāʿ (Manufacturing)**: Order to manufacture goods

### Milestone Status Flow

```
Pending → Submitted → Verified → Paid
         ↓           ↓
         ↓           Rejected
         (evidence)  (verifier decision)
```

## Key Functions

### Admin Functions

```solidity
registerCharity(address _charity)
removeCharity(address _charity)
addVerifier(address _verifier)
removeVerifier(address _verifier)
pauseProject(uint256 _projectId)
resumeProject(uint256 _projectId)
emergencyWithdraw(uint256 _projectId, address _to)
pause()
unpause()
```

### Charity Functions

```solidity
createProject(
    string calldata _title,
    string calldata _metaCid,
    bool _zakatMode,
    string calldata _asnafTag,
    ContractTemplate _contractTemplate,
    uint256 _totalAmount
)

addMilestone(
    uint256 _projectId,
    string calldata _description,
    uint256 _amount,
    address _beneficiary
)
```

### Donor Functions

```solidity
fundProject(uint256 _projectId, uint256 _amount)
getDonorContribution(uint256 _projectId, address _donor)
```

### Builder Functions

```solidity
submitEvidence(uint256 _milestoneId, string calldata _evidenceCid)
```

### Verifier Functions

```solidity
verifyMilestone(uint256 _milestoneId, bool _approved)
```

### View Functions

```solidity
getProject(uint256 _projectId)
getMilestone(uint256 _milestoneId)
getProjectMilestones(uint256 _projectId)
```

## Events

```solidity
event ProjectCreated(uint256 indexed projectId, address indexed charity, string title, uint256 totalAmount, bool zakatMode, ContractTemplate contractTemplate)
event MilestoneAdded(uint256 indexed milestoneId, uint256 indexed projectId, string description, uint256 amount, address beneficiary)
event Funded(uint256 indexed projectId, address indexed donor, uint256 amount, uint256 newBalance)
event MilestoneSubmitted(uint256 indexed milestoneId, uint256 indexed projectId, string evidenceCid, uint256 timestamp)
event MilestoneVerified(uint256 indexed milestoneId, uint256 indexed projectId, address indexed verifier, bool approved, uint256 timestamp)
event MilestonePaid(uint256 indexed milestoneId, uint256 indexed projectId, address indexed beneficiary, uint256 amount, uint256 timestamp)
```

## USDC Token Addresses

- **Mumbai Testnet**: `0x0FA8781a83E46826621b3BC094Ea2A0212e71B23`
- **Polygon Mainnet**: `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`

## Testing with Mumbai Testnet

1. Get Mumbai MATIC from [Polygon Faucet](https://faucet.polygon.technology/)
2. Get Mumbai USDC from [Faucet](https://faucet.circle.com/) or swap MATIC
3. Deploy contract to Mumbai
4. Register charity and verifier addresses
5. Test full workflow:
   - Charity creates project
   - Charity adds milestones
   - Donor funds project
   - Builder submits evidence
   - Verifier approves milestone
   - Funds released to builder

## Security Considerations

- ✅ Uses OpenZeppelin audited contracts
- ✅ Implements reentrancy guards
- ✅ Safe ERC20 token transfers
- ✅ Access control on critical functions
- ✅ Emergency pause mechanism
- ✅ Input validation on all functions

## Gas Optimization

- Uses `immutable` for USDC token address
- Minimal storage operations
- Efficient data structures
- Batch operations where possible

## Auditing Checklist

- [ ] Reentrancy protection verified
- [ ] Access control properly implemented
- [ ] Integer overflow/underflow handled
- [ ] Token transfer safety checked
- [ ] Emergency mechanisms tested
- [ ] Event emissions verified
- [ ] Edge cases covered
- [ ] Gas optimization reviewed

## License

MIT