import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/services/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Copy } from "lucide-react";

interface PasswordResetHistory {
  _id: string;
  userId: string;
  username: string;
  phone: string;
  temporaryPassword: string;
  resetAt: string;
  isUsed: boolean;
}

export function PasswordReset() {
  const { toast } = useToast();
  const [phone, setPhone] = useState("");
  const [lastReset, setLastReset] = useState<PasswordResetHistory | null>(null);
  const queryClient = useQueryClient();

  // Fetch password reset history
  const { data: resetHistoryData, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['passwordResetHistory'],
    queryFn: adminApi.getPasswordResetHistory,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const resetHistory = resetHistoryData?.history || [];

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: adminApi.resetPassword,
    onSuccess: (data) => {
      // Create a new reset entry from the response
      const newReset: PasswordResetHistory = {
        _id: Date.now().toString(),
        userId: 'temp',
        username: data.username,
        phone: data.phone,
        temporaryPassword: data.temporaryPassword,
        resetAt: new Date().toISOString(),
        isUsed: false
      };
      
      // Update the local state
      setLastReset(newReset);
      
      // Refetch the history
      queryClient.invalidateQueries({ queryKey: ['passwordResetHistory'] });
      
      setPhone("");
      toast({
        title: "Success",
        description: "Password reset successful",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to reset password",
      });
    }
  });

  const handleResetPassword = async () => {
    resetPasswordMutation.mutate(phone);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      description: "Copied to clipboard",
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Reset User Password</CardTitle>
          <CardDescription>
            Generate a temporary password for users who need to reset their password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm font-medium">
                User Phone Number
              </label>
              <Input
                id="phone"
                placeholder="+254700000000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <Button
              onClick={handleResetPassword}
              disabled={resetPasswordMutation.isPending || !phone}
              className="w-full"
            >
              {resetPasswordMutation.isPending ? "Generating..." : "Generate Temporary Password"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {lastReset && (
        <Alert>
          <AlertTitle>Password Reset Successful</AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-2">
              <div>
                <span className="font-medium">User: </span>
                {lastReset.username}
              </div>
              <div>
                <span className="font-medium">Phone: </span>
                {lastReset.phone}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Temporary Password: </span>
                <code className="bg-muted px-2 py-1 rounded">
                  {lastReset.temporaryPassword}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyToClipboard(lastReset.temporaryPassword)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {isLoadingHistory ? (
        <div>Loading history...</div>
      ) : resetHistory.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Recent Password Resets</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Reset Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Temporary Password</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resetHistory.map((reset) => (
                  <TableRow key={reset._id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{reset.username}</span>
                        <span className="text-sm text-muted-foreground">
                          {reset.phone}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(reset.resetAt)}</TableCell>
                    <TableCell>
                      <Badge variant={reset.isUsed ? "secondary" : "default"}>
                        {reset.isUsed ? "Used" : "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="bg-muted px-2 py-1 rounded text-xs">
                          {reset.temporaryPassword}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyToClipboard(reset.temporaryPassword)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}