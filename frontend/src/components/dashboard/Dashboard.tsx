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

// Consider data fresh for 10 seconds
const STALE_TIME = 1000 * 10;

// TypeScript interfaces for data structures
interface User {
  balance: number;
  phone: string;
}

interface Investment {
  amount: number;
  profit: number;
  // Add other fields as needed
}

interface Transaction {
  id: string;
  amount: number;
  type: string;
  date: string;
}

interface InvestmentHistory {
  date: string;
  value: number;
}

interface ReferralStats {
  earnings: {
    total: number;
  };
}

export default function Dashboard() {
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user data
  const { data: userData, isLoading: isUserLoading } = useQuery<User>({
    queryKey: ['user'],
    queryFn: async () => {
      const response = await userApi.getProfile();
      return response.user;
    },
    staleTime: STALE_TIME,
    refetchOnWindowFocus: false,
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to load user profile",
        variant: "destructive",
      });
    },
  });

  // Fetch investments
  const { data: investments = [], isLoading: isInvestmentsLoading } = useQuery<Investment[]>({
    queryKey: ['investments'],
    queryFn: async () => {
      const response = await investmentApi.getInvestments();
      return response.investments || [];
    },
    staleTime: STALE_TIME,
    refetchOnWindowFocus: false,
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to load investments",
        variant: "destructive",
      });
    },
  });

  // Fetch investment history
  const { data: investmentHistory = [], isLoading: isHistoryLoading } = useQuery<InvestmentHistory[]>({
    queryKey: ['investmentHistory'],
    queryFn: async () => {
      const response = await investmentApi.getHistory();
      return response.history || [];
    },
    staleTime: STALE_TIME,
    refetchOnWindowFocus: false,
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to load investment history",
        variant: "destructive",
      });
    },
  });

  // Fetch transactions
  const { data: transactions = [], isLoading: isTransactionsLoading } = useQuery<Transaction[]>({
    queryKey: ['transactions'],
    queryFn: async () => {
      const response = await transactionApi.getTransactions();
      return response.transactions || [];
    },
    staleTime: STALE_TIME,
    refetchOnWindowFocus: false,
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to load transactions",
        variant: "destructive",
      });
    },
  });

  // Fetch referral stats
  const { data: referralStats = { earnings: { total: 0 } }, isLoading: isReferralLoading } = useQuery<ReferralStats>({
    queryKey: ['referralStats'],
    queryFn: async () => {
      const response = await referralApi.getStats();
      return response;
    },
    staleTime: STALE_TIME,
    refetchOnWindowFocus: false,
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to load referral stats",
        variant: "destructive",
      });
    },
  });

  // Function to manually refresh specific data
  const refreshData = (type?: 'deposit' | 'withdraw') => {
    queryClient.invalidateQueries({ queryKey: ['user'] });
    if (type === 'deposit' || type === 'withdraw') {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    }
  };

  const handleModalClose = (type: 'deposit' | 'withdraw') => {
    refreshData(type);
  };

  const isLoading = isUserLoading || isInvestmentsLoading || isHistoryLoading || isTransactionsLoading || isReferralLoading;

  const totalInvested = investments.reduce((acc, inv) => acc + inv.amount, 0);
  const totalEarnings = investments.reduce((acc, inv) => acc + inv.profit, 0);
  const referralEarnings = referralStats.earnings.total;

  return (
    <div className="min-h-screen w-full bg-background overflow-x-hidden">
      <div className="container mx-auto px-2 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 max-w-[1400px]">
        <div className="space-y-4 sm:space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
            {/* Balance Card */}
            <Card className="w-full p-3 sm:p-4 lg:p-6">
              <div className="flex flex-col">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Balance</p>
                <p className="text-base sm:text-lg lg:text-2xl font-bold text-primary mt-1 truncate">
                  KES {(userData?.balance ?? 0).toLocaleString()}
                </p>
              </div>
            </Card>

            {/* Total Invested Card */}
            <Card className="w-full p-3 sm:p-4 lg:p-6">
              <div className="flex flex-col">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Invested</p>
                <p className="text-base sm:text-lg lg:text-2xl font-bold text-blue-600 mt-1 truncate">
                  KES {totalInvested.toLocaleString()}
                </p>
              </div>
            </Card>

            {/* Total Earnings Card */}
            <Card className="w-full p-3 sm:p-4 lg:p-6">
              <div className="flex flex-col">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Earnings</p>
                <p className={`text-base sm:text-lg lg:text-2xl font-bold ${totalEarnings >= 0 ? 'text-green-600' : 'text-red-600'} mt-1 truncate`}>
                  KES {totalEarnings.toLocaleString()}
                </p>
              </div>
            </Card>

            {/* Referral Earnings Card */}
            <Card className="w-full p-3 sm:p-4 lg:p-6">
              <div className="flex flex-col">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Referral Earnings</p>
                <p className="text-base sm:text-lg lg:text-2xl font-bold text-orange-600 mt-1 truncate">
                  KES {referralEarnings.toLocaleString()}
                </p>
              </div>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
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
            <div className="w-full overflow-hidden">
              <PortfolioChart 
                investments={investments} 
                history={investmentHistory}
                isLoading={isLoading} 
              />
            </div>
          </Card>

          {/* Portfolio Table */}
          <Card className="w-full p-2 sm:p-4 lg:p-6">
            <h2 className="text-base sm:text-lg lg:text-xl font-medium mb-4">Your Portfolio</h2>
            <div className="w-full overflow-x-auto">
              <div className="min-w-full align-middle">
                <PortfolioTable investments={investments} isLoading={isLoading} />
              </div>
            </div>
          </Card>

          {/* Transaction History */}
          <Card className="w-full p-2 sm:p-4 lg:p-6">
            <h2 className="text-base sm:text-lg lg:text-xl font-medium mb-4">Recent Transactions</h2>
            <div className="w-full overflow-x-auto">
              <div className="min-w-full align-middle">
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
            handleModalClose('deposit');
          }} 
        />
        
        <WithdrawModal 
          isOpen={showWithdrawModal}
          onClose={() => {
            setShowWithdrawModal(false);
            handleModalClose('withdraw');
          }}
          userBalance={userData?.balance ?? 0}
          userPhone={userData?.phone ?? ''}
        />
      </div>
    </div>
  );
}