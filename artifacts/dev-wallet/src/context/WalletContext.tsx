import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { isAvailable as isTempleAvailable, requestPermission as requestTemplePermission } from '@temple-wallet/dapp';
import { useRegisterWallet } from '@workspace/api-client-react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

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
      removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
    };
    tronLink?: {
      request: (args: { method: string }) => Promise<{ code: number }>;
    };
    tronWeb?: {
      defaultAddress: { base58: string };
      fullNode?: { host?: string };
    };
  }
}

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const { user, isLoading: authLoading } = useAuth();
  const [address, setAddress] = useState<string | null>(null);
  const [network, setNetwork] = useState<Network | null>(null);
  const [walletType, setWalletType] = useState<WalletType | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedChain, setSelectedChain] = useState<ChainConfig | null>(null);
  const [restoreReady, setRestoreReady] = useState(false);

  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const registerWallet = useRegisterWallet();

  useEffect(() => {
    if (authLoading) return;
    setRestoreReady(false);
    setAddress(null);
    setNetwork(null);
    setWalletType(null);
    setSelectedChain(null);

    if (!user) {
      setRestoreReady(true);
      return;
    }

    try {
      const key = `dev-wallet-connection:${user.id}`;
      const saved = sessionStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved) as { address?: unknown; network?: unknown; walletType?: unknown };
        const chain = CHAINS.find((item) => item.id === parsed.network);
        const supportedTypes: WalletType[] = ['temple', 'beacon', 'metamask', 'tronlink'];
        if (typeof parsed.address === 'string' && chain && supportedTypes.includes(parsed.walletType as WalletType)) {
          setAddress(parsed.address);
          setNetwork(chain.id);
          setWalletType(parsed.walletType as WalletType);
          setSelectedChain(chain);
        } else {
          sessionStorage.removeItem(key);
        }
      }
    } catch {
      sessionStorage.removeItem(`dev-wallet-connection:${user.id}`);
    }
    setRestoreReady(true);
  }, [authLoading, user?.id]);

  useEffect(() => {
    if (authLoading || !restoreReady || !user) return;
    const key = `dev-wallet-connection:${user.id}`;
    if (address && network && walletType) {
      sessionStorage.setItem(key, JSON.stringify({ address, network, walletType }));
    } else {
      sessionStorage.removeItem(key);
    }
  }, [address, network, walletType, authLoading, restoreReady, user?.id]);

  const handleConnect = async (addr: string, net: Network, type: WalletType) => {
    if (!user) throw new Error('Sign in to your account before connecting a wallet.');
    const normalizedAddress = net === 'ethereum' || net === 'bnb' ? addr.toLowerCase() : addr;
    await registerWallet.mutateAsync({
      data: {
        walletAddress: normalizedAddress,
        network: net,
        walletType: type,
      },
    });
    setAddress(normalizedAddress);
    setNetwork(net);
    setWalletType(type);
    setLocation('/dashboard');
    toast({
      title: 'Wallet connected',
      description: `Connected to ${net} test network successfully.`,
    });
  };

  const connectMetaMask = async (chain: ChainConfig) => {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error(`Install MetaMask to connect to ${chain.name}.`);
    }
    const networkConfig = chain.id === 'ethereum'
      ? {
          chainId: '0xaa36a7',
          chainName: 'Sepolia',
          nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
          rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com'],
          blockExplorerUrls: ['https://sepolia.etherscan.io'],
        }
      : {
          chainId: '0x61',
          chainName: 'BNB Smart Chain Testnet',
          nativeCurrency: { name: 'Test BNB', symbol: 'tBNB', decimals: 18 },
          rpcUrls: ['https://bsc-testnet-dataseed.bnbchain.org'],
          blockExplorerUrls: ['https://testnet.bscscan.com'],
        };
    const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
    if (typeof currentChainId !== 'string' || currentChainId.toLowerCase() !== networkConfig.chainId) {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: networkConfig.chainId }],
        });
      } catch (switchError) {
        const errorCode = switchError && typeof switchError === 'object' && 'code' in switchError
          ? switchError.code
          : undefined;
        if (errorCode !== 4902) throw new Error(`Switch MetaMask to ${chain.testnet} to continue.`);
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [networkConfig],
        });
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: networkConfig.chainId }],
        });
      }
    }
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    if (!Array.isArray(accounts) || typeof accounts[0] !== 'string' || !accounts[0]) {
      throw new Error('MetaMask did not return an account. Unlock it and try again.');
    }
    await handleConnect(accounts[0], chain.id, 'metamask');
  };

  const connectTronLink = async (chain: ChainConfig) => {
    if (typeof window === 'undefined' || !window.tronLink) {
      throw new Error('Install the TronLink wallet extension to connect to Tron Nile.');
    }
    const result = await window.tronLink.request({ method: 'tron_requestAccounts' });
    const address = window.tronWeb?.defaultAddress?.base58;
    if (result.code !== 200 || !address) {
      throw new Error('TronLink did not return an account. Unlock it and try again.');
    }
    if (!/nile/i.test(window.tronWeb?.fullNode?.host ?? '')) {
      throw new Error('Switch TronLink to the Nile test network, then try again.');
    }
    await handleConnect(address, chain.id, 'tronlink');
  };

  const connectTemple = async (chain: ChainConfig) => {
    if (!(await isTempleAvailable())) {
      throw new Error('Install the Temple Wallet extension to connect to Tezos Ghostnet.');
    }
    const permission = await requestTemplePermission(
      'ghostnet',
      { name: 'Dev Wallet Connector' },
    );
    await handleConnect(permission.pkh, chain.id, 'temple');
  };

  const connectWallet = async (chain: ChainConfig) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Sign in first', description: 'Create an account or sign in before connecting a test wallet.' });
      return;
    }
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
        description: error instanceof Error
          ? error.message
          : `Could not connect to ${chain.name}. Please try again.`,
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    if (user) sessionStorage.removeItem(`dev-wallet-connection:${user.id}`);
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
