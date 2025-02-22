import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { transactionApi } from "@/services/api";

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  withdrawableAmount: number;
  userPhone: string;
}

const MIN_WITHDRAWAL = 200;
const TELEGRAM_GROUP_LINK = "https://t.me/estrellabluesky"; // Replace with your actual Telegram group link

export function WithdrawModal({ 
  isOpen, 
  onClose, 
  withdrawableAmount = 0, // Provide default value
  userPhone 
}: WithdrawModalProps) {
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const withdrawAmount = parseFloat(amount);
    if (!withdrawAmount || withdrawAmount <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid amount",
        description: "Please enter a valid amount to withdraw",
      });
      return;
    }

    if (withdrawAmount > withdrawableAmount) {
      toast({
        variant: "destructive",
        title: "Insufficient funds",
        description: "You don't have enough withdrawable funds",
      });
      return;
    }

    setIsLoading(true);
    try {
      await transactionApi.initiateWithdrawal(withdrawAmount);
      toast({
        title: "Withdrawal initiated",
        description: "Your withdrawal request has been submitted for processing",
      });
      setAmount("");
      onClose();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Withdrawal failed",
        description: error instanceof Error ? error.message : "Failed to process withdrawal",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Format amount with proper handling of undefined/null values
  const formattedWithdrawableAmount = Number(withdrawableAmount || 0).toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return (
    <Dialog open={isOpen} onOpenChange={() => {
      if (!isLoading) {
        setAmount("");
        onClose();
      }
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Withdraw Funds</DialogTitle>
          <DialogDescription>
            Enter amount to withdraw. Minimum withdrawal is KES {MIN_WITHDRAWAL}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (KES)</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount to withdraw"
              min={MIN_WITHDRAWAL}
              step="0.01"
              disabled={isLoading}
            />
            <p className="text-sm text-muted-foreground">
              Available to withdraw: KES {formattedWithdrawableAmount}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Withdrawal will be sent to: {userPhone}
            </p>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !amount || parseFloat(amount) < MIN_WITHDRAWAL}
            >
              {isLoading ? "Processing..." : "Withdraw"}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Withdrawal requests are processed within 24 hours
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
} 