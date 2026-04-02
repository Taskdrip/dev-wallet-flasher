import React from 'react';
import { useWallet } from '@/context/WalletContext';
import { useGetTransactions, getGetTransactionsQueryKey } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ArrowDownLeft, ArrowUpRight, Droplets, ExternalLink, ListFilter } from 'lucide-react';
import { Redirect } from 'wouter';
import { format } from 'date-fns';

export default function Transactions() {
  const { address, network } = useWallet();

  if (!address || !network) {
    return <Redirect to="/" />;
  }

  const { data, isLoading } = useGetTransactions(
    { walletAddress: address, network: network as any, limit: 50 },
    { query: { enabled: !!address && !!network, queryKey: getGetTransactionsQueryKey({ walletAddress: address, network: network as any, limit: 50 }) } }
  );

  const getTxIcon = (type: string) => {
    switch (type) {
      case 'faucet': return <Droplets className="h-4 w-4 text-primary" />;
      case 'transfer_in': return <ArrowDownLeft className="h-4 w-4 text-emerald-500" />;
      case 'transfer_out': return <ArrowUpRight className="h-4 w-4 text-rose-500" />;
      default: return <ListFilter className="h-4 w-4" />;
    }
  };

  const getTxLabel = (type: string) => {
    switch (type) {
      case 'faucet': return 'Faucet Claim';
      case 'transfer_in': return 'Received';
      case 'transfer_out': return 'Sent';
      default: return type;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-4">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transaction History</h1>
          <p className="text-muted-foreground mt-2">View all past activity for your connected wallet.</p>
        </div>
      </div>

      <Card className="bg-card/40 border-muted">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Counterparty</TableHead>
                <TableHead className="text-right">Tx Hash</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : data?.transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    No transactions found for this wallet.
                  </TableCell>
                </TableRow>
              ) : (
                data?.transactions.map((tx) => (
                  <TableRow key={tx.id} className="border-border/50">
                    <TableCell>
                      <div className="flex items-center gap-2 font-medium">
                        <div className="p-1.5 rounded-md bg-muted/50">
                          {getTxIcon(tx.type)}
                        </div>
                        {getTxLabel(tx.type)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono font-bold">
                        {tx.type === 'transfer_out' ? '-' : '+'}{tx.amount} <span className="text-xs text-muted-foreground">{tx.tokenType}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(tx.createdAt), 'MMM d, yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      {tx.counterpartyAddress ? (
                        <span className="font-mono text-xs px-2 py-1 rounded bg-muted/30 border">
                          {tx.counterpartyAddress.slice(0, 6)}...{tx.counterpartyAddress.slice(-4)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm italic">System</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <a href="#" className="inline-flex items-center gap-1 text-primary hover:underline font-mono text-xs">
                        {tx.txHash.slice(0, 8)}... <ExternalLink className="h-3 w-3" />
                      </a>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
