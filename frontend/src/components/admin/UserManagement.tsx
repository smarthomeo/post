import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface User {
  _id: string;
  username: string;
  phone: string;
  balance: number | undefined;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  totalInvestments: number | undefined;
  referralCount: number;
}

interface UserManagementProps {
  users: User[];
  isLoading: boolean;
  onDeleteUser: (userId: string) => Promise<void>;
  onResetPassword: (userId: string, phone: string) => Promise<void>;
}

export function UserManagement({ users, isLoading, onDeleteUser, onResetPassword }: UserManagementProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number | undefined) => {
    return (amount || 0).toLocaleString('en-KE', {
      style: 'currency',
      currency: 'KES',
    });
  };

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.phone.includes(searchTerm)
  );

  const handleDelete = async (userId: string) => {
    try {
      await onDeleteUser(userId);
      toast({
        description: "User deleted successfully",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        description: "Failed to delete user",
      });
    }
    setDeleteUserId(null);
  };

  const handleResetPassword = async (userId: string, phone: string) => {
    try {
      await onResetPassword(userId, phone);
    } catch (error) {
      toast({
        variant: "destructive",
        description: "Failed to reset password",
      });
    }
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading users...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search by username or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User Info</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>Investments</TableHead>
              <TableHead>Referrals</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user._id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{user.username}</span>
                    <span className="text-sm text-muted-foreground">{user.phone}</span>
                    <span className="text-xs text-muted-foreground">
                      Joined {formatDate(user.createdAt)}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge variant={user.isActive ? "default" : "secondary"}>
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant={user.isVerified ? "default" : "outline"}>
                      {user.isVerified ? "Verified" : "Unverified"}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>{formatCurrency(user.balance)}</TableCell>
                <TableCell>{formatCurrency(user.totalInvestments)}</TableCell>
                <TableCell>{user.referralCount}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResetPassword(user._id, user.phone)}
                    >
                      Reset Password
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setDeleteUserId(user._id)}
                    >
                      Delete User
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user account
              and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteUserId && handleDelete(deleteUserId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 