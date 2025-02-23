import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";

interface Transaction {
  _id: string;
  type: string;
  amount: number;
  status: string;
  description: string;
  createdAt: string;
}

interface TransactionTableProps {
  transactions: Transaction[];
}

function TransactionTable({ transactions }: TransactionTableProps) {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'rejected':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'pending':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const formatAmount = (amount: number, type: string) => {
    const formattedAmount = Math.abs(amount).toLocaleString('en-KE', {
      style: 'currency',
      currency: 'KES'
    });
    
    return (
      <div className="flex items-center gap-1">
        {type === 'deposit' || type === 'profit' ? (
          <ArrowUpIcon className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
        ) : (
          <ArrowDownIcon className="w-3 h-3 sm:w-4 sm:h-4 text-red-500 flex-shrink-0" />
        )}
        <span className="truncate">{formattedAmount}</span>
      </div>
    );
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
      if (window.innerWidth < 760) {
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

  if (!transactions.length) {
    return (
      <div className="w-full rounded-lg border p-4 sm:p-6 text-center">
        <p className="text-sm sm:text-base text-muted-foreground">No transactions yet</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto -mx-4 sm:mx-0">
      <div className="min-w-full align-middle">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px] hidden sm:table-cell">Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="hidden sm:table-cell">Description</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow key={transaction._id}>
                <TableCell className="hidden sm:table-cell">
                  {formatDate(transaction.createdAt)}
                </TableCell>
                <TableCell className="font-medium capitalize">
                  {transaction.type}
                </TableCell>
                <TableCell className="text-right">
                  <span className={transaction.type === 'deposit' ? 'text-green-600' : 'text-red-600'}>
                    {formatAmount(transaction.amount, transaction.type)}
                  </span>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground">
                  {transaction.description}
                </TableCell>
                <TableCell className="text-right">
                  <Badge 
                    className={`${getStatusColor(transaction.status)} text-[10px] sm:text-xs px-1.5 py-0.5 whitespace-nowrap`}
                    variant="outline"
                  >
                    {transaction.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default TransactionTable;