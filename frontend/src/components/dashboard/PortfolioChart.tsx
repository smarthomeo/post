import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Investment {
  _id: string;
  forexPair: string;
  amount: number;
  entryPrice: number;
  currentPrice: number;
  profit: number;
  dailyROI: number;
  createdAt: string;
  lastProfitUpdate: string;
  status: string;
}

interface InvestmentHistory {
  date: string;
  amount: number;
  type: string;
  balance: number;
}

interface PortfolioChartProps {
  investments?: Investment[];
  history?: InvestmentHistory[];
  isLoading?: boolean;
  referralStats?: {
    earnings: {
      total: number;
    };
  };
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-lg border">
        <p className="font-semibold">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const formatCurrency = (value: number) => {
  return value.toLocaleString('en-KE', {
    style: 'currency',
    currency: 'KES'
  });
};

export default function PortfolioChart({ 
  investments = [], 
  history = [], 
  isLoading = false,
  referralStats = { earnings: { total: 0 } }
}: PortfolioChartProps) {
  // This component handles expired investments as follows:
  // 1. Total Investment only includes active investments (expired investments are excluded)
  // 2. Total Earnings includes profits from all investments (including expired ones)
  // 3. When an investment expires, it's removed from Total Investment but its profits remain in Total Earnings
  
  if (isLoading) {
    return (
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>Portfolio Performance</CardTitle>
          <div className="space-y-4">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';

      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(date);
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'N/A';
    }
  };

  const processChartData = (period: 'all' | '7d' | '30d' = 'all') => {
    // Calculate the current totals that will be displayed at the top of the component
    const currentTotalProfit = investments.reduce((sum, inv) => {
      const profit = typeof inv.profit === 'string' ? parseFloat(inv.profit) : (inv.profit || 0);
      return sum + profit;
    }, 0);
    
    const currentTotalInvestment = investments.reduce((sum, inv) => {
      if (inv.status === 'active') {
        const amount = typeof inv.amount === 'string' ? parseFloat(inv.amount) : (inv.amount || 0);
        return sum + amount;
      }
      return sum;
    }, 0);
    
    const currentReferralEarnings = typeof referralStats.earnings.total === 'string' 
      ? parseFloat(referralStats.earnings.total) 
      : (referralStats.earnings.total || 0);

    // Get the earliest date from investments and history
    const investmentDates = investments.map(inv => new Date(inv.createdAt).toISOString().split('T')[0]);
    const historyDates = history.map(item => item.date);
    const allDates = [...investmentDates, ...historyDates];
    const earliestDate = allDates.length ? allDates.sort()[0] : new Date().toISOString().split('T')[0];
    
    // Initialize data structure for daily changes
    const dailyChanges: { [key: string]: any } = {};
    
    // Initialize dates for all investments
    investments.forEach(inv => {
      const date = new Date(inv.createdAt).toISOString().split('T')[0];
      if (!dailyChanges[date]) {
        dailyChanges[date] = {
          date,
          earningsChange: 0,
          investmentsChange: 0,
          referralChange: 0
        };
      }
      
      // Add investment amount only if active
      if (inv.status === 'active') {
        const amount = typeof inv.amount === 'string' ? parseFloat(inv.amount) : (inv.amount || 0);
        dailyChanges[date].investmentsChange += amount;
      }
    });

    // Process history entries to get daily changes
    history.forEach(item => {
      const date = item.date;
      if (!dailyChanges[date]) {
        dailyChanges[date] = {
          date,
          earningsChange: 0,
          investmentsChange: 0,
          referralChange: 0
        };
      }
      
      const itemAmount = typeof item.amount === 'string' ? parseFloat(item.amount) : (item.amount || 0);
      
      if (item.type === 'roi_earning') {
        dailyChanges[date].earningsChange += itemAmount;
      } else if (item.type === 'investment') {
        // Only add to investments if it's a new investment (not an expired one)
        dailyChanges[date].investmentsChange += itemAmount;
      } else if (item.type === 'investment_expired') {
        // When an investment expires, we don't change anything here
        // The active investments are already filtered in the initial calculation
      } else if (['referral_earning', 'daily_commission', 'one_time_reward'].includes(item.type)) {
        dailyChanges[date].referralChange += itemAmount;
      }
    });

    // If there are no referral entries in history but we have a total, distribute it
    const hasReferralEntries = Object.values(dailyChanges).some(day => day.referralChange > 0);
    if (!hasReferralEntries && currentReferralEarnings > 0) {
      // Find dates with data to distribute referral earnings across
      const sortedDates = Object.keys(dailyChanges).sort();
      
      if (sortedDates.length > 0) {
        // If we have multiple dates, distribute earnings gradually
        if (sortedDates.length >= 2) {
          // Create a gradual increase in referral earnings
          const dateCount = sortedDates.length;
          const increment = currentReferralEarnings / dateCount;
          
          // Distribute earnings with increasing amounts
          sortedDates.forEach((date, index) => {
            // Add a portion of the earnings to each date, with more recent dates getting more
            const portion = increment * (index + 1) / dateCount;
            dailyChanges[date].referralChange += portion;
          });
        } else {
          // If only one date, add all earnings to that date
          const singleDate = sortedDates[0];
          dailyChanges[singleDate].referralChange += currentReferralEarnings;
        }
      } else {
        // If no dates with data, add today's date
        const today = new Date().toISOString().split('T')[0];
        if (!dailyChanges[today]) {
          dailyChanges[today] = {
            date: today,
            earningsChange: 0,
            investmentsChange: 0,
            referralChange: 0
          };
        }
        dailyChanges[today].referralChange += currentReferralEarnings;
      }
    }

    // Convert to array and sort by date
    let sortedDays = Object.values(dailyChanges)
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate cumulative totals
    let runningEarnings = 0;
    let runningInvestments = 0;
    let runningReferrals = 0;
    
    let chartData = sortedDays.map((day: any) => {
      runningEarnings += day.earningsChange;
      runningInvestments += day.investmentsChange;
      runningReferrals += day.referralChange;
      
      return {
        date: formatDate(day.date),
        totalEarnings: runningEarnings,
        totalInvestments: runningInvestments,
        referralEarnings: runningReferrals
      };
    });

    // Filter based on period
    if (period === '7d') {
      chartData = chartData.slice(-7);
    } else if (period === '30d') {
      chartData = chartData.slice(-30);
    }

    // Add today's data point with the current totals
    const today = formatDate(new Date().toISOString());
    const lastDate = chartData.length > 0 ? chartData[chartData.length - 1].date : null;
    
    if (lastDate !== today) {
      // Add a new data point for today
      chartData.push({
        date: today,
        totalEarnings: currentTotalProfit,
        totalInvestments: currentTotalInvestment,
        referralEarnings: currentReferralEarnings
      });
    } else {
      // Update the last data point to match current totals
      const lastPoint = chartData[chartData.length - 1];
      lastPoint.totalEarnings = currentTotalProfit;
      lastPoint.totalInvestments = currentTotalInvestment;
      lastPoint.referralEarnings = currentReferralEarnings;
    }

    // Ensure we have at least two data points for a better chart
    if (chartData.length === 1) {
      // Create a data point for the day before
      const oneDayBefore = new Date();
      oneDayBefore.setDate(oneDayBefore.getDate() - 1);
      const previousDay = formatDate(oneDayBefore.toISOString());
      
      chartData.unshift({
        date: previousDay,
        totalEarnings: 0,
        totalInvestments: 0,
        referralEarnings: 0
      });
    }

    // Ensure the final data point matches the current totals
    if (chartData.length > 0) {
      const lastDataPoint = chartData[chartData.length - 1];
      
      // Check if there's a discrepancy between calculated and actual totals
      const calculatedTotal = lastDataPoint.totalEarnings + lastDataPoint.referralEarnings;
      const actualTotal = currentTotalProfit + currentReferralEarnings;
      
      if (Math.abs(calculatedTotal - actualTotal) > 0.01) {
        // Adjust the last data point to match the current totals
        lastDataPoint.totalEarnings = currentTotalProfit;
        lastDataPoint.referralEarnings = currentReferralEarnings;
      }
    }

    return chartData;
  };

  const chartData = processChartData();
  const chartData7d = processChartData('7d');
  const chartData30d = processChartData('30d');
  
  const totalInvestment = investments.reduce((sum, inv) => {
    // Only count active investments
    if (inv.status === 'active') {
      return sum + (typeof inv.amount === 'string' ? parseFloat(inv.amount) : inv.amount);
    }
    return sum;
  }, 0);
  const totalProfit = investments.reduce((sum, inv) => {
    // Include profits from all investments, regardless of status
    const profit = typeof inv.profit === 'string' ? parseFloat(inv.profit) : (inv.profit || 0);
    return sum + profit;
  }, 0);

  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl mb-4">Portfolio Performance</CardTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="space-y-1">
            <p className="text-xs sm:text-sm text-muted-foreground truncate">Total Investment</p>
            <p className="text-base sm:text-xl font-bold truncate">{formatCurrency(totalInvestment)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs sm:text-sm text-muted-foreground truncate">ROI Earnings</p>
            <p className={`text-base sm:text-xl font-bold truncate ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totalProfit)}
            </p>
          </div>
          <div className="col-span-2 sm:col-span-1 space-y-1">
            <p className="text-xs sm:text-sm text-muted-foreground truncate">Referral Earnings</p>
            <p className="text-base sm:text-xl font-bold text-orange-600 truncate">
              {formatCurrency(referralStats.earnings.total || 0)}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All Time</TabsTrigger>
            <TabsTrigger value="30d">30 Days</TabsTrigger>
            <TabsTrigger value="7d">7 Days</TabsTrigger>
          </TabsList>
          <TabsContent value="all">
            <ChartContent data={chartData} />
          </TabsContent>
          <TabsContent value="30d">
            <ChartContent data={chartData30d} />
          </TabsContent>
          <TabsContent value="7d">
            <ChartContent data={chartData7d} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

interface ChartContentProps {
  data: Array<{
    date: string;
    totalEarnings: number;
    totalInvestments: number;
    referralEarnings: number;
  }>;
}

function ChartContent({ data }: ChartContentProps) {
  return (
    <div>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            interval="preserveStartEnd"
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => value.toLocaleString('en-KE', {
              style: 'currency',
              currency: 'KES',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            })}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="totalInvestments"
            name="Total Investments"
            stroke="#2563eb"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6, strokeWidth: 2 }}
          />
          <Line
            type="monotone"
            dataKey="totalEarnings"
            name="Total Earnings"
            stroke="#16a34a"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6, strokeWidth: 2 }}
          />
          <Line
            type="monotone"
            dataKey="referralEarnings"
            name="Referral Earnings"
            stroke="#f97316"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6, strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}