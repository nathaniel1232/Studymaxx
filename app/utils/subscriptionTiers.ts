/**
 * Subscription Tier System
 * Centralized tier management and feature checks
 */

export type TierName = 'free' | 'student' | 'pro' | 'team';
export type BillingInterval = 'monthly' | 'yearly';

export interface TierFeatures {
  pdf: boolean;
  youtube: boolean;
  ocr_images: number; // 0 = none, -1 = unlimited, N = max images
  export: boolean;
  analytics: boolean;
  srs: boolean; // Spaced Repetition System
  collaboration: boolean;
  priority_support: boolean;
  team_seats?: number;
  admin_dashboard?: boolean;
}

export interface SubscriptionTier {
  tier_name: TierName;
  display_name: string;
  monthly_price_cents: number;
  yearly_price_cents: number;
  max_daily_sets: number; // -1 = unlimited
  max_cards_per_set: number;
  max_folders: number; // -1 = unlimited
  features: TierFeatures;
  stripe_monthly_price_id?: string;
  stripe_yearly_price_id?: string;
}

// Tier definitions (matches database)
export const TIERS: Record<TierName, SubscriptionTier> = {
  free: {
    tier_name: 'free',
    display_name: 'Free',
    monthly_price_cents: 0,
    yearly_price_cents: 0,
    max_daily_sets: 3,
    max_cards_per_set: 10,
    max_folders: 5,
    features: {
      pdf: false,
      youtube: false,
      ocr_images: 0,
      export: false,
      analytics: false,
      srs: false,
      collaboration: false,
      priority_support: false,
    },
  },
  student: {
    tier_name: 'student',
    display_name: 'Student',
    monthly_price_cents: 499, // $4.99
    yearly_price_cents: 4900, // $49 (save $10)
    max_daily_sets: 20,
    max_cards_per_set: 25,
    max_folders: 10,
    features: {
      pdf: true,
      youtube: false,
      ocr_images: 3,
      export: true,
      analytics: true,
      srs: false,
      collaboration: false,
      priority_support: false,
    },
  },
  pro: {
    tier_name: 'pro',
    display_name: 'Pro',
    monthly_price_cents: 999, // $9.99
    yearly_price_cents: 9900, // $99 (save $20)
    max_daily_sets: -1, // unlimited
    max_cards_per_set: 50,
    max_folders: -1, // unlimited
    features: {
      pdf: true,
      youtube: true,
      ocr_images: -1, // unlimited
      export: true,
      analytics: true,
      srs: true,
      collaboration: true,
      priority_support: true,
    },
  },
  team: {
    tier_name: 'team',
    display_name: 'Team',
    monthly_price_cents: 2999, // $29.99
    yearly_price_cents: 29900, // $299 (save $60)
    max_daily_sets: -1, // unlimited
    max_cards_per_set: 100,
    max_folders: -1, // unlimited
    features: {
      pdf: true,
      youtube: true,
      ocr_images: -1,
      export: true,
      analytics: true,
      srs: true,
      collaboration: true,
      priority_support: true,
      team_seats: 5,
      admin_dashboard: true,
    },
  },
};

/**
 * Check if user can use a specific feature
 */
export function canUseFeature(
  tierName: TierName,
  feature: keyof TierFeatures
): boolean {
  const tier = TIERS[tierName];
  const featureValue = tier.features[feature];
  
  // Boolean features
  if (typeof featureValue === 'boolean') {
    return featureValue;
  }
  
  // Numeric features (like ocr_images)
  if (typeof featureValue === 'number') {
    return featureValue !== 0;
  }
  
  return false;
}

/**
 * Get feature limit for numeric features
 */
export function getFeatureLimit(
  tierName: TierName,
  feature: keyof TierFeatures
): number {
  const tier = TIERS[tierName];
  const featureValue = tier.features[feature];
  
  if (typeof featureValue === 'number') {
    return featureValue; // -1 = unlimited, 0 = none, N = limit
  }
  
  return 0;
}

/**
 * Check if user has reached daily set limit
 */
export function canCreateSet(
  tierName: TierName,
  dailySetsCreated: number
): { allowed: boolean; reason?: string } {
  const tier = TIERS[tierName];
  
  if (tier.max_daily_sets === -1) {
    return { allowed: true }; // unlimited
  }
  
  if (dailySetsCreated >= tier.max_daily_sets) {
    return {
      allowed: false,
      reason: `Daily limit reached (${tier.max_daily_sets} sets/day). Upgrade for more!`,
    };
  }
  
  return { allowed: true };
}

/**
 * Format price for display
 */
export function formatPrice(cents: number, currency: string = 'USD'): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  });
  
  return formatter.format(cents / 100);
}

/**
 * Calculate savings for yearly plan
 */
export function getYearlySavings(tierName: TierName): number {
  const tier = TIERS[tierName];
  const monthlyTotal = tier.monthly_price_cents * 12;
  const yearlySavings = monthlyTotal - tier.yearly_price_cents;
  return yearlySavings;
}

/**
 * Get tier comparison for upgrade prompts
 */
export function getTierComparison(
  currentTier: TierName,
  targetTier: TierName
): string[] {
  const current = TIERS[currentTier];
  const target = TIERS[targetTier];
  const differences: string[] = [];
  
  // Check each feature
  if (!current.features.pdf && target.features.pdf) {
    differences.push('✅ PDF uploads');
  }
  if (!current.features.youtube && target.features.youtube) {
    differences.push('✅ YouTube transcripts');
  }
  if (current.features.ocr_images < target.features.ocr_images) {
    differences.push(target.features.ocr_images === -1 
      ? '✅ Unlimited image OCR' 
      : `✅ Up to ${target.features.ocr_images} images`);
  }
  if (current.max_daily_sets < target.max_daily_sets) {
    differences.push(target.max_daily_sets === -1 
      ? '✅ Unlimited sets per day' 
      : `✅ ${target.max_daily_sets} sets per day`);
  }
  if (current.max_cards_per_set < target.max_cards_per_set) {
    differences.push(`✅ Up to ${target.max_cards_per_set} cards per set`);
  }
  if (!current.features.srs && target.features.srs) {
    differences.push('✅ Spaced repetition algorithm');
  }
  if (!current.features.analytics && target.features.analytics) {
    differences.push('✅ Advanced analytics');
  }
  
  return differences;
}

/**
 * Check if tier upgrade is needed for action
 */
export function suggestTierForFeature(
  feature: keyof TierFeatures
): TierName | null {
  // Find cheapest tier with this feature
  const tierOptions: TierName[] = ['student', 'pro', 'team'];
  
  for (const tierName of tierOptions) {
    if (canUseFeature(tierName, feature)) {
      return tierName;
    }
  }
  
  return null;
}
