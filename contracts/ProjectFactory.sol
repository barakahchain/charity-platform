// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Project.sol";

contract ProjectFactory is Ownable {
    using Clones for address;

    address public implementation;
    address[] public allProjects;

    event ProjectCreated(
        address indexed projectAddress,
        address indexed platform,
        address indexed charity,
        address builder,
        uint256 goal,
        uint256 deadline,
        string metaCid,
        bool deadlineEnabled
    );

    constructor(address _implementation) Ownable(msg.sender) {
        require(_implementation != address(0), "Invalid implementation");
        implementation = _implementation;
    }

    function createProject(
        address charity,
        address payable builder,
        uint256 goal,
        uint256 deadline,
        string memory metaCid,
        uint256[] memory milestoneAmounts,
        bool deadlineEnabled  
    ) external returns (address) {
        require(charity != address(0), "Invalid charity");
        require(builder != address(0), "Invalid builder");
        require(goal > 0, "Goal must be > 0");
        require(deadline > block.timestamp, "Deadline must be in future");
        require(bytes(metaCid).length > 0, "Metadata required");

        address clone = Clones.clone(implementation);

        // Initialize the cloned Project
        Project(clone).initialize(
            owner(),   // Platform = factory owner
            charity,   // Charity = operational manager
            builder,
            goal,
            deadline,
            metaCid,
            milestoneAmounts,
            deadlineEnabled
        );

        allProjects.push(clone);

        emit ProjectCreated(clone, owner(), charity, builder, goal, deadline, metaCid, deadlineEnabled);
        return clone;
    }

    function getProjectsCount() external view returns (uint256) {
        return allProjects.length;
    }

    function getAllProjects() external view returns (address[] memory) {
        return allProjects;
    }

    /// Platform admin can upgrade implementation for future projects
    function upgradeImplementation(address _newImplementation) external onlyOwner {
        require(_newImplementation != address(0), "Invalid implementation");
        implementation = _newImplementation;
    }
}
