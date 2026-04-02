import React, { useState } from 'react';
import { useWallet, CHAINS } from '@/context/WalletContext';
import { useSendFlashToken } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { getGetWalletQueryKey } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Zap, CheckCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const FLASH_AMOUNTS = [100, 1000, 10_000, 100_000, 1_000_000];

export default function Flash() {
  const { address, network } = useWallet();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const flashMutation = useSendFlashToken();

  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState(network ?? 'ethereum');
  const [tokenType, setTokenType] = useState('USDT-SIM');
  const [message, setMessage] = useState('');
  const [lastResult, setLastResult] = useState<{ txHash: string; amount: number; toAddress: string } | null>(null);

  const handleFlashSend = async () => {
    if (!toAddress.trim()) {
      toast({ variant: 'destructive', title: 'Missing recipient', description: 'Enter a target wallet address' });
      return;
    }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast({ variant: 'destructive', title: 'Invalid amount', description: 'Enter a valid token amount' });
      return;
    }

    try {
      const result = await flashMutation.mutateAsync({
        data: {
          fromAddress: address ?? 'FLASH_CONSOLE',
          toAddress: toAddress.trim(),
          network: selectedNetwork,
          tokenType,
          amount: amt,
          message: message || null,
        },
      });
      setLastResult({ txHash: result.txHash, amount: result.amount, toAddress: result.toAddress });
      if (address && network) {
        queryClient.invalidateQueries({ queryKey: getGetWalletQueryKey(address, { network: network as 'tezos' | 'ethereum' }) });
      }
      toast({ title: 'Flash tokens sent', description: `${amt.toLocaleString()} ${tokenType} sent to ${toAddress.slice(0, 10)}...` });
      setToAddress('');
      setAmount('');
      setMessage('');
    } catch {
      toast({ variant: 'destructive', title: 'Flash send failed', description: 'Could not send flash tokens' });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Zap className="h-5 w-5 text-yellow-400" />
          <h1 className="text-2xl font-black">Flash Token Send</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Developer tool — instantly send simulated tokens to any wallet address for integration testing. No wallet connection required for the recipient.
        </p>
      </div>

      <Card className="bg-yellow-500/5 border-yellow-500/20">
        <CardContent className="p-4 flex gap-3">
          <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-300/80 leading-relaxed">
            Flash tokens are simulated test tokens only. They have no real-world value and are for development and testing purposes. Recipient wallets must be registered in this platform.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Send Flash Tokens</CardTitle>
          <CardDescription>Configure and fire a test transaction</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Network selector */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Network</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {CHAINS.map((chain) => (
                <button
                  key={chain.id}
                  onClick={() => {
                    setSelectedNetwork(chain.id);
                    setTokenType(chain.id === 'tezos' ? 'USDtz-SIM' : 'USDT-SIM');
                  }}
                  data-testid={`flash-chain-${chain.id}`}
                  className={`px-3 py-2 rounded-lg border text-xs font-bold transition-colors ${
                    selectedNetwork === chain.id
                      ? 'border-yellow-500 bg-yellow-500/15 text-yellow-300'
                      : 'border-border text-muted-foreground hover:border-slate-500'
                  }`}
                >
                  {chain.name}
                </button>
              ))}
            </div>
          </div>

          {/* Token type */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Token</label>
            <div className="flex gap-2">
              {['USDT-SIM', 'USDtz-SIM'].map((t) => (
                <button
                  key={t}
                  onClick={() => setTokenType(t)}
                  className={`px-4 py-2 rounded-lg border text-xs font-bold transition-colors ${
                    tokenType === t ? 'border-yellow-500 bg-yellow-500/15 text-yellow-300' : 'border-border text-muted-foreground'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Recipient address */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Recipient Wallet Address</label>
            <input
              type="text"
              placeholder="0x... or tz1..."
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value)}
              data-testid="input-flash-to"
              className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:border-yellow-500 placeholder:text-muted-foreground font-mono"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Amount</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {FLASH_AMOUNTS.map((a) => (
                <button
                  key={a}
                  onClick={() => setAmount(a.toString())}
                  data-testid={`flash-amount-${a}`}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors ${
                    amount === a.toString()
                      ? 'border-yellow-500 bg-yellow-500/15 text-yellow-300'
                      : 'border-border text-muted-foreground hover:border-slate-500'
                  }`}
                >
                  {a.toLocaleString()}
                </button>
              ))}
            </div>
            <input
              type="number"
              placeholder="Custom amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              data-testid="input-flash-amount"
              className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:border-yellow-500 placeholder:text-muted-foreground"
            />
          </div>

          {/* Optional message */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Message (optional)</label>
            <input
              type="text"
              placeholder="Test payment, integration test..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:border-yellow-500 placeholder:text-muted-foreground"
            />
          </div>

          <Button
            onClick={handleFlashSend}
            disabled={flashMutation.isPending}
            data-testid="btn-flash-send"
            className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold gap-2"
          >
            <Zap className="h-4 w-4" />
            {flashMutation.isPending ? 'Sending...' : 'Flash Send Tokens'}
          </Button>
        </CardContent>
      </Card>

      {/* Result */}
      {lastResult && (
        <Card className="bg-emerald-500/5 border-emerald-500/30">
          <CardContent className="p-4 flex gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-emerald-400">Flash tokens sent successfully</p>
              <p className="text-xs text-muted-foreground">Amount: <span className="text-foreground font-mono">{lastResult.amount.toLocaleString()}</span></p>
              <p className="text-xs text-muted-foreground">To: <span className="text-foreground font-mono">{lastResult.toAddress}</span></p>
              <p className="text-xs text-muted-foreground">TX: <span className="text-foreground font-mono text-[11px]">{lastResult.txHash}</span></p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
