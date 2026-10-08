export interface Address {
  id: string;
  label: string | null;
  recipientName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  phone: string | null;
  isActive: boolean;
  isVerified: boolean;
  twoFactorEnabled: boolean;
  walletAddress: string | null;
  locale: "es" | "en";
  roles: string[];
  addresses: Address[];
  createdAt: string;
}

export type LoyaltyTier = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";

export interface LoyaltyAccount {
  id: string;
  userId: string;
  pointsBalance: number;
  lifetimePoints: number;
  tier: LoyaltyTier;
  nextTier: { tier: LoyaltyTier; pointsNeeded: number } | null;
  expiringSoon: number;
  recentTransactions: Array<{
    id: string;
    operation: "ADD" | "SUBTRACT";
    points: number;
    reason: string;
    orderId: string | null;
    expiresAt: string | null;
    createdAt: string;
  }>;
}

export interface NftBadge {
  id: string;
  tier: LoyaltyTier;
  name: string;
  imageUrl: string;
  metadataUri: string | null;
  metadataUrl: string | null;
  contractAddress: string | null;
  tokenId: string | null;
  txHash: string | null;
  status: "PENDING" | "MINTED" | "FAILED";
  mintedAt: string | null;
}
