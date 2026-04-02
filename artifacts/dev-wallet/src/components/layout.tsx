import React from 'react';
import { Link, useLocation } from 'wouter';
import { useWallet, CHAINS } from '@/context/WalletContext';
import { Button } from '@/components/ui/button';
import { Wallet, Activity, ArrowRightLeft, ShieldAlert, LogOut, Settings, Droplets, Zap, BookOpen } from 'lucide-react';

export function Layout({ children }: { children: React.ReactNode }) {
  const { address, network, disconnect } = useWallet();
  const [location] = useLocation();

  const chain = CHAINS.find(c => c.id === network);
  const isHome = location === '/';

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground font-mono selection:bg-primary/30">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg hover:opacity-80 transition-opacity">
              <ShieldAlert className="h-5 w-5 text-primary" />
              <span>DEV<span className="text-primary">WALLET</span></span>
            </Link>

            {address && (
              <nav className="hidden md:flex items-center gap-4 text-sm">
                <Link href="/dashboard" className={`flex items-center gap-1.5 transition-colors hover:text-foreground ${location === '/dashboard' ? 'text-foreground' : 'text-muted-foreground'}`}>
                  <Activity className="h-3.5 w-3.5" /> Dashboard
                </Link>
                <Link href="/faucet" className={`flex items-center gap-1.5 transition-colors hover:text-foreground ${location === '/faucet' ? 'text-foreground' : 'text-muted-foreground'}`}>
                  <Droplets className="h-3.5 w-3.5" /> Receive
                </Link>
                <Link href="/transfer" className={`flex items-center gap-1.5 transition-colors hover:text-foreground ${location === '/transfer' ? 'text-foreground' : 'text-muted-foreground'}`}>
                  <ArrowRightLeft className="h-3.5 w-3.5" /> Send
                </Link>
                <Link href="/transactions" className={`flex items-center gap-1.5 transition-colors hover:text-foreground ${location === '/transactions' ? 'text-foreground' : 'text-muted-foreground'}`}>
                  <Wallet className="h-3.5 w-3.5" /> History
                </Link>
                <Link href="/flash" className={`flex items-center gap-1.5 transition-colors hover:text-yellow-400 ${location === '/flash' ? 'text-yellow-400' : 'text-muted-foreground'}`}>
                  <Zap className="h-3.5 w-3.5" /> Flash
                </Link>
              </nav>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Link href="/guide" className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-full hover:bg-muted" title="Guide">
              <BookOpen className="h-4 w-4" />
            </Link>
            <Link href="/admin" className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-full hover:bg-muted" title="Admin">
              <Settings className="h-4 w-4" />
            </Link>

            {address ? (
              <div className="flex items-center gap-2 bg-muted/40 py-1.5 px-3 rounded-full border border-border/50">
                {chain && (
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: chain.color }} />
                )}
                <span className="text-xs text-muted-foreground font-mono truncate max-w-[80px]">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </span>
                {chain && (
                  <span className="text-xs hidden md:block" style={{ color: chain.color }}>
                    {chain.name}
                  </span>
                )}
                <button onClick={disconnect} className="text-muted-foreground hover:text-destructive ml-1 transition-colors" title="Disconnect">
                  <LogOut className="h-3.5 w-3.5" />
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

      <main className={`flex-1 ${isHome ? '' : 'container mx-auto p-4 md:p-8'}`}>
        {children}
      </main>

      <footer className="border-t border-border/40 py-4 mt-auto">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <p className="flex items-center gap-2">
            <ShieldAlert className="h-3 w-3" />
            No private keys stored. All connections via secure wallet providers. Testnet only — no real funds.
          </p>
          <div className="flex gap-4 items-center">
            <Link href="/guide" className="hover:text-foreground transition-colors">Guide</Link>
            <span>Simulated Testnet</span>
            <span>v1.0.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
