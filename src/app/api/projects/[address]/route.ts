// app/api/projects/[address]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { projects, milestones } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> } // params is a Promise!
) {
  try {
    // Await the params promise
    const { address } = await params;
    
    console.log(`Fetching project for address: ${address}`);
    
    // Fetch project WITHOUT with clause first to test
    const project = await db.query.projects.findFirst({
      where: eq(projects.contractAddress, address),
    });
    
    if (!project) {
      console.log(`Project not found for address: ${address}`);
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }
    
    console.log(`Found project: ${project.title}`);
    
    // Fetch milestones separately
    const projectMilestones = await db.query.milestones.findMany({
      where: eq(milestones.projectId, project.id),
    });
    
    return NextResponse.json({
      ...project,
      milestones: projectMilestones,
    });
  } catch (error: any) {
    console.error('Error fetching project:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error.message 
      },
      { status: 500 }
    );
  }
}

export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function PATCH() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

