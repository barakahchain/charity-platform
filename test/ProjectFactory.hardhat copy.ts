import { expect } from "chai";
import hre from "hardhat";
import { parseEther } from "viem";

describe("ProjectFactory + Project Integration", function () {
  let deployer: any;
  let charity: any;
  let builder: any;
  let factory: any;
  let projectImpl: any;
  let viem: any;
  let publicClient: any;

  before(async () => {
    const connectRes = await hre.network.connect();
    viem = connectRes.viem;
    [deployer, charity, builder] = await viem.getWalletClients();
    publicClient = await viem.getPublicClient();

    // 1️⃣ Deploy Project implementation
    projectImpl = await viem.deployContract("Project");

    // 2️⃣ Deploy Factory with implementation
    factory = await viem.deployContract("ProjectFactory", [
      projectImpl.address,
    ]);
  });

  it("should deploy a project via factory and initialize it correctly", async () => {
    const goal = parseEther("10");
    const deadline = Math.floor(Date.now() / 1000) + 86400; // +1 day
    const metaCid = "QmExampleCID";
    const milestoneAmounts = [parseEther("4"), parseEther("6")];

    // 3️⃣ Create project through factory
    const hash = await factory.write.createProject([
      charity.account.address,
      builder.account.address,
      goal,
      deadline,
      metaCid,
      milestoneAmounts,
    ]);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    // 4️⃣ Extract new project address from logs
    const events = await factory.getEvents.ProjectCreated();
    expect(events.length).to.be.greaterThan(0);

    const projectAddress = events[0].args.projectAddress;
    expect(projectAddress).to.match(/^0x[a-fA-F0-9]{40}$/);

    // 5️⃣ Connect to the new project
    const project = await viem.getContractAt("Project", projectAddress);

    const [
      platform,
      projCharity,
      projBuilder,
      projGoal,
      projDeadline,
      completed,
    ] = await project.read.getProjectInfo();

    // 6️⃣ Validate initialization - FIXED ADDRESS COMPARISONS
    expect(platform.toLowerCase()).to.equal(
      deployer.account.address.toLowerCase()
    );
    expect(projCharity.toLowerCase()).to.equal(
      charity.account.address.toLowerCase()
    );
    expect(projBuilder.toLowerCase()).to.equal(
      builder.account.address.toLowerCase()
    );
    expect(projGoal).to.equal(goal);
    expect(Number(projDeadline)).to.equal(deadline);
    expect(completed).to.be.false;

    console.log("\n✅ Project successfully created at:", projectAddress);
  });
});
