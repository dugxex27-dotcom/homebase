import { type SelectHouse } from './schema';

export interface MaintenanceTask {
  id: string;
  title: string;
  description: string;
  category: string;
  frequency: 'monthly' | 'quarterly' | 'bi-annual' | 'annual' | 'every_2_years' | 'every_5_years' | 'every_10_years' | 'every_15_years' | 'every_20_years';
  priority: 'high' | 'medium' | 'low';
  estimatedCost: { min: number; max: number };
  estimatedDuration: string;
  diyFriendly: boolean;
  seasonalPreference?: 'spring' | 'summer' | 'fall' | 'winter' | 'any';
  professionalRequired?: boolean;
  relatedSystems?: string[];
}

export interface ScheduledTask extends MaintenanceTask {
  recommendedMonth: number;
  urgency: 'critical' | 'important' | 'routine';
  reason: string;
}

export interface AnnualMaintenanceSchedule {
  byMonth: {
    [month: number]: ScheduledTask[];
  };
  byPriority: {
    high: ScheduledTask[];
    medium: ScheduledTask[];
    low: ScheduledTask[];
  };
  totalEstimatedCost: { min: number; max: number };
  criticalItems: ScheduledTask[];
}

function calculateAge(installedYear: number | null | undefined): number {
  if (!installedYear) return 0;
  return new Date().getFullYear() - installedYear;
}

function getSeasonMonth(season: string): number {
  const seasonMonths: Record<string, number> = {
    spring: 4, // April
    summer: 7, // July
    fall: 10, // October
    winter: 1, // January
  };
  return seasonMonths[season] || 1;
}

