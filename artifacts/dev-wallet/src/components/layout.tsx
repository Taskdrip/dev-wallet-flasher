import React from 'react';
import { Link, useLocation } from 'wouter';
import { useWallet } from '@/context/WalletContext';
import { Button } from '@/components/ui/button';
import { Wallet, Activity, ArrowRightLeft, ShieldAlert, LogOut, Settings, Droplets } from 'lucide-react';

export function Layout({ children }: { children: React.ReactNode }) {
  const { address, network, disconnect } = useWallet();
  const [location] = useLocation();

  const isHome = location === '/';

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground font-mono selection:bg-primary/30">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg hover:text-primary transition-colors">
              <ShieldAlert className="h-5 w-5 text-primary" />
              <span>DEV<span className="text-primary">WALLET</span></span>
            </Link>
            
            {address && (
              <nav className="hidden md:flex items-center gap-4 text-sm">
                <Link href="/dashboard" className={`flex items-center gap-2 transition-colors hover:text-primary ${location === '/dashboard' ? 'text-primary' : 'text-muted-foreground'}`}>
                  <Activity className="h-4 w-4" /> Dashboard
                </Link>
                <Link href="/faucet" className={`flex items-center gap-2 transition-colors hover:text-secondary ${location === '/faucet' ? 'text-secondary' : 'text-muted-foreground'}`}>
                  <Droplets className="h-4 w-4" /> Faucet
                </Link>
                <Link href="/transfer" className={`flex items-center gap-2 transition-colors hover:text-primary ${location === '/transfer' ? 'text-primary' : 'text-muted-foreground'}`}>
                  <ArrowRightLeft className="h-4 w-4" /> Transfer
                </Link>
                <Link href="/transactions" className={`flex items-center gap-2 transition-colors hover:text-primary ${location === '/transactions' ? 'text-primary' : 'text-muted-foreground'}`}>
                  <Wallet className="h-4 w-4" /> History
                </Link>
              </nav>
            )}
          </div>

          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-full hover:bg-muted">
              <Settings className="h-4 w-4" />
            </Link>
            
            {address ? (
              <div className="flex items-center gap-3 bg-muted/50 py-1.5 px-3 rounded-full border border-border/50">
                <div className={`h-2 w-2 rounded-full animate-pulse ${network === 'tezos' ? 'bg-primary' : 'bg-secondary'}`} />
                <span className="text-xs text-muted-foreground truncate w-24">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </span>
                <button onClick={disconnect} className="text-muted-foreground hover:text-destructive ml-2 transition-colors" title="Disconnect">
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : !isHome ? (
              <Button asChild variant="outline" size="sm" className="font-mono text-xs">
                <Link href="/">Connect Wallet</Link>
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-4 md:p-8">
        {children}
      </main>

      <footer className="border-t border-border/40 py-6 mt-auto">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p className="flex items-center gap-2">
            <ShieldAlert className="h-3 w-3" />
            This application does NOT store or access private keys. All wallet connections are handled securely via wallet providers.
          </p>
          <div className="flex gap-4">
            <span>Network: Simulated Testnet</span>
            <span>v0.1.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
