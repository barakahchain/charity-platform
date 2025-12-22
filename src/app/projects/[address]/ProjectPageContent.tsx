// app/projects/[address]/ProjectPageContent.tsx
"use client";

import React, { useState  } from 'react';
import { useProjectData } from '@/lib/hooks/useProjectData';
import { useDonationHandler } from '@/lib/hooks/useDonationHandler';
import { useUser } from '@/app/stores/auth-store';
import { ProjectData } from '@/types/project';
import ProjectHeader from './components/ProjectHeader';
import DonationCard from './components/DonationCard';
import ProjectTabs from './components/ProjectTabs';
import ProjectSidebar from './components/ProjectSidebar';
import { ProjectLoadingSkeleton } from './components/ProjectLoadingSkeleton';
import { ProjectNotFound } from './components/ProjectNotFound';
import { SuccessPopup } from './components/SuccessPopup';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface ProjectPageContentProps {
  address: string; // Changed from params to direct address
}

export function ProjectPageContent({ address }: ProjectPageContentProps) {
  const user = useUser();
  const [activeTab, setActiveTab] = useState('overview');

  
  // Fetch data using our new hook
  const { project, loading, error, source } = useProjectData(address);
  
  // Handle donations
  const donationHandler = useDonationHandler(project, user);

  if (loading) return <ProjectLoadingSkeleton />;
  if (error || !project) return <ProjectNotFound address={address} />;
  
  // console.log("ProjectPageContent rendering with project:", project);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Back Button */}
      <Button variant="ghost" asChild className="mb-6">
        <Link href="/projects">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Link>
      </Button>

      <ProjectHeader project={project} source={source} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <ProjectHeader.Details project={project} />
        </div>
        
        <DonationCard 
          project={project}
          donationHandler={donationHandler}
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ProjectTabs 
            project={project} 
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>
        
        <ProjectSidebar project={project} />
      </div>
      
      <SuccessPopup 
        show={donationHandler.showSuccessPopup}
        data={donationHandler.successData}
        onClose={donationHandler.resetSuccess}
      />
    </div>
  );
}