export function generateMaintenanceSchedule(house: SelectHouse): AnnualMaintenanceSchedule {
  const tasks: ScheduledTask[] = [];
  
  // Calculate ages from installation years
  const roofAge = calculateAge(house.roofInstalledYear);
  const hvacAge = calculateAge(house.hvacInstalledYear);
  const waterHeaterAge = calculateAge(house.waterHeaterInstalledYear);
  const houseAge = calculateAge(house.yearBuilt);

  // HVAC Maintenance
  tasks.push({
    id: 'hvac-filter',
    title: 'Replace HVAC Filters',
    description: 'Replace air filters to maintain air quality and system efficiency',
    category: 'HVAC',
    frequency: 'monthly',
    priority: 'high',
    estimatedCost: { min: 15, max: 50 },
    estimatedDuration: '15 minutes',
    diyFriendly: true,
    recommendedMonth: 1, // Start of year
    urgency: 'routine',
    reason: 'Monthly maintenance for optimal air quality',
  });

  if (house.hvacType && house.hvacType !== 'window_unit') {
    tasks.push({
      id: 'hvac-service',
      title: 'Professional HVAC Service',
      description: 'Annual professional inspection and tune-up of heating and cooling system',
      category: 'HVAC',
      frequency: 'annual',
      priority: hvacAge > 10 ? 'high' : 'medium',
      estimatedCost: { min: 150, max: 300 },
      estimatedDuration: '2-3 hours',
      diyFriendly: false,
      professionalRequired: true,
      seasonalPreference: 'spring',
      recommendedMonth: 4, // April - before summer cooling season
      urgency: hvacAge > 15 ? 'critical' : hvacAge > 10 ? 'important' : 'routine',
      reason: hvacAge > 15 
        ? `System is ${hvacAge} years old - critical to maintain efficiency`
        : hvacAge > 10
        ? `System is ${hvacAge} years old - regular service important for longevity`
        : 'Annual service to maintain warranty and efficiency',
    });
  }

  // Roof Maintenance
  if (house.roofType) {
    const roofInspectionFrequency = roofAge > 15 ? 'annual' : 'bi-annual';
    tasks.push({
      id: 'roof-inspection',
      title: 'Roof Inspection',
      description: 'Inspect roof for damage, missing shingles, and potential leaks',
      category: 'Roof',
      frequency: roofInspectionFrequency,
      priority: roofAge > 15 ? 'high' : 'medium',
      estimatedCost: { min: 200, max: 400 },
      estimatedDuration: '1-2 hours',
      diyFriendly: false,
      professionalRequired: true,
      seasonalPreference: 'spring',
      recommendedMonth: 5, // May
      urgency: roofAge > 20 ? 'critical' : roofAge > 15 ? 'important' : 'routine',
      reason: roofAge > 20
        ? `Roof is ${roofAge} years old - replacement may be needed soon`
        : roofAge > 15
        ? `Roof is ${roofAge} years old - monitor for wear`
        : 'Regular inspection to catch issues early',
    });

    if (roofAge > 20 && house.roofType === 'asphalt_shingle') {
      tasks.push({
        id: 'roof-replacement-plan',
        title: 'Plan Roof Replacement',
        description: 'Asphalt shingle roofs typically last 20-25 years. Begin planning for replacement.',
        category: 'Roof',
        frequency: 'annual',
        priority: 'high',
        estimatedCost: { min: 8000, max: 15000 },
        estimatedDuration: '3-5 days',
        diyFriendly: false,
        professionalRequired: true,
        recommendedMonth: 6,
        urgency: 'critical',
        reason: `Roof is ${roofAge} years old - at end of typical lifespan`,
      });
    }
  }

  // Gutter Cleaning
  tasks.push({
    id: 'gutter-cleaning',
    title: 'Clean Gutters and Downspouts',
    description: 'Remove debris from gutters to prevent water damage',
    category: 'Exterior',
    frequency: 'bi-annual',
    priority: 'high',
    estimatedCost: { min: 100, max: 250 },
    estimatedDuration: '2-4 hours',
    diyFriendly: true,
    seasonalPreference: 'fall',
    recommendedMonth: 10, // October - after leaves fall
    urgency: 'important',
    reason: 'Prevent water damage and foundation issues',
  });

  // Water Heater Maintenance
  if (house.waterHeaterType) {
    tasks.push({
      id: 'water-heater-flush',
      title: 'Flush Water Heater',
      description: 'Drain sediment from water heater to maintain efficiency',
      category: 'Plumbing',
      frequency: 'annual',
      priority: waterHeaterAge > 8 ? 'high' : 'medium',
      estimatedCost: { min: 100, max: 200 },
      estimatedDuration: '1-2 hours',
      diyFriendly: true,
      recommendedMonth: 3, // March
      urgency: waterHeaterAge > 10 ? 'important' : 'routine',
      reason: waterHeaterAge > 10
        ? `Water heater is ${waterHeaterAge} years old - regular maintenance critical`
        : 'Annual maintenance to extend lifespan',
    });

    if (waterHeaterAge > 10) {
      tasks.push({
        id: 'water-heater-replacement-plan',
        title: 'Plan Water Heater Replacement',
        description: 'Water heaters typically last 10-15 years. Monitor for signs of failure.',
        category: 'Plumbing',
        frequency: 'annual',
        priority: 'high',
        estimatedCost: { min: 800, max: 2000 },
        estimatedDuration: '4-6 hours',
        diyFriendly: false,
        professionalRequired: true,
        recommendedMonth: 8,
        urgency: waterHeaterAge > 12 ? 'critical' : 'important',
        reason: `Water heater is ${waterHeaterAge} years old - approaching end of life`,
      });
    }
  }

  // Chimney and Fireplace (if applicable)
  if (house.primaryHeatingFuel === 'wood') {
    tasks.push({
      id: 'chimney-inspection',
      title: 'Chimney Inspection and Cleaning',
      description: 'Professional chimney sweep and safety inspection',
      category: 'Fireplace',
      frequency: 'annual',
      priority: 'high',
      estimatedCost: { min: 150, max: 300 },
      estimatedDuration: '1-2 hours',
      diyFriendly: false,
      professionalRequired: true,
      seasonalPreference: 'fall',
      recommendedMonth: 9, // September - before heating season
      urgency: 'important',
      reason: 'Safety and efficiency for wood-burning systems',
    });
  }

  // Foundation and Basement (if applicable)
  if (house.foundationType === 'basement' || house.foundationType === 'crawl_space') {
    tasks.push({
      id: 'foundation-inspection',
      title: 'Foundation and Basement Inspection',
      description: 'Check for cracks, moisture, and pest activity',
      category: 'Foundation',
      frequency: 'annual',
      priority: houseAge > 30 ? 'high' : 'medium',
      estimatedCost: { min: 0, max: 100 },
      estimatedDuration: '1 hour',
      diyFriendly: true,
      seasonalPreference: 'spring',
      recommendedMonth: 5,
      urgency: houseAge > 30 ? 'important' : 'routine',
      reason: houseAge > 30 
        ? 'Older home - monitor foundation closely'
        : 'Regular inspection to catch issues early',
    });
  }

  // Pest Control
  tasks.push({
    id: 'pest-control',
    title: 'Pest Inspection and Treatment',
    description: 'Professional pest inspection and preventive treatment',
    category: 'Pest Control',
    frequency: 'quarterly',
    priority: 'medium',
    estimatedCost: { min: 100, max: 300 },
    estimatedDuration: '1 hour',
    diyFriendly: false,
    professionalRequired: true,
    recommendedMonth: 3, // Spring - start of pest season
    urgency: 'routine',
    reason: 'Preventive pest control',
  });

  // Smoke and CO Detector Testing
  tasks.push({
    id: 'detector-testing',
    title: 'Test Smoke and CO Detectors',
    description: 'Test all smoke and carbon monoxide detectors, replace batteries',
    category: 'Safety',
    frequency: 'monthly',
    priority: 'high',
    estimatedCost: { min: 10, max: 30 },
    estimatedDuration: '30 minutes',
    diyFriendly: true,
    recommendedMonth: 1,
    urgency: 'critical',
    reason: 'Life safety - critical monthly check',
  });

  // Exterior Paint (based on home type and age)
  if (house.homeType === 'single_family' && houseAge > 5) {
    const paintAge = houseAge % 7; // Assume paint every 7 years
    if (paintAge > 5) {
      tasks.push({
        id: 'exterior-paint',
        title: 'Exterior Paint Touch-up or Repainting',
        description: 'Inspect and touch up or repaint exterior surfaces',
        category: 'Exterior',
        frequency: 'every_5_years',
        priority: 'medium',
        estimatedCost: { min: 3000, max: 8000 },
        estimatedDuration: '1-2 weeks',
        diyFriendly: false,
        seasonalPreference: 'summer',
        recommendedMonth: 7,
        urgency: 'routine',
        reason: 'Protect home exterior and maintain curb appeal',
      });
    }
  }

  // Organize tasks by month
  const byMonth: { [month: number]: ScheduledTask[] } = {};
  for (let i = 1; i <= 12; i++) {
    byMonth[i] = [];
  }

  tasks.forEach(task => {
    byMonth[task.recommendedMonth].push(task);
  });

  // Organize tasks by priority
  const byPriority = {
    high: tasks.filter(t => t.priority === 'high'),
    medium: tasks.filter(t => t.priority === 'medium'),
    low: tasks.filter(t => t.priority === 'low'),
  };

  // Calculate total estimated cost
  const totalEstimatedCost = tasks.reduce(
    (acc, task) => ({
      min: acc.min + task.estimatedCost.min,
      max: acc.max + task.estimatedCost.max,
    }),
    { min: 0, max: 0 }
  );

  // Get critical items (urgency === 'critical')
  const criticalItems = tasks.filter(t => t.urgency === 'critical');

  return {
    byMonth,
    byPriority,
    totalEstimatedCost,
    criticalItems,
  };
}
