export type Condition = "Neuf" | "Très bon état" | "Bon état" | "Satisfaisant";
export type ProductStatus = "available" | "pending" | "sold" | "reserved";

export interface Transaction {
  id: string;
  productId: string;
  productTitle: string;
  buyerId: string;
  sellerId: string;
  participantIds: string[];
  price: number;
  status: 'pending' | 'code_generated' | 'completed' | 'cancelled';
  verificationCode?: string;
  createdAt: any;
  updatedAt: any;
  buyerRated?: boolean;
  sellerRated?: boolean;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phoneNumber?: string;
  phoneVisibility?: 'public' | 'private';
  neighborhood?: string;
  city?: string;
  photoURL?: string;
  coverURL?: string;
  bio?: string;
  location?: string;
  createdAt: any;
  rating?: number;
  reviewCount?: number;
  isVerified?: boolean;
  isCertified?: boolean;
  notificationsEnabled?: boolean;
  badges?: string[];
}

export interface Review {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId?: string; // If reviewing a seller
  toProductId?: string; // If reviewing a product
  rating: number;
  comment: string;
  createdAt: any;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  condition: Condition;
  category: string;
  neighborhood?: string;
  images: string[];
  sellerId: string;
  sellerName: string;
  phoneNumber?: string;
  phoneVisibility?: 'public' | 'private';
  listingType: 'sale' | 'troc' | 'mixed';
  exchangeWanted?: string;
  canTravel?: boolean;
  meetingPoint?: string;
  availability?: string;
  status: ProductStatus;
  is_available?: boolean;
  createdAt: any;
  updatedAt: any;
  likesCount?: number;
  isTemporary?: boolean;
}

export interface Conversation {
  id: string;
  participantIds: string[];
  participantNames: string[];
  productId: string;
  productTitle: string;
  productImage?: string;
  productPrice?: number;
  sellerId?: string;
  lastMessage: string;
  lastSenderId?: string;
  updatedAt: any;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  createdAt: any;
  isSystem?: boolean;
  isProductMention?: boolean;
  isExchangeProposal?: boolean;
  productId?: string;
  exchangeProductId?: string;
  audioUrl?: string;
  replyTo?: {
    id: string;
    text: string;
    senderId: string;
  };
  reactions?: { [emoji: string]: string[] };
  image?: string;
}
