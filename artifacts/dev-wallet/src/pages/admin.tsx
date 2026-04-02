import React, { useState } from 'react';
import { useGetAdminStats, useGetAdminWallets, useGetFaucetLimits, useUpdateFaucetLimits, useFreezeWallet, getGetAdminStatsQueryKey, getGetAdminWalletsQueryKey, getGetFaucetLimitsQueryKey } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Users, Activity, Settings2, ShieldBan, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';

export default function Admin() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: stats, isLoading: isStatsLoading } = useGetAdminStats({ query: { queryKey: getGetAdminStatsQueryKey() } });
  const { data: walletsData, isLoading: isWalletsLoading } = useGetAdminWallets({ limit: 50 }, { query: { queryKey: getGetAdminWalletsQueryKey({ limit: 50 }) } });
  const { data: limits, isLoading: isLimitsLoading } = useGetFaucetLimits({ query: { queryKey: getGetFaucetLimitsQueryKey() } });

  const updateLimitsMutation = useUpdateFaucetLimits();
  const freezeMutation = useFreezeWallet();

  const [tezosLimit, setTezosLimit] = useState('');
  const [ethLimit, setEthLimit] = useState('');

  // Set limits when data loads
  React.useEffect(() => {
    if (limits) {
      if (!tezosLimit) setTezosLimit(limits.tezosUsdtzSimDailyLimit.toString());
      if (!ethLimit) setEthLimit(limits.ethereumUsdtSimDailyLimit.toString());
    }
  }, [limits]);

  const handleUpdateLimits = async () => {
    try {
      await updateLimitsMutation.mutateAsync({
        data: {
          tezosUsdtzSimDailyLimit: Number(tezosLimit),
          ethereumUsdtSimDailyLimit: Number(ethLimit)
        }
      });
      toast({ title: "Limits Updated", description: "Global faucet limits have been updated." });
      queryClient.invalidateQueries({ queryKey: getGetFaucetLimitsQueryKey() });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to update limits." });
    }
  };

  const handleToggleFreeze = async (walletAddress: string, currentStatus: boolean) => {
    try {
      await freezeMutation.mutateAsync({
        walletAddress,
        data: { frozen: !currentStatus }
      });
      toast({ title: "Status Updated", description: `Wallet ${!currentStatus ? 'frozen' : 'unfrozen'}.` });
      queryClient.invalidateQueries({ queryKey: getGetAdminWalletsQueryKey({ limit: 50 }) });
      queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to update wallet status." });
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-4">
      <div className="flex items-center gap-3 mb-8 border-b border-border/50 pb-6">
        <Settings2 className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Administration</h1>
          <p className="text-muted-foreground mt-1">Platform overview and access controls.</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="bg-card/40 border-muted">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalWallets || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats?.totalTezosWallets} XTZ / {stats?.totalEthereumWallets} ETH</p>
          </CardContent>
        </Card>
        <Card className="bg-card/40 border-muted">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Transactions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalTransactions || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats?.todaysClaims} faucet claims today</p>
          </CardContent>
        </Card>
        <Card className="bg-card/40 border-muted">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tokens Distributed</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate" title={stats?.totalUsdtzSimDistributed.toString()}>{stats?.totalUsdtzSimDistributed || 0} <span className="text-sm">USDtz</span></div>
            <div className="text-2xl font-bold truncate mt-1" title={stats?.totalUsdtSimDistributed.toString()}>{stats?.totalUsdtSimDistributed || 0} <span className="text-sm">USDT</span></div>
          </CardContent>
        </Card>
        <Card className="bg-card/40 border-muted">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Frozen Accounts</CardTitle>
            <ShieldBan className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{stats?.frozenWallets || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Requires manual review</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Settings */}
        <Card className="bg-card/60 border-muted md:col-span-1 h-fit">
          <CardHeader>
            <CardTitle>Global Limits</CardTitle>
            <CardDescription>Configure daily faucet limits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tezos USDtz-SIM (Daily)</label>
              <Input 
                type="number" 
                value={tezosLimit} 
                onChange={(e) => setTezosLimit(e.target.value)} 
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Ethereum USDT-SIM (Daily)</label>
              <Input 
                type="number" 
                value={ethLimit} 
                onChange={(e) => setEthLimit(e.target.value)}
                className="bg-background"
              />
            </div>
            <Button 
              onClick={handleUpdateLimits} 
              disabled={updateLimitsMutation.isPending}
              className="w-full mt-4"
            >
              {updateLimitsMutation.isPending ? 'Saving...' : 'Save Configuration'}
            </Button>
          </CardContent>
        </Card>

        {/* User Management */}
        <Card className="bg-card/40 border-muted md:col-span-2">
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Monitor and control platform access</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Address</TableHead>
                  <TableHead>Network</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead className="text-right">Access</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {walletsData?.wallets.map((wallet) => (
                  <TableRow key={wallet.id}>
                    <TableCell className="font-mono text-xs">{wallet.walletAddress.slice(0, 12)}...</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={wallet.network === 'tezos' ? 'text-primary border-primary/50' : 'text-secondary border-secondary/50'}>
                        {wallet.network}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(wallet.lastSeenAt), 'MMM d, HH:mm')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs text-muted-foreground">{wallet.isFrozen ? 'Frozen' : 'Active'}</span>
                        <Switch 
                          checked={!wallet.isFrozen} 
                          onCheckedChange={() => handleToggleFreeze(wallet.walletAddress, wallet.isFrozen)} 
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
