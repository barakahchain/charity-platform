// // scripts/deploy-platform.ts
// import hre from "hardhat";

// async function main() {
//   console.log("🚀 Deploying ProjectFactory platform with Viem...");

//   const { viem } = await hre.network.connect();
  
//   // Use hre.viem directly - no need for network.connect()
//   const [deployer] = await viem.getWalletClients();
//   const publicClient = await viem.getPublicClient();

//   console.log("Platform deployer:", deployer.account.address);
//   console.log("Network:", publicClient.chain?.name);

//   // 1. Deploy Project implementation
//   console.log("\n📦 Step 1: Deploying Project implementation...");
//   const projectImpl = await viem.deployContract("Project");

//   // Get the deployment transaction hash from the contract instance
//   const projectImplAddress = projectImpl.address;
//   console.log("✅ Project implementation:", projectImplAddress);

//   // 2. Deploy Factory with implementation address
//   console.log("\n🏭 Step 2: Deploying ProjectFactory...");
//   const factory = await viem.deployContract(
//     "ProjectFactory",
//     [projectImplAddress]
//   );

//   const factoryAddress = factory.address;
//   console.log("✅ ProjectFactory deployed:", factoryAddress);

//   // 3. Verify contract state
//   console.log("\n🔍 Step 3: Verifying contract state...");
//   const [factoryOwner, factoryImplementation] = await Promise.all([
//     factory.read.owner(),
//     factory.read.implementation(),
//   ]);

//   console.log("\n🎉 DEPLOYMENT SUMMARY");
//   console.log("====================");
//   console.log("🏭 Factory Address:", factoryAddress);
//   console.log("🔧 Implementation:", factoryImplementation);
//   console.log("👑 Factory Owner:", factoryOwner);
//   console.log("📦 Project Impl:", projectImplAddress);
//   console.log("🌐 Network:", publicClient.chain?.name);
//   console.log("\n✅ Platform ready! Charities can now create projects.");

//   return {
//     projectImpl: projectImplAddress,
//     factory: factoryAddress,
//     factoryOwner,
//     factoryImplementation
//   };
// }

// main().catch((error) => {
//   console.error(error);
//   process.exitCode = 1;
// });