import React from 'react';
import { useWallet } from '@/context/WalletContext';
import { useGetFaucetStatus, getGetFaucetStatusQueryKey, useClaimFaucet, getGetWalletQueryKey, getGetTransactionSummaryQueryKey } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Droplets, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { Redirect } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

export default function Faucet() {
  const { address, network } = useWallet();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const safeAddress = address ?? '';
  const safeNetwork = network ?? 'ethereum';
  const tokenType = safeNetwork === 'tezos' ? 'USDtz-SIM' : 'USDT-SIM';

  const { data: status, isLoading, refetch } = useGetFaucetStatus(
    { walletAddress: safeAddress, network: safeNetwork },
    { query: { enabled: !!address && !!network, queryKey: getGetFaucetStatusQueryKey({ walletAddress: safeAddress, network: safeNetwork }) } }
  );

  const claimMutation = useClaimFaucet();

  if (!address || !network) {
    return <Redirect to="/" />;
  }

  const handleClaim = async () => {
    try {
      await claimMutation.mutateAsync({
        data: {
          walletAddress: address,
          network,
          tokenType
        }
      });
      
      toast({
        title: "Tokens Claimed",
        description: `Successfully claimed ${tokenType}.`,
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: getGetWalletQueryKey(address, { network }) });
      queryClient.invalidateQueries({ queryKey: getGetFaucetStatusQueryKey({ walletAddress: address, network }) });
      queryClient.invalidateQueries({ queryKey: getGetTransactionSummaryQueryKey({ walletAddress: address, network }) });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Claim Failed",
        description: error instanceof Error ? error.message : "Could not claim test tokens.",
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
            <p className="text-sm font-medium">Test token for this network</p>
            <div className="rounded-md border border-border/50 bg-muted/20 px-3 py-2 text-sm font-semibold">
              {tokenType}
            </div>
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
