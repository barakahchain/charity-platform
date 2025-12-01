"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import Link from "next/link";

interface Milestone {
  id: number;
  description: string;
  amount: number;
  status: string;
}

interface Project {
  id: number;
  title: string;
  description: string;
  totalAmount: number;
  fundedBalance: number;
  status: string;
  createdAt: string;
  contractTemplate: string;
  zakatMode: boolean;
  asnafTag: string | null;
}

// Example in a server or client component
const res = await fetch("/api/auth/me");
const { user } = await res.json();
// `user` is { id, role } or null

export default function CharityProjectsPage() {
  const { address: walletAddress, isConnected } = useAccount();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isConnected || !walletAddress) {
      setError("Wallet not connected");
      setLoading(false);
      return;
    }

    async function loadProjects() {
      try {
        setLoading(true);
        setError(null); // Clear previous errors
        setProjects([]); // Clear previous projects

        // Fetch charity user by wallet
        const userRes = await fetch(`/api/users?wallet=${walletAddress}`);
        const userData = await userRes.json();
        console.log("walletAddress:", walletAddress);
        console.log("userData:", userData);
        const charityId = userData?.id;

        if (!charityId) {
          setError("No charity account found for this wallet");
          setLoading(false);
          return;
        }

        const res = await fetch(`/api/projects?charityId=${charityId}`);
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Failed to fetch projects");

        setProjects(data);
      } catch (err: any) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadProjects();
  }, [isConnected, walletAddress]); // ✅ Make sure walletAddress is in dependencies

  if (loading)
    return <div className="p-8 text-gray-500">Loading projects...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-black uppercase mb-6">
        My Charity Projects
      </h1>

      {projects.length === 0 ? (
        <p className="text-gray-500">No projects found.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <div
              key={p.id}
              className="border border-gray-700 bg-gray-900 rounded-2xl p-6 flex flex-col justify-between"
            >
              <div>
                <h2 className="text-xl font-semibold text-white mb-2">
                  {p.title}
                </h2>
                <p className="text-sm text-gray-400 mb-4">{p.description}</p>
                <p className="text-sm text-gray-400 mb-2">
                  Contract:{" "}
                  <span className="font-medium">{p.contractTemplate}</span>
                </p>
                <p className="text-sm text-gray-400 mb-2">
                  Status:{" "}
                  <span
                    className={`font-medium ${
                      p.status === "active"
                        ? "text-green-400"
                        : p.status === "paused"
                          ? "text-yellow-400"
                          : "text-gray-400"
                    }`}
                  >
                    {p.status}
                  </span>
                </p>
                <p className="text-sm text-gray-400">
                  Funded: {p.fundedBalance} / {p.totalAmount} USDC
                </p>
              </div>

              <Link
                href={`/charity/projects/${p.id}`}
                className="mt-4 inline-block text-center bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-500 transition"
              >
                View Details
              </Link>
            </div>
          ))}
        </div>
      )}

      <div className="mt-10">
        <Link
          href="/charity/projects/create"
          className="text-green-500 hover:underline font-semibold"
        >
          + Create New Project
        </Link>
      </div>
    </div>
  );
}
