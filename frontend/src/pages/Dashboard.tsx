import { useEffect, useState } from 'react';
import { userApi, transactionApi, investmentApi, referralApi } from '@/services/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import BalanceCard from '@/components/dashboard/BalanceCard';
import TransactionTable from '@/components/dashboard/TransactionTable';
import PortfolioChart from '@/components/dashboard/PortfolioChart';
import DepositModal from "@/components/dashboard/DepositModal";
import { WithdrawModal } from '@/components/dashboard/WithdrawModal';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import PortfolioTable from '@/components/dashboard/forex/PortfolioTable';
import React from 'react';

// Consider data fresh for 10 seconds
const STALE_TIME = 1000 * 10;

export default function Dashboard() {
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user data
  const { data: userData, isLoading: isUserLoading } = useQuery({
    queryKey: ['user'],
    queryFn: () => userApi.getProfile(),
    select: (data) => data.user,
    staleTime: STALE_TIME,
    refetchOnWindowFocus: false,
  });

  // Fetch investments
  const { data: investments = [], isLoading: isInvestmentsLoading } = useQuery({
    queryKey: ['investments'],
    queryFn: async () => {
      const response = await investmentApi.getInvestments();
      console.log('Raw investments response:', response);
      return response.investments || [];
    },
    staleTime: STALE_TIME,
    refetchOnWindowFocus: false,
  });

  // Fetch investment history
  const { data: investmentHistory = [], isLoading: isHistoryLoading } = useQuery({
    queryKey: ['investmentHistory'],
    queryFn: async () => {
      const response = await investmentApi.getHistory();
      return response.history || [];
    },
    staleTime: STALE_TIME,
    refetchOnWindowFocus: false,
  });

  // Fetch transactions
  const { data: transactions = [], isLoading: isTransactionsLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const response = await transactionApi.getTransactions();
      return response.transactions || [];
    },
    staleTime: STALE_TIME,
    refetchOnWindowFocus: false,
  });

  // Fetch referral stats
  const { data: referralStats = { counts: {}, earnings: { total: 0 } }, isLoading: isReferralStatsLoading } = useQuery({
    queryKey: ['referralStats'],
    queryFn: async () => {
      const response = await referralApi.getStats();
      console.log('Raw referral stats response:', response);
      return response || { counts: {}, earnings: { total: 0 } };
    },
    staleTime: STALE_TIME,
    refetchOnWindowFocus: false,
  });

  // Function to manually refresh data
  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ['user'] });
    queryClient.invalidateQueries({ queryKey: ['investments'] });
    queryClient.invalidateQueries({ queryKey: ['investmentHistory'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['referralStats'] });
  };

  const handleModalClose = () => {
    refreshData();
  };

  const isLoading = isUserLoading || isInvestmentsLoading || isHistoryLoading || isTransactionsLoading || isReferralStatsLoading;

  // Calculate total invested from active investments
  const totalInvested = React.useMemo(() => {
    console.log('Calculating total invested from:', investments);
    return investments.reduce((acc: number, inv: any) => {
      // Only count active investments
      if (inv.status === 'active') {
        const amount = typeof inv.amount === 'string' ? parseFloat(inv.amount) : inv.amount;
        console.log('Processing investment:', { id: inv.id, amount, status: inv.status });
        return acc + (amount || 0);
      }
      return acc;
    }, 0);
  }, [investments]);

  // Calculate total earnings from all investments
  const totalEarnings = React.useMemo(() => {
    console.log('Calculating total earnings from:', investments);
    return investments.reduce((acc: number, inv: any) => {
      const profit = typeof inv.profit === 'string' ? parseFloat(inv.profit) : inv.profit;
      console.log('Processing profit:', { id: inv.id, profit });
      return acc + (profit || 0);
    }, 0);
  }, [investments]);

  // Get referral earnings with proper fallback
  const referralEarnings = React.useMemo(() => {
    console.log('Processing referral stats:', referralStats);
    const total = referralStats?.earnings?.total;
    const parsedTotal = typeof total === 'string' ? parseFloat(total) : total;
    console.log('Referral earnings calculation:', { total, parsedTotal });
    return parsedTotal || 0;
  }, [referralStats]);

  // Debug effect to monitor value changes
  React.useEffect(() => {
    console.log('Dashboard values updated:', {
      totalInvested,
      totalEarnings,
      referralEarnings,
      investmentsCount: investments.length,
      hasReferralStats: !!referralStats
    });
  }, [totalInvested, totalEarnings, referralEarnings, investments, referralStats]);

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-background">
      <div className="container mx-auto px-2 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 max-w-[1400px]">
        <div className="space-y-4 sm:space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 w-full">
            {/* Balance Card */}
            <Card className="w-full p-3 sm:p-4 lg:p-6">
              <div className="flex flex-col">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Balance</p>
                <p className="text-base sm:text-lg lg:text-2xl font-bold text-primary mt-1 truncate">
                  KES {userData?.balance?.toLocaleString() || "0"}
                </p>
              </div>
            </Card>

            {/* Total Invested Card */}
            <Card className="w-full p-3 sm:p-4 lg:p-6">
              <div className="flex flex-col">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Invested</p>
                <p className="text-base sm:text-lg lg:text-2xl font-bold text-blue-600 mt-1 truncate">
                  KES {Number(totalInvested).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </Card>

            {/* Withdrawable Card */}
            <Card className="w-full p-3 sm:p-4 lg:p-6">
              <div className="flex flex-col">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Earnings</p>
                <p className="text-base sm:text-lg lg:text-2xl font-bold text-purple-600 mt-1 truncate">
                  KES {Number(userData?.withdrawable || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  ROI + Referrals
                </p>
              </div>
            </Card>

            {/* Referral Earnings Card */}
            <Card className="w-full p-3 sm:p-4 lg:p-6">
              <div className="flex flex-col">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Referral Earnings</p>
                <p className="text-base sm:text-lg lg:text-2xl font-bold text-orange-600 mt-1 truncate">
                  KES {Number(referralEarnings).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 sm:gap-4 w-full">
            <Button 
              size="lg"
              className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold"
              onClick={() => setShowDepositModal(true)}
            >
              Deposit
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold"
              onClick={() => setShowWithdrawModal(true)}
            >
              Withdraw
            </Button>
          </div>

          {/* Portfolio Chart */}
          <Card className="w-full p-2 sm:p-4 lg:p-6">
            <div className="w-full max-w-full overflow-hidden">
              <PortfolioChart 
                investments={investments} 
                history={investmentHistory}
                isLoading={isLoading}
                referralStats={referralStats}
              />
            </div>
          </Card>

          {/* Portfolio Table */}
          <Card className="w-full p-2 sm:p-4 lg:p-6">
            <h2 className="text-base sm:text-lg lg:text-xl font-medium mb-4">Your Portfolio</h2>
            <div className="w-full max-w-full overflow-x-auto">
              <div className="min-w-full align-middle inline-block">
                <PortfolioTable investments={investments} isLoading={isLoading} />
              </div>
            </div>
          </Card>

          {/* Transaction History */}
          <Card className="w-full p-2 sm:p-4 lg:p-6">
            <h2 className="text-base sm:text-lg lg:text-xl font-medium mb-4">Recent Transactions</h2>
            <div className="w-full max-w-full overflow-x-auto">
              <div className="min-w-full align-middle inline-block">
                <TransactionTable transactions={transactions} />
              </div>
            </div>
          </Card>
        </div>

        {/* Modals */}
        <DepositModal 
          isOpen={showDepositModal} 
          onClose={() => {
            setShowDepositModal(false);
            handleModalClose();
          }} 
        />
        
        <WithdrawModal 
          isOpen={showWithdrawModal}
          onClose={() => {
            setShowWithdrawModal(false);
            handleModalClose();
          }}
          withdrawableAmount={userData?.withdrawable || 0}
          userPhone={userData?.phone || ''}
        />
      </div>
    </div>
  );
}