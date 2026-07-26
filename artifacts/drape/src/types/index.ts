// ── Drape Global TypeScript Types ─────────────────────────────────────────

export type Role = "CLIENT" | "DESIGNER" | "PRODUCER" | "ADMIN";
export type StorefrontStatus = "DRAFT" | "ACTIVE" | "SUSPENDED";
export type MeasurementUnit = "CM" | "INCH";
export type EnquiryStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "CONVERTED";
export type OrderStatus = "PENDING" | "CONFIRMED" | "IN_PROGRESS" | "IN_REVIEW" | "COMPLETED" | "CANCELLED" | "REFUNDED";
export type NotificationType =
  | "ENQUIRY_RECEIVED" | "ENQUIRY_ACCEPTED" | "ENQUIRY_REJECTED"
  | "ORDER_CREATED" | "ORDER_UPDATED" | "ORDER_COMPLETED"
  | "MESSAGE_RECEIVED" | "REVIEW_RECEIVED" | "PAYMENT_RECEIVED" | "SYSTEM";
export type AssetType = "REFERENCE_IMAGE" | "MEASUREMENT_CHART" | "PRODUCTION_FILE" | "DELIVERY_PROOF" | "OTHER";

export interface User {
  id: string;
  name?: string | null;
  email: string;
  image?: string | null;
  role: Role;
}

export interface Profile {
  id: string;
  userId: string;
  bio?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
  location?: string | null;
  website?: string | null;
  instagram?: string | null;
}

export interface Storefront {
  id: string;
  userId: string;
  slug: string;
  name: string;
  tagline?: string | null;
  description?: string | null;
  coverImageUrl?: string | null;
  logoUrl?: string | null;
  status: StorefrontStatus;
  avgRating: number;
  reviewCount: number;
  specialties: string[];
  turnaroundDays?: number | null;
  minBudget?: number | null;
  maxBudget?: number | null;
  currency: string;
}

export interface Measurement {
  id: string;
  userId: string;
  label: string;
  unit: MeasurementUnit;
  isDefault: boolean;
  height?: number | null;
  weight?: number | null;
  chest?: number | null;
  waist?: number | null;
  hips?: number | null;
}

export interface Enquiry {
  id: string;
  clientId: string;
  storefrontId: string;
  title: string;
  description: string;
  budgetMin?: number | null;
  budgetMax?: number | null;
  currency: string;
  status: EnquiryStatus;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  clientId: string;
  producerId: string;
  storefrontId: string;
  title: string;
  totalAmount: number;
  currency: string;
  status: OrderStatus;
  createdAt: string;
}

/** API response envelope */
export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

/** Paginated list response */
export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};