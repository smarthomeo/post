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
    console.log('Processing chart data:', {
      historyLength: history.length,
      investments,
      referralStats
    });

    // Get the earliest date from investments
    const investmentDates = investments.map(inv => new Date(inv.createdAt).toISOString().split('T')[0]);
    const earliestDate = investmentDates.length ? investmentDates.sort()[0] : new Date().toISOString().split('T')[0];
    
    // Initialize data with investment amounts
    const initialData: { [key: string]: any } = {};
    investments.forEach(inv => {
      const date = new Date(inv.createdAt).toISOString().split('T')[0];
      if (!initialData[date]) {
        initialData[date] = {
          date,
          totalEarnings: 0,
          totalInvestments: 0,
          referralEarnings: 0
        };
      }
      const amount = typeof inv.amount === 'string' ? parseFloat(inv.amount) : (inv.amount || 0);
      initialData[date].totalInvestments += amount;
    });

    // Add history entries
    const dailyData = history.reduce((acc: { [key: string]: any }, item) => {
      const date = item.date;
      if (!acc[date]) {
        acc[date] = {
          date,
          totalEarnings: 0,
          totalInvestments: 0,
          referralEarnings: 0
        };
      }
      
      const amount = typeof item.amount === 'string' ? parseFloat(item.amount) : (item.amount || 0);
      console.log('Processing history item:', { date, type: item.type, amount });
      
      if (item.type === 'roi_earning') {
        acc[date].totalEarnings += amount;
      } else if (item.type === 'investment') {
        acc[date].totalInvestments += amount;
      } else if (['referral_earning', 'daily_commission', 'one_time_reward'].includes(item.type)) {
        acc[date].referralEarnings += amount;
      }
      
      return acc;
    }, initialData);

    console.log('Daily data after grouping:', dailyData);

    // Convert to array and sort by date
    let chartData = Object.values(dailyData)
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate cumulative totals
    let runningTotalEarnings = 0;
    let runningTotalInvestments = 0;
    let runningReferralEarnings = 0;

    chartData = chartData.map((item: any) => {
      runningTotalEarnings += item.totalEarnings;
      runningTotalInvestments += item.totalInvestments;
      runningReferralEarnings += item.referralEarnings;

      const dataPoint = {
        date: formatDate(item.date),
        totalEarnings: runningTotalEarnings,
        totalInvestments: runningTotalInvestments,
        referralEarnings: runningReferralEarnings
      };
      
      console.log('Cumulative data point:', dataPoint);
      return dataPoint;
    });

    // Filter based on period
    if (period === '7d') {
      chartData = chartData.slice(-7);
    } else if (period === '30d') {
      chartData = chartData.slice(-30);
    }

    // If there's no data for the current day, add current totals
    const lastDate = chartData[chartData.length - 1]?.date;
    const today = formatDate(new Date().toISOString());
    
    if (lastDate !== today) {
      const currentTotals = {
        date: today,
        totalEarnings: investments.reduce((sum, inv) => {
          const profit = typeof inv.profit === 'string' ? parseFloat(inv.profit) : (inv.profit || 0);
          return sum + profit;
        }, 0),
        totalInvestments: investments.reduce((sum, inv) => {
          const amount = typeof inv.amount === 'string' ? parseFloat(inv.amount) : (inv.amount || 0);
          return sum + amount;
        }, 0),
        referralEarnings: typeof referralStats.earnings.total === 'string' 
          ? parseFloat(referralStats.earnings.total) 
          : (referralStats.earnings.total || 0)
      };
      
      console.log('Adding current day totals:', currentTotals);
      chartData.push(currentTotals);
    }

    // Ensure referral earnings are included in the last data point
    if (chartData.length > 0) {
      const lastPoint = chartData[chartData.length - 1];
      const referralTotal = typeof referralStats.earnings.total === 'string' 
        ? parseFloat(referralStats.earnings.total) 
        : (referralStats.earnings.total || 0);
      
      if (lastPoint.referralEarnings !== referralTotal) {
        lastPoint.referralEarnings = referralTotal;
      }
    }

    console.log('Final chart data:', chartData);
    return chartData;
  };

  const chartData = processChartData();
  const totalInvestment = investments.reduce((sum, inv) => sum + inv.amount, 0);
  const totalProfit = investments.reduce((sum, inv) => sum + inv.profit, 0);

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
            <p className="text-xs sm:text-sm text-muted-foreground truncate">Total Earnings</p>
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
            <ChartContent data={processChartData('all')} />
          </TabsContent>
          <TabsContent value="30d">
            <ChartContent data={processChartData('30d')} />
          </TabsContent>
          <TabsContent value="7d">
            <ChartContent data={processChartData('7d')} />
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