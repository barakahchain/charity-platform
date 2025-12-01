"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Eye, TrendingUp, CheckCircle2, Users, Building2, Hammer, BadgeCheck } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const features = [
    {
      icon: Shield,
      title: "Shariah Compliant",
      description: "Built on Islamic finance principles including Wakālah, Juʿālah, and Istisnāʿ contracts with full tamlik compliance.",
    },
    {
      icon: Eye,
      title: "Transparent & Auditable",
      description: "Every transaction recorded on-chain. Track donations, milestones, and fund releases in real-time on Polygon.",
    },
    {
      icon: TrendingUp,
      title: "Milestone-Based Escrow",
      description: "Funds released only after verified completion. Smart contracts ensure accountability at every stage.",
    },
    {
      icon: CheckCircle2,
      title: "Third-Party Verification",
      description: "Independent verifiers confirm project milestones before releasing funds, ensuring trust and transparency.",
    },
  ];

  const roles = [
    {
      icon: Users,
      role: "Donors",
      description: "Contribute USDC to projects, track impact in real-time, and download zakat receipts.",
      color: "text-blue-500",
      link: "/donor",
    },
    {
      icon: Building2,
      role: "Charities",
      description: "Create projects, define milestones, manage builders, and ensure Shariah compliance.",
      color: "text-green-500",
      link: "/charity",
    },
    {
      icon: Hammer,
      role: "Builders",
      description: "Execute project work, upload evidence to IPFS, and receive milestone payments.",
      color: "text-orange-500",
      link: "#",
    },
    {
      icon: BadgeCheck,
      role: "Verifiers",
      description: "Review evidence, confirm completion, and trigger smart contract fund releases.",
      color: "text-purple-500",
      link: "/verifier",
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 px-4 bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-sm font-medium">
              <Shield className="h-4 w-4" />
              Blockchain-Powered Charity Platform
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Transparent Charity Funding
              <br />
              <span className="text-primary">Built on Shariah Principles</span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Milestone-based escrow using smart contracts. Funds released only after verification. 
              Full transparency from donation to impact.
            </p>
            
            <div className="flex flex-wrap gap-4 justify-center pt-4">
              <Link href="/donor">
                <Button size="lg" className="gap-2">
                  <Users className="h-5 w-5" />
                  Donor Dashboard
                </Button>
              </Link>
              <Link href="/charity/projects/create">
                <Button size="lg" variant="outline" className="gap-2">
                  <Building2 className="h-5 w-5" />
                  Create Project
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Key Features</h2>
            <p className="text-muted-foreground text-lg">
              Built with transparency, compliance, and accountability at the core
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="border-2 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <feature.icon className="h-10 w-10 text-primary mb-2" />
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Role-Based Access</h2>
            <p className="text-muted-foreground text-lg">
              Connect your wallet and participate based on your role
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {roles.map((item, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <item.icon className={`h-12 w-12 mb-3 ${item.color}`} />
                  <CardTitle>{item.role}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CardDescription>{item.description}</CardDescription>
                  {item.link !== "#" && (
                    <Link href={item.link}>
                      <Button variant="outline" className="w-full">
                        Access Portal
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
          </div>

          <div className="space-y-8">
            {[
              {
                step: "1",
                title: "Charity Creates Project",
                description: "Define project goals, milestones, budget allocation, and Shariah compliance settings (Zakat mode, Asnaf tags).",
              },
              {
                step: "2",
                title: "Donors Contribute USDC",
                description: "Connect wallet and fund projects using USDC stablecoin on Polygon. Funds held securely in smart contract escrow.",
              },
              {
                step: "3",
                title: "Builders Execute Work",
                description: "Assigned builders complete milestones and upload proof of work (photos/reports) to IPFS.",
              },
              {
                step: "4",
                title: "Verifiers Confirm & Release",
                description: "Independent verifiers review evidence and trigger smart contract to release funds to builders.",
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto max-w-4xl text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold">
            Ready to Transform Charity Giving?
          </h2>
          <p className="text-lg opacity-90">
            Connect your wallet and start participating in transparent, accountable charity funding.
          </p>
          <div className="flex flex-wrap gap-4 justify-center pt-4">
            <Link href="/donor">
              <Button size="lg" variant="secondary">
                Get Started as Donor
              </Button>
            </Link>
            <Link href="/register">
              <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10">
                Register as Charity
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}