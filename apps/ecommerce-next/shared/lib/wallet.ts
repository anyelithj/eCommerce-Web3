// wallet.ts => firma de desafíos Sign-In With Ethereum (SIWE) con la wallet del navegador (MetaMask, Rabby,
// Coinbase Wallet...) usando el estándar EIP-1193 (window.ethereum). Sin librerías: la verificación
// criptográfica la hace el backend con ethers.js; aquí solo se pide la cuenta y la firma (Adapter del proveedor).
import { apiRequest } from "./api-client";

// Eip1193Provider => contrato mínimo del proveedor inyectado por las wallets (tipado seguro, sin "any")
interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

// "declare global" => amplía el tipo Window con la propiedad que inyectan las extensiones de wallet
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
  public readonly code = "WALLET_UNAVAILABLE"; // Clave de traducción (messages/*.json -> errors.WALLET_UNAVAILABLE)

  constructor() {
    super(
      "No encontramos una wallet en este navegador. Instala MetaMask u otra wallet compatible."
    );
    this.name = "WalletUnavailableError";
  }
}

// toHex => personal_sign espera los bytes UTF-8 del mensaje en hexadecimal (formato que todas las wallets aceptan)
const toHex = (text: string) =>
  `0x${Array.from(new TextEncoder().encode(text), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;

// signWalletChallenge => 1) pedir la cuenta  2) pedir nonce al backend  3) firmar el mensaje (EIP-191)
export async function signWalletChallenge(): Promise<SignedWalletChallenge> {
  const ethereum = typeof window === "undefined" ? undefined : window.ethereum;
  if (!ethereum) throw new WalletUnavailableError();

  // "eth_requestAccounts" => abre la wallet para que el usuario autorice compartir su dirección
  const [walletAddress] = (await ethereum.request({ method: "eth_requestAccounts" })) as string[];
  if (!walletAddress) throw new WalletUnavailableError();

  const { data } = await apiRequest<{ message: string }>("/auth/web3/nonce", {
    method: "POST",
    body: { walletAddress },
  });
  // La wallet muestra el mensaje legible (con el nonce de un solo uso) y devuelve la firma ECDSA
  const signature = (await ethereum.request({
    method: "personal_sign",
    params: [toHex(data.message), walletAddress],
  })) as string;
  return { walletAddress, message: data.message, signature };
}
