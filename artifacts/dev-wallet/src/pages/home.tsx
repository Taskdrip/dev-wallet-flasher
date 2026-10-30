import React, { useState } from 'react';
import { useWallet, CHAINS, type ChainConfig } from '@/context/WalletContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, Zap, ArrowDownLeft, ArrowUpRight, RefreshCw, BookOpen, ChevronRight } from 'lucide-react';
import { Link } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { MarketPrices } from '@/components/market-prices';
import walletHero from '@assets/generated_images/wallet-hero.jpg';

const CHAIN_ICONS: Record<string, string> = {
  ethereum: 'ETH',
  bnb: 'BNB',
  tron: 'TRX',
  tezos: 'XTZ',
};

export default function Home() {
  const { connectWallet, isConnecting } = useWallet();
  const { user, signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [selectedChain, setSelectedChain] = useState<ChainConfig | null>(null);
  const [hoveredChain, setHoveredChain] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [identity, setIdentity] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');

  const handleConnect = async () => {
    if (!selectedChain) return;
    await connectWallet(selectedChain);
  };

  const handleAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError('');
    setAuthBusy(true);
    try {
      if (authMode === 'signup') {
        if (!email.trim() && !phone.trim()) {
          throw new Error('Add an email address or phone number.');
        }
        await signUp({
          username,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          password,
        });
        toast({ title: 'Account created', description: 'Your account is ready. Now connect a test wallet.' });
      } else {
        await signIn(identity, password);
        toast({ title: 'Signed in', description: 'Now connect a test wallet to open your dashboard.' });
      }
      setPassword('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not sign in. Please try again.';
      setAuthError(message);
      toast({ variant: 'destructive', title: authMode === 'signup' ? 'Signup failed' : 'Sign-in failed', description: message });
    } finally {
      setAuthBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden -mt-8 -mx-4 md:-mx-8">
      {/* Animated crypto background */}
      <div className="absolute inset-0 bg-[#050a14]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(5,10,20,.46) 0%, rgba(5,10,20,.74) 35%, #050a14 100%), url(${walletHero})`,
            backgroundPosition: 'center 22%',
          }}
        />
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

        <MarketPrices />

        <div className="max-w-2xl mx-auto mb-10">
          {!user ? (
            <div className="rounded-2xl border border-slate-700/70 bg-slate-900/85 p-5 md:p-7 shadow-xl">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-white font-bold text-lg">
                    {authMode === 'signup' ? 'Create your account' : 'Sign in to continue'}
                  </h2>
                  <p className="text-slate-400 text-sm mt-1">
                    Sign in to your app account, then connect a browser wallet on a supported test network.
                  </p>
                </div>
                <Shield className="h-5 w-5 text-blue-400 shrink-0 mt-1" />
              </div>

              <form onSubmit={handleAuth} className="space-y-3">
                {authMode === 'signup' ? (
                  <>
                    <label className="block space-y-1.5">
                      <span className="text-xs font-semibold text-slate-300">Username</span>
                      <Input
                        autoComplete="username"
                        minLength={3}
                        maxLength={32}
                        required
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        placeholder="Choose a username"
                        className="bg-slate-950 border-slate-700"
                      />
                    </label>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <label className="block space-y-1.5">
                        <span className="text-xs font-semibold text-slate-300">Email address (optional)</span>
                        <Input
                          type="email"
                          autoComplete="email"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          placeholder="you@example.com"
                          className="bg-slate-950 border-slate-700"
                        />
                      </label>
                      <label className="block space-y-1.5">
                        <span className="text-xs font-semibold text-slate-300">Phone number (optional)</span>
                        <Input
                          type="tel"
                          autoComplete="tel"
                          value={phone}
                          onChange={(event) => setPhone(event.target.value)}
                          placeholder="+14155552671"
                          className="bg-slate-950 border-slate-700"
                        />
                      </label>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Email and phone are optional. Any saved username, email, or phone can be used to sign in; contact details are not verified.
                    </p>
                  </>
                ) : (
                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-slate-300">Username, email, or phone</span>
                    <Input
                      autoComplete="username"
                      required
                      value={identity}
                      onChange={(event) => setIdentity(event.target.value)}
                      placeholder="Username, you@example.com, or +14155552671"
                      className="bg-slate-950 border-slate-700"
                    />
                  </label>
                )}
                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold text-slate-300">Password</span>
                  <Input
                    type="password"
                    autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
                    minLength={authMode === 'signup' ? 10 : 1}
                    maxLength={128}
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={authMode === 'signup' ? 'At least 10 characters' : 'Your password'}
                    className="bg-slate-950 border-slate-700"
                  />
                </label>
                {authError && <p role="alert" className="text-sm text-rose-400">{authError}</p>}
                <Button type="submit" disabled={authBusy} className="w-full h-11 font-bold">
                  {authBusy ? 'Please wait…' : authMode === 'signup' ? 'Create account' : 'Sign in'}
                </Button>
              </form>
              <button
                type="button"
                onClick={() => {
                  setAuthError('');
                  setPassword('');
                  setAuthMode(authMode === 'signup' ? 'signin' : 'signup');
                }}
                className="mt-4 text-sm text-blue-300 hover:text-blue-200"
              >
                {authMode === 'signup' ? 'Already have an account? Sign in' : 'New here? Create an account'}
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 px-5 py-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-emerald-400 font-bold">Account signed in</p>
                <p className="text-white font-semibold mt-1">@{user.username}</p>
              </div>
              <p className="text-slate-400 text-sm">Your app account is ready. Choose a test network and connect your browser wallet below.</p>
            </div>
          )}
        </div>

        {/* Chain selector */}
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-white font-bold text-lg mb-1">Select a Blockchain</h2>
            <p className="text-slate-500 text-sm">
              {user ? 'Choose a test network, then connect your wallet' : 'Sign in or create an account before connecting a wallet'}
            </p>
          </div>

          <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 ${!user ? 'opacity-50 pointer-events-none' : ''}`}>
            {CHAINS.map((chain) => {
              const isSelected = selectedChain?.id === chain.id;
              const isHovered = hoveredChain === chain.id;
              return (
                <button
                  key={chain.id}
                  onClick={() => setSelectedChain(chain)}
                  disabled={!user}
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
            {selectedChain && user ? (
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
