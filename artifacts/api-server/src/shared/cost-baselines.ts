// Cost baselines for maintenance tasks based on category and difficulty
// These are baseline costs for a moderate cost-of-living region
// Regional multipliers are applied to adjust for local pricing

export interface CostEstimate {
  proLow: number;       // Minimum professional cost
  proHigh?: number;     // Maximum professional cost (optional for fixed-cost tasks)
  materialsLow?: number; // Minimum materials cost for DIY
  materialsHigh?: number; // Maximum materials cost for DIY
  currency?: string;     // Default 'USD'
}

// Regional cost multipliers based on cost of living
export const REGIONAL_COST_MULTIPLIERS: { [region: string]: number } = {
  'Northeast': 1.15,      // Higher costs (NY, Boston, etc.)
  'Southeast': 0.90,      // Lower costs
  'Midwest': 0.85,        // Lower costs
  'Southwest': 0.95,      // Moderate costs
  'West': 1.20,           // Higher costs (CA, WA, etc.)
  'Pacific': 1.25,        // Highest costs (Hawaii, coastal areas)
  'Mountain': 0.95,       // Moderate costs
  'South': 0.90,          // Lower costs
};

// Difficulty multipliers
export const DIFFICULTY_MULTIPLIERS = {
  'easy': 1.0,
  'moderate': 1.4,
  'difficult': 2.0,
};

// Base cost estimates by task category
// Format: [proLow, proHigh, materialsLow, materialsHigh]
export const CATEGORY_BASE_COSTS: { [category: string]: CostEstimate } = {
  // HVAC & Heating
  'hvac': {
    proLow: 80,
    proHigh: 150,
    materialsLow: 15,
    materialsHigh: 30,
  },
  'heating': {
    proLow: 100,
    proHigh: 200,
    materialsLow: 20,
    materialsHigh: 40,
  },
  
  // Plumbing
  'plumbing': {
    proLow: 100,
    proHigh: 250,
    materialsLow: 10,
    materialsHigh: 50,
  },
  
  // Electrical
  'electrical': {
    proLow: 80,
    proHigh: 200,
    materialsLow: 5,
    materialsHigh: 25,
  },
  
  // Exterior
  'exterior': {
    proLow: 75,
    proHigh: 150,
    materialsLow: 20,
    materialsHigh: 60,
  },
  'roof': {
    proLow: 150,
    proHigh: 400,
    materialsLow: 30,
    materialsHigh: 100,
  },
  'gutters': {
    proLow: 60,
    proHigh: 120,
    materialsLow: 10,
    materialsHigh: 30,
  },
  'siding': {
    proLow: 100,
    proHigh: 300,
    materialsLow: 40,
    materialsHigh: 150,
  },
  
  // Interior
  'interior': {
    proLow: 60,
    proHigh: 120,
    materialsLow: 10,
    materialsHigh: 40,
  },
  'flooring': {
    proLow: 80,
    proHigh: 200,
    materialsLow: 30,
    materialsHigh: 100,
  },
  'walls': {
    proLow: 70,
    proHigh: 150,
    materialsLow: 15,
    materialsHigh: 50,
  },
  
  // Safety
  'safety': {
    proLow: 40,
    proHigh: 80,
    materialsLow: 5,
    materialsHigh: 20,
  },
  'fire_safety': {
    proLow: 50,
    proHigh: 100,
    materialsLow: 10,
    materialsHigh: 30,
  },
  
  // Appliances
  'appliances': {
    proLow: 70,
    proHigh: 150,
    materialsLow: 10,
    materialsHigh: 40,
  },
  'water_heater': {
    proLow: 100,
    proHigh: 250,
    materialsLow: 20,
    materialsHigh: 50,
  },
  
  // Lawn & Garden
  'lawn': {
    proLow: 50,
    proHigh: 100,
    materialsLow: 15,
    materialsHigh: 40,
  },
  'landscaping': {
    proLow: 80,
    proHigh: 200,
    materialsLow: 25,
    materialsHigh: 80,
  },
  
  // Windows & Doors
  'windows': {
    proLow: 60,
    proHigh: 120,
    materialsLow: 10,
    materialsHigh: 30,
  },
  'doors': {
    proLow: 70,
    proHigh: 150,
    materialsLow: 15,
    materialsHigh: 40,
  },
  
  // Foundation & Structure
  'foundation': {
    proLow: 120,
    proHigh: 300,
    materialsLow: 30,
    materialsHigh: 100,
  },
  'structure': {
    proLow: 100,
    proHigh: 250,
    materialsLow: 25,
    materialsHigh: 80,
  },
  
  // Insulation & Ventilation
  'insulation': {
    proLow: 80,
    proHigh: 200,
    materialsLow: 30,
    materialsHigh: 100,
  },
  'ventilation': {
    proLow: 60,
    proHigh: 150,
    materialsLow: 15,
    materialsHigh: 50,
  },
  
  // Water & Drainage
  'drainage': {
    proLow: 80,
    proHigh: 200,
    materialsLow: 20,
    materialsHigh: 60,
  },
  'water_systems': {
    proLow: 90,
    proHigh: 220,
    materialsLow: 25,
    materialsHigh: 70,
  },
  
  // Pest Control
  'pest_control': {
    proLow: 75,
    proHigh: 200,
    materialsLow: 10,
    materialsHigh: 40,
  },
  
  // Painting
  'painting': {
    proLow: 70,
    proHigh: 180,
    materialsLow: 25,
    materialsHigh: 80,
  },
  
  // Cleaning & Maintenance
  'cleaning': {
    proLow: 40,
    proHigh: 80,
    materialsLow: 5,
    materialsHigh: 20,
  },
  'general_maintenance': {
    proLow: 50,
    proHigh: 100,
    materialsLow: 10,
    materialsHigh: 30,
  },
  
  // Deck & Patio
  'deck': {
    proLow: 80,
    proHigh: 200,
    materialsLow: 30,
    materialsHigh: 100,
  },
  'patio': {
    proLow: 70,
    proHigh: 180,
    materialsLow: 25,
    materialsHigh: 80,
  },
  
  // Pool & Spa
  'pool': {
    proLow: 100,
    proHigh: 250,
    materialsLow: 30,
    materialsHigh: 80,
  },
  
  // Garage
  'garage': {
    proLow: 60,
    proHigh: 150,
    materialsLow: 15,
    materialsHigh: 50,
  },
  
  // Septic & Sewer
  'septic': {
    proLow: 150,
    proHigh: 400,
    materialsLow: 20,
    materialsHigh: 60,
  },
  
  // Default fallback
  'default': {
    proLow: 60,
    proHigh: 120,
    materialsLow: 10,
    materialsHigh: 30,
  },
};

