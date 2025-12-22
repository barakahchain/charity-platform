// app/projects/[address]/components/SuccessPopup.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ExternalLink } from 'lucide-react';

interface SuccessPopupProps {
  show: boolean;
  data: {
    amount: string;
    hash: string;
  } | null;
  onClose: () => void;
}

export function SuccessPopup({ show, data, onClose }: SuccessPopupProps) {
  if (!show || !data) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-gradient-to-br from-green-50 to-emerald-100 border-green-200">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-green-800">
            Donation Successful! 🎉
          </CardTitle>
          <CardDescription className="text-green-700">
            Thank you for your generous contribution
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <div className="bg-white rounded-lg p-4 border border-green-200">
            <p className="font-semibold text-lg text-green-800">
              {data.amount} MATIC
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Successfully donated to the project
            </p>
          </div>

          <div className="text-xs text-muted-foreground break-all bg-white/50 p-2 rounded">
            TX: {data.hash}
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                window.open(
                  `https://amoy.polygonscan.com/tx/${data.hash}`,
                  "_blank"
                );
              }}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View TX
            </Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={() => {
                onClose();
                window.location.reload();
              }}
            >
              Continue
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}