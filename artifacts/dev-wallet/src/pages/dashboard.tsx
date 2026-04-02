import React from 'react';
import { useWallet } from '@/context/WalletContext';
import { useGetWallet, getGetWalletQueryKey, useGetTransactionSummary, getGetTransactionSummaryQueryKey } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowDownLeft, ArrowUpRight, Activity, Wallet, Database } from 'lucide-react';
import { Redirect } from 'wouter';

export default function Dashboard() {
  const { address, network } = useWallet();

  if (!address || !network) {
    return <Redirect to="/" />;
  }

  const { data: wallet, isLoading: isWalletLoading } = useGetWallet(
    address, 
    { network: network as any },
    { query: { enabled: !!address && !!network, queryKey: getGetWalletQueryKey(address, { network: network as any }) } }
  );

  const { data: summary, isLoading: isSummaryLoading } = useGetTransactionSummary(
    { walletAddress: address, network: network as string },
    { query: { enabled: !!address && !!network, queryKey: getGetTransactionSummaryQueryKey({ walletAddress: address, network: network as string }) } }
  );

  const isTezos = network === 'tezos';
  const networkColor = isTezos ? 'text-primary' : 'text-secondary';
  const bgNetworkColor = isTezos ? 'bg-primary/10 border-primary/20' : 'bg-secondary/10 border-secondary/20';

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Wallet Overview</h1>
          <p className="text-muted-foreground mt-1 font-mono text-sm">
            {address}
          </p>
        </div>
        <div className={`px-4 py-1.5 rounded-full border text-sm font-bold uppercase tracking-wider ${bgNetworkColor} ${networkColor}`}>
          {network} Testnet
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-card/40 backdrop-blur border-muted">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Database className="h-4 w-4" /> USDtz-SIM Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isWalletLoading ? (
              <Skeleton className="h-10 w-32" />
            ) : (
              <div className="text-4xl font-bold">
                {wallet?.usdtzSimBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-lg text-muted-foreground font-normal">USDtz</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/40 backdrop-blur border-muted">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Database className="h-4 w-4" /> USDT-SIM Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isWalletLoading ? (
              <Skeleton className="h-10 w-32" />
            ) : (
              <div className="text-4xl font-bold">
                {wallet?.usdtSimBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-lg text-muted-foreground font-normal">USDT</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <h2 className="text-xl font-bold mt-10 mb-4 flex items-center gap-2">
        <Activity className="h-5 w-5" /> Activity Summary
      </h2>
      
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-card/20 border-muted">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <ArrowDownLeft className="h-4 w-4 text-emerald-500" /> Total Received
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSummaryLoading ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-semibold">{summary?.totalReceived || 0}</div>}
          </CardContent>
        </Card>
        
        <Card className="bg-card/20 border-muted">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-rose-500" /> Total Sent
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSummaryLoading ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-semibold">{summary?.totalSent || 0}</div>}
          </CardContent>
        </Card>
        
        <Card className="bg-card/20 border-muted">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" /> Faucet Claimed
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSummaryLoading ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-semibold">{summary?.totalFaucetClaimed || 0}</div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