/**
 * Get cost estimate for a task based on category, difficulty, and region
 */
export function getCostEstimate(
  category: string,
  difficulty: 'easy' | 'moderate' | 'difficult' = 'easy',
  region?: string
): CostEstimate {
  // Get base costs for category
  const normalizedCategory = category.toLowerCase().replace(/\s+/g, '_');
  const baseCost = CATEGORY_BASE_COSTS[normalizedCategory] || CATEGORY_BASE_COSTS['default'];
  
  // Apply difficulty multiplier
  const difficultyMultiplier = DIFFICULTY_MULTIPLIERS[difficulty];
  
  // Apply regional multiplier if region provided
  const regionalMultiplier = region ? (REGIONAL_COST_MULTIPLIERS[region] || 1.0) : 1.0;
  
  // Calculate final costs
  const totalMultiplier = difficultyMultiplier * regionalMultiplier;
  
  return {
    proLow: Math.round(baseCost.proLow * totalMultiplier),
    proHigh: baseCost.proHigh ? Math.round(baseCost.proHigh * totalMultiplier) : undefined,
    materialsLow: baseCost.materialsLow ? Math.round(baseCost.materialsLow * totalMultiplier) : undefined,
    materialsHigh: baseCost.materialsHigh ? Math.round(baseCost.materialsHigh * totalMultiplier) : undefined,
    currency: 'USD',
  };
}

/**
 * Calculate DIY savings (professional cost minus materials cost)
 */
export function calculateDIYSavings(estimate: CostEstimate): { low: number; high: number } {
  const proLow = estimate.proLow;
  const proHigh = estimate.proHigh || estimate.proLow;
  const materialsHigh = estimate.materialsHigh || 0;
  const materialsLow = estimate.materialsLow || 0;
  
  return {
    low: Math.max(0, proLow - materialsHigh),  // Minimum savings
    high: Math.max(0, proHigh - materialsLow),  // Maximum savings
  };
}

/**
 * Format cost estimate for display
 */
export function formatCostEstimate(estimate: CostEstimate): string {
  if (estimate.proHigh && estimate.proHigh !== estimate.proLow) {
    return `$${estimate.proLow}–$${estimate.proHigh}`;
  }
  return `$${estimate.proLow}`;
}

/**
 * Format DIY savings for display
 */
export function formatDIYSavings(estimate: CostEstimate): string {
  const savings = calculateDIYSavings(estimate);
  if (savings.high !== savings.low) {
    return `$${savings.low}–$${savings.high}`;
  }
  return `$${savings.low}`;
}
