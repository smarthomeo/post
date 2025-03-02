import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { adminApi } from '@/services/api';
import { PasswordReset } from '@/components/admin/PasswordReset';
import { DashboardStats } from '@/components/admin/DashboardStats';
import { UserManagement } from '@/components/admin/UserManagement';
import { TransactionHistory } from '@/components/admin/TransactionHistory';

// Consider data fresh for 10 seconds
const STALE_TIME = 1000 * 10;

interface Transaction {
  _id: string;
  userId: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  phone: string;
  username: string;
}

interface User {
  _id: string;
  username: string;
  phone: string;
  balance: number;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  totalInvestments: number;
  referralCount: number;
  withdrawableAmount: number;
  activeInvestments: number;
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("users");

  // Fetch admin stats
  const { data: adminStats, isLoading: isStatsLoading } = useQuery({
    queryKey: ['adminStats'],
    queryFn: adminApi.getStats,
    staleTime: STALE_TIME,
    refetchOnWindowFocus: false,
  });

  // Fetch all users
  const { data: users = [], isLoading: isUsersLoading } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: async () => {
      const response = await adminApi.getUsers();
      return response.users || [];
    },
    staleTime: STALE_TIME,
    refetchOnWindowFocus: false,
  });

  // Fetch pending transactions
  const { data: pendingTransactions = [], isLoading: isTransactionsLoading } = useQuery({
    queryKey: ['adminTransactions'],
    queryFn: async () => {
      const response = await adminApi.getPendingTransactions();
      return response.transactions || [];
    },
    staleTime: STALE_TIME,
    refetchOnWindowFocus: false,
  });

  // Fetch user verifications
  const { data: pendingVerifications = [], isLoading: isVerificationsLoading } = useQuery({
    queryKey: ['adminVerifications'],
    queryFn: async () => {
      const response = await adminApi.getPendingVerifications();
      return response.verifications || [];
    },
    staleTime: STALE_TIME,
    refetchOnWindowFocus: false,
  });

  // Calculate dashboard stats
  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter(user => (user.activeInvestments || 0) > 0).length,
    totalInvestments: adminStats?.totalInvestments || 0,
    totalTransactions: adminStats?.totalTransactions || 0,
  };

  const handleApproveTransaction = async (transactionId: string) => {
    try {
      await adminApi.approveTransaction(transactionId);
      queryClient.invalidateQueries({ queryKey: ['adminTransactions'] });
      toast({
        description: 'Transaction approved successfully',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        description: 'Failed to approve transaction',
      });
    }
  };

  const handleRejectTransaction = async (transactionId: string) => {
    try {
      await adminApi.rejectTransaction(transactionId);
      queryClient.invalidateQueries({ queryKey: ['adminTransactions'] });
      toast({
        description: 'Transaction rejected successfully',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        description: 'Failed to reject transaction',
      });
    }
  };

  const handleVerifyUser = async (userId: string) => {
    try {
      await adminApi.verifyUser(userId);
      queryClient.invalidateQueries({ queryKey: ['adminVerifications'] });
      toast({
        description: 'User verified successfully',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        description: 'Failed to verify user',
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await adminApi.deleteUser(userId);
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      toast({
        description: 'User deleted successfully',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        description: 'Failed to delete user',
      });
    }
  };

  const handleResetPassword = async (userId: string, phone: string) => {
    try {
      const response = await adminApi.resetPassword(phone);
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      toast({
        description: 'Password reset successful',
      });
      return response;
    } catch (error) {
      toast({
        variant: 'destructive',
        description: 'Failed to reset password',
      });
      throw error;
    }
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

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-KE', {
      style: 'currency',
      currency: 'KES',
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
      <DashboardStats {...stats} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="verifications">Verifications</TabsTrigger>
          <TabsTrigger value="password-reset">Password Reset</TabsTrigger>
          <TabsTrigger value="transaction-history">Transaction History</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UserManagement
            users={users}
            isLoading={isUsersLoading}
            onDeleteUser={handleDeleteUser}
            onResetPassword={handleResetPassword}
          />
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Pending Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {isTransactionsLoading ? (
                <div className="text-center py-4">Loading...</div>
              ) : !pendingTransactions.length ? (
                <div className="text-center py-4 text-muted-foreground">
                  No pending transactions
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingTransactions.map((transaction: Transaction) => (
                        <tr key={transaction._id}>
                          <td>
                            <div className="flex flex-col">
                              <span className="font-medium">{transaction.username}</span>
                              <span className="text-sm text-muted-foreground">
                                {transaction.phone}
                              </span>
                            </div>
                          </td>
                          <td>
                            <Badge variant={transaction.type === 'deposit' ? 'default' : 'secondary'}>
                              {transaction.type}
                            </Badge>
                          </td>
                          <td>{formatCurrency(transaction.amount)}</td>
                          <td>{formatDate(transaction.createdAt)}</td>
                          <td>
                            <Badge variant="outline">
                              {transaction.status}
                            </Badge>
                          </td>
                          <td>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleApproveTransaction(transaction._id)}
                                className="px-3 py-1 bg-green-500 text-white rounded-md"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectTransaction(transaction._id)}
                                className="px-3 py-1 bg-red-500 text-white rounded-md"
                              >
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verifications">
          <Card>
            <CardHeader>
              <CardTitle>Pending Verifications</CardTitle>
            </CardHeader>
            <CardContent>
              {isVerificationsLoading ? (
                <div className="text-center py-4">Loading...</div>
              ) : !pendingVerifications.length ? (
                <div className="text-center py-4 text-muted-foreground">
                  No pending verifications
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Phone</th>
                        <th>Joined</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingVerifications.map((user: any) => (
                        <tr key={user._id}>
                          <td>
                            <span className="font-medium">{user.username}</span>
                          </td>
                          <td>{user.phone}</td>
                          <td>{formatDate(user.createdAt)}</td>
                          <td>
                            <Badge variant={user.isVerified ? 'secondary' : 'default'}>
                              {user.isVerified ? 'Verified' : 'Pending'}
                            </Badge>
                          </td>
                          <td>
                            <button
                              onClick={() => handleVerifyUser(user._id)}
                              disabled={user.isVerified}
                              className="px-3 py-1 bg-primary text-white rounded-md disabled:opacity-50"
                            >
                              Verify
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="password-reset">
          <div className="max-w-3xl mx-auto">
            <PasswordReset />
          </div>
        </TabsContent>

        <TabsContent value="transaction-history">
          <TransactionHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}