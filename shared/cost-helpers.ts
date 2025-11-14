// Helper utilities for applying cost estimates to maintenance tasks

import { getCostEstimate, CostEstimate } from './cost-baselines';
import { MaintenanceTaskItem } from './location-maintenance-data';
import { getTaskPriority, TaskPriority } from './priority-classifier';

/**
 * Infer category from task title and description
 * This helps auto-assign cost estimates to seasonal tasks
 */
export function inferTaskCategory(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase();
  
  // HVAC and Heating
  if (text.includes('hvac') || text.includes('air conditioning') || text.includes('furnace') || 
      text.includes('heating system') || text.includes('thermostat')) {
    return 'hvac';
  }
  if (text.includes('filter') && (text.includes('furnace') || text.includes('hvac'))) {
    return 'hvac';
  }
  if (text.includes('fireplace') || text.includes('chimney')) {
    return 'heating';
  }
  
  // Plumbing
  if (text.includes('plumbing') || text.includes('pipe') || text.includes('faucet') || 
      text.includes('drain') || text.includes('toilet') || text.includes('sink')) {
    return 'plumbing';
  }
  if (text.includes('sump pump')) {
    return 'plumbing';
  }
  if (text.includes('water heater')) {
    return 'water_heater';
  }
  
  // Electrical
  if (text.includes('electrical') || text.includes('outlet') || text.includes('gfci') || 
      text.includes('afci') || text.includes('breaker') || text.includes('wiring')) {
    return 'electrical';
  }
  
  // Roof and Gutters
  if (text.includes('roof') || text.includes('shingle') || text.includes('flashing')) {
    return 'roof';
  }
  if (text.includes('gutter') || text.includes('downspout')) {
    return 'gutters';
  }
  if (text.includes('ice dam')) {
    return 'roof';
  }
  
  // Exterior
  if (text.includes('siding') || text.includes('exterior') || text.includes('trim')) {
    return 'exterior';
  }
  if (text.includes('deck') || text.includes('railing')) {
    return 'deck';
  }
  if (text.includes('patio') || text.includes('concrete')) {
    return 'patio';
  }
  
  // Windows and Doors
  if (text.includes('window') || text.includes('weatherstripping') && text.includes('window')) {
    return 'windows';
  }
  if (text.includes('door') || text.includes('weatherstripping') && text.includes('door')) {
    return 'doors';
  }
  
  // Safety
  if (text.includes('smoke detector') || text.includes('carbon monoxide') || 
      text.includes('fire extinguisher')) {
    return 'safety';
  }
  
  // Insulation
  if (text.includes('insulation') || text.includes('attic') && text.includes('insul')) {
    return 'insulation';
  }
  if (text.includes('ventilation') || text.includes('exhaust fan')) {
    return 'ventilation';
  }
  
  // Drainage
  if (text.includes('drainage') || text.includes('foundation') && text.includes('water')) {
    return 'drainage';
  }
  
  // Lawn and Garden
  if (text.includes('lawn') || text.includes('grass') || text.includes('mow')) {
    return 'lawn';
  }
  if (text.includes('landscaping') || text.includes('shrub') || text.includes('tree') || 
      text.includes('garden')) {
    return 'landscaping';
  }
  
  // Appliances
  if (text.includes('appliance') || text.includes('refrigerator') || text.includes('washer') || 
      text.includes('dryer') || text.includes('dishwasher')) {
    return 'appliances';
  }
  
  // Painting
  if (text.includes('paint') || text.includes('stain') && (text.includes('deck') || text.includes('wood'))) {
    return 'painting';
  }
  
  // Garage
  if (text.includes('garage') && (text.includes('door') || text.includes('opener'))) {
    return 'garage';
  }
  
  // Pool
  if (text.includes('pool') || text.includes('spa') || text.includes('hot tub')) {
    return 'pool';
  }
  
  // Septic
  if (text.includes('septic') || text.includes('sewer')) {
    return 'septic';
  }
  
  // Cleaning and General Maintenance
  if (text.includes('clean') || text.includes('vacuum') || text.includes('dust')) {
    return 'cleaning';
  }
  
  // Default fallback
  return 'general_maintenance';
}

/**
 * Infer difficulty from task description and title
 */
export function inferTaskDifficulty(title: string, description: string): 'easy' | 'moderate' | 'difficult' {
  const text = `${title} ${description}`.toLowerCase();
  
  // Difficult indicators
  if (text.includes('professional') || text.includes('hire') || text.includes('contractor') ||
      text.includes('licensed') || text.includes('certified') || text.includes('complex') ||
      text.includes('dangerous') || text.includes('electrical panel') || text.includes('roof repair') ||
      text.includes('structural') || text.includes('foundation')) {
    return 'difficult';
  }
  
  // Moderate indicators
  if (text.includes('repair') || text.includes('replace') || text.includes('install') ||
      text.includes('service') || text.includes('maintenance') || text.includes('schedule') ||
      text.includes('inspect') && !text.includes('visual')) {
    return 'moderate';
  }
  
  // Easy indicators
  if (text.includes('test') || text.includes('check') || text.includes('clean') ||
      text.includes('vacuum') || text.includes('visual') || text.includes('monitor') ||
      text.includes('replace filter') || text.includes('change battery')) {
    return 'easy';
  }
  
  // Default to easy
  return 'easy';
}

/**
 * Enrich a maintenance task with cost estimate and priority based on its category and difficulty
 */
export function enrichTaskWithCost(
  task: MaintenanceTaskItem,
  region?: string,
  fallbackPriority: TaskPriority = 'medium'
): MaintenanceTaskItem {
  // Infer category and difficulty from task content
  const category = inferTaskCategory(task.title, task.description);
  const difficulty = inferTaskDifficulty(task.title, task.description);
  
  // Get cost estimate (only if not already present)
  const costEstimate = task.costEstimate || getCostEstimate(category, difficulty, region);
  
  // Get priority using classifier (respects existing priority, checks overrides, then classifies)
  const priority = getTaskPriority(task, fallbackPriority);
  
  return {
    ...task,
    costEstimate,
    priority,
  };
}

/**
 * Enrich an array of maintenance tasks with cost estimates and priorities
 */
export function enrichTasksWithCosts(
  tasks: MaintenanceTaskItem[],
  region?: string,
  fallbackPriority: TaskPriority = 'medium'
): MaintenanceTaskItem[] {
  return tasks.map(task => enrichTaskWithCost(task, region, fallbackPriority));
}
