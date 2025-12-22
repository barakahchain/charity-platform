// app/projects/[address]/page.tsx
"use client";
import React from 'react';
import { Suspense } from 'react';
import { ProjectPageContent } from './ProjectPageContent';

export default function ProjectPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  // Unwrap the promise using React.use()
  const { address } = React.use(params);
  
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProjectPageContent address={address} />
    </Suspense>
  );
}