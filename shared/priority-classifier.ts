/**
 * Priority Classification System for Maintenance Tasks
 * 
 * Automatically assigns priority levels (high/medium/low) based on:
 * - Safety criticality
 * - Potential damage/cost if ignored
 * - Urgency and importance
 * 
 * Priority Levels:
 * - HIGH (red): Life safety, fire risk, carbon monoxide, major damage prevention, emergencies
 * - MEDIUM (yellow): Important maintenance, efficiency, comfort, system reliability
 * - LOW (green): Routine tasks, aesthetic improvements, organizational tasks
 */

export type TaskPriority = 'high' | 'medium' | 'low';

interface TaskForClassification {
  title: string;
  description: string;
  category?: string;
}

// High priority keywords - safety and critical damage prevention
const HIGH_PRIORITY_KEYWORDS = [
  // Life safety (specific, not generic)
  'carbon monoxide', 'co detector', 'smoke detector', 'fire hazard', 'fire risk',
  'electrical hazard', 'electrical fire', 'gas leak', 'safety hazard', 'safety risk',
  'danger', 'poisoning', 'electrocution', 'deadly', 'life-critical', 'prevents death',
  'prevents injury', 'chimney fire', 'creosote buildup',
  
  // Major damage prevention
  'flood', 'flooding', 'burst pipe', 'water damage', 'frozen pipe',
  'ice dam', 'roof leak', 'foundation damage', 'structural damage',
  'prevents thousands', 'prevents expensive', 'major damage',
  
  // Critical systems
  'backup generator', 'backup sump pump', 'emergency shut-off', 'pressure relief valve',
  'emergency heat', 'emergency backup',
  
  // Weather emergencies & storms
  'storm damage', 'wind damage', 'winter storm', 'severe weather',
  'emergency supplies', 'power outage', 'extended outage',
  'before storms intensify', 'before winter cold'
];

// Low priority keywords - routine, aesthetic, organizational
const LOW_PRIORITY_KEYWORDS = [
  // Routine cleaning (expanded)
  'clean', 'cleaning', 'wash', 'washing', 'wipe', 'organize', 'straighten',
  'tidy', 'dust', 'polish', 'vacuum', 'sweep', 'scrub',
  
  // Aesthetic improvements
  'aesthetic', 'appearance', 'curb appeal', 'beautify', 'decorate',
  'freshen', 'touch up', 'cosmetic', 'look better', 'visual appeal',
  
  // Minor maintenance
  'lubricate', 'oil', 'adjust', 'label', 'organize supplies',
  'replace bulb', 'light bulb', 'touch-up', 'minor repair',
  
  // Low-impact tasks
  'optional', 'when convenient', 'if desired', 'consider',
  'freshen up', 'refresh'
];

// Medium priority keywords - important but not critical
const MEDIUM_PRIORITY_KEYWORDS = [
  'inspect', 'test', 'check', 'monitor', 'maintain', 'service',
  'efficiency', 'performance', 'preventive', 'routine maintenance',
  'filter replacement', 'weatherstrip', 'insulation', 'energy savings'
];

/**
 * Calculate a priority score for a task based on keyword matches
 * Returns: { highScore, mediumScore, lowScore }
 */
function calculateKeywordScores(text: string): { highScore: number; mediumScore: number; lowScore: number } {
  const lowerText = text.toLowerCase();
  
  const highScore = HIGH_PRIORITY_KEYWORDS.filter(keyword => 
    lowerText.includes(keyword)
  ).length;
  
  const mediumScore = MEDIUM_PRIORITY_KEYWORDS.filter(keyword => 
    lowerText.includes(keyword)
  ).length;
  
  const lowScore = LOW_PRIORITY_KEYWORDS.filter(keyword => 
    lowerText.includes(keyword)
  ).length;
  
  return { highScore, mediumScore, lowScore };
}

/**
 * Classify a maintenance task's priority level
 * 
 * @param task - Task with title and description
 * @param fallbackPriority - Priority to use if classification is uncertain (default: 'medium')
 * @returns TaskPriority ('high' | 'medium' | 'low')
 */
export function classifyTaskPriority(
  task: TaskForClassification,
  fallbackPriority: TaskPriority = 'medium'
): TaskPriority {
  // Combine title and description for analysis
  const combinedText = `${task.title} ${task.description}`;
  
  // Calculate keyword scores
  const scores = calculateKeywordScores(combinedText);
  
  // High priority if ANY high-priority keywords found
  if (scores.highScore > 0) {
    return 'high';
  }
  
  // Low priority if ANY low-priority keywords found (relaxed from ≥2)
  // BUT not if high-priority keywords also present
  if (scores.lowScore > 0 && scores.highScore === 0) {
    // If medium keywords also present, low must strictly dominate (ties go to medium)
    if (scores.mediumScore > 0 && scores.lowScore <= scores.mediumScore) {
      return 'medium';
    }
    return 'low';
  }
  
  // Medium priority if medium keywords found
  if (scores.mediumScore > 0) {
    return 'medium';
  }
  
  // Additional heuristics based on task content
  const lowerText = combinedText.toLowerCase();
  
  // High priority patterns
  if (
    lowerText.includes('prevent') && (lowerText.includes('damage') || lowerText.includes('failure')) ||
    lowerText.includes('must') || lowerText.includes('critical') ||
    lowerText.includes('immediately') || lowerText.includes('urgent')
  ) {
    return 'high';
  }
  
  // Low priority patterns
  if (
    lowerText.includes('optional') || lowerText.includes('when convenient') ||
    lowerText.includes('if desired') || lowerText.includes('consider')
  ) {
    return 'low';
  }
  
  // Default to fallback priority
  return fallbackPriority;
}

/**
 * Override map for specific tasks that need manual priority assignment
 * Key is a substring from the task title that uniquely identifies it
 */
export const PRIORITY_OVERRIDES: Record<string, TaskPriority> = {
  // Add specific overrides here if automated classification is incorrect
  // Example: 'Clean washing machine drain filter': 'low',
};

/**
 * Get the final priority for a task, considering both classification and overrides
 */
export function getTaskPriority(
  task: TaskForClassification & { priority?: TaskPriority },
  fallbackPriority: TaskPriority = 'medium'
): TaskPriority {
  // 1. If task already has a priority set, use it
  if (task.priority) {
    return task.priority;
  }
  
  // 2. Check for manual overrides
  for (const [titleSubstring, overridePriority] of Object.entries(PRIORITY_OVERRIDES)) {
    if (task.title.includes(titleSubstring)) {
      return overridePriority;
    }
  }
  
  // 3. Use automated classification
  return classifyTaskPriority(task, fallbackPriority);
}
