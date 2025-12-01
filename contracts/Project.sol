// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

contract Project is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable, PausableUpgradeable {
    address public charity;          // Operational manager
    address payable public builder;  // Fund recipient
    address public platform;         // Platform admin (for emergency)

    uint256 public goal;
    uint256 public deadline;
    string public metaCid;

    bool public completed;
    bool public deadlineEnabled;     // ✅ Toggle to enforce or ignore deadline

    struct Milestone {
        uint128 amount;
        bool released;
    }
    Milestone[] public milestones;

    uint256 public totalDonated;
    mapping(address => uint256) public donations;

    event Donated(address indexed donor, uint256 amount);
    event MilestoneReleased(uint256 indexed index, uint256 amount);
    event ProjectCompleted();
    event ProjectFailed();
    event EmergencyPaused(address indexed byPlatform);
    event DeadlineToggled(bool enabled); // ✅ New event

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice initialize is called instead of constructor (for clones)
    function initialize(
        address _platform,
        address _charity,
        address payable _builder,
        uint256 _goal,
        uint256 _deadline,
        string memory _metaCid,
        uint256[] memory _milestoneAmounts,
        bool _deadlineEnabled  

    ) external initializer {
        require(_platform != address(0), "Invalid platform");
        require(_charity != address(0), "Invalid charity");
        require(_builder != address(0), "Invalid builder");
        require(_deadline > block.timestamp, "Deadline must be in future");
        require(_goal > 0, "Goal >0");
        require(_milestoneAmounts.length > 0, "Milestones required");

        __Ownable_init(_platform);
        __ReentrancyGuard_init();
        __Pausable_init();

        platform = _platform;
        charity = _charity;
        builder = _builder;
        goal = _goal;
        deadline = _deadline;
        metaCid = _metaCid;
        deadlineEnabled = _deadlineEnabled; 

        uint256 totalMilestones;
        for (uint i = 0; i < _milestoneAmounts.length; i++) {
            require(_milestoneAmounts[i] > 0, "Milestone >0");
            totalMilestones += _milestoneAmounts[i];
            milestones.push(Milestone({
                amount: uint128(_milestoneAmounts[i]),
                released: false
            }));
        }

        require(totalMilestones <= _goal, "Milestones exceed goal");
    }

    modifier onlyCharity() {
        require(msg.sender == charity, "Only charity");
        _;
    }

    modifier onlyPlatform() {
        require(msg.sender == platform, "Only platform");
        _;
    }

    /// ✅ New modifier to check deadline condition dynamically
    modifier checkDeadline() {
        if (deadlineEnabled) {
            require(block.timestamp <= deadline, "Deadline passed");
        }
        _;
    }

    /// @notice Donate to this project
    function donate() external payable whenNotPaused nonReentrant checkDeadline {
        require(!completed, "Already completed");
        require(msg.value > 0, "Donate >0");
        require(totalDonated + msg.value <= goal, "Exceeds goal");

        donations[msg.sender] += msg.value;
        totalDonated += msg.value;

        emit Donated(msg.sender, msg.value);
    }

    /// @notice Release a milestone payment (only charity)
    function releaseMilestone(uint256 index) external onlyCharity nonReentrant {
        require(!completed, "Completed");
        require(index < milestones.length, "Invalid milestone");
        Milestone storage m = milestones[index];
        require(!m.released, "Already released");
        require(address(this).balance >= m.amount, "Insufficient balance");

        m.released = true;
        (bool success, ) = builder.call{ value: m.amount }("");
        require(success, "Transfer failed");

        emit MilestoneReleased(index, m.amount);

        if (_allMilestonesReleased()) {
            completed = true;
            emit ProjectCompleted();
        }
    }

    /// @notice Refund donors if project failed
    function claimRefund() external nonReentrant {
        require(deadlineEnabled, "Refunds disabled (no deadline)");
        require(block.timestamp > deadline, "Deadline not passed");
        require(!completed, "Project completed");
        require(totalDonated < goal, "Goal met");

        uint256 donation = donations[msg.sender];
        require(donation > 0, "No donation to refund");

        donations[msg.sender] = 0;
        (bool success, ) = msg.sender.call{ value: donation }("");
        require(success, "Refund failed");
    }

    // Charity controls
    function pause() external onlyCharity {
        _pause();
    }

    function unpause() external onlyCharity {
        _unpause();
    }

    /// ✅ Toggle deadline enforcement (charity only)
    function toggleDeadline(bool _enabled) external onlyCharity {
        deadlineEnabled = _enabled;
        emit DeadlineToggled(_enabled);
    }

    // Platform emergency controls
    function emergencyPause() external onlyPlatform {
        _pause();
        emit EmergencyPaused(msg.sender);
    }

    // View helpers
    function getProjectInfo() external view returns (
        address _platform,
        address _charity,
        address _builder,
        uint256 _goal,
        uint256 _deadline,
        bool _completed,
        bool _deadlineEnabled
    ) {
        return (platform, charity, builder, goal, deadline, completed, deadlineEnabled);
    }

    function milestoneCount() external view returns (uint256) {
        return milestones.length;
    }

    function getMilestone(uint256 index) external view returns (uint256 amount, bool released) {
        require(index < milestones.length, "Invalid milestone");
        Milestone storage m = milestones[index];
        return (m.amount, m.released);
    }

    function _allMilestonesReleased() internal view returns (bool) {
        for (uint i = 0; i < milestones.length; i++) {
            if (!milestones[i].released) {
                return false;
            }
        }
        return true;
    }
}
