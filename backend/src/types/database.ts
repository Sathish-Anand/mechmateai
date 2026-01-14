// Database Types for Mechmate AI

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  age: number;
  passwordHash: string;
  planId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  diagnosisUsage: DiagnosisUsage;
}

export interface DiagnosisUsage {
  userId: string;
  dailyUsed: number;
  weeklyUsed: number;
  lastResetDate: Date;
  totalUsed: number;
}

export interface Plan {
  id: string;
  name: string;
  type: 'Basic' | 'Essential' | 'Performance' | 'Ultimate';
  price: number;
  billingCycle: 'ONE_TIME' | 'MONTHLY' | 'YEARLY';
  diagnosisLimitDaily: number;
  diagnosisLimitWeekly: number;
  features: string[];
  isActive: boolean;
}

export interface Vehicle {
  id: string;
  userId: string;
  make: string;
  model: string;
  year: number;
  variant?: string;
  registration: string;
  odometer: number;
  lastServiceDate?: Date;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Diagnosis {
  id: string;
  userId: string;
  vehicleId?: string;
  guestEmail?: string;
  make: string;
  model: string;
  year: number;
  variant?: string;
  registration?: string;
  odometer?: number;
  issueDescription: string;
  aiResponse: {
    diagnosis: string;
    confidence: number;
    suggestedFixes: string[];
    estimatedCost?: {
      min: number;
      max: number;
    };
    urgency: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  youtubeVideos: {
    title: string;
    url: string;
    thumbnail: string;
    channelName: string;
    relevanceScore: number;
  }[];
  productLinks: {
    name: string;
    url: string;
    price?: number;
    vendor: string;
    affiliateId?: string;
  }[];
  images?: string[];
  videos?: string[];
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  isGuest: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LogbookEntry {
  id: string;
  userId: string;
  vehicleId: string;
  date: Date;
  serviceType: 'MAINTENANCE' | 'REPAIR' | 'INSPECTION' | 'OTHER';
  workDone: string;
  cost?: number;
  vendor?: string;
  odometer?: number;
  receiptImages?: string[];
  warrantyInfo?: {
    startDate: Date;
    endDate: Date;
    coverageDetails: string;
    warrantyProvider: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  status: 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'INCOMPLETE';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
  updatedAt: Date;
}