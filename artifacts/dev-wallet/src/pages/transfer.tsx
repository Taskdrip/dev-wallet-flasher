import React from 'react';
import { useWallet } from '@/context/WalletContext';
import { useTransferTokens, getGetWalletQueryKey, getGetTransactionsQueryKey, getGetTransactionSummaryQueryKey } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRightLeft } from 'lucide-react';
import { Redirect } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const transferSchema = z.object({
  toAddress: z.string().min(5, "Address must be at least 5 characters"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  tokenType: z.enum(['USDtz-SIM', 'USDT-SIM']),
});

type TransferFormValues = z.infer<typeof transferSchema>;

export default function Transfer() {
  const { address, network } = useWallet();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  if (!address || !network) {
    return <Redirect to="/" />;
  }

  const transferMutation = useTransferTokens();

  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      toAddress: '',
      amount: 10,
      tokenType: 'USDtz-SIM',
    },
  });

  const onSubmit = async (data: TransferFormValues) => {
    try {
      await transferMutation.mutateAsync({
        data: {
          fromAddress: address,
          toAddress: data.toAddress,
          network: network as any,
          tokenType: data.tokenType as any,
          amount: data.amount
        }
      });
      
      toast({
        title: "Transfer Successful",
        description: `Sent ${data.amount} ${data.tokenType} to ${data.toAddress}`,
      });
      
      form.reset({ toAddress: '', amount: 10, tokenType: data.tokenType });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: getGetWalletQueryKey(address, { network: network as any }) });
      queryClient.invalidateQueries({ queryKey: getGetTransactionsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetTransactionSummaryQueryKey({ walletAddress: address, network: network as string }) });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Transfer Failed",
        description: error?.response?.data?.error || "An unknown error occurred",
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
          <CardDescription>Network: {network} Testnet</CardDescription>
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
                      <Input placeholder="0x... or tz1..." className="font-mono bg-background/50" {...field} />
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

                <FormField
                  control={form.control}
                  name="tokenType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Token</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background/50">
                            <SelectValue placeholder="Select token" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="USDtz-SIM">USDtz-SIM</SelectItem>
                          <SelectItem value="USDT-SIM">USDT-SIM</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
