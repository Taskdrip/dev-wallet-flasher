import React, { useState } from 'react';
import { Link } from 'wouter';
import { ChevronDown, ChevronRight, Shield, Wallet, Zap, RefreshCw, ArrowUpRight, ArrowDownLeft, BookOpen } from 'lucide-react';

interface Step {
  number: number;
  title: string;
  description: string;
  details: string[];
  icon: React.ReactNode;
  color: string;
}

const STEPS: Step[] = [
  {
    number: 1,
    title: 'Choose Your Blockchain',
    description: 'Select the network you want to develop and test on.',
    details: [
      'Ethereum (Sepolia Testnet) — best for ERC-20 and smart contract testing. Use MetaMask.',
      'BNB Chain Testnet — for BEP-20 tokens and BSC-based dApps. Use MetaMask.',
      'Tron Nile Testnet — for TRC-20 USDT and Tron ecosystem apps. Use TronLink.',
      'Tezos Ghostnet — for FA2 tokens and Tezos smart contracts. Use Temple Wallet.',
      'Note: All transactions use SIMULATED tokens — no real funds are ever involved.',
    ],
    icon: <Wallet className="h-5 w-5" />,
    color: '#2563eb',
  },
  {
    number: 2,
    title: 'Install Your Wallet Extension',
    description: 'Install the appropriate browser extension for your chosen network.',
    details: [
      'MetaMask (Ethereum / BNB): Visit metamask.io and install the browser extension. Create or import an account.',
      'TronLink (Tron): Visit tronlink.org and install the extension. Switch to "Nile Testnet" in settings.',
      'Temple Wallet (Tezos): Visit templewallet.com and install. Switch to "Ghostnet" network.',
      'IMPORTANT: Never share your seed phrase. This platform never asks for it.',
      'Once installed, reload this page and the extension icon will appear in your browser toolbar.',
    ],
    icon: <Shield className="h-5 w-5" />,
    color: '#10b981',
  },
  {
    number: 3,
    title: 'Connect Your Wallet',
    description: 'Click your blockchain on the home page and authorize the connection.',
    details: [
      'Return to the Home page and click your chosen blockchain card.',
      'Click the "Connect" button — your wallet extension will open a popup.',
      'Review the connection request and click "Connect" or "Approve" in your wallet.',
      'Your wallet address will appear in the top navigation bar once connected.',
      'You will be redirected to your Dashboard automatically.',
    ],
    icon: <ChevronRight className="h-5 w-5" />,
    color: '#8b5cf6',
  },
  {
    number: 4,
    title: 'Claim Test Tokens from Faucet',
    description: 'Get your first simulated tokens from the faucet — free, with daily limits.',
    details: [
      'Go to the "Receive" (Faucet) page from your dashboard.',
      'Select the token type: USDtz-SIM (Tezos) or USDT-SIM (Ethereum/BNB/Tron).',
      'Click "Claim Tokens" — you will receive up to 100 tokens per claim.',
      'Daily limit: 1,000 tokens per wallet per day. Resets at midnight UTC.',
      'Tokens appear in your wallet balance immediately.',
    ],
    icon: <ArrowDownLeft className="h-5 w-5" />,
    color: '#f59e0b',
  },
  {
    number: 5,
    title: 'Top Up Your Balance',
    description: 'Need a large balance for testing? Top up directly from your dashboard.',
    details: [
      'On the Dashboard, click "Top Up Balance".',
      'Choose a preset amount ($1,000 → $200,000,000) or enter a custom amount.',
      'Click "Add Funds" — tokens are added instantly to your simulated balance.',
      'Maximum top-up per request: $200,000,000 (200 million tokens).',
      'Use this to simulate high-value transactions or stress-test your dApp.',
    ],
    icon: <ArrowUpRight className="h-5 w-5" />,
    color: '#ec4899',
  },
  {
    number: 6,
    title: 'Enable Auto-Accumulate',
    description: 'Toggle the smart contract simulation to automatically grow your balance.',
    details: [
      'On the Dashboard, find the "Auto ON/OFF" toggle button in the balance card.',
      'When enabled, a simulated smart contract continuously adds USDT to your wallet.',
      'The purple spinning icon indicates the contract is active.',
      'Use this to simulate yield-bearing accounts or staking reward contracts.',
      'Toggle off at any time to pause accumulation.',
    ],
    icon: <RefreshCw className="h-5 w-5" />,
    color: '#a855f7',
  },
  {
    number: 7,
    title: 'Send & Transfer Tokens',
    description: 'Transfer simulated tokens to other registered wallets.',
    details: [
      'Go to "Send" (Transfer) from your Dashboard.',
      'Enter the recipient wallet address — they must be registered on this platform.',
      'Select the token type and enter the amount.',
      'Click "Transfer" — the transaction records in both wallets\' history.',
      'View your full transaction history on the Transactions page.',
    ],
    icon: <ArrowUpRight className="h-5 w-5" />,
    color: '#06b6d4',
  },
  {
    number: 8,
    title: 'Flash Token Send (Developer Tool)',
    description: 'Instantly send test tokens to any address without balance requirements.',
    details: [
      'Access "Flash Token Send" from your Dashboard quick actions.',
      'Enter the target wallet address (must be registered on this platform).',
      'Select network, token type, and amount.',
      'Add an optional message to identify the test payment.',
      'Click "Flash Send" — tokens arrive at the recipient instantly.',
      'Use this for recipient-side integration testing (testing receive workflows).',
    ],
    icon: <Zap className="h-5 w-5" />,
    color: '#eab308',
  },
];

