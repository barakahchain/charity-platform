import  ProjectViewer  from "../../components/ProjectViewer";
import  ProjectsList  from "../../components/ProjectsList";

export default function ProjectsPage() {
  const cloneAddress = "0x164374295659ef538b563dc805afd97347d7cf45" as `0x${string}`;

  return (
    <main className="min-h-screen bg-black text-white">
      {/* <ProjectViewer cloneAddress={cloneAddress} /> */}
      <ProjectsList />
    </main>
  );
}
