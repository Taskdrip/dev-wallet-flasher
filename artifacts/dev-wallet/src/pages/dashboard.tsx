import React, { useState, useEffect, useRef } from 'react';
import { useWallet, CHAINS } from '@/context/WalletContext';
import {
  useGetWallet, getGetWalletQueryKey,
  useGetTransactionSummary, getGetTransactionSummaryQueryKey, getGetTransactionsQueryKey,
  useTopUpWallet, useToggleAutoAccumulate
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowDownLeft, ArrowUpRight, Activity, Wallet, RefreshCw, Zap, TrendingUp } from 'lucide-react';
import { Redirect, Link } from 'wouter';
import { useToast } from '@/hooks/use-toast';

const TOPUP_PRESETS = [1000, 10_000, 100_000, 1_000_000, 10_000_000, 200_000_000];

export default function Dashboard() {
  const { address, network } = useWallet();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showTopUp, setShowTopUp] = useState(false);
  const [topupAmount, setTopupAmount] = useState('');
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);

  if (!address || !network) return <Redirect to="/" />;

  const chain = CHAINS.find(c => c.id === network);

  const walletQueryKey = getGetWalletQueryKey(address, { network: network as 'tezos' | 'ethereum' });
  const summaryQueryKey = getGetTransactionSummaryQueryKey({ walletAddress: address, network });

  const { data: wallet, isLoading: walletLoading } = useGetWallet(
    address,
    { network: network as 'tezos' | 'ethereum' },
    { query: { enabled: !!address && !!network, queryKey: walletQueryKey } }
  );

  const { data: summary, isLoading: summaryLoading } = useGetTransactionSummary(
    { walletAddress: address, network },
    { query: { enabled: !!address && !!network, queryKey: summaryQueryKey } }
  );

  const topUpMutation = useTopUpWallet();
  const autoAccMutation = useToggleAutoAccumulate();

  const tokenType = network === 'tezos' ? 'USDtz-SIM' : 'USDT-SIM';
  const balance = network === 'tezos' ? (wallet?.usdtzSimBalance ?? 0) : (wallet?.usdtSimBalance ?? 0);
  const isAutoOn = wallet?.autoAccumulate ?? false;

  // Auto-accumulate simulation: when enabled, add tokens every 5s
  useEffect(() => {
    if (isAutoOn && address && network) {
      autoRef.current = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: walletQueryKey });
      }, 5000);
    }
    return () => { if (autoRef.current) clearInterval(autoRef.current); };
  }, [isAutoOn, address, network]);

  const handleTopUp = async () => {
    const amt = parseFloat(topupAmount);
    if (!Number.isFinite(amt) || amt < 0.000001 || amt > 200_000_000 || !Number.isInteger(amt * 1_000_000)) {
      toast({ variant: 'destructive', title: 'Invalid amount', description: 'Enter an amount between 1 and 200,000,000' });
      return;
    }
    try {
      const updatedWallet = await topUpMutation.mutateAsync({ walletAddress: address, data: { network, tokenType, amount: amt } });
      queryClient.setQueryData(walletQueryKey, updatedWallet);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: walletQueryKey }),
        queryClient.invalidateQueries({ queryKey: summaryQueryKey }),
        queryClient.invalidateQueries({ queryKey: getGetTransactionsQueryKey() }),
      ]);
      toast({ title: 'Top-up successful', description: `Added ${amt.toLocaleString()} ${tokenType} to your wallet` });
      setTopupAmount('');
      setShowTopUp(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Top-up failed',
        description: error instanceof Error ? error.message : 'Could not top up your wallet',
      });
    }
  };

  const handleAutoAccumulate = async () => {
    try {
      await autoAccMutation.mutateAsync({ walletAddress: address, data: { network, enabled: !isAutoOn } });
      queryClient.invalidateQueries({ queryKey: walletQueryKey });
      toast({
        title: isAutoOn ? 'Auto-accumulate paused' : 'Auto-accumulate enabled',
        description: isAutoOn ? 'Smart contract paused.' : 'USDT is now accumulating automatically.',
      });
    } catch {
      toast({ variant: 'destructive', title: 'Failed to toggle auto-accumulate' });
    }
  };

  const chainColor = chain?.color ?? '#2563eb';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: chainColor }} />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: chainColor }}>
              {chain?.name} — {chain?.testnet}
            </span>
          </div>
          <h1 className="text-2xl font-black text-foreground">Wallet Dashboard</h1>
          <p className="text-muted-foreground font-mono text-xs mt-0.5 truncate">
            {address}
          </p>
        </div>

        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm" className="text-xs gap-1.5">
            <Link href="/transfer"><ArrowUpRight className="h-3.5 w-3.5" /> Send</Link>
          </Button>
          <Button asChild size="sm" className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
            <Link href="/faucet"><ArrowDownLeft className="h-3.5 w-3.5" /> Receive</Link>
          </Button>
        </div>
      </div>

      {/* Main balance card */}
      <Card className="border-0 overflow-hidden relative" style={{ background: `linear-gradient(135deg, ${chainColor}15, ${chainColor}08)`, borderTop: `3px solid ${chainColor}60` }}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-muted-foreground text-sm mb-2 flex items-center gap-1.5">
                <Wallet className="h-4 w-4" /> Simulated Token Balance
              </p>
              {walletLoading ? (
                <Skeleton className="h-12 w-48" />
              ) : (
                <div className="text-5xl font-black text-foreground">
                  ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              )}
              <p className="text-muted-foreground text-sm mt-1">{tokenType}</p>
            </div>

            {/* Auto-accumulate toggle */}
            <div className="flex flex-col items-end gap-2">
              <button
                onClick={handleAutoAccumulate}
                disabled={autoAccMutation.isPending}
                data-testid="btn-auto-accumulate"
                className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-bold transition-all duration-200 ${
                  isAutoOn
                    ? 'bg-violet-500 border-violet-500 text-white shadow-lg shadow-violet-500/30'
                    : 'border-slate-600 text-muted-foreground hover:border-violet-500 hover:text-violet-400'
                }`}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isAutoOn ? 'animate-spin' : ''}`} style={isAutoOn ? { animationDuration: '2s' } : {}} />
                Auto {isAutoOn ? 'ON' : 'OFF'}
              </button>
              {isAutoOn && (
                <p className="text-violet-400 text-xs">Smart contract active</p>
              )}
            </div>
          </div>

          {/* Top-up section */}
          <div className="mt-6 border-t border-slate-800 pt-4">
            {!showTopUp ? (
              <button
                onClick={() => setShowTopUp(true)}
                data-testid="btn-show-topup"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <TrendingUp className="h-4 w-4" />
                Top Up Balance (up to $200,000,000)
              </button>
            ) : (
                <form
                  className="space-y-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void handleTopUp();
                  }}
                >
                <p className="text-sm font-semibold text-foreground">Top Up Wallet</p>
                <div className="flex flex-wrap gap-2">
                  {TOPUP_PRESETS.map((p) => (
                    <button
                      key={p}
                        type="button"
                      onClick={() => setTopupAmount(p.toString())}
                      data-testid={`topup-preset-${p}`}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors ${
                        topupAmount === p.toString()
                          ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                          : 'border-slate-700 text-muted-foreground hover:border-slate-500'
                      }`}
                    >
                      ${p.toLocaleString()}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Custom amount"
                    value={topupAmount}
                    min="0.000001"
                    max="200000000"
                    step="0.000001"
                    required
                    onChange={(e) => setTopupAmount(e.target.value)}
                    data-testid="input-topup-amount"
                    className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-foreground outline-none focus:border-blue-500 placeholder:text-muted-foreground"
                  />
                  <Button type="submit" disabled={topUpMutation.isPending} size="sm" data-testid="btn-topup-confirm">
                    {topUpMutation.isPending ? 'Adding...' : 'Add Funds'}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setShowTopUp(false); setTopupAmount(''); }}>
                    Cancel
                  </Button>
                  </div>
                </form>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Secondary balances */}
      {wallet && (
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-card/30 border-border/50">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs text-muted-foreground font-medium">USDtz-SIM</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold">{wallet.usdtzSimBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            </CardContent>
          </Card>
          <Card className="bg-card/30 border-border/50">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs text-muted-foreground font-medium">USDT-SIM</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold">{wallet.usdtSimBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Activity summary */}
      <div>
        <h2 className="text-base font-bold mb-3 flex items-center gap-2 text-foreground">
          <Activity className="h-4 w-4" /> Activity Summary
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Received', icon: <ArrowDownLeft className="h-4 w-4 text-emerald-500" />, value: summary?.totalReceived },
            { label: 'Total Sent', icon: <ArrowUpRight className="h-4 w-4 text-rose-500" />, value: summary?.totalSent },
            { label: 'Faucet Claimed', icon: <Wallet className="h-4 w-4 text-blue-500" />, value: summary?.totalFaucetClaimed },
            { label: 'Added Funds', icon: <TrendingUp className="h-4 w-4 text-violet-500" />, value: summary?.totalToppedUp },
          ].map((s) => (
            <Card key={s.label} className="bg-card/20 border-border/40">
              <CardContent className="p-4">
                <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-2">{s.icon}{s.label}</div>
                {summaryLoading ? <Skeleton className="h-7 w-20" /> : <div className="text-xl font-bold">{(s.value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3 pt-2">
        <Button asChild variant="outline" size="sm" className="gap-2 text-xs">
          <Link href="/flash"><Zap className="h-3.5 w-3.5 text-yellow-400" /> Flash Token Send</Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="gap-2 text-xs">
          <Link href="/transactions"><Activity className="h-3.5 w-3.5" /> Transaction History</Link>
        </Button>
      </div>
    </div>
  );
}
