// scripts/deploy-factory.ts
import hre from "hardhat";
import { getAddress } from "viem"; // ✅ Add this

async function main() {
  console.log("🚀 Deploying ProjectFactory platform with Viem...");

  const { viem } = await hre.network.connect();
  const [deployer] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  console.log("Platform deployer:", deployer.account.address);
  console.log("Network:", publicClient.chain?.name);

  // ✅ Properly checksummed Project implementation address
  // const existingProjectImpl = getAddress("0x43dF1E8f72327359f8069D5E0EB75ef09E179e30");
  const existingProjectImpl = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;
  console.log("\n📦 Using existing Project implementation:", existingProjectImpl);

  console.log("\n🏭 Step 2: Deploying ProjectFactory...");
  const factory = await viem.deployContract("ProjectFactory", [existingProjectImpl]);

  const factoryAddress = factory.address;
  console.log("✅ ProjectFactory deployed:", factoryAddress);

  const [factoryOwner, factoryImplementation] = await Promise.all([
    factory.read.owner(),
    factory.read.implementation(),
  ]);

  console.log("\n🎉 DEPLOYMENT SUMMARY");
  console.log("====================");
  console.log("🏭 Factory Address:", factoryAddress);
  console.log("🔧 Implementation:", factoryImplementation);
  console.log("👑 Factory Owner:", factoryOwner);
  console.log("📦 Project Impl:", existingProjectImpl);
  console.log("🌐 Network:", publicClient.chain?.name);
  console.log("\n✅ Platform ready! Charities can now create projects.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
