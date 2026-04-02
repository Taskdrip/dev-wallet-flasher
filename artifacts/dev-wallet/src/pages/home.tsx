import React, { useState } from 'react';
import { useWallet, CHAINS, type ChainConfig } from '@/context/WalletContext';
import { Button } from '@/components/ui/button';
import { Shield, Zap, ArrowDownLeft, ArrowUpRight, RefreshCw, BookOpen, ChevronRight } from 'lucide-react';
import { Link } from 'wouter';

const CHAIN_ICONS: Record<string, string> = {
  ethereum: 'ETH',
  bnb: 'BNB',
  tron: 'TRX',
  tezos: 'XTZ',
};

export default function Home() {
  const { connectWallet, isConnecting } = useWallet();
  const [selectedChain, setSelectedChain] = useState<ChainConfig | null>(null);
  const [hoveredChain, setHoveredChain] = useState<string | null>(null);

  const handleConnect = async () => {
    if (!selectedChain) return;
    await connectWallet(selectedChain);
  };

  return (
    <div className="relative min-h-screen overflow-hidden -mt-8 -mx-4 md:-mx-8">
      {/* Animated crypto background */}
      <div className="absolute inset-0 bg-[#050a14]">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            radial-gradient(ellipse 80% 50% at 20% 40%, rgba(37,99,235,0.15) 0%, transparent 60%),
            radial-gradient(ellipse 60% 50% at 80% 20%, rgba(16,185,129,0.10) 0%, transparent 60%),
            radial-gradient(ellipse 40% 30% at 50% 80%, rgba(99,102,241,0.12) 0%, transparent 60%)
          `
        }} />
        {/* Grid lines */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }} />
        {/* Floating orbs */}
        <div className="absolute top-20 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-32 right-1/4 w-80 h-80 bg-emerald-500/8 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 md:px-8 pt-16 pb-24">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold tracking-widest uppercase mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400" />
            </span>
            Multi-Chain Testnet Platform
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white mb-6 leading-tight">
            Dev Wallet<br />
            <span className="bg-gradient-to-r from-blue-400 via-emerald-400 to-violet-400 bg-clip-text text-transparent">
              Connector
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed mb-8">
            The global toolkit for Web3 developers. Test transactions across multiple blockchains with simulated tokens up to <span className="text-emerald-400 font-bold">$200,000,000</span>.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            {[
              { icon: <ArrowDownLeft className="h-3.5 w-3.5" />, label: 'Receive Tokens', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
              { icon: <ArrowUpRight className="h-3.5 w-3.5" />, label: 'Send Tokens', color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' },
              { icon: <Zap className="h-3.5 w-3.5" />, label: 'Flash Test Send', color: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' },
              { icon: <RefreshCw className="h-3.5 w-3.5" />, label: 'Auto-Accumulate', color: 'text-violet-400 border-violet-500/30 bg-violet-500/10' },
            ].map((f) => (
              <span key={f.label} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold ${f.color}`}>
                {f.icon} {f.label}
              </span>
            ))}
          </div>
        </div>

        {/* Chain selector */}
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-white font-bold text-lg mb-1">Select a Blockchain</h2>
            <p className="text-slate-500 text-sm">Choose your network, then connect your wallet</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {CHAINS.map((chain) => {
              const isSelected = selectedChain?.id === chain.id;
              const isHovered = hoveredChain === chain.id;
              return (
                <button
                  key={chain.id}
                  onClick={() => setSelectedChain(chain)}
                  onMouseEnter={() => setHoveredChain(chain.id)}
                  onMouseLeave={() => setHoveredChain(null)}
                  data-testid={`chain-select-${chain.id}`}
                  className={`relative flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20'
                      : isHovered
                      ? 'border-slate-600 bg-slate-800/80'
                      : 'border-slate-700/60 bg-slate-900/60'
                  }`}
                  style={isSelected ? { borderColor: chain.color + '80', boxShadow: `0 0 20px ${chain.color}20` } : {}}
                >
                  {/* Chain icon circle */}
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-black text-sm"
                    style={{ backgroundColor: chain.color + '25', border: `2px solid ${chain.color}60` }}
                  >
                    <span style={{ color: chain.color }}>{CHAIN_ICONS[chain.id]}</span>
                  </div>
                  <div className="text-center">
                    <div className="text-white font-bold text-sm">{chain.name}</div>
                    <div className="text-slate-500 text-xs mt-0.5">{chain.testnet}</div>
                  </div>
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full" style={{ backgroundColor: chain.color }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Connect button */}
          <div className="space-y-3">
            {selectedChain ? (
              <Button
                onClick={handleConnect}
                disabled={isConnecting}
                data-testid="btn-connect-wallet"
                className="w-full h-14 text-base font-bold rounded-xl transition-all duration-200"
                style={{
                  background: `linear-gradient(135deg, ${selectedChain.color}, ${selectedChain.color}cc)`,
                  boxShadow: `0 4px 20px ${selectedChain.color}40`,
                  color: '#fff',
                }}
              >
                {isConnecting ? (
                  <span className="flex items-center gap-2"><RefreshCw className="h-4 w-4 animate-spin" /> Connecting...</span>
                ) : (
                  <span className="flex items-center gap-2">
                    Connect {selectedChain.name}
                    <ChevronRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            ) : (
              <div className="w-full h-14 rounded-xl border border-dashed border-slate-700 flex items-center justify-center text-slate-600 text-sm">
                Select a blockchain above to continue
              </div>
            )}

            <Link href="/guide">
              <button className="w-full flex items-center justify-center gap-2 text-slate-500 hover:text-slate-300 text-sm transition-colors py-2">
                <BookOpen className="h-4 w-4" />
                How to get started — step-by-step guide
              </button>
            </Link>
          </div>
        </div>

        {/* Feature grid */}
        <div className="grid md:grid-cols-3 gap-4 mt-16 max-w-3xl mx-auto">
          {[
            {
              icon: <Zap className="h-5 w-5" />,
              color: 'text-yellow-400',
              bg: 'bg-yellow-500/10 border-yellow-500/20',
              title: 'Flash Test Tokens',
              desc: 'Instantly send simulated tokens to any wallet for integration testing',
            },
            {
              icon: <RefreshCw className="h-5 w-5" />,
              color: 'text-violet-400',
              bg: 'bg-violet-500/10 border-violet-500/20',
              title: 'Auto-Accumulate',
              desc: 'Toggle a smart contract that continuously accumulates USDT to your balance',
            },
            {
              icon: <Shield className="h-5 w-5" />,
              color: 'text-emerald-400',
              bg: 'bg-emerald-500/10 border-emerald-500/20',
              title: 'Zero-Risk Security',
              desc: 'No private keys ever stored. All connections via secure wallet providers',
            },
          ].map((f) => (
            <div key={f.title} className={`p-5 rounded-2xl border ${f.bg}`}>
              <div className={`${f.color} mb-3`}>{f.icon}</div>
              <div className="text-white font-bold text-sm mb-1">{f.title}</div>
              <div className="text-slate-500 text-xs leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>

        {/* Security notice */}
        <div className="mt-10 max-w-2xl mx-auto">
          <div className="flex items-start gap-3 bg-slate-900/60 border border-slate-800 p-5 rounded-xl">
            <Shield className="h-5 w-5 text-slate-500 mt-0.5 shrink-0" />
            <p className="text-xs text-slate-500 leading-relaxed">
              <span className="text-slate-400 font-semibold">Security Notice:</span> This application does NOT store or access private keys. All wallet connections are handled securely via standard browser wallet providers (MetaMask, TronLink, Temple Wallet). This is a testnet simulation environment — no real funds are involved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
