// Geographic and seasonal maintenance recommendations for US regions
export interface LocationMaintenanceData {
  region: string;
  climateZone: string;
  monthlyTasks: {
    [month: number]: {
      seasonal: string[];
      weatherSpecific: string[];
      priority: 'high' | 'medium' | 'low';
    };
  };
  yearRoundTasks: string[];
  specialConsiderations: string[];
}

export const US_MAINTENANCE_DATA: { [key: string]: LocationMaintenanceData } = {
  'Northeast': {
    region: 'Northeast',
    climateZone: 'Cold/Humid Continental',
    monthlyTasks: {
      1: { // January
        seasonal: [
          'Check heating system efficiency',
          'Inspect and clean fireplace/chimney',
          'Check for ice dams on roof',
          'Test carbon monoxide detectors',
          'Inspect weatherstripping on doors and windows'
        ],
        weatherSpecific: [
          'Remove snow from roof if excessive buildup',
          'Check pipes for freezing in unheated areas',
          'Ensure adequate insulation in attic and basement',
          'Monitor humidity levels (30-50%)',
          'Check for drafts around windows and doors'
        ],
        priority: 'high'
      },
      2: { // February
        seasonal: [
          'Service heating system before peak winter ends',
          'Check attic insulation and ventilation',
          'Inspect roof for winter damage',
          'Test sump pump if applicable',
          'Check storm doors and windows'
        ],
        weatherSpecific: [
          'Monitor for ice damage on gutters',
          'Check basement for moisture issues',
          'Ensure proper ventilation to prevent condensation',
          'Inspect exterior caulking',
          'Check for frozen pipe prevention measures'
        ],
        priority: 'high'
      },
      3: { // March
        seasonal: [
          'Begin spring cleaning preparation',
          'Schedule HVAC system transition maintenance',
          'Inspect exterior for winter damage',
          'Check deck and patio for winter damage',
          'Test outdoor water spigots'
        ],
        weatherSpecific: [
          'Begin monitoring for spring flooding',
          'Check gutters and downspouts for winter damage',
          'Inspect driveway for frost heave damage',
          'Remove any remaining ice dam protection',
          'Check foundation for frost damage'
        ],
        priority: 'medium'
      },
      4: { // April
        seasonal: [
          'Deep clean interior after winter',
          'Service air conditioning before summer',
          'Clean and inspect gutters',
          'Check exterior paint and siding',
          'Inspect roof shingles and flashing'
        ],
        weatherSpecific: [
          'Check for spring flooding in basement',
          'Inspect and clean storm drains',
          'Check grading around foundation',
          'Monitor for pest activity as weather warms',
          'Inspect outdoor furniture and equipment'
        ],
        priority: 'medium'
      },
      5: { // May
        seasonal: [
          'Complete spring lawn care',
          'Clean and maintain outdoor equipment',
          'Inspect and clean deck/patio',
          'Check screens on windows and doors',
          'Service lawn mower and garden tools'
        ],
        weatherSpecific: [
          'Check air conditioning system before summer heat',
          'Inspect for pest entry points',
          'Clean outdoor HVAC unit',
          'Check irrigation system if applicable',
          'Inspect exterior wood for moisture damage'
        ],
        priority: 'medium'
      },
      6: { // June
        seasonal: [
          'Monitor air conditioning efficiency',
          'Inspect and maintain outdoor spaces',
          'Check attic ventilation for summer heat',
          'Clean and inspect swimming pool if applicable',
          'Maintain landscaping and irrigation'
        ],
        weatherSpecific: [
          'Ensure adequate cooling system capacity',
          'Check humidity levels and dehumidifier',
          'Inspect for summer storm damage preparation',
          'Monitor energy efficiency of cooling system',
          'Check outdoor electrical connections'
        ],
        priority: 'medium'
      },
      7: { // July
        seasonal: [
          'Peak air conditioning maintenance',
          'Monitor energy usage and efficiency',
          'Maintain outdoor living spaces',
          'Check and clean outdoor equipment',
          'Inspect deck and outdoor structures'
        ],
        weatherSpecific: [
          'Monitor air conditioning filters frequently',
          'Check for proper attic ventilation',
          'Ensure adequate cooling system capacity',
          'Monitor for summer storm damage',
          'Check outdoor water systems'
        ],
        priority: 'high'
      },
      8: { // August
        seasonal: [
          'Continue peak cooling system maintenance',
          'Prepare for fall transition',
          'Check exterior painting needs',
          'Maintain outdoor equipment and furniture',
          'Monitor lawn and garden irrigation'
        ],
        weatherSpecific: [
          'Check cooling system efficiency during peak heat',
          'Monitor humidity control systems',
          'Inspect for heat-related expansion damage',
          'Check outdoor electrical systems',
          'Prepare for potential severe summer weather'
        ],
        priority: 'high'
      },
      9: { // September
        seasonal: [
          'Begin fall preparation tasks',
          'Schedule heating system service',
          'Clean and inspect gutters before autumn',
          'Check weatherstripping and caulking',
          'Prepare outdoor equipment for storage'
        ],
        weatherSpecific: [
          'Transition HVAC from cooling to heating mode',
          'Check insulation before cold weather',
          'Inspect roof for summer damage',
          'Begin winterizing outdoor equipment',
          'Check foundation and basement for moisture'
        ],
        priority: 'medium'
      },
      10: { // October
        seasonal: [
          'Complete fall cleanup and preparation',
          'Service heating system for winter',
          'Clean gutters and install leaf guards',
          'Winterize outdoor water systems',
          'Check and seal exterior gaps'
        ],
        weatherSpecific: [
          'Prepare heating system for cold weather',
          'Insulate pipes in unheated areas',
          'Check storm windows and doors',
          'Inspect chimney and fireplace for winter use',
          'Check outdoor equipment winterization'
        ],
        priority: 'high'
      },
      11: { // November
        seasonal: [
          'Complete winter preparation',
          'Test heating system thoroughly',
          'Final exterior maintenance before cold',
          'Check insulation and weatherproofing',
          'Store outdoor furniture and equipment'
        ],
        weatherSpecific: [
          'Ensure heating system is operating efficiently',
          'Check for drafts and air leaks',
          'Prepare for first freeze conditions',
          'Check emergency heating backup systems',
          'Monitor humidity levels as heating begins'
        ],
        priority: 'high'
      },
      12: { // December
        seasonal: [
          'Monitor heating system performance',
          'Check holiday decorations safety',
          'Inspect and maintain fireplace',
          'Test carbon monoxide and smoke detectors',
          'Monitor energy usage and efficiency'
        ],
        weatherSpecific: [
          'Prepare for winter storm conditions',
          'Check ice and snow removal equipment',
          'Monitor heating system during cold snaps',
          'Check for ice dam formation on roof',
          'Ensure adequate emergency supplies'
        ],
        priority: 'high'
      }
    },
    yearRoundTasks: [
      'Test smoke and carbon monoxide detectors monthly',
      'Check HVAC filters monthly',
      'Inspect plumbing for leaks quarterly',
      'Check electrical systems annually',
      'Professional HVAC service twice yearly'
    ],
    specialConsiderations: [
      'Heavy snow load considerations for roof',
      'Ice dam prevention and removal',
      'Freeze protection for plumbing',
      'High humidity management in summer',
      'Storm preparation for nor\'easters'
    ]
  },
  'Southeast': {
    region: 'Southeast',
    climateZone: 'Humid Subtropical',
    monthlyTasks: {
      1: { // January
        seasonal: [
          'Service heating system during cooler months',
          'Check and clean fireplace if applicable',
          'Inspect weatherstripping',
          'Test carbon monoxide detectors',
          'Check attic insulation'
        ],
        weatherSpecific: [
          'Monitor for freeze protection of pipes',
          'Check humidity levels (winter can be dry)',
          'Inspect exterior for mild winter damage',
          'Ensure proper ventilation during heating season',
          'Check for pest activity (active year-round)'
        ],
        priority: 'medium'
      },
      2: { // February
        seasonal: [
          'Begin early spring preparation',
          'Check irrigation system for spring startup',
          'Inspect exterior paint and siding',
          'Clean and maintain lawn equipment',
          'Check deck and outdoor furniture'
        ],
        weatherSpecific: [
          'Prepare for early spring weather changes',
          'Check air conditioning system before warm season',
          'Monitor for early pest activity',
          'Inspect drainage systems before spring rains',
          'Check outdoor electrical connections'
        ],
        priority: 'medium'
      },
      3: { // March
        seasonal: [
          'Begin spring cleaning and maintenance',
          'Service air conditioning system',
          'Clean and inspect gutters',
          'Check screens and outdoor areas',
          'Start landscaping and lawn care'
        ],
        weatherSpecific: [
          'Prepare cooling system for warm weather',
          'Check for tornado season preparation',
          'Inspect for spring storm damage prevention',
          'Monitor humidity levels as weather warms',
          'Check foundation drainage'
        ],
        priority: 'medium'
      },
      4: { // April
        seasonal: [
          'Complete spring maintenance tasks',
          'Deep clean interior and exterior',
          'Service and test air conditioning',
          'Maintain outdoor living spaces',
          'Check pool and spa systems'
        ],
        weatherSpecific: [
          'Prepare for severe weather season',
          'Check cooling system capacity',
          'Monitor for increased pest activity',
          'Inspect exterior for weather damage',
          'Check hurricane/storm preparedness supplies'
        ],
        priority: 'high'
      },
      5: { // May
        seasonal: [
          'Peak air conditioning preparation',
          'Complete outdoor maintenance',
          'Check and maintain pool systems',
          'Inspect deck and outdoor structures',
          'Maintain landscaping systems'
        ],
        weatherSpecific: [
          'Ensure air conditioning system is ready for heat',
          'Check humidity control systems',
          'Prepare for hurricane season',
          'Monitor for summer storm damage prevention',
          'Check outdoor water and electrical systems'
        ],
        priority: 'high'
      },
      6: { // June
        seasonal: [
          'Peak cooling season maintenance',
          'Monitor air conditioning efficiency',
          'Maintain pool and outdoor systems',
          'Check attic ventilation',
          'Inspect for heat-related expansion'
        ],
        weatherSpecific: [
          'Hurricane season preparation',
          'Check cooling system capacity for extreme heat',
          'Monitor humidity and mold prevention',
          'Inspect for storm damage preparation',
          'Check emergency generator if applicable'
        ],
        priority: 'high'
      },
      7: { // July
        seasonal: [
          'Peak summer maintenance',
          'Monitor energy efficiency',
          'Maintain cooling systems',
          'Check and clean pool systems',
          'Inspect outdoor equipment'
        ],
        weatherSpecific: [
          'Peak hurricane season vigilance',
          'Monitor air conditioning during extreme heat',
          'Check for heat stress on exterior materials',
          'Monitor humidity and moisture control',
          'Inspect storm shutters and protection'
        ],
        priority: 'high'
      },
      8: { // August
        seasonal: [
          'Continue peak summer maintenance',
          'Monitor cooling system performance',
          'Maintain outdoor living areas',
          'Check pool and spa equipment',
          'Inspect exterior for heat damage'
        ],
        weatherSpecific: [
          'Peak hurricane season preparation',
          'Monitor extreme heat effects on home',
          'Check moisture and humidity control',
          'Inspect for storm damage prevention',
          'Check cooling system efficiency'
        ],
        priority: 'high'
      },
      9: { // September
        seasonal: [
          'Continue hurricane season vigilance',
          'Maintain cooling systems',
          'Begin gradual fall preparation',
          'Check exterior maintenance needs',
          'Inspect pool and outdoor equipment'
        ],
        weatherSpecific: [
          'Peak hurricane season continues',
          'Monitor for storm damage and preparation',
          'Check cooling system as heat continues',
          'Inspect drainage and water management',
          'Monitor for continued pest activity'
        ],
        priority: 'high'
      },
      10: { // October
        seasonal: [
          'Begin transition to cooler weather',
          'Check heating system preparation',
          'Clean gutters and drainage systems',
          'Inspect exterior paint and siding',
          'Maintain outdoor equipment'
        ],
        weatherSpecific: [
          'End of hurricane season vigilance',
          'Transition HVAC systems for cooler weather',
          'Check for mild fall weather preparation',
          'Monitor humidity changes',
          'Inspect for storm season damage'
        ],
        priority: 'medium'
      },
      11: { // November
        seasonal: [
          'Prepare for mild winter season',
          'Check heating system operation',
          'Clean and maintain outdoor areas',
          'Inspect weatherproofing',
          'Check holiday decoration safety'
        ],
        weatherSpecific: [
          'Prepare for cooler but mild winter',
          'Check heating system for occasional use',
          'Monitor humidity levels during heating',
          'Check for minimal freeze protection needs',
          'Inspect for reduced pest activity'
        ],
        priority: 'medium'
      },
      12: { // December
        seasonal: [
          'Monitor heating system performance',
          'Check holiday decorations and lighting',
          'Maintain mild winter preparations',
          'Test smoke and carbon monoxide detectors',
          'Check weatherstripping and insulation'
        ],
        weatherSpecific: [
          'Monitor for occasional freeze conditions',
          'Check heating system during cold snaps',
          'Prepare for mild winter storm conditions',
          'Monitor humidity during heating season',
          'Check for continued year-round pest activity'
        ],
        priority: 'medium'
      }
    },
    yearRoundTasks: [
      'Test smoke and carbon monoxide detectors monthly',
      'Check HVAC filters monthly (more frequent due to humidity)',
      'Inspect for mold and moisture quarterly',
      'Professional pest control quarterly',
      'Hurricane preparedness supplies check quarterly'
    ],
    specialConsiderations: [
      'Hurricane season preparation (June-November)',
      'High humidity and mold prevention',
      'Year-round pest control needs',
      'Extreme heat management',
      'Flood and storm water management'
    ]
  },
  'Midwest': {
    region: 'Midwest',
    climateZone: 'Continental/Humid Continental',
    monthlyTasks: {
      1: { // January
        seasonal: [
          'Peak heating season maintenance',
          'Check heating system efficiency',
          'Inspect and clean fireplace/chimney',
          'Test carbon monoxide detectors',
          'Check insulation and weatherstripping'
        ],
        weatherSpecific: [
          'Monitor for extreme cold effects on pipes',
          'Check for ice dams and roof snow load',
          'Ensure adequate heating system capacity',
          'Monitor humidity levels (winter air is dry)',
          'Check for drafts and heat loss'
        ],
        priority: 'high'
      },
      2: { // February
        seasonal: [
          'Continue peak winter maintenance',
          'Service heating system',
          'Check attic insulation and ventilation',
          'Inspect storm doors and windows',
          'Monitor energy usage'
        ],
        weatherSpecific: [
          'Prepare for potential severe winter weather',
          'Check ice and snow removal equipment',
          'Monitor heating system during cold snaps',
          'Check for winter damage to exterior',
          'Ensure proper ventilation during heating'
        ],
        priority: 'high'
      },
      3: { // March
        seasonal: [
          'Begin spring transition planning',
          'Check HVAC system for seasonal change',
          'Inspect exterior for winter damage',
          'Begin spring cleaning preparation',
          'Check outdoor equipment for spring startup'
        ],
        weatherSpecific: [
          'Monitor for spring flooding potential',
          'Check basement and foundation drainage',
          'Inspect roof for winter damage',
          'Begin severe weather season preparation',
          'Check sump pump operation'
        ],
        priority: 'medium'
      },
      4: { // April
        seasonal: [
          'Complete spring maintenance tasks',
          'Service air conditioning system',
          'Deep clean interior after winter',
          'Clean and inspect gutters',
          'Check exterior paint and maintenance needs'
        ],
        weatherSpecific: [
          'Prepare for tornado season',
          'Check severe weather preparedness',
          'Monitor for spring flooding',
          'Inspect drainage systems',
          'Check storm shelter or safe room'
        ],
        priority: 'high'
      },
      5: { // May
        seasonal: [
          'Peak tornado season preparation',
          'Complete outdoor maintenance',
          'Service lawn equipment and tools',
          'Check and maintain deck/patio',
          'Inspect screens and outdoor furniture'
        ],
        weatherSpecific: [
          'Peak tornado season vigilance',
          'Check severe weather warning systems',
          'Prepare air conditioning for summer heat',
          'Monitor for hail and storm damage',
          'Check emergency supplies and communications'
        ],
        priority: 'high'
      },
      6: { // June
        seasonal: [
          'Begin summer cooling season',
          'Monitor air conditioning efficiency',
          'Maintain outdoor living spaces',
          'Check attic ventilation',
          'Inspect and maintain pool if applicable'
        ],
        weatherSpecific: [
          'Continue tornado season vigilance',
          'Prepare for summer heat and humidity',
          'Monitor cooling system capacity',
          'Check for severe weather damage',
          'Inspect outdoor electrical systems'
        ],
        priority: 'high'
      },
      7: { // July
        seasonal: [
          'Peak summer heat maintenance',
          'Monitor energy efficiency',
          'Maintain cooling systems',
          'Check outdoor equipment and furniture',
          'Inspect for heat-related expansion'
        ],
        weatherSpecific: [
          'Monitor air conditioning during heat waves',
          'Check humidity control systems',
          'Prepare for potential severe summer storms',
          'Monitor energy usage during peak cooling',
          'Check heat stress on exterior materials'
        ],
        priority: 'high'
      },
      8: { // August
        seasonal: [
          'Continue peak summer maintenance',
          'Monitor cooling system performance',
          'Check and maintain outdoor areas',
          'Inspect exterior for summer damage',
          'Prepare for fall transition'
        ],
        weatherSpecific: [
          'Continue monitoring extreme heat effects',
          'Check cooling system efficiency',
          'Monitor for late summer storms',
          'Check outdoor water systems',
          'Begin fall preparation planning'
        ],
        priority: 'high'
      },
      9: { // September
        seasonal: [
          'Begin fall preparation',
          'Schedule heating system service',
          'Check weatherproofing and insulation',
          'Clean gutters before autumn',
          'Inspect exterior maintenance needs'
        ],
        weatherSpecific: [
          'Prepare for rapid temperature changes',
          'Transition HVAC systems for fall',
          'Monitor for early frost protection',
          'Check heating system before cold weather',
          'Inspect for summer damage repairs'
        ],
        priority: 'medium'
      },
      10: { // October
        seasonal: [
          'Complete fall preparation',
          'Service heating system for winter',
          'Winterize outdoor water systems',
          'Clean and maintain gutters',
          'Check storm windows and doors'
        ],
        weatherSpecific: [
          'Prepare for first freeze',
          'Check insulation before cold weather',
          'Inspect heating system capacity',
          'Winterize outdoor equipment',
          'Check foundation and basement preparation'
        ],
        priority: 'high'
      },
      11: { // November
        seasonal: [
          'Complete winter preparation',
          'Test heating system thoroughly',
          'Check insulation and weatherproofing',
          'Store outdoor furniture and equipment',
          'Check holiday decoration safety'
        ],
        weatherSpecific: [
          'Prepare for cold winter conditions',
          'Check heating system efficiency',
          'Monitor for early winter storms',
          'Check ice and snow removal preparation',
          'Ensure emergency heating backup'
        ],
        priority: 'high'
      },
      12: { // December
        seasonal: [
          'Monitor heating system performance',
          'Check holiday decorations and lighting',
          'Test carbon monoxide and smoke detectors',
          'Maintain winter preparations',
          'Monitor energy usage'
        ],
        weatherSpecific: [
          'Monitor heating during cold snaps',
          'Check for winter storm preparation',
          'Monitor ice and snow effects on home',
          'Check emergency supplies',
          'Ensure proper ventilation during heating'
        ],
        priority: 'high'
      }
    },
    yearRoundTasks: [
      'Test smoke and carbon monoxide detectors monthly',
      'Check HVAC filters monthly',
      'Inspect for seasonal weather damage quarterly',
      'Check sump pump operation seasonally',
      'Professional HVAC service twice yearly'
    ],
    specialConsiderations: [
      'Tornado season preparation (April-June)',
      'Extreme temperature variations (-20°F to 100°F+)',
      'Severe winter weather preparation',
      'Flooding and severe storm management',
      'High seasonal HVAC demands'
    ]
  },
  'Southwest': {
    region: 'Southwest',
    climateZone: 'Arid/Desert',
    monthlyTasks: {
      1: { // January
        seasonal: [
          'Monitor heating system for cool season',
          'Check weatherstripping and insulation',
          'Inspect exterior for UV and heat damage',
          'Test carbon monoxide detectors',
          'Check attic insulation'
        ],
        weatherSpecific: [
          'Monitor for occasional freeze protection',
          'Check heating system for winter use',
          'Inspect for winter wind damage',
          'Check pool heating systems if applicable',
          'Monitor humidity levels (winter air is very dry)'
        ],
        priority: 'medium'
      },
      2: { // February
        seasonal: [
          'Begin early spring preparation',
          'Check irrigation and water systems',
          'Inspect exterior paint for UV damage',
          'Check pool and spa equipment',
          'Clean and maintain outdoor areas'
        ],
        weatherSpecific: [
          'Prepare for increasing UV exposure',
          'Check water conservation systems',
          'Inspect for wind and dust damage',
          'Monitor for pest activity increase',
          'Check outdoor electrical connections'
        ],
        priority: 'medium'
      },
      3: { // March
        seasonal: [
          'Begin spring cleaning and maintenance',
          'Service air conditioning system early',
          'Check and clean outdoor equipment',
          'Inspect deck and outdoor structures',
          'Maintain landscaping and irrigation'
        ],
        weatherSpecific: [
          'Prepare cooling system for heat season',
          'Check dust and sand filtration systems',
          'Monitor water usage and conservation',
          'Inspect for increasing pest activity',
          'Check outdoor UV protection measures'
        ],
        priority: 'medium'
      },
      4: { // April
        seasonal: [
          'Complete air conditioning preparation',
          'Deep clean interior before heat season',
          'Check attic ventilation and insulation',
          'Maintain pool and outdoor systems',
          'Inspect exterior for heat preparation'
        ],
        weatherSpecific: [
          'Prepare for extreme heat season',
          'Check cooling system capacity',
          'Monitor dust storm preparation',
          'Check water systems for increased demand',
          'Inspect outdoor equipment heat protection'
        ],
        priority: 'high'
      },
      5: { // May
        seasonal: [
          'Begin peak cooling season preparation',
          'Monitor air conditioning efficiency',
          'Maintain outdoor living spaces',
          'Check pool and water systems',
          'Inspect exterior heat protection'
        ],
        weatherSpecific: [
          'Prepare for extreme heat (100°F+)',
          'Check cooling system for peak demand',
          'Monitor dust and sand infiltration',
          'Check water conservation measures',
          'Inspect heat-resistant exterior materials'
        ],
        priority: 'high'
      },
      6: { // June
        seasonal: [
          'Peak air conditioning season begins',
          'Monitor energy efficiency',
          'Maintain pool and cooling systems',
          'Check attic ventilation',
          'Inspect outdoor equipment protection'
        ],
        weatherSpecific: [
          'Peak heat season preparation (110°F+)',
          'Monitor air conditioning capacity',
          'Check monsoon season preparation',
          'Inspect dust storm damage prevention',
          'Check outdoor water and cooling systems'
        ],
        priority: 'high'
      },
      7: { // July
        seasonal: [
          'Peak summer heat maintenance',
          'Monitor cooling system performance',
          'Check monsoon damage prevention',
          'Maintain pool and outdoor systems',
          'Inspect heat stress on home materials'
        ],
        weatherSpecific: [
          'Monsoon season preparation',
          'Monitor extreme heat effects (115°F+)',
          'Check flash flood preparation',
          'Monitor dust storm and wind damage',
          'Check cooling system during peak demand'
        ],
        priority: 'high'
      },
      8: { // August
        seasonal: [
          'Continue peak heat maintenance',
          'Monitor monsoon damage',
          'Check cooling system efficiency',
          'Maintain outdoor equipment protection',
          'Inspect for heat and UV damage'
        ],
        weatherSpecific: [
          'Peak monsoon season vigilance',
          'Monitor flash flood risks',
          'Check extreme heat protection measures',
          'Monitor dust and debris cleanup',
          'Check cooling system during storms'
        ],
        priority: 'high'
      },
      9: { // September
        seasonal: [
          'Continue monsoon season vigilance',
          'Monitor cooling system performance',
          'Check for summer damage',
          'Maintain outdoor areas',
          'Begin gradual fall preparation'
        ],
        weatherSpecific: [
          'Late monsoon season monitoring',
          'Check heat stress damage from summer',
          'Monitor for flash flood damage',
          'Check dust and debris accumulation',
          'Continue extreme heat protection'
        ],
        priority: 'high'
      },
      10: { // October
        seasonal: [
          'Begin transition to cooler season',
          'Check heating system preparation',
          'Clean and maintain outdoor areas',
          'Inspect exterior for summer damage',
          'Check pool heating systems'
        ],
        weatherSpecific: [
          'End of extreme heat season',
          'Check UV and heat damage repairs',
          'Monitor for pleasant weather maintenance',
          'Check dust and sand cleanup',
          'Prepare for mild winter conditions'
        ],
        priority: 'medium'
      },
      11: { // November
        seasonal: [
          'Enjoy pleasant weather for maintenance',
          'Check heating system for winter',
          'Complete exterior maintenance',
          'Check weatherproofing',
          'Maintain outdoor living areas'
        ],
        weatherSpecific: [
          'Optimal weather for outdoor maintenance',
          'Check heating system for cool season',
          'Monitor for mild winter preparation',
          'Check dust and allergen control',
          'Inspect for reduced pest activity'
        ],
        priority: 'medium'
      },
      12: { // December
        seasonal: [
          'Monitor heating system performance',
          'Check holiday decorations and lighting',
          'Maintain mild winter conditions',
          'Test smoke and carbon monoxide detectors',
          'Check pool and spa heating'
        ],
        weatherSpecific: [
          'Monitor for cool weather conditions',
          'Check heating system during cold snaps',
          'Prepare for occasional winter storms',
          'Monitor humidity levels (very dry)',
          'Check for minimal freeze protection'
        ],
        priority: 'medium'
      }
    },
    yearRoundTasks: [
      'Test smoke and carbon monoxide detectors monthly',
      'Check HVAC filters frequently (dust/sand)',
      'Monitor water conservation systems monthly',
      'Check pool and cooling systems regularly',
      'Inspect for UV and heat damage quarterly'
    ],
    specialConsiderations: [
      'Extreme heat management (100°F+ regularly)',
      'Monsoon season preparation (July-September)',
      'Water conservation and management',
      'UV and sun damage prevention',
      'Dust storm and sand infiltration control'
    ]
  },
  'West Coast': {
    region: 'West Coast',
    climateZone: 'Mediterranean/Marine West Coast',
    monthlyTasks: {
      1: { // January
        seasonal: [
          'Monitor heating system for cool season',
          'Check for winter storm damage',
          'Inspect weatherstripping',
          'Test carbon monoxide detectors',
          'Check attic insulation and ventilation'
        ],
        weatherSpecific: [
          'Monitor for winter storm and wind damage',
          'Check earthquake preparedness supplies',
          'Inspect for rain and moisture damage',
          'Check heating system for cool weather',
          'Monitor for mudslide and flooding risks'
        ],
        priority: 'medium'
      },
      2: { // February
        seasonal: [
          'Continue winter storm monitoring',
          'Check drainage systems',
          'Inspect exterior for weather damage',
          'Check and clean gutters',
          'Maintain fireplace and chimney'
        ],
        weatherSpecific: [
          'Peak winter storm season',
          'Monitor for flooding and water damage',
          'Check earthquake preparedness',
          'Inspect for wind damage',
          'Check moisture and mold prevention'
        ],
        priority: 'medium'
      },
      3: { // March
        seasonal: [
          'Begin spring maintenance',
          'Check irrigation systems',
          'Inspect exterior paint and siding',
          'Clean and maintain outdoor areas',
          'Check pool and spa systems'
        ],
        weatherSpecific: [
          'Monitor for late winter storms',
          'Check wildfire preparedness',
          'Inspect for moisture damage from winter',
          'Check drought-resistant landscaping',
          'Monitor for increased pest activity'
        ],
        priority: 'medium'
      },
      4: { // April
        seasonal: [
          'Complete spring maintenance tasks',
          'Service air conditioning system',
          'Deep clean interior and exterior',
          'Check and maintain deck/patio',
          'Inspect screens and outdoor furniture'
        ],
        weatherSpecific: [
          'Begin wildfire season preparation',
          'Check fire suppression systems',
          'Monitor drought conditions',
          'Check outdoor water conservation',
          'Inspect for earthquake safety updates'
        ],
        priority: 'medium'
      },
      5: { // May
        seasonal: [
          'Begin wildfire season preparation',
          'Maintain air conditioning system',
          'Check outdoor equipment and furniture',
          'Maintain landscaping with water conservation',
          'Inspect deck and outdoor structures'
        ],
        weatherSpecific: [
          'Peak wildfire season preparation',
          'Check defensible space around home',
          'Monitor drought and water restrictions',
          'Check fire-resistant landscaping',
          'Inspect evacuation route planning'
        ],
        priority: 'high'
      },
      6: { // June
        seasonal: [
          'Peak wildfire season vigilance',
          'Monitor air conditioning efficiency',
          'Maintain outdoor living spaces',
          'Check pool and water systems',
          'Inspect exterior for fire safety'
        ],
        weatherSpecific: [
          'Peak wildfire season (June-October)',
          'Monitor fire danger conditions',
          'Check air quality systems',
          'Maintain defensible space',
          'Check emergency evacuation supplies'
        ],
        priority: 'high'
      },
      7: { // July
        seasonal: [
          'Continue wildfire vigilance',
          'Monitor cooling system efficiency',
          'Maintain fire-safe landscaping',
          'Check outdoor equipment protection',
          'Inspect air quality systems'
        ],
        weatherSpecific: [
          'Peak wildfire danger period',
          'Monitor air quality during fires',
          'Check fire suppression readiness',
          'Maintain defensible space',
          'Monitor drought stress on landscaping'
        ],
        priority: 'high'
      },
      8: { // August
        seasonal: [
          'Continue peak wildfire season vigilance',
          'Monitor air conditioning performance',
          'Check fire-resistant exterior materials',
          'Maintain outdoor areas safely',
          'Inspect emergency preparedness'
        ],
        weatherSpecific: [
          'Peak wildfire season continues',
          'Monitor extreme fire danger conditions',
          'Check air filtration during fire season',
          'Maintain clear evacuation routes',
          'Monitor water usage restrictions'
        ],
        priority: 'high'
      },
      9: { // September
        seasonal: [
          'Continue wildfire season vigilance',
          'Check heating system preparation',
          'Monitor air quality systems',
          'Maintain fire-safe practices',
          'Inspect exterior maintenance needs'
        ],
        weatherSpecific: [
          'Peak wildfire season continues',
          'Monitor for Santa Ana wind conditions',
          'Check fire safety equipment',
          'Monitor air quality and filtration',
          'Check earthquake preparedness updates'
        ],
        priority: 'high'
      },
      10: { // October
        seasonal: [
          'Continue wildfire vigilance',
          'Begin heating system preparation',
          'Clean gutters before winter rains',
          'Check weatherproofing',
          'Maintain outdoor areas'
        ],
        weatherSpecific: [
          'Peak wildfire season continues',
          'Monitor for dry wind conditions',
          'Prepare for winter storm season',
          'Check fire and flood preparedness',
          'Monitor for earthquake safety'
        ],
        priority: 'high'
      },
      11: { // November
        seasonal: [
          'End of wildfire season vigilance',
          'Prepare for winter storm season',
          'Check heating system operation',
          'Clean and maintain outdoor areas',
          'Check holiday decoration safety'
        ],
        weatherSpecific: [
          'Transition from fire to flood season',
          'Check winter storm preparedness',
          'Monitor for mudslide risks',
          'Check heating system for winter',
          'Inspect for fire season damage'
        ],
        priority: 'medium'
      },
      12: { // December
        seasonal: [
          'Monitor heating system performance',
          'Check winter storm preparation',
          'Test smoke and carbon monoxide detectors',
          'Check holiday decorations safety',
          'Maintain mild winter conditions'
        ],
        weatherSpecific: [
          'Winter storm season begins',
          'Monitor for flooding and wind damage',
          'Check earthquake preparedness supplies',
          'Monitor heating during cool weather',
          'Check moisture control during rains'
        ],
        priority: 'medium'
      }
    },
    yearRoundTasks: [
      'Test smoke and carbon monoxide detectors monthly',
      'Check earthquake emergency supplies quarterly',
      'Monitor air quality systems regularly',
      'Check water conservation systems monthly',
      'Professional HVAC service twice yearly'
    ],
    specialConsiderations: [
      'Wildfire season preparation (May-October)',
      'Earthquake preparedness and safety',
      'Water conservation and drought management',
      'Air quality monitoring during fire season',
      'Mudslide and flood risk management'
    ]
  },
  'Mountain West': {
    region: 'Mountain West',
    climateZone: 'High Desert/Alpine',
    monthlyTasks: {
      1: { // January
        seasonal: [
          'Peak winter heating season',
          'Check heating system efficiency',
          'Monitor for extreme cold effects',
          'Inspect fireplace and chimney',
          'Check insulation and weatherproofing'
        ],
        weatherSpecific: [
          'Extreme cold weather preparation (-20°F+)',
          'Check for ice dam formation',
          'Monitor heating system during cold snaps',
          'Check altitude-specific considerations',
          'Monitor for winter storm damage'
        ],
        priority: 'high'
      },
      2: { // February
        seasonal: [
          'Continue peak winter maintenance',
          'Check heating system performance',
          'Monitor energy usage efficiency',
          'Check attic insulation and ventilation',
          'Inspect for winter damage'
        ],
        weatherSpecific: [
          'Monitor for extreme weather conditions',
          'Check snow load on roof structures',
          'Monitor heating efficiency at altitude',
          'Check for winter storm preparation',
          'Monitor for avalanche safety if applicable'
        ],
        priority: 'high'
      },
      3: { // March
        seasonal: [
          'Begin spring preparation',
          'Check HVAC system transition',
          'Inspect exterior for winter damage',
          'Begin outdoor equipment preparation',
          'Check water systems for spring thaw'
        ],
        weatherSpecific: [
          'Monitor for spring flooding from snowmelt',
          'Check foundation drainage systems',
          'Prepare for rapid weather changes',
          'Monitor altitude weather effects',
          'Check for spring storm preparation'
        ],
        priority: 'medium'
      },
      4: { // April
        seasonal: [
          'Complete spring maintenance',
          'Service air conditioning system',
          'Clean and inspect outdoor areas',
          'Check irrigation and water systems',
          'Inspect exterior paint and maintenance'
        ],
        weatherSpecific: [
          'Monitor for spring storms and flooding',
          'Check wildfire preparedness',
          'Monitor for rapid temperature changes',
          'Check outdoor equipment for altitude',
          'Prepare for severe weather season'
        ],
        priority: 'medium'
      },
      5: { // May
        seasonal: [
          'Begin wildfire season preparation',
          'Complete outdoor maintenance',
          'Service lawn and garden equipment',
          'Check deck and outdoor structures',
          'Maintain outdoor living areas'
        ],
        weatherSpecific: [
          'Begin wildfire season vigilance',
          'Check fire suppression systems',
          'Monitor drought conditions',
          'Check defensible space maintenance',
          'Prepare for altitude weather changes'
        ],
        priority: 'high'
      },
      6: { // June
        seasonal: [
          'Peak wildfire season preparation',
          'Monitor air conditioning efficiency',
          'Maintain outdoor equipment',
          'Check pool and water systems',
          'Inspect fire-safe landscaping'
        ],
        weatherSpecific: [
          'Peak wildfire season (June-September)',
          'Monitor fire danger at altitude',
          'Check air quality systems',
          'Monitor water usage and conservation',
          'Check emergency evacuation planning'
        ],
        priority: 'high'
      },
      7: { // July
        seasonal: [
          'Continue wildfire vigilance',
          'Monitor cooling system efficiency',
          'Maintain fire-safe practices',
          'Check outdoor equipment protection',
          'Inspect air quality management'
        ],
        weatherSpecific: [
          'Peak wildfire season continues',
          'Monitor for lightning-caused fires',
          'Check monsoon preparation in some areas',
          'Monitor air quality during fires',
          'Check altitude-specific fire risks'
        ],
        priority: 'high'
      },
      8: { // August
        seasonal: [
          'Continue peak wildfire season',
          'Monitor cooling system performance',
          'Check for summer damage',
          'Maintain outdoor areas safely',
          'Prepare for fall transition'
        ],
        weatherSpecific: [
          'Peak wildfire danger continues',
          'Monitor for dry lightning storms',
          'Check fire suppression readiness',
          'Monitor monsoon effects if applicable',
          'Check altitude weather monitoring'
        ],
        priority: 'high'
      },
      9: { // September
        seasonal: [
          'Continue wildfire vigilance',
          'Begin fall preparation',
          'Check heating system preparation',
          'Monitor outdoor equipment',
          'Inspect exterior maintenance needs'
        ],
        weatherSpecific: [
          'Wildfire season continues',
          'Prepare for rapid fall weather changes',
          'Monitor for early winter preparation',
          'Check altitude-specific fall risks',
          'Begin winter storm preparation'
        ],
        priority: 'high'
      },
      10: { // October
        seasonal: [
          'End wildfire season vigilance',
          'Complete fall preparation',
          'Service heating system for winter',
          'Check insulation and weatherproofing',
          'Winterize outdoor water systems'
        ],
        weatherSpecific: [
          'Prepare for rapid temperature drops',
          'Check heating system for altitude',
          'Monitor for early winter storms',
          'Prepare for potential extreme cold',
          'Check winter storm supplies'
        ],
        priority: 'high'
      },
      11: { // November
        seasonal: [
          'Complete winter preparation',
          'Test heating system thoroughly',
          'Check winter emergency supplies',
          'Store outdoor equipment',
          'Check holiday decoration safety'
        ],
        weatherSpecific: [
          'Prepare for extreme winter conditions',
          'Check heating efficiency at altitude',
          'Monitor for winter storm preparation',
          'Check emergency backup systems',
          'Prepare for potential isolation conditions'
        ],
        priority: 'high'
      },
      12: { // December
        seasonal: [
          'Monitor heating system performance',
          'Check winter storm preparation',
          'Test emergency systems',
          'Monitor energy usage',
          'Check holiday safety measures'
        ],
        weatherSpecific: [
          'Peak winter weather monitoring',
          'Check extreme cold preparations',
          'Monitor heating during severe weather',
          'Check emergency supplies access',
          'Monitor for winter storm effects'
        ],
        priority: 'high'
      }
    },
    yearRoundTasks: [
      'Test smoke and carbon monoxide detectors monthly',
      'Check HVAC filters monthly (altitude effects)',
      'Monitor emergency supplies quarterly',
      'Check altitude-specific equipment annually',
      'Professional HVAC service twice yearly'
    ],
    specialConsiderations: [
      'Extreme temperature variations (-30°F to 100°F+)',
      'Wildfire season preparation (May-September)',
      'Altitude effects on HVAC and equipment',
      'Winter storm and isolation preparation',
      'UV exposure at high altitude'
    ]
  },
  'Pacific Northwest': {
    region: 'Pacific Northwest',
    climateZone: 'Marine West Coast',
    monthlyTasks: {
      1: { // January
        seasonal: [
          'Monitor heating system for cool, wet season',
          'Check for winter storm damage',
          'Inspect weatherstripping and insulation',
          'Test carbon monoxide detectors',
          'Check moisture control systems'
        ],
        weatherSpecific: [
          'Peak winter storm season',
          'Monitor for flooding and wind damage',
          'Check moisture and mold prevention',
          'Monitor heating during wet conditions',
          'Check earthquake preparedness'
        ],
        priority: 'medium'
      },
      2: { // February
        seasonal: [
          'Continue winter storm monitoring',
          'Check drainage and water management',
          'Inspect exterior for moisture damage',
          'Maintain heating system efficiency',
          'Check attic ventilation'
        ],
        weatherSpecific: [
          'Continue winter storm vigilance',
          'Monitor for water and moisture damage',
          'Check mold and mildew prevention',
          'Monitor heating system performance',
          'Check for wind damage'
        ],
        priority: 'medium'
      },
      3: { // March
        seasonal: [
          'Begin spring maintenance',
          'Check drainage systems thoroughly',
          'Inspect exterior paint for weather damage',
          'Clean gutters and downspouts',
          'Check outdoor equipment'
        ],
        weatherSpecific: [
          'Monitor for flooding from spring rains',
          'Check moisture control throughout home',
          'Prepare for increasing daylight',
          'Monitor for mold and mildew issues',
          'Check earthquake preparedness updates'
        ],
        priority: 'medium'
      },
      4: { // April
        seasonal: [
          'Complete spring cleaning',
          'Service air conditioning if applicable',
          'Deep clean to remove winter moisture',
          'Check outdoor living areas',
          'Maintain landscaping drainage'
        ],
        weatherSpecific: [
          'Monitor for continued rain and moisture',
          'Check air quality and ventilation',
          'Prepare for mild warming trend',
          'Check for pest activity increase',
          'Monitor wildfire preparedness'
        ],
        priority: 'medium'
      },
      5: { // May
        seasonal: [
          'Begin wildfire season preparation',
          'Maintain outdoor equipment and areas',
          'Check air conditioning preparation',
          'Inspect deck and outdoor structures',
          'Check water conservation systems'
        ],
        weatherSpecific: [
          'Begin dry season and wildfire preparation',
          'Check air quality monitoring systems',
          'Monitor drought preparation',
          'Check fire suppression systems',
          'Prepare for warm, dry weather'
        ],
        priority: 'medium'
      },
      6: { // June
        seasonal: [
          'Wildfire season vigilance begins',
          'Monitor air conditioning efficiency',
          'Maintain fire-safe landscaping',
          'Check outdoor water systems',
          'Inspect exterior for summer preparation'
        ],
        weatherSpecific: [
          'Begin dry season and wildfire vigilance',
          'Monitor air quality during fire season',
          'Check drought-resistant landscaping',
          'Prepare for warm, dry conditions',
          'Check defensible space maintenance'
        ],
        priority: 'high'
      },
      7: { // July
        seasonal: [
          'Peak dry season and wildfire vigilance',
          'Monitor cooling system if needed',
          'Maintain water conservation',
          'Check fire-safe practices',
          'Inspect outdoor equipment protection'
        ],
        weatherSpecific: [
          'Peak dry season and wildfire risk',
          'Monitor extreme fire danger',
          'Check air filtration systems',
          'Monitor water usage restrictions',
          'Check emergency evacuation planning'
        ],
        priority: 'high'
      },
      8: { // August
        seasonal: [
          'Continue wildfire season vigilance',
          'Monitor cooling systems',
          'Maintain fire-safe outdoor areas',
          'Check water conservation measures',
          'Prepare for fall transition'
        ],
        weatherSpecific: [
          'Peak wildfire season continues',
          'Monitor air quality during fires',
          'Check fire suppression readiness',
          'Monitor drought stress effects',
          'Prepare for smoke management'
        ],
        priority: 'high'
      },
      9: { // September
        seasonal: [
          'Continue wildfire vigilance',
          'Begin fall preparation',
          'Check heating system preparation',
          'Monitor air quality systems',
          'Inspect for summer damage'
        ],
        weatherSpecific: [
          'Wildfire season continues',
          'Begin transition to wet season',
          'Monitor for early fall rains',
          'Check air quality and filtration',
          'Prepare for weather transition'
        ],
        priority: 'high'
      },
      10: { // October
        seasonal: [
          'End wildfire season vigilance',
          'Begin winter storm preparation',
          'Check heating system operation',
          'Clean gutters before winter rains',
          'Check weatherproofing'
        ],
        weatherSpecific: [
          'Transition from dry to wet season',
          'Begin winter storm preparation',
          'Check moisture control systems',
          'Prepare for increasing rainfall',
          'Monitor for earthquake preparedness'
        ],
        priority: 'medium'
      },
      11: { // November
        seasonal: [
          'Complete winter storm preparation',
          'Check heating system efficiency',
          'Prepare moisture control systems',
          'Check outdoor equipment storage',
          'Inspect holiday decoration safety'
        ],
        weatherSpecific: [
          'Begin peak wet season',
          'Check drainage and water management',
          'Monitor heating system for wet conditions',
          'Prepare for wind and storm damage',
          'Check mold and mildew prevention'
        ],
        priority: 'medium'
      },
      12: { // December
        seasonal: [
          'Monitor heating system performance',
          'Check winter storm damage prevention',
          'Test emergency systems',
          'Monitor moisture control',
          'Check holiday safety measures'
        ],
        weatherSpecific: [
          'Peak winter storm season begins',
          'Monitor for flooding and wind damage',
          'Check heating efficiency during storms',
          'Monitor moisture and mold control',
          'Check earthquake emergency supplies'
        ],
        priority: 'medium'
      }
    },
    yearRoundTasks: [
      'Test smoke and carbon monoxide detectors monthly',
      'Check moisture control systems monthly',
      'Monitor air quality during fire season',
      'Check earthquake emergency supplies quarterly',
      'Professional HVAC service twice yearly'
    ],
    specialConsiderations: [
      'Wildfire season preparation (June-September)',
      'Year-round moisture and mold management',
      'Earthquake preparedness and safety',
      'Winter storm and wind damage management',
      'Air quality monitoring during fire season'
    ]
  }
};

// Helper function to determine region from climate zone
export function getRegionFromClimateZone(climateZone: string): string {
  const regionMappings: { [key: string]: string } = {
    '1': 'Northeast',
    '2': 'Southeast', 
    '3': 'Southeast',
    '4': 'Midwest',
    '5': 'Midwest',
    '6': 'Mountain West',
    '7': 'Southwest',
    '8': 'West Coast'
  };
  
  return regionMappings[climateZone] || 'Midwest';
}

// Helper function to get current month tasks
export function getCurrentMonthTasks(region: string, month: number) {
  const regionData = US_MAINTENANCE_DATA[region];
  if (!regionData) return null;
  
  return regionData.monthlyTasks[month] || null;
}

// Helper function to get region-specific considerations
export function getRegionConsiderations(region: string) {
  const regionData = US_MAINTENANCE_DATA[region];
  if (!regionData) return [];
  
  return regionData.specialConsiderations;
}