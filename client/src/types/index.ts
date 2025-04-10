// Type definitions for the application

// Proposal type matching the schema
export interface Proposal {
  id: number;
  createdAt: string | null;
  userId: number;
  grantId: number | null;
  status: string | null;
  title: string;
  content: string;
  feedback: string | null;
  metadata: string | null;
  updatedAt: string | null;
}

// Grant type matching the schema
export interface Grant {
  id: number;
  title: string;
  description?: string;
  category?: string;
  status?: string;
  url?: string;
  amount?: number;
  deadline?: string;
  issuer?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  isWebGrant?: boolean;
  source?: string;
  saved?: boolean;
  website?: string; // Some grants use website instead of url
}

// Report type
export interface Report {
  id: number;
  userId: number;
  proposalId: number;
  title: string;
  content: string;
  status: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

// Activity type
export interface Activity {
  id: number;
  userId: number;
  type: string;
  description: string;
  entityId?: number;
  entityType?: string;
  createdAt: string | null;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
}

// Mutation result types
export interface DeleteResult {
  id: number;
  success: boolean;
  data: any;
  timestamp?: string;
}

export interface ProposalsBulkDeleteResult {
  results: DeleteResult[];
  originalData?: ApiResponse<Proposal[]>;
  ids: number[];
  timestamp: string;
}

export interface DeletionContext {
  originalData?: ApiResponse<Proposal[]>;
  ids: number[];
  timestamp: string;
}

export interface RefetchResult {
  success: boolean;
  data?: ApiResponse<Proposal[]>;
  error?: Error;
  timestamp: string;
  delayMs?: number;
}

// Extended types for improved logging
export interface RefetchState {
  initiated: boolean;
  attempts: RefetchResult[];
  lastSuccess?: RefetchResult;
  lastError?: RefetchResult;
}

export interface CacheUpdateLog {
  action: 'set' | 'reset' | 'update' | 'delete';
  source: string;
  success: boolean;
  itemIds?: number[];
  dataLength?: number;
  timestamp: string;
}

// Navigation item type
export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}