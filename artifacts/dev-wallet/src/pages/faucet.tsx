import React, { useState } from 'react';
import { useWallet } from '@/context/WalletContext';
import { useGetFaucetStatus, getGetFaucetStatusQueryKey, useClaimFaucet, getGetWalletQueryKey, getGetTransactionSummaryQueryKey } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Droplets, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { Redirect } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

export default function Faucet() {
  const { address, network } = useWallet();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [tokenType, setTokenType] = useState<string>('USDtz-SIM');

  if (!address || !network) {
    return <Redirect to="/" />;
  }

  const { data: status, isLoading, refetch } = useGetFaucetStatus(
    { walletAddress: address, network: network as any },
    { query: { enabled: !!address && !!network, queryKey: getGetFaucetStatusQueryKey({ walletAddress: address, network: network as any }) } }
  );

  const claimMutation = useClaimFaucet();

  const handleClaim = async () => {
    try {
      await claimMutation.mutateAsync({
        data: {
          walletAddress: address,
          network: network as any,
          tokenType: tokenType as any
        }
      });
      
      toast({
        title: "Tokens Claimed",
        description: `Successfully claimed ${tokenType}.`,
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: getGetWalletQueryKey(address, { network: network as any }) });
      queryClient.invalidateQueries({ queryKey: getGetFaucetStatusQueryKey({ walletAddress: address, network: network as any }) });
      queryClient.invalidateQueries({ queryKey: getGetTransactionSummaryQueryKey({ walletAddress: address, network: network as string }) });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Claim Failed",
        description: error?.response?.data?.error || "An unknown error occurred",
      });
    }
  };

  const isTezos = network === 'tezos';
  const themeColor = isTezos ? 'text-primary' : 'text-secondary';
  const themeBg = isTezos ? 'bg-primary' : 'bg-secondary';
  const themeBgHover = isTezos ? 'hover:bg-primary/90' : 'hover:bg-secondary/90';

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Testnet Faucet</h1>
        <p className="text-muted-foreground mt-2">Request simulated tokens for development and testing purposes.</p>
      </div>

      <Card className="bg-card/60 backdrop-blur border-muted">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplets className={`h-5 w-5 ${themeColor}`} /> Faucet Status
          </CardTitle>
          <CardDescription>Daily limits apply to ensure fair distribution</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center p-4 bg-muted/30 rounded-lg border border-border/50">
                <span className="text-sm font-medium text-muted-foreground">Daily Limit</span>
                <span className="font-mono font-bold">{status?.dailyLimit}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-muted/30 rounded-lg border border-border/50">
                <span className="text-sm font-medium text-muted-foreground">Claimed Today</span>
                <span className="font-mono font-bold">{status?.claimedToday} / {status?.dailyLimit}</span>
              </div>
              
              {!status?.canClaim && status?.nextClaimAt && (
                <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive-foreground">
                  <Clock className="h-4 w-4" />
                  <AlertTitle>Limit Reached</AlertTitle>
                  <AlertDescription>
                    You have reached your daily limit. You can claim again on {new Date(status.nextClaimAt).toLocaleString()}.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}

          <div className="space-y-3 pt-4 border-t border-border/50">
            <label className="text-sm font-medium">Select Token to Claim</label>
            <Select value={tokenType} onValueChange={setTokenType}>
              <SelectTrigger>
                <SelectValue placeholder="Select token type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USDtz-SIM">USDtz-SIM</SelectItem>
                <SelectItem value="USDT-SIM">USDT-SIM</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            className={`w-full font-bold ${themeBg} text-background ${themeBgHover}`}
            size="lg"
            onClick={handleClaim}
            disabled={!status?.canClaim || claimMutation.isPending || isLoading}
          >
            {claimMutation.isPending ? 'Processing...' : 'Request Tokens'}
          </Button>
        </CardFooter>
      </Card>
      
      {claimMutation.isSuccess && (
        <Alert className="bg-emerald-500/10 border-emerald-500/20 text-emerald-500">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>
            Tokens successfully added to your wallet balance.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
