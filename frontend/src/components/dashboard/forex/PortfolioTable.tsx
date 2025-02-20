import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface Investment {
  _id: string;
  forexPair: string;
  amount: number;
  entryPrice: number;
  currentPrice: number;
  profit: number;
  status: string;
  createdAt: string;
}

interface PortfolioTableProps {
  investments?: Investment[];
  isLoading?: boolean;
  onClosePosition?: (investmentId: string) => void;
}

export default function PortfolioTable({ 
  investments = [], 
  isLoading = false,
  onClosePosition 
}: PortfolioTableProps) {
  const { toast } = useToast();

  const formatCurrency = (value: number) => {
    return value.toLocaleString('en-KE', {
      style: 'currency',
      currency: 'KES'
    });
  };

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';

      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Africa/Nairobi'
      };

      // Use a more compact format for mobile
      if (window.innerWidth < 640) {
        options.year = '2-digit';
        delete options.hour;
        delete options.minute;
      }

      return new Intl.DateTimeFormat('en-KE', options).format(date);
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'N/A';
    }
  };

  if (isLoading) {
    return (
      <div className="w-full overflow-x-auto -mx-4 sm:mx-0">
        <Table>
          <TableHeader>
            <TableRow key="header">
              <TableHead className="w-[100px]">Pair</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Entry</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Current</TableHead>
              <TableHead className="text-right">Profit</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3].map((i) => (
              <TableRow key={`skeleton-${i}`}>
                <TableCell><Skeleton className="h-4 w-16 sm:w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20 sm:w-24" /></TableCell>
                <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20 sm:w-24" /></TableCell>
                <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-8 w-16 sm:w-20" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }
  
  if (!investments || !investments.length) {
    return (
      <div className="w-full rounded-lg border p-4 sm:p-6 text-center">
        <p className="text-sm sm:text-base text-muted-foreground">No active investments</p>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">Start investing to see your portfolio here</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto -mx-4 sm:mx-0">
      <div className="min-w-full align-middle">
        <Table>
          <TableHeader>
            <TableRow key="header">
              <TableHead className="w-[100px]">Pair</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Entry</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Current</TableHead>
              <TableHead className="text-right">Profit</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {investments.map((investment) => {
              const profit = investment.profit;
              const profitColor = profit >= 0 ? 'text-green-600' : 'text-red-600';

              return (
                <TableRow key={investment._id}>
                  <TableCell className="font-medium">{investment.forexPair}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(investment.amount)}
                  </TableCell>
                  <TableCell className="text-right hidden sm:table-cell">
                    {investment.entryPrice.toFixed(5)}
                  </TableCell>
                  <TableCell className="text-right hidden sm:table-cell">
                    {investment.currentPrice.toFixed(5)}
                  </TableCell>
                  <TableCell className={`text-right ${profitColor}`}>
                    {formatCurrency(profit)}
                  </TableCell>
                  <TableCell className="text-right hidden sm:table-cell">
                    <Badge 
                      variant={investment.status === 'active' ? 'default' : 'secondary'}
                    >
                      {investment.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {investment.status === 'active' && onClosePosition && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onClosePosition(investment._id)}
                      >
                        Close
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}