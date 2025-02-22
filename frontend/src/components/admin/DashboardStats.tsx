import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Wallet, ArrowUpDown, UserCheck } from "lucide-react";
import { adminApi } from '@/services/api';

// Consider data fresh for 5 seconds and refetch every 10 seconds
const STALE_TIME = 1000 * 10;
//const REFETCH_INTERVAL = 1000 * 10;

export function DashboardStats() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['adminStats'],
    queryFn: adminApi.getStats,
    staleTime: STALE_TIME,
    //refetchInterval: REFETCH_INTERVAL,
    refetchOnWindowFocus: true,
  });

  const formatCurrency = (amount: number = 0) => {
    return amount.toLocaleString('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  if (isLoading) {
    return <div>Loading stats...</div>;
  }

  // Ensure we have default values for all stats
  const safeStats = {
    totalUsers: stats?.totalUsers || 0,
    activeUsers: stats?.activeUsers || 0,
    totalInvestments: stats?.totalInvestments || 0,
    totalTransactions: stats?.totalTransactions || 0,
    pendingTransactions: stats?.pendingTransactions || 0,
    pendingVerifications: stats?.pendingVerifications || 0,
  };

  const activeRate = safeStats.totalUsers > 0 
    ? ((safeStats.activeUsers / safeStats.totalUsers) * 100).toFixed(1) 
    : '0.0';

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{safeStats.totalUsers}</div>
          <p className="text-xs text-muted-foreground">
            {safeStats.activeUsers} active users
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Rate</CardTitle>
          <UserCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeRate}%</div>
          <p className="text-xs text-muted-foreground">
            Of total users
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Investments</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(safeStats.totalInvestments)}</div>
          <p className="text-xs text-muted-foreground">
            Active investments
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(safeStats.totalTransactions)}</div>
          <p className="text-xs text-muted-foreground">
            {safeStats.pendingTransactions} pending
          </p>
        </CardContent>
      </Card>
    </div>
  );
}