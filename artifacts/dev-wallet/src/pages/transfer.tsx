import React from 'react';
import { useWallet, CHAINS } from '@/context/WalletContext';
import { useTransferTokens, getGetWalletQueryKey, getGetTransactionsQueryKey, getGetTransactionSummaryQueryKey } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRightLeft } from 'lucide-react';
import { Redirect } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const transferSchema = z.object({
  toAddress: z.string().trim().min(1, "Enter a recipient address."),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
});

type TransferFormValues = z.infer<typeof transferSchema>;

function isValidAddress(address: string, network: string): boolean {
  if (network === "ethereum" || network === "bnb") return /^0x[a-fA-F0-9]{40}$/.test(address);
  if (network === "tron") return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address);
  if (network === "tezos") return /^(?:tz[1-4]|KT1)[1-9A-HJ-NP-Za-km-z]{33}$/.test(address);
  return false;
}

export default function Transfer() {
  const { address, network } = useWallet();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const safeAddress = address ?? "";
  const safeNetwork = network ?? "ethereum";
  const transferMutation = useTransferTokens();

  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      toAddress: '',
      amount: 10,
    },
  });

  if (!address || !network) {
    return <Redirect to="/" />;
  }

  const tokenType = network === "tezos" ? "USDtz-SIM" : "USDT-SIM";
  const chain = CHAINS.find((item) => item.id === network);

  const onSubmit = async (data: TransferFormValues) => {
    if (!isValidAddress(data.toAddress, network)) {
      form.setError("toAddress", { message: `Enter a valid ${network} testnet wallet address.` });
      return;
    }

    try {
      await transferMutation.mutateAsync({
        data: {
          fromAddress: address,
          toAddress: data.toAddress,
          network,
          tokenType,
          amount: data.amount
        }
      });
      
      toast({
        title: "Test transfer recorded",
        description: `${data.amount} ${tokenType} was moved in the ${network} simulation ledger. No on-chain transaction was sent.`,
      });
      
      form.reset({ toAddress: '', amount: 10 });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: getGetWalletQueryKey(safeAddress, { network: safeNetwork }) });
      queryClient.invalidateQueries({ queryKey: getGetTransactionsQueryKey({ walletAddress: safeAddress, network: safeNetwork }) });
      queryClient.invalidateQueries({ queryKey: getGetTransactionSummaryQueryKey({ walletAddress: safeAddress, network: safeNetwork }) });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Transfer Failed",
        description: error instanceof Error ? error.message : "Could not record the test transfer.",
      });
    }
  };

  const isTezos = network === 'tezos';
  const themeBg = isTezos ? 'bg-primary' : 'bg-secondary';
  const themeBgHover = isTezos ? 'hover:bg-primary/90' : 'hover:bg-secondary/90';

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Transfer Tokens</h1>
        <p className="text-muted-foreground mt-2">Send simulated tokens to another wallet address.</p>
      </div>

      <Card className="bg-card/60 backdrop-blur border-muted">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" /> Send Transaction
          </CardTitle>
          <CardDescription>{chain?.testnet} · simulated balances only</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="toAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recipient Address</FormLabel>
                    <FormControl>
                    <Input
                      placeholder={network === "tron" ? "T..." : network === "tezos" ? "tz1..." : "0x..."}
                      className="font-mono bg-background/50"
                      autoComplete="off"
                      spellCheck={false}
                      {...field}
                    />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" className="font-mono bg-background/50" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <Label>Test token</Label>
                  <div className="flex h-10 items-center rounded-md border border-input bg-background/50 px-3 text-sm font-semibold">
                    {tokenType}
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                className={`w-full font-bold ${themeBg} text-background ${themeBgHover}`}
                size="lg"
                disabled={transferMutation.isPending}
              >
                {transferMutation.isPending ? 'Processing Transfer...' : 'Confirm Transfer'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
