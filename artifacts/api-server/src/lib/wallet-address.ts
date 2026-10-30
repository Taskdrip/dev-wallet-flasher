export function isValidWalletAddress(address: string, network: string): boolean {
  switch (network) {
    case "ethereum":
    case "bnb":
      return /^0x[a-fA-F0-9]{40}$/.test(address);
    case "tron":
      return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address);
    case "tezos":
      return /^(?:tz[1-4]|KT1)[1-9A-HJ-NP-Za-km-z]{33}$/.test(address);
    default:
      return false;
  }
}

export function walletTypeForNetwork(network: string): string {
  switch (network) {
    case "tron":
      return "tronlink";
    case "tezos":
      return "temple";
    default:
      return "metamask";
  }
}
