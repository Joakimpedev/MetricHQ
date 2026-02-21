export interface PlanDef {
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  description: string;
  features: string[];
  popular?: boolean;
  monthlyPriceId?: string;
  yearlyPriceId?: string;
}

export const PLANS: PlanDef[] = [
  {
    name: 'Starter',
    monthlyPrice: 29,
    yearlyPrice: 22,
    description: 'For solo founders testing paid ads.',
    features: [
      '1 ad platform',
      'Stripe + RevenueCat revenue',
      'Country + campaign P&L',
      '6-month data retention',
    ],
    monthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTHLY,
    yearlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_YEARLY,
  },
  {
    name: 'Growth',
    monthlyPrice: 49,
    yearlyPrice: 37,
    popular: true,
    description: 'For scaling across multiple channels.',
    features: [
      'All ad platforms',
      'Stripe + RevenueCat revenue',
      'Country + campaign P&L',
      'Cohorts, Events & Custom Costs',
      '1-year data retention',
    ],
    monthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_GROWTH_MONTHLY,
    yearlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_GROWTH_YEARLY,
  },
  {
    name: 'Pro',
    monthlyPrice: 99,
    yearlyPrice: 75,
    description: 'For teams that need the full picture.',
    features: [
      'All ad platforms',
      'Stripe + RevenueCat revenue',
      'Country + campaign P&L',
      'Cohorts, Events & Custom Costs',
      'Unlimited data retention',
      'Team access',
      'API access',
    ],
    monthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY,
    yearlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY,
  },
];
