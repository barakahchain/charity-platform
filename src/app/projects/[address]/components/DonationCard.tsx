// app/projects/[address]/components/DonationCard.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HandCoins } from 'lucide-react';
import { ProjectData } from '@/types/project';

interface DonationHandler {
  donationAmount: string;
  setDonationAmount: (amount: string) => void;
  isDonating: boolean;
  isConfirming: boolean;
  handleDonate: () => void;
  canDonate: boolean;
}

interface DonationCardProps {
  project: ProjectData;
  donationHandler: DonationHandler;
}

export default function DonationCard({ project, donationHandler }: DonationCardProps) {
  const {
    donationAmount,
    setDonationAmount,
    isDonating,
    isConfirming,
    handleDonate,
    canDonate
  } = donationHandler;

  return (
    <Card className="bg-gradient-to-br from-green-50 to-blue-50 border-green-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HandCoins className="h-5 w-5" />
          Support this Project
        </CardTitle>
        <CardDescription>
          Your donation helps make this project a reality
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="donationAmount">Donation Amount (MATIC)</Label>
          <Input
            id="donationAmount"
            type="number"
            placeholder="0.00"
            min="0"
            step="0.01"
            value={donationAmount}
            onChange={(e) => setDonationAmount(e.target.value)}
            disabled={
              isDonating ||
              isConfirming ||
              project.completed ||
              (project.deadlineEnabled &&
                Number(project.deadline) * 1000 < Date.now())
            }
          />
        </div>
        <Button
          className="w-full gap-2"
          size="lg"
          onClick={handleDonate}
          disabled={!canDonate}
        >
          {isDonating || isConfirming ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              {isConfirming ? "Confirming..." : "Donating..."}
            </>
          ) : (
            <>
              <HandCoins className="h-4 w-4" />
              Donate Now
            </>
          )}
        </Button>

        {(project.completed ||
          (project.deadlineEnabled &&
            Number(project.deadline) * 1000 < Date.now())) && (
          <p className="text-sm text-red-600 text-center">
            {project.completed
              ? "This project has been completed and no longer accepts donations"
              : "This project deadline has passed and no longer accepts donations"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}