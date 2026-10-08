import { apiRequest } from "./api-client";

interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

export interface SignedWalletChallenge {
  walletAddress: string;
  message: string;
  signature: string;
}

export class WalletUnavailableError extends Error {
  public readonly code = "WALLET_UNAVAILABLE";

  constructor() {
    super(
      "No encontramos una wallet en este navegador. Instala MetaMask u otra wallet compatible."
    );
    this.name = "WalletUnavailableError";
  }
}

const toHex = (text: string) =>
  `0x${Array.from(new TextEncoder().encode(text), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;

export async function signWalletChallenge(): Promise<SignedWalletChallenge> {
  const ethereum = typeof window === "undefined" ? undefined : window.ethereum;
  if (!ethereum) throw new WalletUnavailableError();

  const [walletAddress] = (await ethereum.request({ method: "eth_requestAccounts" })) as string[];
  if (!walletAddress) throw new WalletUnavailableError();

  const { data } = await apiRequest<{ message: string }>("/auth/web3/nonce", {
    method: "POST",
    body: { walletAddress },
  });
  const signature = (await ethereum.request({
    method: "personal_sign",
    params: [toHex(data.message), walletAddress],
  })) as string;
  return { walletAddress, message: data.message, signature };
}
