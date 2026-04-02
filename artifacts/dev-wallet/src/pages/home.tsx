import React from 'react';
import { useWallet } from '@/context/WalletContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Terminal, Zap } from 'lucide-react';

export default function Home() {
  const { connectMetaMask, connectTemple, isConnecting } = useWallet();

  return (
    <div className="max-w-4xl mx-auto py-12 flex flex-col items-center">
      <div className="text-center mb-16 space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold tracking-wider mb-4 uppercase">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          Testnet Environment
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter">
          Dev Wallet <span className="text-primary">Connector</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mt-6">
          The precision testnet toolkit for Web3 developers. Connect your wallet securely, acquire simulated tokens, and build with confidence.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 w-full max-w-2xl mb-16">
        <Card className="bg-card/50 border-primary/20 hover:border-primary/50 transition-colors duration-300 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-8 flex flex-col items-center text-center space-y-6 relative z-10">
            <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 text-primary">
              <Zap className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Temple Wallet</h3>
              <p className="text-sm text-muted-foreground">Connect via Tezos ghostnet</p>
            </div>
            <Button 
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20"
              size="lg"
              onClick={connectTemple}
              disabled={isConnecting}
            >
              {isConnecting ? 'Connecting...' : 'Connect Temple'}
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-secondary/20 hover:border-secondary/50 transition-colors duration-300 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-8 flex flex-col items-center text-center space-y-6 relative z-10">
            <div className="h-16 w-16 bg-secondary/10 rounded-2xl flex items-center justify-center border border-secondary/20 text-secondary">
              <Terminal className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">MetaMask</h3>
              <p className="text-sm text-muted-foreground">Connect via Ethereum testnet</p>
            </div>
            <Button 
              className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground font-bold shadow-lg shadow-secondary/20"
              size="lg"
              onClick={connectMetaMask}
              disabled={isConnecting}
            >
              {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4 bg-muted/30 border border-border/50 p-6 rounded-xl max-w-2xl w-full">
        <div className="bg-background p-3 rounded-full shadow-inner">
          <Shield className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <h4 className="font-bold text-sm mb-1">Security Notice</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            This application does NOT store or access private keys. All wallet connections are handled securely via standard provider injection.
          </p>
        </div>
      </div>
    </div>
  );
}
