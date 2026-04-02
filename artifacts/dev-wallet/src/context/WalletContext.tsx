import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useRegisterWallet } from '@workspace/api-client-react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';

export type Network = 'tezos' | 'ethereum' | 'tron' | 'bnb';
export type WalletType = 'temple' | 'beacon' | 'metamask' | 'tronlink';

export interface ChainConfig {
  id: Network;
  name: string;
  symbol: string;
  testnet: string;
  color: string;
  token: string;
  walletProvider: 'metamask' | 'temple' | 'tronlink';
}

export const CHAINS: ChainConfig[] = [
  {
    id: 'ethereum',
    name: 'Ethereum',
    symbol: 'ETH',
    testnet: 'Sepolia Testnet',
    color: '#627EEA',
    token: 'USDT-SIM',
    walletProvider: 'metamask',
  },
  {
    id: 'bnb',
    name: 'BNB Chain',
    symbol: 'BNB',
    testnet: 'BNB Testnet',
    color: '#F0B90B',
    token: 'USDT-SIM',
    walletProvider: 'metamask',
  },
  {
    id: 'tron',
    name: 'Tron',
    symbol: 'TRX',
    testnet: 'Nile Testnet',
    color: '#EF0027',
    token: 'USDT-SIM',
    walletProvider: 'tronlink',
  },
  {
    id: 'tezos',
    name: 'Tezos',
    symbol: 'XTZ',
    testnet: 'Ghostnet',
    color: '#2C7DF7',
    token: 'USDtz-SIM',
    walletProvider: 'temple',
  },
];

interface WalletState {
  address: string | null;
  network: Network | null;
  walletType: WalletType | null;
  isConnecting: boolean;
  selectedChain: ChainConfig | null;
  setSelectedChain: (chain: ChainConfig) => void;
  connectWallet: (chain: ChainConfig) => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletState | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) throw new Error('useWallet must be used within WalletProvider');
  return context;
};

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
    };
    tronLink?: {
      request: (args: { method: string }) => Promise<{ code: number }>;
    };
    tronWeb?: {
      defaultAddress: { base58: string };
    };
  }
}

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [network, setNetwork] = useState<Network | null>(null);
  const [walletType, setWalletType] = useState<WalletType | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedChain, setSelectedChain] = useState<ChainConfig | null>(null);

  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const registerWallet = useRegisterWallet();

  const handleConnect = async (addr: string, net: Network, type: WalletType) => {
    setAddress(addr);
    setNetwork(net);
    setWalletType(type);

    try {
      await registerWallet.mutateAsync({
        data: {
          walletAddress: addr,
          network: net as 'tezos' | 'ethereum',
          walletType: type as 'temple' | 'beacon' | 'metamask',
        },
      });
      setLocation('/dashboard');
      toast({
        title: 'Wallet connected',
        description: `Connected to ${net} network successfully.`,
      });
    } catch (error) {
      console.error('Failed to register wallet', error);
    }
  };

  const connectMetaMask = async (chain: ChainConfig) => {
    if (typeof window === 'undefined' || !window.ethereum) {
      toast({
        variant: 'destructive',
        title: 'Wallet not found',
        description: `Please install MetaMask to connect to ${chain.name}.`,
      });
      return;
    }
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as string[];
    if (accounts && accounts.length > 0) {
      await handleConnect(accounts[0], chain.id, 'metamask');
    }
  };

  const connectTronLink = async (chain: ChainConfig) => {
    if (typeof window !== 'undefined' && window.tronLink) {
      try {
        const result = await window.tronLink.request({ method: 'tron_requestAccounts' });
        if (result.code === 200 && window.tronWeb?.defaultAddress?.base58) {
          await handleConnect(window.tronWeb.defaultAddress.base58, chain.id, 'tronlink');
          return;
        }
      } catch {
        // fall through to mock
      }
    }
    // Mock Tron address for testnet
    await new Promise<void>((r) => setTimeout(r, 1000));
    await handleConnect('TJYmBQGr7sCXFiB5MXqf3qzqhB5B3yJWqh', chain.id, 'tronlink');
  };

  const connectTemple = async (chain: ChainConfig) => {
    const isTempleAvailable =
      typeof window !== 'undefined' &&
      typeof (window as Record<string, unknown>).temple !== 'undefined';

    if (isTempleAvailable) {
      const templeWallet = (window as Record<string, { connect?: (n: string) => Promise<void>; pkh?: () => Promise<string> }>).temple;
      if (templeWallet.connect) await templeWallet.connect('ghostnet');
      const addr = templeWallet.pkh ? await templeWallet.pkh() : null;
      if (addr) {
        await handleConnect(addr, chain.id, 'temple');
        return;
      }
    }
    await new Promise<void>((r) => setTimeout(r, 1200));
    await handleConnect('tz1VSUr8GL1ScaXhBvT2M8tT5r61H4hTbxuJ', chain.id, 'temple');
  };

  const connectWallet = async (chain: ChainConfig) => {
    setIsConnecting(true);
    setSelectedChain(chain);
    try {
      if (chain.walletProvider === 'temple') {
        await connectTemple(chain);
      } else if (chain.walletProvider === 'tronlink') {
        await connectTronLink(chain);
      } else {
        await connectMetaMask(chain);
      }
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Connection failed',
        description: `Could not connect to ${chain.name}. Please try again.`,
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setAddress(null);
    setNetwork(null);
    setWalletType(null);
    setSelectedChain(null);
    setLocation('/');
  };

  return (
    <WalletContext.Provider
      value={{
        address,
        network,
        walletType,
        isConnecting,
        selectedChain,
        setSelectedChain,
        connectWallet,
        disconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};
