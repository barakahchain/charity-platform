// app/projects/[address]/components/ProjectNotFound.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface ProjectNotFoundProps {
  address?: string;
}

export function ProjectNotFound({ address }: ProjectNotFoundProps) {
  return (
    <div className="container mx-auto px-4 py-20 max-w-6xl">
      <Card className="border-2">
        <CardHeader className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <CardTitle>Project Not Found</CardTitle>
          <CardDescription>
            {address 
              ? `The project at address ${address} doesn't exist or couldn't be loaded.`
              : "The project you're looking for doesn't exist or couldn't be loaded."
            }
          </CardDescription>
          <Button asChild className="mt-4">
            <Link href="/projects">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Projects
            </Link>
          </Button>
        </CardHeader>
      </Card>
    </div>
  );
}