export default function Guide() {
  const [expanded, setExpanded] = useState<number | null>(1);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <BookOpen className="h-6 w-6 text-blue-400" />
        <div>
          <h1 className="text-2xl font-black text-foreground">Getting Started Guide</h1>
          <p className="text-muted-foreground text-sm">Step-by-step instructions for developers</p>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.number}>
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border cursor-pointer transition-all"
              style={expanded === s.number
                ? { backgroundColor: s.color + '30', borderColor: s.color, color: s.color }
                : { borderColor: 'rgba(255,255,255,0.1)', color: 'rgb(100,116,139)' }
              }
              onClick={() => setExpanded(expanded === s.number ? null : s.number)}
            >
              {s.number}
            </div>
            {i < STEPS.length - 1 && <div className="flex-1 h-px bg-slate-800" />}
          </React.Fragment>
        ))}
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {STEPS.map((step) => {
          const isOpen = expanded === step.number;
          return (
            <div
              key={step.number}
              className="border rounded-xl overflow-hidden transition-all"
              style={{ borderColor: isOpen ? step.color + '40' : 'rgba(255,255,255,0.06)' }}
            >
              <button
                className="w-full flex items-center gap-4 p-4 text-left hover:bg-slate-800/40 transition-colors"
                onClick={() => setExpanded(isOpen ? null : step.number)}
                data-testid={`guide-step-${step.number}`}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: step.color + '20', color: step.color }}
                >
                  {step.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground">STEP {step.number}</span>
                  </div>
                  <div className="font-bold text-foreground">{step.title}</div>
                  <div className="text-muted-foreground text-xs mt-0.5 truncate">{step.description}</div>
                </div>
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </button>

              {isOpen && (
                <div className="px-4 pb-4 ml-14">
                  <ul className="space-y-2.5">
                    {step.details.map((detail, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <div className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ backgroundColor: step.color }} />
                        <span className="text-sm text-muted-foreground leading-relaxed">{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* CTA */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6 text-center">
        <h3 className="font-bold text-white mb-2">Ready to start?</h3>
        <p className="text-slate-400 text-sm mb-4">Connect your wallet and begin testing in seconds</p>
        <Link href="/">
          <button className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-sm transition-colors">
            Go to Home
          </button>
        </Link>
      </div>
    </div>
  );
}
