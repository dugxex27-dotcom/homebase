// Geographic and seasonal maintenance recommendations for US regions
import { CostEstimate } from './cost-baselines';

export interface MaintenanceTaskItem {
  title: string;
  description: string;
  priority?: 'high' | 'medium' | 'low'; // Task-specific priority (defaults to month priority if not set)
  actionSummary?: string; // Single sentence action summary (e.g., "Do these 3 quick checks to winterize your home")
  steps?: string[]; // Bullet point steps to complete the task
  toolsAndSupplies?: string[]; // Tools and supplies needed checklist
  costEstimate?: CostEstimate; // Optional professional cost estimate and DIY materials cost
  impact?: string; // What happens if this task is not completed
  impactCost?: string; // Potential costs if task is not done
}

export interface LocationMaintenanceData {
  region: string;
  climateZone: string;
  monthlyTasks: {
    [month: number]: {
      seasonal: MaintenanceTaskItem[];
      weatherSpecific: MaintenanceTaskItem[];
      priority: 'high' | 'medium' | 'low';
    };
  };
  yearRoundTasks: MaintenanceTaskItem[];
  specialConsiderations: string[];
}

export const US_MAINTENANCE_DATA: { [key: string]: LocationMaintenanceData } = {
  'Northeast': {
    region: 'Northeast',
    climateZone: 'Cold/Humid Continental',
    monthlyTasks: {
      1: { // January
        seasonal: [
          { 
            title: 'Check heating system efficiency', 
            description: 'Ensure your heating system is running efficiently during peak winter. Check thermostat settings, listen for unusual noises, and verify all vents are open and unobstructed. Consider scheduling professional maintenance if performance seems reduced.', 
            priority: 'high',
            actionSummary: 'Do these 3 quick checks to ensure your heating system runs efficiently all winter.',
            steps: [
              'Check thermostat settings and verify temperature is accurate',
              'Listen for unusual noises like banging, squealing, or rattling',
              'Verify all vents throughout your home are open and unobstructed'
            ],
            toolsAndSupplies: ['Flashlight', 'Notepad (for noting issues)'],
            impact: 'An inefficient or malfunctioning heating system can lead to complete system failure in the middle of winter, leaving your home without heat. This can cause frozen pipes, uncomfortable living conditions, and significantly higher energy bills.', 
            impactCost: '$3,000 - $8,000 for emergency furnace replacement; $500 - $2,000 for frozen pipe repairs' 
          },
          { title: 'Inspect and clean fireplace/chimney', description: 'Remove ash buildup from fireplace and inspect chimney for creosote deposits or blockages. Check damper operation and look for cracks in firebox. Schedule professional chimney sweep if heavily used.', priority: 'medium' },
          { 
            title: 'Check for ice dams on roof', 
            description: 'Look for icicles or ice buildup at roof edges that can cause water damage. Clear snow from gutters and roof edges if safe to do so. Ensure attic insulation and ventilation are adequate to prevent warm air from melting snow unevenly.', 
            priority: 'high',
            actionSummary: 'Inspect your roof for ice dams and take these 3 steps to prevent costly water damage.',
            steps: [
              'Look for large icicles or ice buildup along roof edges from the ground',
              'Safely clear snow from gutters using a roof rake (stay on the ground)',
              'Check attic for adequate insulation and proper ventilation',
              'Call a professional if you notice significant ice dams'
            ],
            toolsAndSupplies: ['Binoculars (for safe inspection)', 'Roof rake with extension pole', 'Flashlight (for attic check)'],
            impact: 'Ice dams can cause severe water damage to your roof, attic, walls, and ceilings. Melting water trapped behind ice can seep under shingles and into your home, leading to stained ceilings, peeling paint, damaged insulation, and potential mold growth.', 
            impactCost: '$2,000 - $10,000+ for water damage repairs and mold remediation' 
          },
          { title: 'Test carbon monoxide detectors', description: 'Press the test button on all CO detectors to verify they are working. Replace batteries if needed. Detectors should be placed near sleeping areas and on every level of your home.', priority: 'high' },
          { title: 'Inspect weatherstripping on doors and windows', description: 'Check all door and window seals for gaps, cracks, or worn areas. Replace damaged weatherstripping to prevent heat loss and drafts. Use a lit candle or incense stick near edges to detect air leaks.', priority: 'medium' },
          { 
            title: 'Inspect furnace filter and replace if dirty', 
            description: 'Remove furnace filter and hold it up to light - if you cannot see through it clearly, replace it. Dirty filters reduce efficiency and air quality. Most filters should be changed every 1-3 months during heating season.', 
            priority: 'high',
            actionSummary: 'Complete this 2-minute filter check to keep your furnace running safely and efficiently.',
            steps: [
              'Locate and remove your furnace filter',
              'Hold the filter up to a light source',
              'Replace if you cannot see light through the filter',
              'Mark your calendar to check again in 1-3 months'
            ],
            toolsAndSupplies: ['Replacement filter (check size first)', 'Permanent marker'],
            impact: 'Clogged filters force your furnace to work harder, increasing energy costs by 15-30% and risking system failure. Restricted airflow can cause the heat exchanger to overheat and crack, creating a carbon monoxide leak hazard.', 
            impactCost: '$1,500 - $4,000 for heat exchanger replacement; potential health risks from carbon monoxide exposure' 
          },
          { title: 'Test GFCI outlets in kitchen, bathrooms, garage, and exterior', description: 'Press the "test" button on each GFCI outlet - it should click and cut power. Then press "reset" to restore power. If it does not trip, the outlet needs replacement for safety.', priority: 'medium' },
          { title: 'Inspect sump pump (if applicable) — pour water to confirm it activates', description: 'Pour a bucket of water into the sump pit to ensure the pump activates and drains properly. Check that the discharge pipe is clear and draining away from your foundation. Clean the inlet screen if present.', priority: 'medium' },
          { title: 'Clean washing machine drain filter', description: 'Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, and debris, then replace the filter and test for leaks.', priority: 'low' }
        ],
        weatherSpecific: [
          { title: 'Remove snow from roof if excessive buildup', description: 'If snow accumulation exceeds 2 feet or you notice sagging, carefully remove snow using a roof rake from the ground. Never climb on a snow-covered roof. Focus on removing snow from roof edges to prevent ice dams.', priority: 'high' },
          { 
            title: 'Check pipes for freezing in unheated areas', 
            description: 'Inspect pipes in basements, crawl spaces, attics, and exterior walls. Feel pipes for cold spots. Let faucets drip slightly during extreme cold. Open cabinet doors under sinks to allow warm air circulation.', 
            priority: 'high',
            actionSummary: 'Take these 4 preventive steps to protect your pipes from freezing and bursting.',
            steps: [
              'Inspect pipes in basement, crawl spaces, attic, and along exterior walls',
              'Feel pipes for cold spots - they should be warm to touch',
              'During extreme cold, let faucets drip slightly (hot and cold)',
              'Open cabinet doors under sinks to allow warm air to circulate around pipes'
            ],
            toolsAndSupplies: ['Flashlight', 'Pipe insulation foam (if cold spots found)', 'Space heater (for extreme situations)'],
            impact: 'Frozen pipes can burst, causing catastrophic water damage throughout your home. A single burst pipe can release hundreds of gallons of water per hour, damaging floors, walls, furniture, and personal belongings. Insurance claims often denied if preventive measures weren\'t taken.', 
            impactCost: '$5,000 - $70,000+ for water damage restoration, pipe repair, and contents replacement' 
          },
          { title: 'Ensure adequate insulation in attic and basement', description: 'Check attic insulation depth - it should be at least 10-14 inches for cold climates. Look for gaps or compressed areas. Ensure basement rim joists and walls are insulated. Add insulation where needed to prevent heat loss.', priority: 'medium' },
          { title: 'Monitor humidity levels (30-50%)', description: 'Use a hygrometer to check indoor humidity. Too low causes dry skin and static; too high causes condensation and mold. Run a humidifier if too dry, or improve ventilation and use a dehumidifier if too humid.', priority: 'low' },
          { title: 'Check for drafts around windows and doors', description: 'On a windy day, hold a lit candle or incense stick near window and door edges. If smoke wavers, you have air leaks. Seal gaps with caulk or weatherstripping. Consider using temporary plastic window insulation kits.', priority: 'medium' }
        ],
        priority: 'high'
      },
      2: { // February
        seasonal: [
          { title: 'Service heating system before peak winter ends', description: 'Schedule a professional HVAC technician to inspect your furnace or boiler for efficiency and safety. They will check burners, heat exchangers, and electrical components. Address any issues now before the system shuts down for spring.', priority: 'high' },
          { title: 'Check attic insulation and ventilation', description: 'Inspect attic insulation for proper depth (10-14 inches minimum in cold climates) and look for compressed or missing areas. Ensure soffit vents and ridge vents are clear of snow and debris to prevent moisture buildup and ice dams.', priority: 'medium' },
          { title: 'Inspect roof for winter damage', description: 'From the ground or with binoculars, look for missing, cracked, or curled shingles caused by ice and snow. Check flashing around chimneys and vents. Call a professional roofer for any visible damage to prevent leaks.', priority: 'high' },
          { title: 'Test sump pump if applicable', description: 'Pour a bucket of water into the sump pit to ensure the pump activates and drains properly. Check that the discharge pipe is clear and draining away from your foundation. Clean the inlet screen if present.', priority: 'medium' },
          { title: 'Check storm doors and windows', description: 'Inspect weatherstripping and seals on storm doors and windows for gaps or damage. Tighten loose hinges and closers. Clean tracks and ensure proper operation. Replace damaged weatherstripping before spring.', priority: 'low' },
          { title: 'Test GFCI/AFCI circuit breakers in electrical panel', description: 'Open your electrical panel and press the "test" button on each GFCI and AFCI breaker - it should trip. Then flip it back to "on." If any breaker fails to trip or won\'t reset, call an electrician immediately.', priority: 'high' },
          { title: 'Inspect water heater for leaks and check temperature (~120°F)', description: 'Look around the base of your water heater for puddles or rust. Use a thermometer on hot tap water or check the thermostat setting - it should be around 120°F to prevent scalding and save energy. Wipe away any moisture and monitor.', priority: 'medium' },
          { title: 'Flush toilets and sinks that aren\'t used often to prevent dry traps', description: 'Run water in guest bathrooms, basement sinks, and other rarely used fixtures for 30 seconds. This refills the drain trap and prevents sewer gases from entering your home. Do this monthly for unused fixtures.', priority: 'low' },
          { title: 'Check bathroom exhaust fans for proper airflow', description: 'Turn on each bathroom fan and hold a tissue near the grille - it should be pulled against the vent. Clean the grille with a vacuum attachment. Proper ventilation prevents moisture damage and mold growth.', priority: 'medium' },
          { title: 'Inspect fire extinguishers for charge and expiration date', description: 'Check the pressure gauge on each fire extinguisher - the needle should be in the green zone. Look for the expiration date or inspection tag. If expired or pressure is low, replace or have it professionally recharged.', priority: 'high' }
        ],
        weatherSpecific: [
          { title: 'Monitor for ice damage on gutters', description: 'Look for bent, sagging, or detached gutters caused by ice weight. Check for ice dams forming at roof edges. Safely remove accessible ice with warm (not hot) water. Heavy ice may require professional removal to avoid injury.', priority: 'high' },
          { title: 'Check basement for moisture issues', description: 'Look for water stains on walls, floors, and around windows. Feel walls for dampness and check for musty odors indicating mold. Use a dehumidifier if humidity exceeds 50%. Address leaks immediately to prevent structural damage.', priority: 'medium' },
          { title: 'Ensure proper ventilation to prevent condensation', description: 'Run bathroom and kitchen exhaust fans during and after showers and cooking. Open windows briefly on mild days to exchange air. Check that attic and crawl space vents are clear to prevent moisture buildup and mold.', priority: 'low' },
          { title: 'Inspect exterior caulking', description: 'Check caulk around windows, doors, and where siding meets trim for cracks or gaps. Scrape out old, damaged caulk and reapply with exterior-grade caulk on days above 40°F. Proper sealing prevents water intrusion and heat loss.', priority: 'medium' },
          { title: 'Check for frozen pipe prevention measures', description: 'Feel pipes in unheated areas (basement, crawl space, attic) for cold spots. Open cabinet doors under sinks to allow warm air circulation. Let faucets drip during extreme cold. Add pipe insulation where needed to prevent freezing and bursting.', priority: 'high' }
        ],
        priority: 'high'
      },
      3: { // March
        seasonal: [
          { title: 'Begin spring cleaning preparation', description: 'Start deep cleaning as weather warms. Wash windows inside and out, vacuum air vents and baseboards, and clean behind appliances. Check smoke detectors and replace batteries. This is a good time to declutter and organize storage areas.' },
          { title: 'Schedule HVAC system transition maintenance', description: 'Contact an HVAC professional to service your air conditioning before warm weather. They will clean coils, check refrigerant levels, test the compressor, and ensure efficient operation. Schedule now before the busy season rush.' },
          { title: 'Inspect exterior for winter damage', description: 'Walk around your home looking for damaged siding, trim, or fascia boards. Check for peeling paint, cracks in stucco, or loose boards. Take photos of damage for insurance claims if needed. Schedule repairs before spring rains.' },
          { title: 'Check deck and patio for winter damage', description: 'Look for loose boards, popped nails, or cracked concrete. Test deck railings for stability - they should not wobble. Check for wood rot by probing with a screwdriver. Make repairs before using outdoor spaces this season.' },
          { title: 'Test outdoor water spigots', description: 'Turn on each outdoor faucet fully and check for leaks at the handle and where the pipe enters the house. If water drips inside or flow is weak, the pipe may have frozen and cracked - call a plumber immediately.' },
          { title: 'Test sump pump again before spring rains', description: 'Pour a bucket of water into the sump pit to ensure the pump activates and drains properly. Check that the discharge pipe is clear and draining away from your foundation. Clean the inlet screen if present. Test backup battery if equipped.' },
          { title: 'Test outdoor faucets for leaks once thawed', description: 'Turn on each outdoor faucet and let water run for a few minutes. Check for leaks at the handle, spout, and where the pipe enters the house. Feel inside the basement or crawl space near the faucet connection for moisture.' },
          { title: 'Inspect foundation for cracks or water entry points', description: 'Walk around your foundation looking for cracks wider than 1/4 inch, crumbling concrete, or water stains. Mark problem areas with chalk. Seal small cracks with concrete caulk. Call a structural engineer for large cracks or bowing walls.' },
          { title: 'Clean and test dryer vent and exhaust duct for airflow', description: 'Disconnect the dryer and remove lint from the vent hose and duct. Use a dryer vent brush or vacuum to clean the entire duct to the exterior. Ensure the outside vent flap opens freely. Poor airflow causes fires and inefficiency.' },
          { title: 'Check window screens for tears; repair before spring', description: 'Remove screens and inspect for holes, tears, or damaged frames. Small holes can be patched with screen repair kits. Replace torn screens or bent frames before you want to open windows for fresh air.' },
          { title: 'Clean washing machine drain filter', description: 'Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, and debris, then replace the filter and test for leaks.' }
        ],
        weatherSpecific: [
          { title: 'Begin monitoring for spring flooding', description: 'Check basement and crawl spaces for water intrusion during spring thaw and rains. Ensure sump pump is working. Keep valuables off basement floors. If flooding occurs regularly, consider installing a French drain or improving grading around your foundation.' },
          { title: 'Check gutters and downspouts for winter damage', description: 'Look for bent, sagging, or separated gutter sections. Ensure downspouts are securely attached and extend at least 5 feet from the foundation. Clear any debris. Repair or replace damaged sections before spring rains cause water damage.' },
          { title: 'Inspect driveway for frost heave damage', description: 'Look for new cracks, buckling, or sections that have lifted from freeze-thaw cycles. Small cracks can be filled with asphalt or concrete patch. Large damage may require professional resurfacing. Address before cracks expand.' },
          { title: 'Remove any remaining ice dam protection', description: 'Once temperatures consistently stay above freezing, carefully remove roof heating cables or other ice dam prevention measures. Inspect for any damage caused during installation or by ice. Store cables properly for next winter.' },
          { title: 'Check foundation for frost damage', description: 'Look for new cracks, spalling (flaking concrete), or shifts in foundation walls. Feel for air leaks from cracks. Small cracks can be sealed with concrete caulk. Call a structural engineer if you see large cracks or horizontal cracks.' }
        ],
        priority: 'medium'
      },
      4: { // April
        seasonal: [
          { title: 'Deep clean interior after winter', description: 'Thoroughly clean your home from top to bottom. Wash walls and baseboards, shampoo carpets, clean behind appliances, and dust ceiling fans. Replace HVAC filters, clean window tracks, and organize closets. Open windows on nice days for fresh air circulation.' },
          { title: 'Service air conditioning before summer', description: 'Have an HVAC professional inspect and service your AC system. They will clean coils, check refrigerant levels, test capacitors and contactors, and ensure optimal performance. Early service ensures your system is ready for hot weather and may prevent breakdowns.' },
          { title: 'Clean and inspect gutters', description: 'Remove leaves, twigs, and debris from gutters and downspouts. Flush with a hose to check flow and look for leaks. Ensure downspouts direct water at least 5 feet from foundation. Repair sagging sections or loose brackets now.' },
          { title: 'Check exterior paint and siding', description: 'Walk around your home looking for peeling or cracking paint, damaged siding, or wood rot. Scrape and repaint small areas. For extensive damage, plan for professional painting this season. Address wood rot immediately to prevent structural issues.' },
          { title: 'Inspect roof shingles and flashing', description: 'From the ground with binoculars, look for missing, cracked, or curled shingles. Check flashing around chimneys, vents, and skylights for rust or gaps. Look for granules in gutters (sign of shingle wear). Call a roofer for any concerns.' },
          { title: 'Test HVAC system (switch between heat and cooling modes)', description: 'Turn your thermostat to heat and ensure the furnace runs properly, then switch to cool and verify the AC starts and cools. Listen for unusual noises. If either mode doesn\'t work correctly, call an HVAC technician before you need it urgently.' },
          { title: 'Schedule AC service/inspection before summer', description: 'Contact an HVAC company to service your air conditioner before peak cooling season. They will clean coils, check refrigerant, test electrical components, and replace filters. Scheduling early avoids the rush and ensures comfort when heat arrives.' },
          { title: 'Test irrigation/sprinkler system for leaks and coverage', description: 'Turn on each irrigation zone and watch for broken or misaligned sprinkler heads, leaks, or dry spots. Adjust heads to avoid watering sidewalks. Replace damaged components. Proper watering saves water and keeps your lawn healthy.' },
          { title: 'Inspect deck, porch, and railings for rot or loose boards', description: 'Walk your deck testing each board for soft spots (wood rot) using a screwdriver. Shake railings to check for stability. Look for popped nails or loose screws. Replace rotten boards and tighten fasteners before someone gets hurt.' },
          { title: 'Check garage door auto-reverse safety feature', description: 'Place a 2x4 board on the ground in the door\'s path and close it. The door should reverse when it touches the board. Also wave a broom under the closing door - it should reverse immediately. If not, adjust the sensors or call a technician.' },
          { title: 'Test safety lighting (motion sensor and exterior lights)', description: 'Walk around your home at dusk to ensure all exterior lights turn on. Test motion sensors by walking in their detection zone. Replace burnt bulbs and clean sensor lenses. Good lighting deters intruders and prevents trips and falls.' }
        ],
        weatherSpecific: [
          { title: 'Check for spring flooding in basement', description: 'Inspect basement for water stains, dampness, or standing water during spring rains. Ensure sump pump is working. Check for cracks in foundation walls. If flooding occurs, improve exterior grading or install interior drainage systems. Call a waterproofing specialist if needed.' },
          { title: 'Inspect and clean storm drains', description: 'Remove leaves and debris from storm drains near your property. Ensure water flows freely into drains during rain. Clogged drains can cause street flooding that may enter your basement or garage. Report city-owned drains to your municipality.' },
          { title: 'Check grading around foundation', description: 'Walk around your foundation during or after rain. Ground should slope away from your house (6 inches drop over 10 feet). Look for pooling water or erosion. Add soil to low spots and ensure water flows away from foundation to prevent basement leaks.' },
          { title: 'Monitor for pest activity as weather warms', description: 'Look for signs of ants, termites, or rodents entering your home as temperatures warm. Check for gaps around pipes, vents, and foundations. Seal openings with steel wool or caulk. If you see active infestations, contact a pest control professional.' },
          { title: 'Inspect outdoor furniture and equipment', description: 'Clean and inspect patio furniture, grills, and outdoor equipment stored over winter. Look for rust, rot, or damage. Replace damaged furniture cushions. Service lawn mowers and check garden hoses for leaks. Store or cover items not yet in use.' }
        ],
        priority: 'medium'
      },
      5: { // May
        seasonal: [
          { title: 'Complete spring lawn care', description: 'Fertilize your lawn with appropriate spring formula. Aerate compacted areas and overseed thin spots. Begin regular mowing at proper height (2.5-3 inches for most grasses). Edge borders and mulch garden beds. Water deeply but infrequently to encourage deep roots.' },
          { title: 'Clean and maintain outdoor equipment', description: 'Service your lawn mower (change oil, replace spark plug, sharpen blade). Clean and oil garden tools. Check hoses for cracks and replace worn washers. Inspect outdoor power equipment and make repairs now before peak use season.' },
          { title: 'Inspect and clean deck/patio', description: 'Sweep and wash your deck or patio with appropriate cleaner. Check for loose boards, nails, or rotted wood. Apply deck stain or sealer if needed. Clean and arrange outdoor furniture. Ensure railings are secure and stairs are stable.' },
          { title: 'Check screens on windows and doors', description: 'Inspect all window and door screens for tears, holes, or bent frames. Repair small holes with screen patch kits or replace damaged screens. Clean screens with soap and water. Ensure screens fit tightly to keep insects out.' },
          { title: 'Service lawn mower and garden tools', description: 'Change mower oil, replace spark plug and air filter, and sharpen the blade for clean cuts. Clean debris from mower deck. Sharpen pruning shears and spade edges. Oil moving parts on tools. Check string trimmer line and fuel lines.' },
          { title: 'Test outdoor GFCI outlets with a tester', description: 'Plug a GFCI outlet tester or lamp into each outdoor outlet. Press the "test" button - power should cut off immediately. Press "reset" to restore power. If outlets don\'t trip or won\'t reset, call an electrician - this is a serious safety issue.' },
          { title: 'Inspect and clean gutters and downspouts after spring pollen/debris', description: 'Remove accumulated pollen, seeds, and spring debris from gutters. Flush with a hose to ensure proper flow. Check that downspouts drain freely and extend at least 5 feet from foundation. Clean or install gutter guards to reduce future maintenance.' },
          { title: 'Check lawn equipment (mower blades, fuel lines, spark plugs)', description: 'Remove mower blade and sharpen or replace if nicked or dull. Check fuel lines for cracks or leaks. Replace spark plug if dark or worn. Clean or replace air filter. These simple tasks prevent breakdowns and improve performance.' },
          { title: 'Inspect fences and gates for stability', description: 'Push on fence posts to check for wobble or rot. Look for loose boards, rusted hardware, or leaning sections. Test gate latches and hinges. Tighten screws, replace rotten posts, and repaint or stain weathered wood to maintain property security and appearance.' },
          { title: 'Test window locks and lubricate if needed', description: 'Check that all window locks engage properly and hold windows securely closed. Lubricate sticky locks with graphite powder or silicone spray (not oil, which attracts dirt). Tighten loose screws. Working locks improve security and energy efficiency.' },
          { title: 'Check exterior caulking (windows, doors, siding, trim)', description: 'Inspect caulk around all windows, doors, and where different materials meet. Look for cracks, gaps, or missing caulk. Scrape out old damaged caulk and reapply with exterior-grade silicone or acrylic caulk. Proper sealing prevents water damage and pest entry.' },
          { title: 'Clean washing machine drain filter', description: 'Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, and debris, then replace the filter and test for leaks.' }
        ],
        weatherSpecific: [
          { title: 'Check air conditioning system before summer heat', description: 'Turn on your AC and ensure it cools properly. Listen for unusual noises or clicking. Check that air flows from all vents. Replace the air filter. If the system struggles or doesn\'t cool, call an HVAC technician now before heat waves arrive.' },
          { title: 'Inspect for pest entry points', description: 'Walk around your home looking for gaps around pipes, vents, windows, and where utilities enter. Seal openings larger than 1/4 inch with caulk, steel wool, or spray foam. Check for signs of ant trails or mouse droppings and address immediately.' },
          { title: 'Clean outdoor HVAC unit', description: 'Turn off power to the AC unit. Remove debris, leaves, and grass clippings from around the unit. Gently spray the fins with a hose from inside out (low pressure only). Trim vegetation to allow 2 feet of clearance on all sides for proper airflow.' },
          { title: 'Check irrigation system if applicable', description: 'Run each zone of your sprinkler system and look for broken heads, leaks, or poor coverage. Adjust spray patterns to avoid watering pavement. Check the controller settings for your climate. Fix leaks to conserve water and prevent foundation issues.' },
          { title: 'Inspect exterior wood for moisture damage', description: 'Check deck boards, siding, window trim, and door frames for soft spots indicating rot. Probe suspected areas with a screwdriver - soft wood needs replacement. Look for peeling paint which allows moisture penetration. Paint or seal exposed wood immediately.' }
        ],
        priority: 'medium'
      },
      6: { // June
        seasonal: [
          { title: 'Monitor air conditioning efficiency', description: 'Check that your AC cools your home adequately. Replace filters monthly during heavy use. Listen for unusual noises or frequent cycling. Monitor your energy bills for unexpected increases. If performance drops, schedule service before a heatwave hits.' },
          { title: 'Inspect and maintain outdoor spaces', description: 'Maintain lawn with regular mowing and watering. Weed garden beds and add fresh mulch. Deadhead flowers to encourage blooming. Clean and seal deck or patio if needed. Check outdoor lighting and replace bulbs. Enjoy your outdoor living areas.' },
          { title: 'Check attic ventilation for summer heat', description: 'On a hot day, check your attic temperature - it shouldn\'t exceed 20°F above outdoor temp. Ensure soffit and ridge vents are clear. Check that attic fans work properly. Good ventilation prevents roof damage and reduces cooling costs.' },
          { title: 'Clean and inspect swimming pool if applicable', description: 'Test and balance pool water chemistry (pH 7.2-7.8, chlorine 1-3 ppm). Clean filters and skim debris daily. Check pool equipment for leaks or unusual noises. Inspect safety equipment like pool covers and fencing. Consider professional service for major issues.' },
          { title: 'Maintain landscaping and irrigation', description: 'Water deeply but less frequently to encourage deep roots. Adjust sprinkler heads for optimal coverage. Mulch plants to retain moisture. Prune dead branches and shape shrubs. Check for pest or disease issues and treat promptly. Fertilize as appropriate for plant types.' },
          { title: 'Flush water heater', description: 'Turn off power/gas and water supply. Attach a hose to the drain valve and run water into a bucket or drain until clear (removing sediment). Close valve, restore water and power. This extends heater life and improves efficiency. Do annually.' },
          { title: 'Inspect attic ventilation fans and confirm proper airflow', description: 'Turn on attic fans and ensure they run smoothly without rattling. Check that vents and louvers open fully. Feel for airflow at vents. Clean any dust from fan blades. Proper ventilation prevents heat buildup that damages shingles and increases cooling costs.' },
          { title: 'Test ceiling fans for wobble/balance', description: 'Run each ceiling fan on high speed and watch for excessive wobbling. Tighten mounting screws and blade brackets. Use a balancing kit if needed (attach weights to blades). Clean blades to prevent dust buildup. Reverse direction seasonally - counterclockwise for summer.' },
          { title: 'Inspect plumbing under sinks for leaks', description: 'Open cabinets under kitchen and bathroom sinks. Feel pipes and connections for moisture. Look for water stains, rust, or mineral deposits. Run water and watch for drips. Tighten loose connections or replace worn washers. Call a plumber for persistent leaks.' },
          { title: 'Test outdoor water pressure and hoses for leaks', description: 'Turn on outdoor faucets fully and note water pressure. Check hoses for cracks, bulges, or leaks at connections. Replace worn washers in hose ends. Consider upgrading old rubber hoses to durable reinforced hoses. Good water pressure indicates healthy plumbing.' },
          { title: 'Check pest control barriers and look for termite activity', description: 'Inspect foundation for mud tubes (termite highways). Look for discarded wings near windows. Check wood for hollow sounds when tapped. Keep mulch 6 inches from siding. If you see signs of termites, call a pest control professional immediately for treatment.' },
          { title: 'Inspect grout and caulking in showers, tubs, and sinks', description: 'Check tile grout for cracks or missing sections. Inspect caulk around tubs, showers, and sinks for gaps or mold. Remove old caulk and reapply with mildew-resistant silicone caulk. Seal grout if porous. This prevents water damage behind walls.' }
        ],
        weatherSpecific: [
          { title: 'Ensure adequate cooling system capacity', description: 'Verify your AC keeps your home comfortable during hot days. If rooms stay warm or the system runs constantly, it may be undersized or need service. Check that registers are open and unobstructed. Consider a professional load calculation if issues persist.' },
          { title: 'Check humidity levels and dehumidifier', description: 'Use a hygrometer to measure indoor humidity - ideal is 30-50%. High humidity causes mold and discomfort. Run dehumidifiers in damp basements. Ensure bathroom and kitchen exhaust fans vent outside. Consider a whole-house dehumidifier if problems persist.' },
          { title: 'Inspect for summer storm damage preparation', description: 'Trim dead tree branches that could fall on your home. Secure loose outdoor items. Check that gutters and downspouts are clear. Test sump pump. Have a generator or backup plan for power outages. Keep emergency supplies stocked.' },
          { title: 'Monitor energy efficiency of cooling system', description: 'Compare current electric bills to previous summers. Replace AC filters monthly. Ensure windows and doors seal tightly. Use programmable thermostat to reduce cooling when away. Close blinds during peak sun. Clean AC coils for better efficiency. Consider attic insulation improvements.' },
          { title: 'Check outdoor electrical connections', description: 'Inspect outdoor outlets, light fixtures, and extension cords for damage, corrosion, or loose connections. Ensure GFCI outlets work properly. Keep electrical connections dry and protected from weather. Never use damaged cords outdoors. Call an electrician for any safety concerns.' }
        ],
        priority: 'medium'
      },
      7: { // July
        seasonal: [
          { title: 'Peak air conditioning maintenance', description: 'Replace AC filters monthly during peak use. Check outdoor unit for debris and clear vegetation. Listen for unusual noises indicating worn components. Ensure all vents are open and unobstructed. If system struggles to cool, call for service before equipment fails.' },
          { title: 'Monitor energy usage and efficiency', description: 'Compare current utility bills to previous years. Unexpectedly high bills suggest inefficient appliances or air leaks. Use programmable thermostat to reduce cooling when away. Close blinds during hottest hours. Consider energy audit if costs seem excessive.' },
          { title: 'Maintain outdoor living spaces', description: 'Sweep and clean decks and patios regularly. Water plants and lawn as needed. Check outdoor furniture for wear or damage. Keep pool clean and balanced if applicable. Enjoy outdoor activities while maintaining your investment.' },
          { title: 'Check and clean outdoor equipment', description: 'Clean lawn mower after each use to prevent grass buildup. Check oil levels and sharpen blades mid-season. Clean and store garden tools properly. Maintain grills by cleaning grates and checking propane connections for leaks using soapy water.' },
          { title: 'Inspect deck and outdoor structures', description: 'Check deck boards and railings for new cracks, splinters, or loose fasteners. Look for signs of wood rot or insect damage. Tighten any loose screws or bolts. Consider applying fresh sealant or stain if wood looks weathered.' },
          { title: 'Test home security system and update codes if needed', description: 'Test all door and window sensors by triggering them. Replace low batteries in wireless sensors. Update access codes if you\'ve had contractors or guests with codes. Ensure monitoring service contact info is current. Check camera views and recording function.' },
          { title: 'Inspect driveway and walkways for cracks', description: 'Fill small cracks in asphalt or concrete before they expand. Use appropriate crack filler for your surface type. Seal asphalt driveways every 2-3 years. Replace broken or heaving concrete sections to prevent trip hazards and further damage.' },
          { title: 'Test outdoor drainage after heavy rain', description: 'During or after heavy rain, check that water flows away from your foundation. Look for pooling near the house. Ensure downspouts extend at least 5 feet from foundation. Clear any clogged drains. Poor drainage causes basement leaks and foundation damage.' },
          { title: 'Check refrigerator door seals (paper test)', description: 'Close a dollar bill in the refrigerator door. If you can pull it out easily, the seal is worn and cold air is escaping. Check the entire seal perimeter. Clean seals with soap and water or replace if cracked. Proper seals save energy and keep food safe.' },
          { title: 'Inspect pool equipment (if applicable) for safety and leaks', description: 'Check pool pump, filter, and heater for leaks or unusual noises. Test GFCI protection on pool electrical connections. Ensure pool covers and safety fencing are secure. Check pool lights for cracks. Call a pool professional for electrical or major equipment issues.' },
          { title: 'Test garage door keypad and remotes', description: 'Test each garage door opener remote and keypad code. Replace batteries in remotes showing weak signals. Update keypad codes if needed for security. Ensure opener responds consistently. Program new remotes according to manufacturer instructions.' },
          { title: 'Clean washing machine drain filter', description: 'Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, and debris, then replace the filter and test for leaks.' }
        ],
        weatherSpecific: [
          { title: 'Monitor air conditioning filters frequently', description: 'Check and replace AC filters monthly during peak cooling season. Dirty filters reduce efficiency and air quality significantly. Hold filter to light - if you can\'t see through it, replace it. Consider upgrading to better quality filters for improved air quality.' },
          { title: 'Check for proper attic ventilation', description: 'On a hot day, check attic temperature - it should be within 20°F of outdoor temperature. Ensure soffit and ridge vents are not blocked. Check that powered attic fans are working. Inadequate ventilation damages shingles and increases cooling costs dramatically.' },
          { title: 'Ensure adequate cooling system capacity', description: 'Verify AC keeps all rooms comfortable during peak heat. If some rooms stay warm or system runs constantly without adequate cooling, it may be undersized or failing. Check all vents are open. Call HVAC professional if performance is inadequate.' },
          { title: 'Monitor for summer storm damage', description: 'After storms, inspect for roof damage, fallen branches, or flooding. Check gutters for clogs from debris. Look for water intrusion in basement. Trim overhanging tree branches before they fall. Document storm damage with photos for insurance claims if needed.' },
          { title: 'Check outdoor water systems', description: 'Monitor sprinkler system for broken heads or leaks. Adjust watering schedule based on rainfall. Check outdoor faucets and hoses for leaks. Ensure hose bibs shut off completely. Fix leaks promptly to conserve water and prevent foundation issues from excessive moisture.' }
        ],
        priority: 'high'
      },
      8: { // August
        seasonal: [
          { title: 'Continue peak cooling system maintenance', description: 'Replace AC filters monthly and keep outdoor unit clear of debris. Monitor system performance during peak heat. Listen for unusual sounds indicating wear. Schedule service if cooling seems inadequate before fall when HVAC companies get busy with heating system calls.' },
          { title: 'Prepare for fall transition', description: 'Order heating system fuel if needed (oil, propane). Schedule heating system inspection for September. Check fireplace chimney and stock firewood. Begin planning fall cleanup projects. Purchase furnace filters to have on hand when you switch from cooling to heating.' },
          { title: 'Check exterior painting needs', description: 'Inspect paint on siding, trim, doors, and windows for peeling or fading. Late summer/early fall is ideal for exterior painting. Get quotes now if major painting is needed. Touch up small areas yourself with matching paint. Proper paint protects wood from moisture damage.' },
          { title: 'Maintain outdoor equipment and furniture', description: 'Clean and inspect lawn mowers and garden tools. Touch up rust spots on metal furniture. Check cushions for mildew and clean as needed. Repair or replace damaged items before storing for winter. Proper maintenance extends equipment life significantly.' },
          { title: 'Monitor lawn and garden irrigation', description: 'Adjust watering based on rainfall and temperature. Check for dry spots indicating sprinkler issues. Reduce watering as temperatures cool. Ensure you\'re not overwatering, which wastes water and promotes fungus. Prepare to winterize irrigation system in coming months.' },
          { title: 'Inspect roof shingles for summer storm damage', description: 'Using binoculars from the ground, look for missing, cracked, or curled shingles after summer storms. Check flashing around chimneys and vents. Look for granules accumulating in gutters (indicates shingle wear). Schedule roofing repairs before winter weather arrives.' },
          { title: 'Test HVAC performance (is the AC cooling properly?)', description: 'Verify your AC maintains comfortable temperatures during peak heat. Check that cold air flows from all vents. Listen for unusual noises or frequent cycling. If performance seems reduced, call for service - a small issue now prevents costly emergency repairs.' },
          { title: 'Test water pressure regulator (should be ~40–60 psi)', description: 'Install a pressure gauge on an outdoor faucet and turn on the water. Pressure should read 40-60 psi. Too high damages pipes and appliances; too low indicates supply problems. If outside this range, call a plumber to adjust the regulator or investigate issues.' },
          { title: 'Inspect chimney exterior for cracks or leaning', description: 'From the ground, look at your chimney for cracks in masonry, missing mortar, or any lean. Check that the chimney cap is secure and intact. Binoculars help see detail. Call a chimney professional for any damage - chimney issues create fire hazards and carbon monoxide risks.' },
          { title: 'Check septic system filter/inspection port (if applicable)', description: 'Locate your septic tank inspection port (usually a green or black lid in the yard). Check the filter for buildup and rinse if needed. Look for sewage odors or soggy areas in the drain field. Have tank pumped every 3-5 years or as recommended by professional.' },
          { title: 'Flush garbage disposal with ice and vinegar to clean blades', description: 'Pour 2 cups of ice cubes into the disposal and grind with cold water running. Then pour 1 cup of vinegar and let sit for a few minutes. Run with cold water to flush. This cleans blades, removes odors, and helps prevent clogs. Do monthly.' }
        ],
        weatherSpecific: [
          { title: 'Check cooling system efficiency during peak heat', description: 'During the hottest days, monitor how well your AC keeps up. If it runs constantly without maintaining comfort, filters may be dirty or system needs service. Check that outdoor unit isn\'t blocked. Consider shade for outdoor unit to improve efficiency.' },
          { title: 'Monitor humidity control systems', description: 'Use a hygrometer to check indoor humidity (ideal 30-50%). High humidity makes heat feel worse and promotes mold. Ensure AC is removing moisture properly. Run dehumidifiers in basement if needed. Check that bathroom and kitchen fans vent outside, not into attic.' },
          { title: 'Inspect for heat-related expansion damage', description: 'Check for new cracks in drywall, sticking doors or windows from wood expansion. Look for gaps that opened in exterior caulking. Most minor expansion is normal and will reverse with cooler weather, but document any significant structural movement for professional evaluation.' },
          { title: 'Check outdoor electrical systems', description: 'Inspect outdoor outlets, lights, and any landscape lighting for corrosion or damage from summer weather. Ensure GFCI outlets still trip when tested. Check for frayed wires or loose connections. Summer storms can damage outdoor electrical, creating hazards that need immediate professional attention.' },
          { title: 'Prepare for potential severe summer weather', description: 'Have emergency supplies ready including flashlights, batteries, water, and non-perishable food. Trim dead tree branches before they fall. Secure outdoor furniture and decorations. Test sump pump and have generator ready if you own one. Know your area\'s severe weather shelter location.' }
        ],
        priority: 'high'
      },
      9: { // September
        seasonal: [
          { title: 'Begin fall preparation tasks', description: 'Create a list of outdoor maintenance to complete before cold weather. Check gutters, roof, weatherstripping. Test heating system. Stock up on supplies like furnace filters and ice melt. Schedule professional services now before contractors get busy with emergency heating calls.' },
          { title: 'Schedule heating system service', description: 'Contact an HVAC professional to inspect and service your furnace or boiler. They will check safety controls, heat exchanger, burners, and efficiency. Early service ensures your system is safe and ready when you need heat, and prevents emergency breakdowns during cold snaps.' },
          { title: 'Clean and inspect gutters before autumn', description: 'Remove debris from gutters and downspouts before leaves fall. Flush with a hose to check for clogs and leaks. Tighten loose brackets. Ensure downspouts extend 5 feet from foundation. Consider gutter guards to reduce fall leaf maintenance. Clean gutters prevent ice dams.' },
          { title: 'Check weatherstripping and caulking', description: 'Inspect weatherstripping around all doors and windows for gaps, cracks, or compression. Replace worn sections. Check exterior caulk around windows, doors, and penetrations for cracks. Reapply as needed. Good sealing reduces heating costs and prevents drafts and ice dams.' },
          { title: 'Prepare outdoor equipment for storage', description: 'Drain gas from lawn mower and trimmer or add fuel stabilizer. Clean equipment thoroughly. Sharpen blades and make repairs. Drain garden hoses and store indoors. Clean and oil garden tools. Proper winterization prevents damage and ensures equipment is ready for spring.' },
          { title: 'Test smoke and carbon monoxide detectors', description: 'Press the test button on all smoke and CO detectors to verify they work. Replace batteries (or do it on Daylight Saving Time change). Clean dust from sensors with a vacuum. Replace smoke detectors older than 10 years and CO detectors older than 7 years. Install detectors on every level and near bedrooms. These devices save lives.', priority: 'high' },
          { title: 'Test thermostat programming', description: 'Verify your programmable thermostat switches between heating and cooling correctly. Update the schedule for fall (more heating in morning and evening). Replace thermostat batteries if applicable. Consider upgrading to a smart thermostat to reduce energy costs with better control.' },
          { title: 'Inspect weatherstripping and door seals before cold weather', description: 'Check all exterior door sweeps and weatherstripping for wear or gaps. Close door on a piece of paper - you should feel resistance when pulling it out. Replace worn weatherstripping. Install or adjust door sweeps to eliminate gaps that waste energy and let in pests.' },
          { title: 'Check attic for pests (rodents often enter in fall)', description: 'Look for droppings, nesting materials, or chewed items in your attic. Listen for scratching sounds at night. Check for entry points like gaps around vents, pipes, or eaves. Seal openings with steel wool and caulk. Set traps or call pest control for active infestations.' },
          { title: 'Test outdoor handrails and steps for safety', description: 'Shake handrails firmly to check for wobble or loose mounting. Tighten any loose screws or bolts. Check stairs for rot, cracks, or loose treads. Repair or replace damaged components before ice and snow make stairs treacherous. Secure railings prevent falls and injuries.' },
          { title: 'Clean washing machine drain filter', description: 'Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, and debris, then replace the filter and test for leaks.' }
        ],
        weatherSpecific: [
          { title: 'Transition HVAC from cooling to heating mode', description: 'Switch thermostat from cool to heat and test that heating system starts. Replace filters before heating season. Close AC circuit breaker for winter (if recommended by manufacturer). Cover outdoor AC unit loosely to protect from debris but allow air circulation. Check registers are open.' },
          { title: 'Check insulation before cold weather', description: 'Inspect attic insulation depth - minimum 10-14 inches in cold climates. Look for compressed or missing areas. Check for gaps around recessed lights, pipes, or wiring. Add insulation if needed. Ensure attic vents remain clear. Good insulation significantly reduces heating costs.' },
          { title: 'Inspect roof for summer damage', description: 'Look for missing, cracked, or curled shingles from summer storms. Check flashing around chimneys and vents. Look for granule loss in gutters. Schedule repairs before winter snow and ice cause leaks. A damaged roof can lead to expensive interior water damage during winter.' },
          { 
            title: 'Begin winterizing outdoor water systems', 
            description: 'Start early winterization as temperatures begin to drop. Drain and store garden hoses indoors. Locate interior shut-off valves for outdoor faucets. If freezing weather is forecast, shut off these valves, open outdoor faucets to drain, and consider installing freeze-proof faucet covers. For sprinkler systems, schedule professional winterization or prepare to drain system yourself. Remove window AC units or cover permanently installed units. Store or cover outdoor furniture.',
            priority: 'medium'
          },
          { title: 'Check foundation and basement for moisture', description: 'Look for water stains, efflorescence (white powder), or dampness on foundation walls. Check for cracks or gaps. Ensure ground slopes away from foundation. Clean window wells and ensure covers fit properly. Address moisture issues before they freeze and expand in winter, causing major damage.' }
        ],
        priority: 'medium'
      },
      10: { // October
        seasonal: [
          { title: 'Complete fall cleanup and preparation', description: 'Rake leaves and remove from gutters. Trim dead branches. Aerate and overseed lawn. Mulch garden beds. Store or cover outdoor furniture. Check all exterior maintenance before winter locks you out of outdoor work.' },
          { title: 'Service heating system for winter', description: 'Have HVAC professional inspect furnace or boiler before heating season. They will check safety controls, burners, heat exchanger, and carbon monoxide levels. Replace furnace filter. This prevents dangerous malfunctions and ensures efficient operation all winter.' },
          { title: 'Clean gutters and install leaf guards', description: 'After leaves fall, thoroughly clean gutters and downspouts. Remove all debris and flush with hose. Check for leaks and secure loose sections. Consider installing gutter guards to reduce future maintenance. Clean gutters prevent ice dams and water damage.' },
          { 
            title: 'Winterize outdoor water systems (hoses, sprinklers, faucets)', 
            description: 'Complete all outdoor water winterization to prevent costly freeze damage. Shut off interior valves to outdoor faucets (usually in basement or crawl space). Open outdoor faucets and leave open all winter to drain completely. Remove, drain, and store all garden hoses indoors. Drain and winterize sprinkler/irrigation system (blow out with compressed air or hire professional). Install insulated faucet covers for added protection. This critical winterization prevents burst pipes that cause thousands in water damage.',
            priority: 'high',
            actionSummary: 'Follow these 5 essential steps to winterize your outdoor water systems and prevent burst pipes.',
            steps: [
              'Locate and close shut-off valves inside your home for all outdoor faucets',
              'Open all outdoor faucets and leave them open all winter to allow drainage',
              'Disconnect all garden hoses, drain them completely, and store indoors',
              'Drain sprinkler/irrigation system using compressed air or hire a professional',
              'Install insulated foam faucet covers on all outdoor spigots for extra protection'
            ],
            toolsAndSupplies: [
              'Adjustable wrench (to turn shut-off valves)',
              'Insulated faucet covers (one for each outdoor faucet)',
              'Air compressor (for sprinkler system winterization, or hire professional)',
              'Bucket (to catch draining water)',
              'Towels or rags',
              'Flashlight (for locating basement shut-off valves)'
            ],
            impact: 'Frozen outdoor pipes can burst, causing catastrophic water damage inside walls and flooding basements. A single burst pipe can release hundreds of gallons of water, damaging floors, walls, and belongings. Sprinkler system freeze damage often costs $500-2,000 to repair.',
            impactCost: '$500 - $5,000 for pipe repairs and water damage; $500 - $2,000 for sprinkler system repairs'
          },
          { title: 'Check and seal exterior gaps', description: 'Inspect foundation, siding, and around all penetrations (pipes, wires, vents) for gaps. Seal cracks and openings with appropriate caulk or spray foam. Check door thresholds and weatherstripping. Prevents pest entry, heat loss, and moisture intrusion.' },
          { title: 'Test outdoor lighting (especially pathway and security lights)', description: 'Walk your property at dusk to check all outdoor lights. Replace burnt bulbs. Clean fixtures and motion sensor lenses. Adjust sensor angles if needed. Good lighting prevents accidents on dark winter paths and deters crime. Consider LED bulbs for winter durability.' },
          { title: 'Test emergency generator if you have one', description: 'Run generator monthly with a load for 15-30 minutes. Check oil level and change as recommended. Test automatic transfer switch if equipped. Keep extra gas, oil, and filters on hand. Ensure generator is outside and at least 20 feet from your home to prevent carbon monoxide poisoning.' },
          { title: 'Inspect fireplace and chimney flue; schedule cleaning if needed', description: 'Look inside fireplace for creosote buildup (shiny black residue). Check damper operation. Look for cracks in firebox. Have chimney professionally swept if used regularly (1+ cord of wood per year). Creosote causes dangerous chimney fires.' },
          { title: 'Test smoke and carbon monoxide detectors', description: 'Press test button on all smoke and CO detectors to verify they work. Replace batteries (or do it on Daylight Saving Time change in November). Clean dust from sensors with a vacuum. Replace smoke detectors older than 10 years and CO detectors older than 7 years. Install detectors on every level, near bedrooms, and near fuel-burning appliances. These devices save lives.', priority: 'high' },
          { title: 'Check insulation around pipes to prevent winter freezing', description: 'Inspect pipe insulation in unheated areas (basement, crawl space, attic). Look for gaps, compressed, or missing sections. Add foam pipe insulation to exposed pipes, especially those on exterior walls. Pay special attention to pipes in unheated garages.' },
          { title: 'Test ground drainage with garden hose', description: 'Run water near your foundation and watch where it flows. Water should drain away from house, not pool near foundation. Fix low spots by adding soil to slope away from house (6 inch drop over 10 feet). Good drainage prevents basement flooding and foundation damage.' }
        ],
        weatherSpecific: [
          { title: 'Insulate pipes in unheated areas', description: 'Wrap exposed pipes in basements, crawl spaces, attics, and garages with foam pipe insulation. Pay attention to pipes on exterior walls. Open cabinet doors during extreme cold. Let faucets drip when temperatures drop below 20°F. Burst pipes cause massive damage.' },
          { title: 'Check storm windows and doors', description: 'Install storm windows if removable. Check for broken glass or damaged frames. Ensure they seal tightly. Replace worn weatherstripping. Lock all windows for tightest seal. Storm windows significantly reduce heat loss and prevent drafts in older homes.' },
          { title: 'Inspect chimney and fireplace for winter use', description: 'Ensure damper opens and closes properly. Check for debris or animal nests in chimney. Have professional inspection and cleaning if used regularly. Stock up on firewood and store off ground, covered but with air circulation. Never burn treated wood or trash.' },
          { title: 'Check outdoor equipment winterization', description: 'Store gas lawn equipment with empty tank or fuel stabilizer added. Clean equipment thoroughly. Change oil in mower. Drain and store all hoses. Cover AC unit loosely. Bring in anything that could be damaged by freezing temperatures.' }
        ],
        priority: 'high'
      },
      11: { // November
        seasonal: [
          { title: 'Complete winter preparation', description: 'Finish all outdoor winterization tasks before harsh weather arrives. Confirm heating system is serviced, outdoor water is winterized, gutters are clean, and windows are sealed. Stock emergency supplies (flashlights, batteries, water, non-perishable food). Check home insurance coverage.' },
          { title: 'Test and monitor heating system performance', description: 'Run heating system for several hours to ensure it maintains comfortable temperature. Listen for unusual noises and check that all rooms heat evenly. Replace filters monthly during heating season. Verify thermostat accuracy with a separate thermometer. Monitor for cold spots or excessive cycling. Schedule immediate service if any issues arise before winter cold intensifies.' },
          { title: 'Final exterior maintenance before cold', description: 'Complete any outdoor painting or repairs before freezing temperatures. Check that all winterization is complete (hoses stored, faucets drained). Secure loose siding or trim. Apply deicer to steps. Once ground freezes, exterior work becomes difficult or impossible.' },
          { title: 'Check insulation and weatherproofing', description: 'Inspect attic insulation depth and coverage. Seal any gaps in weatherstripping or caulking you may have missed. Check for drafts around windows and doors. Add door sweeps where needed. Good insulation and sealing significantly reduces heating costs all winter.' },
          { title: 'Store outdoor furniture and equipment', description: 'Clean and store patio furniture, grills, and decorations in garage or shed. Cover items that must stay outside with waterproof covers. Bring in sensitive plants. Drain and store fountain pumps. Proper storage extends furniture life and prevents winter damage.' },
          { title: 'Test garage door auto-reverse safety again', description: 'Place a 2x4 board in the door\'s path and close the door - it should reverse when touching the board. Wave a broom under the closing door - it should reverse immediately. This safety feature prevents injuries and deaths. Adjust sensors or call technician if it fails.' },
          { title: 'Inspect and clean gutters of fall leaves', description: 'Do final gutter cleaning after all leaves have fallen. Remove all debris and flush with hose. Ensure downspouts flow freely and extend 5 feet from foundation. Repair any loose or damaged sections now. Clean gutters prevent ice dams and foundation problems.' },
          { title: 'Test backup sump pump battery (if applicable)', description: 'Unplug primary sump pump and pour water in pit - backup should activate. Ensure battery is fully charged. Replace battery every 3-5 years. Test monthly during spring and fall. A working backup prevents basement flooding during power outages or primary pump failure.' },
          { title: 'Inspect snow removal equipment (snowblower, shovels, salt)', description: 'Service snowblower: change oil, check spark plug, inspect belts and shear pins, ensure auger turns freely. Stock up on ice melt and sand. Have working shovels with ergonomic handles. Being prepared for first snow prevents stress and prevents back injuries.' },
          { title: 'Test outdoor outlets (holiday lighting safety)', description: 'Test outdoor GFCI outlets by pressing test button - they should trip and cut power. Use ground-fault protection for all outdoor holiday lights. Check extension cords for damage. Never overload circuits. Use timers to control lights. Follow all safety guidelines to prevent electrical fires.' },
          { title: 'Inspect weatherproofing on exterior doors/windows', description: 'Check all exterior door weatherstripping and sweeps for gaps. Test windows for drafts using candle test. Apply plastic window insulation kits for extra protection on single-pane windows. Seal any gaps found. Proper weatherproofing keeps you comfortable and reduces heating bills.' },
          { title: 'Clean washing machine drain filter', description: 'Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, and debris, then replace the filter and test for leaks.' }
        ],
        weatherSpecific: [
          { title: 'Check for drafts and air leaks', description: 'On a windy day, hold lit candle or incense stick near windows, doors, outlets, and baseboards. Wavering smoke indicates air leaks. Seal gaps with weatherstripping, caulk, or foam. Add outlet insulators. Preventing drafts improves comfort and significantly reduces heating costs.' },
          { title: 'Prepare for first freeze conditions', description: 'Ensure all outdoor water is winterized and drained. Disconnect and store hoses. Protect tender plants or bring indoors. Open cabinet doors under sinks during freeze warnings. Let faucets drip if pipes are vulnerable. Keep garage doors closed to protect pipes.' },
          { title: 'Check emergency heating backup systems', description: 'If you have a backup heating source (fireplace, wood stove, space heater), ensure it\'s ready and safe. Stock firewood or fuel. Test operation. Have fire extinguisher nearby. Never use outdoor heaters (grills, generators) indoors due to carbon monoxide danger.' },
          { title: 'Monitor humidity levels as heating begins', description: 'Use hygrometer to check indoor humidity - ideal is 30-50%. Winter heating dries air, causing health issues and wood damage. Run humidifier if below 30%. Too high causes condensation and mold. Balance is important for comfort and home preservation.' }
        ],
        priority: 'high'
      },
      12: { // December
        seasonal: [
          { title: 'Monitor heating system performance', description: 'Watch for unusual noises, odors, or cycling issues from your heating system. Replace filters monthly during winter. Ensure all rooms heat evenly. Listen for banging pipes or hissing sounds. Call HVAC technician immediately if performance declines - don\'t wait for a breakdown in winter.' },
          { title: 'Check holiday decorations safety', description: 'Inspect all light strings for frayed wires or damaged sockets before hanging. Use outdoor-rated lights outside only. Don\'t overload circuits. Keep live trees watered to prevent fire hazard. Turn off decorative lights when leaving home or sleeping. Use LED lights to reduce fire risk and energy costs.' },
          { title: 'Inspect and maintain fireplace', description: 'Check that damper opens fully and closes tightly. Remove ash buildup regularly (when cool). Keep glass doors closed when fire is burning. Use a fireplace screen with open fireplaces. Never leave fire unattended. Only burn seasoned hardwood, never treated wood or trash.' },
          { title: 'Monitor energy usage and efficiency', description: 'Compare current utility bills to previous winters. Unexpectedly high usage suggests air leaks, inefficient heating, or equipment problems. Use programmable thermostat to reduce heating when sleeping or away. Seal any drafts. Consider energy audit if costs seem excessive.' },
          { title: 'Check water heater pressure relief valve (carefully lift lever)', description: 'With bucket underneath, carefully lift the pressure relief valve lever slightly until water flows, then release. This tests valve function and flushes sediment. Water should stop when released. If valve leaks continuously after, it needs replacement. Do this annually for safety.' },
          { title: 'Test indoor circuit breakers (flip each one to ensure not stuck)', description: 'At your electrical panel, flip each breaker to OFF then back to ON to ensure they move freely. Stuck breakers won\'t protect circuits during overloads. Label any unlabeled breakers while testing. If breakers feel stiff or won\'t stay on, call an electrician immediately.' },
          { title: 'Inspect attic and crawl space for moisture or leaks', description: 'Check attic for water stains on roof decking, mold, or dampness indicating roof leaks or ice dams. Inspect crawl space for standing water, moisture on walls, or musty odors. Address leaks immediately to prevent structural damage. Ensure ventilation is adequate.' },
          { title: 'Test furnace emergency shut-off switch', description: 'Locate emergency shut-off switch (usually red, near furnace or at top of basement stairs). Flip off - furnace should stop immediately. Flip back on - furnace should restart. Everyone in household should know this location for emergency situations. Test annually.' },
          { title: 'Run whole-home safety drill (fire escape plan + extinguisher use)', description: 'Practice fire escape plan with all household members. Ensure everyone knows two exits from each room and meeting spot outside. Practice low-crawling under smoke. Show adults how to use fire extinguisher (PASS method). Replace plan as needed. Practice twice yearly.' }
        ],
        weatherSpecific: [
          { title: 'Prepare for winter storm conditions', description: 'Stock emergency supplies: flashlights, batteries, water (1 gallon per person per day), non-perishable food, blankets, first aid kit, medications, battery/hand-crank radio. Have backup heat source. Keep gas tank above half. Know how to manually open electric garage door. Charge all devices before storms.' },
          { title: 'Check ice and snow removal equipment', description: 'Ensure snowblower runs properly - test before each storm. Keep gas and oil on hand. Have working shovels and ice melt readily accessible. Apply ice melt before snow for easier removal. Shovel frequently during heavy snow rather than waiting for accumulation.' },
          { title: 'Monitor heating system during cold snaps', description: 'During extreme cold, check that heating system maintains comfortable temperature without excessive cycling. Open cabinets under sinks to prevent pipe freezing. Let faucets drip if pipes are vulnerable. Don\'t turn heat down below 55°F even when away to prevent frozen pipes.' },
          { title: 'Check for ice dam formation on roof', description: 'Look for icicles or ice buildup at roof edges indicating ice dams. Check attic for warm spots causing uneven snow melt. Ensure attic is properly insulated and ventilated. Use roof rake from ground to remove snow from roof edges. Never climb on icy roof.' },
          { title: 'Ensure adequate emergency supplies', description: 'Maintain 3-day supply of water, food, medications, and batteries. Have flashlights, radio, and blankets accessible. Keep phone chargers and power banks charged. Store supplies in accessible location. Check expiration dates. Winter storms can cause extended power outages and impassable roads.' }
        ],
        priority: 'high'
      }
    },
    yearRoundTasks: [
      { title: 'Test smoke and carbon monoxide detectors monthly', description: 'Press the test button on all smoke and CO detectors to verify they work. Replace batteries twice yearly or when chirping. Clean dust from sensors with vacuum. Replace smoke detectors over 10 years old and CO detectors over 7 years old.' },
      { title: 'Check HVAC filters monthly', description: 'Remove furnace/AC filter and hold to light - if you cannot see through it clearly, replace it. Check monthly during heavy use seasons. Dirty filters reduce efficiency, increase energy costs, and strain your system. Use quality pleated filters for better air quality.' },
      { title: 'Inspect plumbing for leaks quarterly', description: 'Check under all sinks, around toilets, and near water heater for moisture, stains, or drips. Listen for running water when nothing is on. Check water meter before and after 2-hour no-use period - if it changes, you have a leak. Address leaks immediately to prevent damage.' },
      { title: 'Check electrical systems annually', description: 'Test all GFCI and AFCI outlets and breakers. Look for warm outlets or switch plates. Check for flickering lights or frequently tripping breakers. Ensure electrical panel labels are accurate. Call electrician for any electrical issues - never ignore warning signs of electrical problems.' },
      { title: 'Professional HVAC service twice yearly', description: 'Schedule professional furnace inspection in fall and AC inspection in spring. Technicians will check safety controls, clean coils, test refrigerant, inspect heat exchangers, and ensure efficient operation. Regular service prevents breakdowns and extends equipment life significantly.' },
      { title: 'Whole-home electrical inspection by electrician (every 3–5 years)', description: 'Have licensed electrician inspect entire electrical system including panel, wiring, outlets, and grounding. They will identify outdated components, safety hazards, and code violations. Essential for homes over 25 years old or before major renovations. Can prevent electrical fires.' },
      { title: 'Whole-home plumbing inspection (annually)', description: 'Have plumber inspect water heater, check all fixtures for leaks, test water pressure, inspect exposed pipes, check sump pump, and assess overall system condition. Annual inspection catches small issues before they become expensive emergencies. Especially important in older homes.' },
      { title: 'Pest inspection (annually or as needed)', description: 'Have professional pest control inspect for termites, carpenter ants, rodents, and other pests. They will check foundation, attic, crawl spaces, and vulnerable areas. Annual inspection is critical for early detection. Immediate inspection needed if you see signs of infestation.' },
      { title: 'Radon test (at least once, more if in high-risk area)', description: 'Test basement or lowest living level for radon gas using DIY kit or professional service. Radon is colorless, odorless, and causes lung cancer. Test initially when buying home, then every 2 years or after major foundation work. Mitigation systems are effective if levels are elevated.' },
      { title: 'Well water test (if applicable, annually)', description: 'Have well water tested annually for bacteria, nitrates, and other contaminants. Test more frequently if you notice changes in taste, odor, or appearance, or after flooding or nearby contamination. Safe drinking water is essential for health. Keep records of all test results.' },
      { title: 'Septic inspection/pumping (every 3–5 years)', description: 'Have septic tank inspected and pumped every 3-5 years (more often for large households or garbage disposals). Professional will check tank levels, inspect baffles and filter, and assess drain field condition. Regular pumping prevents system failure and costly replacement.' },
      { title: 'Roof inspection (annually)', description: 'Have professional roofer inspect shingles, flashing, gutters, and overall roof condition annually. They will identify damage, wear, and potential leaks. Best done in spring or fall. Early detection of roof issues prevents expensive interior water damage and extends roof life.' }
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
          { title: 'Service heating system during cooler months', description: 'Have HVAC professional inspect heating system during mild winter. They will check burners, heat exchanger, and efficiency. Southeast winters are mild but heating reliability is important for comfort. Address any issues before next winter.' },
          { title: 'Check and clean fireplace if applicable', description: 'Remove ash when cool and inspect for cracks in firebox. Check damper operation. If used regularly, schedule chimney sweep to remove creosote. Many Southeast homes use fireplaces occasionally during cooler months for ambiance and supplemental heat.' },
          { title: 'Inspect weatherstripping', description: 'Check door and window weatherstripping for gaps or wear. While winters are mild, proper sealing improves heating efficiency and reduces humidity infiltration. Replace worn sections and add door sweeps where needed.' },
          { title: 'Test carbon monoxide detectors', description: 'Press test button on all CO detectors to verify operation. Replace batteries if needed. Place detectors near bedrooms and on every level. Even mild heating season use requires CO detector safety.' },
          { title: 'Check attic insulation', description: 'Inspect attic insulation for proper depth (R-30 to R-38 for Southeast). Look for gaps, compression, or moisture damage. Good insulation keeps home cool in summer and warm in mild winter. Ensure vents remain clear for airflow.' },
          { title: 'Inspect furnace filter and replace if dirty', description: 'Remove filter and hold to light - replace if you can\'t see through it clearly. Change monthly during use. Clean filters improve efficiency and air quality. Important in Southeast where humidity and pollen affect indoor air.' },
          { title: 'Test GFCI outlets in kitchen, bathrooms, garage, and exterior', description: 'Press "test" button on each GFCI outlet - it should trip and cut power. Press "reset" to restore. If any fail to trip or won\'t reset, replace immediately. Critical safety device especially in humid Southeast climate.' },
          { title: 'Inspect sump pump (if applicable) — pour water to confirm it activates', description: 'Pour bucket of water into sump pit to test pump activation. Check discharge pipe drains away from foundation. Clean inlet screen. While less common in Southeast, sump pumps in low-lying areas are critical for preventing flooding.' },
          { title: 'Clean washing machine drain filter', description: 'Locate access panel at bottom front of washer. Place towels underneath, remove filter, and clean out lint and debris. Replace filter and test for leaks. Prevents drainage issues and extends washer life.' }
        ],
        weatherSpecific: [
          { title: 'Monitor for freeze protection of pipes', description: 'During occasional freezes, open cabinet doors under sinks to allow warm air circulation. Let faucets drip when temperatures drop near freezing. Protect outdoor faucets with covers. Southeast freezes are brief but can damage unprepared pipes.' },
          { title: 'Check humidity levels (winter can be dry)', description: 'Use hygrometer to monitor indoor humidity - ideal 30-50%. Winter heating can dry air in Southeast. Run humidifier if needed for comfort and to protect wood furniture. Too dry causes health issues and wood cracking.' },
          { title: 'Inspect exterior for mild winter damage', description: 'Check siding, trim, and paint for damage from occasional winter storms. Look for loose boards or peeling paint. Address issues now during mild weather before spring humidity and summer heat worsen damage.' },
          { title: 'Ensure proper ventilation during heating season', description: 'Run bathroom and kitchen exhaust fans during use. Open windows briefly on mild days for fresh air. Southeast homes prone to moisture buildup need good ventilation even in winter to prevent mold.' },
          { title: 'Check for pest activity (active year-round)', description: 'Inspect for signs of ants, termites, or rodents. Mild Southeast winters mean pests stay active year-round. Check for entry points around foundation, pipes, and vents. Seal gaps and call pest control if needed.' }
        ],
        priority: 'medium'
      },
      2: { // February
        seasonal: [
          { title: 'Begin early spring preparation', description: 'Start planning spring projects like painting, landscaping, and exterior repairs. Order supplies and materials now before spring rush. Check garage and shed organization. Mild Southeast February weather is ideal for outdoor project planning and prep work.' },
          { title: 'Check irrigation system for spring startup', description: 'Turn on irrigation system and inspect each zone for broken heads, leaks, or clogs. Adjust spray patterns and coverage. Replace damaged components. Southeast landscapes need proper watering as warm season approaches. Test now before heat arrives.' },
          { title: 'Inspect exterior paint and siding', description: 'Walk around home checking for peeling paint, damaged siding, or wood rot. High humidity damages exterior finishes faster in Southeast. Look for cracks, holes, or gaps. Plan repairs and painting for spring when temperatures are moderate.' },
          { title: 'Clean and maintain lawn equipment', description: 'Service lawn mower by changing oil, replacing spark plug and air filter, and sharpening blade. Clean grass buildup from deck. Check fuel lines and belts. Southeast lawns grow year-round so equipment needs regular maintenance for reliable operation.' },
          { title: 'Check deck and outdoor furniture', description: 'Inspect deck for loose boards, popped nails, or wood rot. Probe suspect areas with screwdriver. Clean outdoor furniture and check for rust or damage. Apply sealant to deck if needed. Prepare outdoor spaces for spring entertaining season.' },
          { title: 'Test GFCI/AFCI circuit breakers in electrical panel', description: 'Open electrical panel and press "test" button on each GFCI and AFCI breaker - it should trip to off position. Then flip back to on. If any breaker fails to trip or won\'t reset, call licensed electrician immediately for safety.' },
          { title: 'Inspect water heater for leaks and check temperature (~120°F)', description: 'Look around base of water heater for puddles, rust, or moisture. Test hot water temperature with thermometer - set to 120°F to prevent scalding and save energy. Look for corrosion on connections. Schedule replacement if unit is over 10 years old.' },
          { title: 'Flush toilets and sinks that aren\'t used often to prevent dry traps', description: 'Run water for 30 seconds in guest bathrooms, basement sinks, and rarely used fixtures. This refills drain trap (U-bend) which prevents sewer gases from entering home. Do monthly for all unused fixtures to maintain water seal.' },
          { title: 'Check bathroom exhaust fans for proper airflow', description: 'Turn on each bathroom fan and hold tissue near grille - it should be pulled firmly against vent. Clean grille with vacuum attachment. Bathroom fans are critical in humid Southeast to prevent moisture damage and mold growth in bathrooms.' },
          { title: 'Inspect fire extinguishers for charge and expiration date', description: 'Check pressure gauge on each fire extinguisher - needle should be in green zone. Look for expiration date or inspection tag. Ensure they\'re accessible and everyone knows locations. Replace or recharge if expired or pressure is low.' }
        ],
        weatherSpecific: [
          { title: 'Prepare for early spring weather changes', description: 'Check that AC system is ready for sudden warm spells common in Southeast February. Test thermostat switching between heat and cool. Clean outdoor AC unit of debris. Monitor weather forecasts for late cold snaps that may require plant protection.' },
          { title: 'Check air conditioning system before warm season', description: 'Turn on AC and verify it cools properly. Change filter and clean area around indoor and outdoor units. Listen for unusual noises. Schedule professional AC service now before spring rush and hot weather arrives. Southeast cooling season starts early.' },
          { title: 'Monitor for early pest activity', description: 'Inspect for ants, termites, and other pests that become active in warming Southeast weather. Check foundation, window sills, and entry points. Seal gaps and cracks. Call pest control if you see mud tubes, ant trails, or droppings.' },
          { title: 'Inspect drainage systems before spring rains', description: 'Clean gutters and downspouts of winter debris. Ensure downspouts extend 5+ feet from foundation. Check grading slopes away from house. Test drainage during rain. Poor drainage causes foundation issues in heavy Southeast spring storms.' },
          { title: 'Check outdoor electrical connections', description: 'Inspect outdoor outlets, light fixtures, and wiring for damage, corrosion, or loose connections. Test all GFCI outlets. Replace cracked outlet covers. Ensure connections are weatherproof. High humidity in Southeast accelerates electrical corrosion.' }
        ],
        priority: 'medium'
      },
      3: { // March
        seasonal: [
          { title: 'Begin spring cleaning and maintenance', description: 'Deep clean home from top to bottom. Wash windows, vacuum vents, clean behind appliances, and shampoo carpets. Replace HVAC filters and check smoke detectors. Southeast spring arrives early - start fresh air circulation and declutter stored winter items.' },
          { title: 'Service air conditioning system', description: 'Schedule professional AC service before cooling season. Technician will clean coils, check refrigerant levels, test electrical components, and ensure efficient operation. Critical in Southeast where AC runs most of the year. Book early to avoid spring rush.' },
          { title: 'Clean and inspect gutters', description: 'Remove leaves, pollen, and debris from gutters and downspouts. Flush with hose to check flow and leaks. Ensure downspouts extend 5+ feet from foundation. Southeast spring storms require clear gutters to prevent water damage and foundation issues.' },
          { title: 'Check screens and outdoor areas', description: 'Inspect window and door screens for tears or damage. Repair or replace before opening windows for spring air. Clean and arrange patio furniture. Power wash deck and outdoor areas. Prepare outdoor spaces for spring and summer use.' },
          { title: 'Start landscaping and lawn care', description: 'Begin spring fertilization and weed control. Aerate compacted areas and overseed thin spots. Mulch garden beds and plant warm-season flowers. Southeast growing season starts early - establish lawn health now for hot summer ahead.' },
          { title: 'Test sump pump again before spring rains', description: 'Pour bucket of water into sump pit to ensure pump activates and drains properly. Check discharge pipe is clear and extends away from foundation. Clean inlet screen. Test backup battery if equipped. Southeast spring storms can be heavy.' },
          { title: 'Test outdoor faucets for leaks once thawed', description: 'Turn on each outdoor faucet and let water run several minutes. Check for leaks at handle, spout, and where pipe enters house. Inspect inside near connections for moisture. Replace worn washers or call plumber for pipe damage from rare freezes.' },
          { title: 'Inspect foundation for cracks or water entry points', description: 'Walk around foundation looking for cracks wider than 1/4 inch, crumbling concrete, or water stains. Mark problems with chalk. Seal small cracks with concrete caulk. High Southeast rainfall makes foundation waterproofing critical - call specialist for major issues.' },
          { title: 'Clean and test dryer vent and exhaust duct for airflow', description: 'Disconnect dryer and remove lint from vent hose and duct. Use dryer vent brush to clean entire duct to exterior. Ensure outside vent flap opens freely. Clogged vents cause fires and force dryer to work harder. Clean annually minimum.' },
          { title: 'Check window screens for tears; repair before spring', description: 'Remove and inspect all window screens for holes, tears, or bent frames. Patch small holes with screen repair kits or replace damaged screens. Clean screens with soap and water. Essential for bug-free fresh air in humid Southeast springs.' },
          { title: 'Clean washing machine drain filter', description: 'Locate access panel at bottom front of washer. Place towels underneath, open panel, and remove filter. Clean out lint, coins, and debris. Replace filter and test for leaks. Prevents drainage problems and extends washer life in humid climate.' }
        ],
        weatherSpecific: [
          { title: 'Prepare cooling system for warm weather', description: 'Replace AC filter with fresh one. Clean outdoor condenser unit of debris and vegetation. Turn on system and verify cooling. Check that all vents open and blow cool air. Southeast warm weather arrives early - ensure system is ready now.' },
          { title: 'Check for tornado season preparation', description: 'Identify safe interior room or storm shelter. Stock emergency supplies including flashlight, radio, batteries, water, and first aid kit. Review family emergency plan. Trim dead tree branches. Southeast tornado season peaks in spring - be prepared.' },
          { title: 'Inspect for spring storm damage prevention', description: 'Secure loose outdoor items that could blow away. Check roof shingles and flashing. Ensure gutters are clear. Trim overhanging branches. Southeast spring brings severe thunderstorms with high winds - prevent damage before storms hit.' },
          { title: 'Monitor humidity levels as weather warms', description: 'Use hygrometer to check indoor humidity - ideal 30-50%. Run dehumidifiers in damp areas like basements. Southeast humidity rises rapidly in spring. Excess moisture causes mold and structural damage. Ensure exhaust fans vent outside.' },
          { title: 'Check foundation drainage', description: 'During rain, verify water flows away from house. Ground should slope 6 inches down over 10 feet. Look for pooling water or erosion near foundation. Add soil to low spots. Poor drainage causes basement leaks in heavy Southeast rains.' }
        ],
        priority: 'medium'
      },
      4: { // April
        seasonal: [
          { title: 'Complete spring maintenance tasks', description: 'Finish all spring cleaning and maintenance projects. Touch up paint, complete landscaping, and repair any winter damage. Check off all pending maintenance items. Southeast April weather is ideal for outdoor work before summer heat and humidity arrive.' },
          { title: 'Deep clean interior and exterior', description: 'Thoroughly clean entire home inside and out. Wash exterior siding, clean windows, power wash driveway and deck. Inside, deep clean carpets, wash walls, and organize closets. Fresh start for summer season in Southeast.' },
          { title: 'Service and test air conditioning', description: 'Ensure AC system is professionally serviced and running efficiently. Test cooling in all rooms. Replace filter and verify thermostat works properly. Southeast summer heat is intense - confirm system is ready for months of heavy use ahead.' },
          { title: 'Maintain outdoor living spaces', description: 'Clean and seal deck or patio. Arrange outdoor furniture and check cushions. Test outdoor kitchen equipment and lighting. Prepare pool area if applicable. Southeast outdoor living season is year-round - ensure spaces are ready for spring and summer enjoyment.' },
          { title: 'Check pool and spa systems', description: 'Test and balance pool water chemistry (pH 7.2-7.8, chlorine 1-3 ppm). Clean filters and inspect pump and heater operation. Check for leaks in equipment. Ensure safety equipment is functional. Southeast pools get heavy use - proper maintenance is critical.' },
          { title: 'Test HVAC system (switch between heat and cooling modes)', description: 'Set thermostat to heat and verify furnace runs properly, then switch to cool and confirm AC starts and cools effectively. Listen for unusual noises in both modes. If either fails, call HVAC technician before you need it urgently.' },
          { title: 'Schedule AC service/inspection before summer', description: 'Book professional AC service if not done already. Technician will clean coils, check refrigerant levels, test capacitors, and ensure peak performance. Schedule now before summer rush. Southeast AC systems work hard and need annual service.' },
          { title: 'Test irrigation/sprinkler system for leaks and coverage', description: 'Run each zone and watch for broken heads, leaks, or dry spots. Adjust spray patterns to avoid watering pavement. Replace damaged components. Proper irrigation is essential for Southeast landscapes during hot, dry periods.' },
          { title: 'Inspect deck, porch, and railings for rot or loose boards', description: 'Walk deck testing boards for soft spots (rot) with screwdriver. Shake railings to check stability. Look for popped nails or loose screws. High Southeast humidity accelerates wood decay - replace rotten boards and tighten fasteners before injury occurs.' },
          { title: 'Check garage door auto-reverse safety feature', description: 'Place 2x4 board on ground in door path and close door - it should reverse when touching board. Wave broom under closing door - should reverse immediately. If not, adjust sensors or call technician. Critical safety feature.' },
          { title: 'Test safety lighting (motion sensor and exterior lights)', description: 'Walk around home at dusk ensuring all exterior lights activate. Test motion sensors by walking through detection zones. Replace burnt bulbs and clean sensor lenses. Good lighting deters intruders and prevents accidents on walks and stairs.' }
        ],
        weatherSpecific: [
          { title: 'Prepare for severe weather season', description: 'Stock emergency supplies including water, non-perishable food, flashlights, batteries, first aid kit, and important documents in waterproof container. Review evacuation routes. Southeast spring brings severe storms and early hurricane preparation is wise.' },
          { title: 'Check cooling system capacity', description: 'Verify AC keeps home comfortable on hot days. If system runs constantly or rooms stay warm, it may need service or be undersized. Check that all vents are open and unobstructed. Address issues now before peak summer heat.' },
          { title: 'Monitor for increased pest activity', description: 'Inspect for ants, termites, mosquitoes, and other pests active in warm Southeast weather. Check for mud tubes on foundation, standing water for mosquitoes, and ant trails. Seal entry points and consider professional pest control for prevention.' },
          { title: 'Inspect exterior for weather damage', description: 'Check siding, roof, windows, and doors for storm damage. Look for loose shingles, damaged gutters, or cracks in siding. Repair now before hurricane season. Southeast weather is harsh on exteriors - stay ahead of damage.' },
          { title: 'Check hurricane/storm preparedness supplies', description: 'Review hurricane kit including generator fuel, storm shutters, plywood, batteries, water, food, and medications. Test generator operation. Hurricane season starts in June - Southeast residents must prepare early and thoroughly every year.' }
        ],
        priority: 'high'
      },
      5: { // May
        seasonal: [
          { title: 'Peak air conditioning preparation', description: 'Verify AC system is running at peak efficiency. Replace filters monthly during heavy use. Monitor energy bills for unusual increases. Listen for strange noises. Southeast May heat arrives - ensure cooling system can handle months of constant use ahead.' },
          { title: 'Complete outdoor maintenance', description: 'Finish all outdoor projects before summer heat intensifies. Complete painting, deck sealing, and landscaping. Service lawn equipment and irrigation. Southeast summer heat makes outdoor work difficult - complete tasks now while weather is still manageable.' },
          { title: 'Check and maintain pool systems', description: 'Test pool water chemistry daily and adjust as needed. Clean filters weekly. Skim debris and vacuum pool. Check pump and filter operation. Inspect for leaks. Southeast pools see heavy use in summer - maintain water quality and equipment.' },
          { title: 'Inspect deck and outdoor structures', description: 'Check deck boards, railings, and stairs for rot, splinters, or loose fasteners. Tighten screws and replace damaged wood. Inspect pergolas and gazebos for stability. High Southeast humidity accelerates wood deterioration - maintain outdoor structures regularly.' },
          { title: 'Maintain landscaping systems', description: 'Adjust irrigation for warmer weather - water deeply but less frequently. Mulch plants to retain moisture. Fertilize appropriately for Southeast growing season. Monitor for disease and pests. Prune overgrown shrubs and remove dead plant material.' },
          { title: 'Test outdoor GFCI outlets with a tester', description: 'Plug GFCI tester into each outdoor outlet and press test button - power should cut immediately. Press reset to restore. Replace outlets that don\'t trip or won\'t reset. Critical safety for outdoor electrical use in humid Southeast climate.' },
          { title: 'Inspect and clean gutters and downspouts after spring pollen/debris', description: 'Remove heavy pollen, seed pods, and spring debris from gutters. Flush with hose to ensure proper flow. Southeast spring pollen is heavy - clean gutters before summer storms to prevent water damage and foundation issues.' },
          { title: 'Check lawn equipment (mower blades, fuel lines, spark plugs)', description: 'Sharpen or replace dull mower blades for clean cuts. Check fuel lines for cracks and replace if brittle. Replace spark plug if dark or worn. Clean air filter. Southeast lawns grow rapidly - maintain equipment for reliable performance.' },
          { title: 'Inspect fences and gates for stability', description: 'Push on fence posts checking for wobble or rot. Look for loose boards, rusted hardware, or leaning sections. Test gate latches and hinges. Tighten screws and replace rotten posts. High humidity and storms stress fences - maintain security and appearance.' },
          { title: 'Test window locks and lubricate if needed', description: 'Check all window locks engage properly and hold securely. Lubricate sticky locks with graphite powder or silicone spray (not oil). Tighten loose screws. Working locks improve security and energy efficiency during Southeast AC season.' },
          { title: 'Check exterior caulking (windows, doors, siding, trim)', description: 'Inspect caulk around all windows, doors, and where materials meet. Look for cracks, gaps, or missing caulk. Remove old damaged caulk and reapply with exterior-grade silicone. Proper sealing prevents water and pest entry in humid Southeast.' },
          { title: 'Clean washing machine drain filter', description: 'Place towels under washer, open access panel at bottom front, and remove filter. Clean out lint, debris, and coins. Replace filter and check for leaks during next wash. Prevents clogs and extends washer life in humid climate.' }
        ],
        weatherSpecific: [
          { title: 'Ensure air conditioning system is ready for heat', description: 'Test AC runs continuously and cools adequately during hot days. Replace filter monthly. Keep outdoor unit clear of debris. If system struggles or makes noise, call HVAC technician immediately - Southeast summer depends on working AC.' },
          { title: 'Check humidity control systems', description: 'Monitor indoor humidity with hygrometer - ideal 30-50%. Run dehumidifiers in damp areas. Ensure bathroom and kitchen fans vent outside. Southeast summer humidity causes mold and discomfort - control moisture levels actively.' },
          { title: 'Prepare for hurricane season', description: 'Hurricane season begins June 1st. Stock supplies now: water, food, batteries, flashlights, medications, cash, important documents. Install or test storm shutters. Review evacuation plan. Southeast residents must be fully prepared before storms threaten.' },
          { title: 'Monitor for summer storm damage prevention', description: 'Trim dead tree branches near house. Secure loose outdoor items. Clear gutters and drains. Check roof for loose shingles. Southeast summer brings severe thunderstorms and hurricanes - prevent damage proactively.' },
          { title: 'Check outdoor water and electrical systems', description: 'Ensure outdoor outlets are GFCI protected and weatherproof. Check hoses for leaks. Test irrigation system operation. Inspect outdoor lighting. High Southeast humidity and storms make outdoor systems vulnerable - verify safe operation.' }
        ],
        priority: 'high'
      },
      6: { // June
        seasonal: [
          { title: 'Peak cooling season maintenance', description: 'Replace AC filters monthly during peak use. Check that system cools effectively and runs smoothly. Monitor thermostat settings and ensure vents are open. Southeast June heat is intense - AC system will run almost constantly for next several months.' },
          { title: 'Monitor air conditioning efficiency', description: 'Track energy bills for unexpected increases suggesting inefficiency. Listen for unusual noises or frequent cycling. Ensure all rooms cool evenly. If performance drops, call HVAC technician immediately - Southeast summers are unbearable without working AC.' },
          { title: 'Maintain pool and outdoor systems', description: 'Test pool chemistry twice weekly minimum. Clean filters regularly and vacuum pool. Skim daily to remove debris. Check equipment for leaks and proper operation. Southeast pool season is in full swing - maintain water quality for safe swimming.' },
          { title: 'Check attic ventilation', description: 'On hot day, check attic temperature - shouldn\'t exceed 20°F above outdoor temp. Ensure soffit and ridge vents are clear. Verify attic fans work properly. Poor ventilation damages roof and increases cooling costs in intense Southeast summer heat.' },
          { title: 'Inspect for heat-related expansion', description: 'Look for gaps in caulking around windows and doors from heat expansion. Check for cracks in concrete or stucco. Monitor for doors or windows sticking. Southeast extreme heat causes materials to expand - address issues to prevent damage.' },
          { title: 'Flush water heater', description: 'Turn off power/gas and water supply. Attach hose to drain valve and run water into bucket or drain until clear, removing sediment. Close valve, restore water and power. Extends heater life and improves efficiency. Do annually in hard water areas.' },
          { title: 'Inspect attic ventilation fans and confirm proper airflow', description: 'Turn on attic fans and ensure they run smoothly without rattling. Check that vents open fully and feel for strong airflow. Clean dust from fan blades. Southeast attics can reach 150°F - proper ventilation is critical to protect roof and reduce cooling costs.' },
          { title: 'Test ceiling fans for wobble/balance', description: 'Run each ceiling fan on high and watch for excessive wobbling. Tighten mounting screws and blade brackets. Use balancing kit if needed (attach weights to blades). Clean blades. Set counterclockwise rotation for summer to push air downward for cooling.' },
          { title: 'Inspect plumbing under sinks for leaks', description: 'Open cabinets under all sinks and feel pipes for moisture. Look for water stains, rust, or mineral deposits. Run water and watch for drips at connections. Tighten loose fittings or replace worn washers. High Southeast humidity can hide small leaks - check regularly.' },
          { title: 'Test outdoor water pressure and hoses for leaks', description: 'Turn on outdoor faucets fully and note pressure. Check hoses for cracks, bulges, or leaks at connections. Replace worn washers. Upgrade old rubber hoses to reinforced ones. Good water pressure indicates healthy plumbing and supports irrigation needs.' },
          { title: 'Check pest control barriers and look for termite activity', description: 'Inspect foundation for mud tubes (termite highways). Look for discarded wings near windows and doors. Check wood for hollow sounds when tapped. Southeast has high termite activity - professional inspection annually is essential. Call immediately if signs detected.' },
          { title: 'Inspect grout and caulking in showers, tubs, and sinks', description: 'Check tile grout for cracks or missing sections. Inspect caulk around tubs, showers, and sinks for gaps or mold. Remove old caulk and reapply with mildew-resistant silicone. Seal porous grout. Southeast humidity makes bathroom waterproofing critical.' }
        ],
        weatherSpecific: [
          { title: 'Hurricane season preparation', description: 'Hurricane season is active June-November. Ensure emergency supplies are stocked and fresh. Know evacuation routes. Install or inspect storm shutters. Trim dangerous tree branches. Have generator fuel ready. Southeast hurricanes are serious - maintain constant readiness.' },
          { title: 'Check cooling system capacity for extreme heat', description: 'Verify AC maintains comfortable temperature during hottest parts of day. If system runs constantly but doesn\'t cool adequately, call HVAC technician. May need additional capacity or repairs. Southeast extreme heat demands properly functioning cooling system.' },
          { title: 'Monitor humidity and mold prevention', description: 'Use hygrometer to check indoor humidity - keep 30-50%. Run dehumidifiers continuously in damp areas. Ensure exhaust fans vent outside. Check for musty odors indicating mold. Southeast summer humidity promotes mold growth - control moisture aggressively.' },
          { title: 'Inspect for storm damage preparation', description: 'Before storm season peaks, secure all loose outdoor items. Check roof and gutters are sound. Ensure windows and doors seal properly. Have emergency supplies ready. Southeast summer storms can be severe - prepare home thoroughly.' },
          { title: 'Check emergency generator if applicable', description: 'Test generator operation monthly. Run for 15-20 minutes under load. Check oil level and fuel. Keep fresh fuel stored properly. Hurricane season power outages are common in Southeast - ensure backup power works reliably.' }
        ],
        priority: 'high'
      },
      7: { // July
        seasonal: [
          { title: 'Peak summer maintenance', description: 'Keep up with all maintenance during intense Southeast heat. Replace AC filters monthly. Maintain pool chemistry. Water lawn during coolest parts of day. Monitor systems for stress from constant use. Check on elderly neighbors during heat waves.' },
          { title: 'Monitor energy efficiency', description: 'Compare current electric bills to previous summers. Unexpectedly high bills suggest AC inefficiency or air leaks. Keep blinds closed during hottest hours. Use programmable thermostat. Southeast summer cooling costs are high - maximize efficiency to control expenses.' },
          { title: 'Maintain cooling systems', description: 'Check AC filter monthly and replace when dirty. Keep outdoor unit clear of debris and vegetation. Listen for unusual noises. Ensure all vents blow cold air. Call technician immediately for any performance issues - Southeast heat is dangerous without AC.' },
          { title: 'Check and clean pool systems', description: 'Test and balance pool water chemistry 2-3 times weekly during peak use. Backwash filter weekly. Skim and vacuum pool regularly. Check chlorinator and salt cell if applicable. Southeast pools need intensive maintenance in heavy use season.' },
          { title: 'Inspect outdoor equipment', description: 'Clean lawn mower after each use. Check oil and blade sharpness. Clean and maintain garden tools. Inspect grill for grease buildup and propane leaks. Service irrigation system. Southeast outdoor equipment works hard in heat and humidity.' },
          { title: 'Test home security system and update codes if needed', description: 'Test all door and window sensors. Replace low batteries in wireless sensors. Update access codes if contractors or guests had codes. Ensure monitoring service contact info is current. Check camera operation. Summer vacation season requires security vigilance.' },
          { title: 'Inspect driveway and walkways for cracks', description: 'Fill small cracks in asphalt or concrete before they expand from heat. Use appropriate crack filler for surface type. Consider seal coating asphalt driveways. Replace broken or heaving concrete sections to prevent trips. Southeast heat accelerates pavement deterioration.' },
          { title: 'Test outdoor drainage after heavy rain', description: 'During summer thunderstorms, check that water flows away from foundation. Look for pooling near house. Ensure downspouts extend 5+ feet from foundation. Clear any clogged drains. Southeast summer storms are intense - verify drainage works properly.' },
          { title: 'Check refrigerator door seals (paper test)', description: 'Close dollar bill in refrigerator door - if you can pull it out easily, seal is worn and cold air escaping. Check entire seal perimeter. Clean seals with soap and water or replace if cracked. Proper seals save energy during Southeast summer cooling costs.' },
          { title: 'Inspect pool equipment (if applicable) for safety and leaks', description: 'Check pool pump, filter, and heater for leaks or unusual noises. Test GFCI protection on all pool electrical. Ensure pool covers and safety fencing secure. Check pool lights for cracks. Southeast pool season peaks - safety is critical.' },
          { title: 'Test garage door keypad and remotes', description: 'Test each garage door opener remote and keypad code. Replace batteries in weak remotes. Update keypad codes if needed for security. Ensure opener responds consistently. Program new remotes per manufacturer instructions.' },
          { title: 'Clean washing machine drain filter', description: 'Place towels under washer, open bottom access panel, and remove filter. Clean lint, coins, and debris. Replace filter and test next load for leaks. Prevents drainage issues and extends washer life. Do every 2-3 months in humid Southeast climate.' }
        ],
        weatherSpecific: [
          { title: 'Peak hurricane season vigilance', description: 'July-September is peak Atlantic hurricane season. Monitor weather forecasts closely. Keep emergency supplies fresh and accessible. Know evacuation routes. Have important documents ready. Fill prescriptions. Southeast coastal residents must stay alert and prepared to act quickly.' },
          { title: 'Monitor air conditioning during extreme heat', description: 'During heat waves, check AC runs smoothly and cools adequately. Don\'t set thermostat too low (strains system). Close blinds and limit oven use. If system fails, seek cooling center. Southeast July heat is dangerous - monitor vulnerable family members.' },
          { title: 'Check for heat stress on exterior materials', description: 'Inspect siding, trim, and caulking for damage from extreme heat. Look for warping, cracking, or gaps. Check roof shingles for curling. Monitor deck for splintering. Southeast summer heat stresses materials - catch damage early.' },
          { title: 'Monitor humidity and moisture control', description: 'Keep indoor humidity 30-50% using dehumidifiers and AC. Run bathroom and kitchen exhaust fans during use. Check for condensation on windows or pipes. Look for musty odors. Southeast summer humidity is oppressive - active moisture control prevents mold and damage.' },
          { title: 'Inspect storm shutters and protection', description: 'Test storm shutters deploy properly. Check hardware and tracks. Ensure plywood and mounting brackets are ready if applicable. Verify generator operates. Keep fuel fresh. Southeast hurricane threats require shutters ready to deploy on short notice.' }
        ],
        priority: 'high'
      },
      8: { // August
        seasonal: [
          { title: 'Continue peak summer maintenance', description: 'Maintain vigilance with all systems during hottest month. Replace AC filters, monitor pool chemistry, water lawn appropriately. Check on vulnerable neighbors. Southeast August is typically hottest month - keep all systems running optimally.' },
          { title: 'Monitor cooling system performance', description: 'Track AC performance during peak use. Listen for strain or unusual noises. Ensure adequate cooling in all rooms. Monitor energy consumption. If system shows wear, schedule service now - Southeast AC systems face months more of heavy use.' },
          { title: 'Maintain outdoor living areas', description: 'Keep outdoor spaces clean despite limited use in extreme heat. Maintain pool area, clean furniture, and protect surfaces from sun damage. Water plants during coolest hours. Southeast August heat limits outdoor activities but spaces still need care.' },
          { title: 'Check pool and spa equipment', description: 'Inspect pool pump and filter for signs of strain from heavy use. Listen for unusual noises. Check for leaks around equipment. Ensure adequate water circulation. Monitor chlorine consumption. Southeast pools work overtime in August - watch for equipment stress.' },
          { title: 'Inspect exterior for heat damage', description: 'Look for warped siding, cracked caulk, or faded paint from intense sun exposure. Check for gaps around windows and doors. Monitor wood surfaces for splitting. Southeast August heat is punishing on exteriors - identify damage before it worsens.' },
          { title: 'Inspect roof shingles for summer storm damage', description: 'From ground with binoculars, look for missing, cracked, or curled shingles after summer storms. Check flashing around chimneys and vents. Look for granule loss in gutters. Southeast summer storms are severe - inspect after each major storm event.' },
          { title: 'Test HVAC performance (is the AC cooling properly?)', description: 'Measure temperature at vents with thermometer - should be 15-20°F cooler than room air. Check that all rooms cool evenly. Listen for system cycling properly. If cooling is inadequate, call technician immediately - Southeast heat is dangerous.' },
          { title: 'Test water pressure regulator (should be ~40–60 psi)', description: 'Attach pressure gauge to outdoor faucet and turn on water. Reading should be 40-60 psi. Too high damages plumbing and appliances; too low indicates issues. If outside range, have plumber adjust regulator or investigate problems.' },
          { title: 'Inspect chimney exterior for cracks or leaning', description: 'From ground, look at chimney for cracks in masonry, leaning, or loose bricks. Check flashing where chimney meets roof. While rarely used in Southeast, chimneys still need structural integrity. Call mason for significant cracks or leaning.' },
          { title: 'Check septic system filter/inspection port (if applicable)', description: 'Open septic tank inspection port and check filter for clogs. Clean or replace filter as needed. Note tank levels. If tank is over half full or you see backup signs, schedule pumping. Southeast septic systems need regular monitoring.' },
          { title: 'Flush garbage disposal with ice and vinegar to clean blades', description: 'Fill disposal with ice cubes and run with cold water to sharpen blades and clean buildup. Then flush with vinegar and baking soda to deodorize. Run cold water 30 seconds after grinding anything. Keeps disposal fresh in humid Southeast climate.' }
        ],
        weatherSpecific: [
          { title: 'Peak hurricane season preparation', description: 'August-September is statistical peak of hurricane season. Monitor National Hurricane Center forecasts daily. Keep emergency supplies stocked and vehicle fueled. Be ready to evacuate on short notice. Southeast coastal areas face highest risk now.' },
          { title: 'Monitor extreme heat effects on home', description: 'Watch for heat-stressed materials: cracking concrete, warping wood, failing caulk. Ensure AC keeps up with demand. Monitor for power brownouts. Check that attic ventilation is adequate. Southeast August heat tests home systems to their limits.' },
          { title: 'Check moisture and humidity control', description: 'Monitor dehumidifier operation and empty reservoirs regularly. Check for condensation on windows, pipes, or in closets. Look for musty odors. Run exhaust fans religiously. Southeast August humidity is oppressive - aggressive moisture control prevents mold.' },
          { title: 'Inspect for storm damage prevention', description: 'Keep emergency supplies fresh and accessible. Ensure storm shutters function properly. Trim dead branches before they fall. Clear gutters and drains. Southeast August tropical systems can develop quickly - stay prepared at all times.' },
          { title: 'Check cooling system efficiency', description: 'Monitor electric bills compared to previous years. Ensure insulation is adequate and windows seal properly. Consider adding shade to south and west windows. Keep outdoor AC unit clean. Southeast August cooling costs peak - maximize efficiency.' }
        ],
        priority: 'high'
      },
      9: { // September
        seasonal: [
          { title: 'Continue hurricane season vigilance', description: 'September is statistically most active hurricane month. Monitor weather forecasts constantly. Keep emergency supplies ready and fresh. Know evacuation routes. Fill prescriptions early. Have generator fuel ready. Southeast September requires maximum hurricane preparedness and awareness.' },
          { title: 'Maintain cooling systems', description: 'Continue monthly AC filter changes. Monitor system performance as it enters final months of heavy use. Keep outdoor unit clean. Watch for signs of wear. Southeast September is still hot - cooling system remains critical for comfort and safety.' },
          { title: 'Begin gradual fall preparation', description: 'Start planning for minimal Southeast fall season. Order HVAC service for heating system check. Plan exterior maintenance projects. Prepare lawn for fall fertilization. While still hot, Southeast fall arrives gradually - begin preparing for seasonal transition.' },
          { title: 'Check exterior maintenance needs', description: 'Inspect siding, trim, and paint for summer damage. Look for needed repairs or repainting. Check roof condition. Plan projects for cooler October-November weather. Southeast exteriors take beating from summer - address damage before winter.' },
          { title: 'Inspect pool and outdoor equipment', description: 'If reducing pool use as kids return to school, adjust chemical routine accordingly. Service pool equipment before reduced use season. Check outdoor furniture for damage. Southeast pools may see less use in fall but still need maintenance.' },
          { title: 'Test smoke and carbon monoxide detectors', description: 'Press test button on all smoke and CO detectors. Replace batteries in any with low battery warnings. Clean dust from sensors with vacuum attachment. Replace smoke detectors older than 10 years and CO detectors older than 7 years. Install detectors on every level and near bedrooms. Quarterly testing ensures these critical safety devices work properly in Southeast homes.', priority: 'high' },
          { title: 'Test thermostat programming', description: 'Verify programmable thermostat settings are appropriate for early fall. Test switching between cool and heat modes. Replace thermostat batteries if applicable. Program for energy savings as weather begins gradual cooling. Proper programming saves money.' },
          { title: 'Inspect weatherstripping and door seals before cold weather', description: 'Check door and window weatherstripping for gaps or wear. While Southeast winters are mild, proper sealing improves heating efficiency and keeps out humidity. Replace worn sections and add door sweeps where needed before heating season.' },
          { title: 'Check attic for pests (rodents often enter in fall)', description: 'Inspect attic for signs of rodents, raccoons, or other pests seeking shelter. Look for droppings, nesting materials, or entry holes. Seal gaps larger than 1/4 inch. Southeast pests stay active year-round but fall brings new shelter-seeking behavior.' },
          { title: 'Test outdoor handrails and steps for safety', description: 'Grab handrails and shake firmly - they should not wobble. Check that fasteners are tight. Look for rot in wood railings. Test deck stairs for stability. Repair loose or rotten components immediately to prevent falls and injuries.' },
          { title: 'Clean washing machine drain filter', description: 'Open access panel at bottom front of washer and remove filter. Clean out accumulated lint, coins, and debris. Replace filter and run test load watching for leaks. Do every 2-3 months in humid Southeast climate to prevent drainage issues.' }
        ],
        weatherSpecific: [
          { title: 'Peak hurricane season continues', description: 'September is peak month for major hurricanes. Stay alert to National Hurricane Center forecasts. Keep emergency kit ready. Know evacuation zones and routes. Have shutters ready to install quickly. Southeast September requires constant weather awareness and readiness.' },
          { title: 'Monitor for storm damage and preparation', description: 'After summer storms, inspect for accumulated damage. Check roof, gutters, and exterior. Repair damage before hurricane season ends. Keep emergency supplies stocked. Southeast September storms can still be severe - stay prepared and vigilant.' },
          { title: 'Check cooling system as heat continues', description: 'AC still runs heavily in September Southeast heat. Monitor performance and efficiency. Change filters monthly. Watch for signs of wear after long cooling season. Schedule maintenance if performance drops. System still has weeks more of heavy use ahead.' },
          { title: 'Inspect drainage and water management', description: 'Ensure gutters and downspouts are clear before fall rains. Check that grading slopes away from foundation. Test drainage during rain events. September tropical systems bring heavy rain - verify your drainage system handles water properly.' },
          { title: 'Monitor for continued pest activity', description: 'Pests remain very active in warm Southeast September. Watch for increased ant activity, termites, and mosquitoes. Keep standing water eliminated. Check for entry points and seal gaps. Consider professional pest control if infestations develop.' }
        ],
        priority: 'high'
      },
      10: { // October
        seasonal: [
          { title: 'Begin transition to cooler weather', description: 'Start preparing for mild Southeast fall and winter. Schedule heating system service. Plan outdoor maintenance projects for pleasant weather. Reduce pool maintenance as use decreases. October brings comfortable weather - tackle delayed outdoor projects.' },
          { title: 'Check heating system preparation', description: 'Schedule professional furnace or heat pump inspection before cool weather. Technician will check burners, heat exchanger, and safety controls. While Southeast winters are mild, reliable heating is important for comfort during occasional cold snaps.' },
          { title: 'Clean gutters and drainage systems', description: 'Remove fall leaves and debris from gutters and downspouts. Flush with hose to ensure flow. Check that downspouts extend away from foundation. Southeast fall rains require clean gutters to prevent water damage and foundation problems.' },
          { title: 'Inspect exterior paint and siding', description: 'Check siding and paint for summer storm damage, fading, or peeling. Look for wood rot from high humidity. Plan repainting or repairs for comfortable fall weather. Southeast exteriors suffer from intense summer sun and humidity - assess damage now.' },
          { title: 'Maintain outdoor equipment', description: 'Service or store seasonal equipment. Drain and store pool equipment if closing pool. Service lawn equipment before reduced use season. Clean and store outdoor furniture if desired. Southeast outdoor maintenance continues but at reduced intensity.' },
          { 
            title: 'Winterize outdoor water systems (optional in most Southeast areas)', 
            description: 'In northern parts of Southeast region or during occasional freeze warnings, drain and store garden hoses indoors. Shut off interior valves to outdoor faucets and drain remaining water. Install insulated foam faucet covers for freeze protection. Most Southeast areas don\'t require full winterization, but occasional freezes can damage unprepared pipes. Better safe than dealing with burst pipe repairs.',
            priority: 'low'
          },
          { title: 'Test outdoor lighting (especially pathway and security lights)', description: 'Test all outdoor lights as days shorten. Replace burnt bulbs and clean fixtures. Check motion sensors work properly. Ensure pathway and security lighting adequate for darker evenings. Good lighting prevents accidents and deters intruders.' },
          { title: 'Test emergency generator if you have one', description: 'Run generator for 15-20 minutes under load. Check oil level and change if due. Verify battery charge. Keep fuel stabilizer in stored gas. Southeast homes rely on generators for hurricane season - test before storing or during off-season.' },
          { title: 'Inspect fireplace and chimney flue; schedule cleaning if needed', description: 'Open damper and look up chimney with flashlight for creosote buildup or obstructions. Schedule chimney sweep if heavily used last season. Check firebox for cracks. Southeast fireplaces used occasionally - ensure safe before cool weather use.' },
          { title: 'Test smoke and carbon monoxide detectors', description: 'Press test button on all smoke and CO detectors to verify operation. Replace batteries if needed. Clean dust from sensors with vacuum. Replace smoke detectors older than 10 years and CO detectors older than 7 years. Detectors should be near sleeping areas and on every level. Even mild Southeast heating season requires CO detector safety - test before using heating systems.', priority: 'high' },
          { title: 'Check insulation around pipes to prevent winter freezing', description: 'In attics, crawl spaces, and exterior walls, verify pipes have insulation. While Southeast freezes are rare, they do occur and can burst unprepared pipes. Focus on north-facing walls and unheated areas. Inexpensive foam pipe insulation provides protection.' },
          { title: 'Test ground drainage with garden hose', description: 'Run hose at various locations around foundation to verify water flows away from house. Ground should slope 6 inches down over 10 feet. Look for pooling water. Poor drainage causes foundation problems in Southeast heavy rains.' }
        ],
        weatherSpecific: [
          { title: 'End of hurricane season vigilance', description: 'Hurricane season officially ends November 30th, but October can still bring storms. Stay weather aware through October. Once season ends, assess and replenish emergency supplies for next year. Southeast October still requires hurricane awareness until month ends.' },
          { title: 'Transition HVAC systems for cooler weather', description: 'As cooling needs decrease, verify heating system works properly. Test thermostat switching between modes. Change to heating filters if different. Southeast October sees transition from AC to occasional heat - ensure both systems function properly.' },
          { title: 'Check for mild fall weather preparation', description: 'Prepare for comfortable Southeast fall weather. Plan outdoor projects while temperatures are pleasant. Check windows and doors for air leaks. Light maintenance now prevents issues in winter. October is ideal for outdoor work.' },
          { title: 'Monitor humidity changes', description: 'As outdoor humidity decreases with cooler weather, monitor indoor levels with hygrometer. May need less dehumidification. Ensure humidity stays 30-50% for comfort. Southeast fall brings welcome relief from oppressive summer humidity - enjoy comfortable conditions.' },
          { title: 'Inspect for storm season damage', description: 'With hurricane season ending, thoroughly inspect for accumulated storm damage. Check roof, gutters, siding, and landscape. Document damage for insurance if needed. Repair issues now during pleasant weather before next storm season begins.' }
        ],
        priority: 'medium'
      },
      11: { // November
        seasonal: [
          { title: 'Prepare for mild winter season', description: 'Get ready for Southeast mild winter. Ensure heating system works properly. Check weatherstripping. Stock firewood if applicable. Prepare for occasional cold snaps. Southeast winters are generally mild but occasional freezes require preparation.' },
          { title: 'Check heating system operation', description: 'Run heat and verify warm air flows from all vents. Listen for unusual noises. Check thermostat operation. Replace filter. While rarely used, Southeast heating should work reliably for occasional cool days. Call HVAC technician if issues arise.' },
          { title: 'Clean and maintain outdoor areas', description: 'Rake leaves and remove fall debris from lawn and beds. Clean and store pool equipment if closing pool for winter. Trim back perennials. Southeast fall cleanup is lighter than northern regions but outdoor spaces still need attention.' },
          { title: 'Inspect weatherproofing', description: 'Check weatherstripping on doors and windows. Look for gaps that allow air leaks. Add door sweeps where needed. While Southeast winters are mild, proper sealing improves heating efficiency and keeps out humidity and pests. Replace worn weatherstripping.' },
          { title: 'Check holiday decoration safety', description: 'Inspect holiday lights for frayed wires or broken sockets before installing. Test outdoor outlets are GFCI protected. Don\'t overload circuits. Use outdoor-rated decorations outside. Ensure ladders are stable. Southeast holiday decorating is popular - prioritize safety.' },
          { title: 'Test garage door auto-reverse safety again', description: 'Place board on ground in door path and close - door should reverse when touching board. Wave broom under closing door - should reverse immediately. Adjust sensors if needed. Test periodically to ensure this critical safety feature functions properly.' },
          { title: 'Inspect and clean gutters of fall leaves', description: 'Remove accumulated fall leaves from gutters and downspouts. Flush with hose to ensure flow. Check for sagging or damage. Southeast fall leaf drop is lighter than North but gutters still need clearing before winter rains arrive.' },
          { title: 'Test backup sump pump battery (if applicable)', description: 'Pour water in sump pit to activate pump. Then disconnect power and verify backup battery system activates and pumps water. Charge or replace battery if weak. Southeast low areas need reliable sump pumps for heavy winter rains.' },
          { title: 'Inspect snow removal equipment (snowblower, shovels, salt)', description: 'Not applicable for most Southeast locations. In northern parts of region (mountains, upper South), check equipment now. Most Southeast homes don\'t need snow removal equipment - occasional snow melts quickly on its own.' },
          { title: 'Test outdoor outlets (holiday lighting safety)', description: 'Plug lamp or tester into each outdoor outlet and press GFCI test button - should trip immediately. Reset to restore power. Replace outlets that don\'t trip. Essential safety before plugging in holiday lights and decorations outdoors.' },
          { title: 'Inspect weatherproofing on exterior doors/windows', description: 'Check caulk around door and window frames for cracks or gaps. Inspect weatherstripping on doors for wear. Replace damaged caulk and weatherstripping. Southeast humidity and storms stress seals - maintain weatherproofing for efficiency and protection.' },
          { title: 'Clean washing machine drain filter', description: 'Open access panel at washer bottom front, place towels underneath, and remove filter. Clean out lint and debris. Replace and test for leaks. Humid Southeast climate requires regular filter cleaning every 2-3 months to prevent drainage issues.' }
        ],
        weatherSpecific: [
          { title: 'Prepare for cooler but mild winter', description: 'Southeast winters bring pleasant daytime temperatures but occasional cold snaps. Prepare light outerwear, ensure heating works, protect sensitive plants. Stock supplies for rare ice or snow events. Enjoy comfortable winter while staying prepared for occasional extreme weather.' },
          { title: 'Check heating system for occasional use', description: 'Verify heat works properly for occasional cool days and nights. Southeast homes don\'t use heat constantly, but reliable heating is important for comfort. Test system early in season to address issues before you need it during cold snap.' },
          { title: 'Monitor humidity levels during heating', description: 'Occasional heat use can dry indoor air in Southeast. Monitor humidity with hygrometer - ideal 30-50%. May need humidifier during heating periods. Too dry causes discomfort and static. Balance heating needs with humidity comfort.' },
          { title: 'Check for minimal freeze protection needs', description: 'Southeast rarely freezes, but when it does, unprepared homes suffer damage. Cover outdoor faucets, know how to drip faucets, protect sensitive plants. Have freeze emergency plan ready for occasional Arctic fronts that reach Southeast.' },
          { title: 'Inspect for reduced pest activity', description: 'Pests remain active year-round in mild Southeast climate, though activity decreases slightly in winter. Continue monitoring for ants, termites, and rodents. Maintain pest control measures. Southeast winter doesn\'t provide pest-killing freezes like northern regions.' }
        ],
        priority: 'medium'
      },
      12: { // December
        seasonal: [
          { title: 'Monitor heating system performance', description: 'As Southeast experiences coolest weather, monitor heating system operation. Listen for unusual noises. Check all rooms heat adequately. Replace filter monthly during use. If system struggles or makes noise, call HVAC technician for repair before holidays.' },
          { title: 'Check holiday decorations and lighting', description: 'Inspect all holiday lights and decorations for safety. Check for frayed wires, broken bulbs, or damaged connections. Don\'t overload outlets. Use outdoor-rated items outside. Turn off lights when away or sleeping. Southeast holiday displays are beautiful - keep them safe.' },
          { title: 'Maintain mild winter preparations', description: 'Keep home ready for Southeast winter variability. Monitor weather forecasts for occasional cold snaps or freezes. Protect sensitive plants when freezes threaten. Ensure heating works reliably. Stock supplies for rare winter weather events.' },
          { title: 'Test smoke and carbon monoxide detectors', description: 'Press test button on all smoke and CO detectors. Replace batteries in chirping units. Clean dust from sensors with vacuum. Detectors should be on every level and near sleeping areas. Holiday season requires extra fire safety vigilance with candles and decorations.' },
          { title: 'Check weatherstripping and insulation', description: 'Inspect door and window seals for gaps allowing cold air or humidity entry. Replace worn weatherstripping. Check attic insulation is adequate and evenly distributed. Southeast mild winters still benefit from good weatherproofing for comfort and efficiency.' },
          { title: 'Check water heater pressure relief valve (carefully lift lever)', description: 'Carefully lift lever on pressure relief valve at top or side of water heater. Water should discharge through drain pipe. Release lever - discharge should stop. If valve doesn\'t work or won\'t stop dripping after test, call plumber immediately for safety.' },
          { title: 'Test indoor circuit breakers (flip each one to ensure not stuck)', description: 'Open electrical panel and flip each breaker to off then back to on. Stuck breakers won\'t protect circuits. Breakers should snap firmly. If any feel loose or won\'t reset, call electrician. Working breakers are essential safety protection.' },
          { title: 'Inspect attic and crawl space for moisture or leaks', description: 'Check attic and crawl space for water stains, dampness, or active leaks. Look for mold or musty odors. Ensure adequate ventilation. Southeast humidity requires good moisture control even in winter. Address leaks and ventilation issues immediately.' },
          { title: 'Test furnace emergency shut-off switch', description: 'Locate red emergency shut-off switch near furnace (looks like light switch). Flip to off - furnace should stop immediately. Flip back on - furnace should restart. Working emergency switch critical for safety if furnace problems occur.' },
          { title: 'Run whole-home safety drill (fire escape plan + extinguisher use)', description: 'Practice fire escape plan with entire household. Know two exits from each room. Designate outside meeting place. Show everyone fire extinguisher locations and how to use. Holiday season with candles, lights, and cooking requires extra fire safety awareness and preparation.' }
        ],
        weatherSpecific: [
          { title: 'Monitor for occasional freeze conditions', description: 'Southeast can experience occasional freezes December through February. Monitor weather forecasts for freeze warnings. Cover outdoor faucets, drip indoor faucets, protect sensitive plants. Bring pets inside. Southeast freezes are brief but can damage unprepared homes and gardens.' },
          { title: 'Check heating system during cold snaps', description: 'During occasional Southeast cold snaps, verify heating system maintains comfortable temperature. Don\'t set thermostat unusually high - systems not designed for extreme demand. If inadequate heating, use space heaters safely or call HVAC technician.' },
          { title: 'Prepare for mild winter storm conditions', description: 'Southeast winter storms bring rain, occasional ice, and rare snow. Stock basic emergency supplies. Know how to turn off water main if pipes freeze. Have flashlights and batteries ready. Most winter weather is mild but be prepared for exceptions.' },
          { title: 'Monitor humidity during heating season', description: 'Occasional heat use can dry indoor air. Monitor with hygrometer - maintain 30-50% humidity. Use humidifier if too dry. Southeast winters generally humid but indoor heating creates dry pockets. Balance comfort with preventing excess moisture.' },
          { title: 'Check for continued year-round pest activity', description: 'Mild Southeast winters allow pests to remain active year-round. Continue monitoring for ants, roaches, termites, and rodents. Check for entry points and seal gaps. Professional pest control may be needed. Southeast doesn\'t get killing freezes that eliminate pests.' }
        ],
        priority: 'medium'
      }
    },
    yearRoundTasks: [
      { title: 'Test smoke and carbon monoxide detectors monthly', description: 'Press test button on all smoke and CO detectors monthly to verify operation. Replace batteries twice yearly or when chirping. Clean dust from sensors with vacuum. Replace smoke detectors over 10 years old and CO detectors over 7 years old for safety.' },
      { title: 'Check HVAC filters monthly (more frequent due to humidity)', description: 'Remove AC/furnace filter monthly and hold to light - replace if you cannot see through it clearly. Southeast humidity and long cooling season require frequent filter changes. Dirty filters reduce efficiency, increase costs, and strain system. Use quality pleated filters.' },
      { title: 'Inspect for mold and moisture quarterly', description: 'Check bathrooms, basements, attics, and closets for mold, mildew, or musty odors every 3 months. Look for water stains or dampness. Monitor humidity with hygrometer - keep 30-50%. Southeast humidity promotes mold - early detection prevents health issues and damage.' },
      { title: 'Professional pest control quarterly', description: 'Schedule professional pest control service every 3 months for preventive treatment. Southeast climate supports year-round pest activity including termites, ants, roaches, and mosquitoes. Regular professional service is more effective and economical than reactive treatments.' },
      { title: 'Hurricane preparedness supplies check quarterly', description: 'Every 3 months review hurricane emergency kit: water, non-perishable food, batteries, flashlights, medications, first aid, cash, important documents. Replace expired items. Test generator. Refresh supplies before hurricane season. Southeast coastal living demands constant preparedness.' }
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
          { title: 'Peak heating season maintenance', description: 'Monitor furnace during coldest months. Listen for unusual noises. Replace filters monthly during heavy use. Ensure all vents are open and unobstructed. Midwest January cold is extreme - heating system must run reliably for months ahead.' },
          { title: 'Check heating system efficiency', description: 'Monitor heating performance and energy bills. Ensure home heats evenly. Listen for concerning sounds like banging or grinding. If system runs constantly but doesn\'t heat well, call HVAC technician. Midwest winter is long and cold - efficiency matters.' },
          { title: 'Inspect and clean fireplace/chimney', description: 'Remove ash buildup when cool. Check damper operation. Look for cracks in firebox. If used regularly, schedule professional chimney sweep to remove dangerous creosote. Midwest homes rely on fireplaces for supplemental heat during harsh winters.' },
          { title: 'Test carbon monoxide detectors', description: 'Press test button on all CO detectors to verify operation. Replace batteries if needed. Place detectors near bedrooms and on every level. Midwest winter heating season with closed windows makes CO detector testing critical for safety.' },
          { title: 'Check insulation and weatherstripping', description: 'Inspect attic insulation depth (should be 12-14 inches in Midwest). Look for gaps or compressed areas. Check door and window weatherstripping for wear. Good insulation critical for keeping Midwest homes warm and reducing heating costs in brutal winter.' },
          { title: 'Clean washing machine drain filter', description: 'Open access panel at bottom front of washer. Place towels underneath and remove filter. Clean out lint, coins, and debris. Replace filter and check for leaks. Prevents drainage issues and extends washer life through winter months.' }
        ],
        weatherSpecific: [
          { title: 'Monitor for extreme cold effects on pipes', description: 'During subzero weather, feel pipes in unheated areas for cold spots. Open cabinet doors under sinks for warm air circulation. Let faucets drip when temps drop below zero. Midwest extreme cold can freeze and burst pipes - prevention is critical.' },
          { title: 'Check for ice dams and roof snow load', description: 'Look for icicles and ice buildup at roof edges indicating ice dams. If snow exceeds 2 feet or roof sags, carefully remove snow with roof rake from ground. Never climb snow-covered roof. Midwest heavy snow causes ice dams and structural stress.' },
          { title: 'Ensure adequate heating system capacity', description: 'Verify furnace keeps home comfortable during coldest days. System should not run constantly. If it struggles to maintain temperature, it may need service or be undersized. Midwest January cold tests heating systems to their limits.' },
          { title: 'Monitor humidity levels (winter air is dry)', description: 'Use hygrometer to check indoor humidity - ideal 30-50%. Midwest winter air is very dry indoors. Run humidifier if too dry to prevent health issues, static, and wood cracking. Balance with preventing excess condensation on windows.' },
          { title: 'Check for drafts and heat loss', description: 'On windy winter day, hold candle or incense near windows and doors. Wavering smoke indicates air leaks. Seal gaps with caulk or weatherstripping. Midwest winter drafts waste energy and create uncomfortable cold spots in home.' }
        ],
        priority: 'high'
      },
      2: { // February
        seasonal: [
          { title: 'Continue peak winter maintenance', description: 'Maintain vigilance with heating system during continued cold. Replace furnace filters monthly. Check for ice dams after storms. Monitor energy usage for unusual increases. Midwest February remains harsh - keep all winter systems functioning optimally.' },
          { title: 'Service heating system', description: 'Schedule professional HVAC inspection while still in heating season. Technician will check burners, heat exchanger, and safety controls. Address any issues before spring. Midwest furnaces work hard all winter - professional service ensures safety and efficiency.' },
          { title: 'Check attic insulation and ventilation', description: 'Inspect attic insulation for proper depth and coverage. Ensure soffit and ridge vents are clear of snow and ice. Good insulation and ventilation prevent ice dams and reduce heating costs. Midwest attics need both for winter performance.' },
          { title: 'Inspect storm doors and windows', description: 'Check storm windows and doors for tight seals. Look for condensation between glass panes indicating seal failure. Ensure latches work properly. Storm windows critical for Midwest homes to reduce heat loss and improve comfort during long winters.' },
          { title: 'Monitor energy usage', description: 'Compare winter heating bills to previous years. Unexpectedly high bills suggest system inefficiency or air leaks. Note patterns and investigate causes. Midwest winter heating costs are significant - monitoring helps control expenses and identify problems early.' }
        ],
        weatherSpecific: [
          { title: 'Prepare for potential severe winter weather', description: 'Keep emergency supplies stocked: flashlights, batteries, water, non-perishable food, blankets. Have backup heat source plan. Stock snow removal supplies. Midwest late winter can bring severe blizzards - maintain constant readiness for major storms.' },
          { title: 'Check ice and snow removal equipment', description: 'Ensure snowblower runs properly. Check belts, auger, and chute operation. Replace worn scraper on snow blower. Sharpen shovel edges. Stock ice melt. Midwest February still brings heavy snow - equipment must work reliably through end of winter.' },
          { title: 'Monitor heating system during cold snaps', description: 'During extreme cold, verify furnace maintains comfortable temperature without constant running. Listen for unusual noises. Check filter is clean. If system struggles, call HVAC technician immediately - Midwest cold is dangerous without reliable heat.' },
          { title: 'Check for winter damage to exterior', description: 'Look for ice damage to gutters, siding, or trim. Check for cracks in concrete from freeze-thaw cycles. Note damage for spring repairs. Midwest winter weather is harsh on exteriors - documenting damage helps plan spring maintenance.' },
          { title: 'Ensure proper ventilation during heating', description: 'Run bathroom and kitchen exhaust fans during use. Crack windows briefly on mild days for fresh air. Check that dryer vents outside. Midwest winter homes sealed tight need ventilation to prevent moisture buildup, stuffiness, and mold growth.' }
        ],
        priority: 'high'
      },
      3: { // March
        seasonal: [
          { title: 'Begin spring transition planning', description: 'As Midwest begins slow thaw, plan spring projects. Order supplies for painting, landscaping, repairs. Check garage organization. Prepare for mud season and rapid weather changes. March brings variable weather - use mild days for outdoor project planning.' },
          { title: 'Check HVAC system for seasonal change', description: 'Test both heating and cooling modes as spring approaches. Schedule professional AC service before warm weather. Replace filter. Midwest March sees wild temperature swings - both systems must work reliably for unpredictable weather.' },
          { title: 'Inspect exterior for winter damage', description: 'Walk around home checking for damaged siding, gutters, or trim from ice and snow. Look for cracks in foundation or concrete. Note repairs needed. Midwest winter is harsh - thoroughly assess damage before starting spring repairs.' },
          { title: 'Begin spring cleaning preparation', description: 'Start deep cleaning after long winter indoors. Open windows on mild days. Wash winter-sealed windows. Vacuum vents and baseboards. Organize closets. Midwest spring cleaning refreshes home after months of closed-up winter living.' },
          { title: 'Check outdoor equipment for spring startup', description: 'Inspect lawn mower, remove snowblower. Check garden tools and hoses. Test outdoor faucets once thawed. Prepare equipment for spring yard work. Midwest spring arrives gradually - check equipment during mild weather windows.' },
          { title: 'Clean washing machine drain filter', description: 'Open access panel at washer bottom, place towels underneath, remove and clean filter of lint and debris. Replace and test for leaks. Regular filter cleaning prevents drainage issues and extends washer life through seasonal changes.' }
        ],
        weatherSpecific: [
          { title: 'Monitor for spring flooding potential', description: 'As snow melts, check basement for water infiltration. Test sump pump regularly. Clear floor drains. Monitor weather for heavy spring rains. Midwest spring melt and rains cause flooding - stay vigilant and keep sump pump working.' },
          { title: 'Check basement and foundation drainage', description: 'Ensure water flows away from foundation as snow melts. Check for basement dampness or leaks. Verify downspouts extend 5+ feet from house. Poor drainage during Midwest spring thaw causes foundation damage and basement flooding.' },
          { title: 'Inspect roof for winter damage', description: 'From ground with binoculars, look for missing or damaged shingles from ice and wind. Check flashing around chimneys. Look for signs of ice dam damage. Midwest winter is hard on roofs - assess condition before spring rains.' },
          { title: 'Begin severe weather season preparation', description: 'As tornado season approaches, identify safe interior room. Stock emergency supplies. Review family plan. Trim dead tree branches. Midwest March marks start of severe weather season - prepare early for spring and summer storms.' },
          { title: 'Check sump pump operation', description: 'Pour bucket of water into sump pit to test pump activation. Check discharge pipe is clear and draining away from foundation. Clean inlet screen. Test backup battery if equipped. Critical as Midwest spring melt brings water.' }
        ],
        priority: 'medium'
      },
      4: { // April
        seasonal: [
          { title: 'Complete spring maintenance tasks', description: 'Thoroughly clean and inspect your home after winter. Wash windows inside and out, check screens for damage, inspect exterior paint and caulking. Clean gutters and test downspouts. Check foundation for cracks. Midwest spring is ideal for catching winter damage before summer weather.' },
          { title: 'Service air conditioning system', description: 'Schedule professional AC service before hot weather arrives. Technician will clean coils, check refrigerant levels, test electrical components, and ensure system runs efficiently. Early service avoids summer rush and ensures comfort when Midwest heat and humidity arrive.' },
          { title: 'Deep clean interior after winter', description: 'Open windows on nice days for fresh air. Wash walls, baseboards, and ceiling fans. Shampoo carpets and clean behind appliances. Vacuum air vents and replace HVAC filters. Midwest homes sealed tight all winter need thorough spring cleaning to refresh indoor air quality.' },
          { title: 'Clean and inspect gutters', description: 'Remove leaves, twigs, and spring debris from gutters and downspouts. Flush with hose to check flow and look for leaks. Ensure downspouts direct water 5+ feet from foundation. Repair sagging sections. Midwest spring rains require clean gutters to prevent foundation damage.' },
          { title: 'Check exterior paint and maintenance needs', description: 'Walk around home inspecting for peeling or cracking paint, damaged siding, or wood rot. Scrape and touch up small areas now. Note larger projects for summer. Address wood rot immediately to prevent structural issues. Midwest freeze-thaw cycles are hard on exteriors.' },
          { title: 'Test outdoor faucets and irrigation systems', description: 'Turn on each outdoor faucet fully and check for leaks at handle and where pipe enters house. If water drips inside or flow is weak, pipe may have frozen - call plumber. Test irrigation zones for broken heads or leaks. Midwest freezing can damage outdoor plumbing.' },
          { title: 'Inspect deck, porch, and stairs for winter damage', description: 'Check all deck boards for soft spots indicating rot - probe with screwdriver. Shake railings to test stability. Look for popped nails, loose screws, or cracked boards. Tighten fasteners and replace damaged wood before someone gets hurt from Midwest winter damage.' },
          { title: 'Check and test sump pump', description: 'Pour bucket of water into sump pit to ensure pump activates and drains properly. Verify discharge pipe is clear and draining 5+ feet from foundation. Clean inlet screen. Test backup battery if equipped. Critical as Midwest spring rains and snowmelt bring water.' },
          { title: 'Inspect roof and attic after winter', description: 'From ground with binoculars, look for missing, damaged, or curled shingles from ice and wind. Check flashing around chimneys and vents. Inspect attic for water stains or daylight showing through. Midwest winter is harsh on roofs - repair damage before spring rains.' },
          { title: 'Service lawn mower and outdoor power equipment', description: 'Change mower oil, replace spark plug and air filter, sharpen blade. Check belts and cables. Clean debris from deck. Service string trimmer and check fuel lines. Fill with fresh gas. Midwest lawn care season is starting - equipment must be ready.' }
        ],
        weatherSpecific: [
          { title: 'Prepare for tornado season', description: 'Identify interior safe room or basement location away from windows. Stock emergency supplies: water, flashlight, battery radio, first aid kit. Review family emergency plan. Trim dead tree branches that could become projectiles. Midwest tornado season runs April through June - prepare early.' },
          { title: 'Check severe weather preparedness', description: 'Test weather radio and smartphone alerts. Ensure everyone knows tornado warning signals. Practice moving to safe location quickly. Keep shoes and flashlight by bed. Review insurance coverage. Midwest severe weather can develop rapidly - preparedness saves lives.' },
          { title: 'Monitor for spring flooding', description: 'Check basement for water stains or dampness during spring rains and snowmelt. Keep sump pump working. Move valuables off basement floor. Monitor weather forecasts for heavy rain. Clear storm drains near property. Midwest spring flooding can happen quickly with heavy rains.' },
          { title: 'Inspect drainage systems', description: 'Walk property during or after rain watching water flow. Ground should slope away from house - add soil to low spots if needed. Ensure downspouts drain far from foundation. Clear debris from yard drains. Poor drainage causes Midwest basement flooding and foundation damage.' },
          { title: 'Check storm shelter or safe room', description: 'If you have basement or safe room, ensure it\'s accessible and stocked with emergency supplies. Clear clutter blocking quick access. Test battery radio and flashlight. Keep emergency kit current. Midwest tornado season requires functional safe shelter ready for immediate use.' }
        ],
        priority: 'high'
      },
      5: { // May
        seasonal: [
          { title: 'Peak tornado season preparation', description: 'May is peak tornado month in Midwest. Review emergency plan with family weekly. Test weather radio daily. Keep safe room stocked and accessible. Monitor weather forecasts closely. Have multiple ways to receive warnings. Know difference between watch and warning. Be ready to take shelter within seconds.' },
          { title: 'Complete outdoor maintenance', description: 'Fertilize lawn with appropriate spring formula. Aerate compacted soil and overseed thin areas. Mulch garden beds 2-3 inches deep. Prune dead branches from trees and shrubs. Edge borders and plant annuals. Midwest May weather is ideal for establishing lawn and gardens before summer heat.' },
          { title: 'Service lawn equipment and tools', description: 'Change mower oil mid-season and check blade sharpness - sharpen if needed for clean cuts. Clean air filter and check spark plug. Sharpen pruning shears and spade edges. Oil moving parts on tools. Replace worn trimmer line. Well-maintained equipment performs better through busy Midwest growing season.' },
          { title: 'Check and maintain deck/patio', description: 'Sweep and power wash deck or patio. Check for loose boards, nails, or rotted wood on deck - repair immediately. Test railing stability. Apply deck stain or sealer if wood looks weathered. Clean and arrange patio furniture. Ensure outdoor spaces are safe and ready for Midwest summer entertaining.' },
          { title: 'Inspect screens and outdoor furniture', description: 'Check all window and door screens for tears or holes - repair with patch kits or replace damaged screens. Clean screens with soap and water. Inspect outdoor furniture for rust, loose joints, or torn fabric. Make repairs before heavy use. Good screens keep bugs out during Midwest summer.' },
          { title: 'Clean washing machine drain filter', description: 'Open access panel at washer bottom front, place towels underneath, remove and clean filter of lint, coins, and debris. Replace filter and test for leaks during next wash. Clean filter prevents drainage issues and extends washer life through seasonal changes and heavy use.' },
          { title: 'Plant gardens and maintain landscaping', description: 'After last frost (typically early May in Midwest), plant vegetable gardens and tender annuals. Water new plants deeply. Deadhead spring bulbs and divide overcrowded perennials. Apply pre-emergent weed control. Midwest May is prime planting time with warm soil and reliable rainfall.' },
          { title: 'Test outdoor GFCI outlets', description: 'Press "test" button on each outdoor GFCI outlet - power should cut immediately. Press "reset" to restore power. If outlet doesn\'t trip or won\'t reset, call electrician - this is serious safety issue. Outdoor GFCI protection is critical for Midwest summer power tool and equipment use.' },
          { title: 'Check air conditioning system operation', description: 'Turn AC to cooling mode and verify it cools properly. Listen for unusual noises. Check that cold air flows from all vents. Replace filter. If system struggles or makes strange sounds, call HVAC technician now before Midwest heat and humidity arrive in earnest.' },
          { title: 'Inspect and clean gutters after spring pollen', description: 'Remove accumulated pollen, seeds, oak tassels, and spring debris from gutters. Flush with hose to check flow. Ensure downspouts drain 5+ feet from foundation. Check for wasp nests forming in gutters. Midwest spring pollen can clog gutters before summer storms arrive.' }
        ],
        weatherSpecific: [
          { title: 'Peak tornado season vigilance', description: 'May brings highest tornado risk in Midwest. Monitor weather constantly during severe weather outbreaks. Have weather radio on when storms threaten. Know your county name for warnings. Practice drills with family. Go to shelter immediately when warning issued - don\'t wait to see the tornado.' },
          { title: 'Check severe weather warning systems', description: 'Test all methods of receiving warnings: weather radio, smartphone apps, outdoor sirens. Ensure everyone in household can receive alerts. Have backup battery power for radios and phones. Keep chargers handy. Midwest severe weather can knock out power - have multiple warning sources.' },
          { title: 'Prepare air conditioning for summer heat', description: 'Ensure AC is serviced and ready before Midwest heat and humidity arrive. Clean outdoor unit of debris. Trim vegetation to 2 feet clearance. Replace filters. Test system on hot day to verify adequate cooling. Schedule service now if any issues - don\'t wait for first 95°F day.' },
          { title: 'Monitor for hail and storm damage', description: 'After severe storms, inspect roof, siding, and vehicles for hail damage. Look for dented gutters, damaged shingles, or broken siding. Check air conditioner fins for damage. Document with photos for insurance. Midwest May hail storms can cause thousands in damage - inspect promptly.' },
          { title: 'Check emergency supplies and communications', description: 'Restock tornado emergency kit: water, non-perishable food, flashlights, batteries, first aid, medications. Test weather radio and charge backup batteries. Program emergency contacts in phone. Review insurance coverage. Midwest severe weather season requires constant emergency readiness.' }
        ],
        priority: 'high'
      },
      6: { // June
        seasonal: [
          { title: 'Begin summer cooling season', description: 'Ensure AC runs efficiently as Midwest heat and humidity arrive. Replace filters monthly during peak use. Keep outdoor unit clear of grass clippings and debris. Close blinds during hottest hours. Use ceiling fans to circulate air. Monitor energy bills for unusual increases indicating system problems.' },
          { title: 'Monitor air conditioning efficiency', description: 'Check that AC cools home adequately without running constantly. Listen for unusual noises, clicking, or grinding sounds. Verify cold air flows from all vents. If ice forms on outdoor unit or system struggles, call HVAC technician immediately. Midwest summer heat demands reliable cooling.' },
          { title: 'Maintain outdoor living spaces', description: 'Sweep deck and patio regularly. Water lawn and gardens deeply but less frequently to encourage deep roots. Deadhead flowers weekly. Trim hedges and shrubs. Check outdoor furniture for wear. Clean grill grates after each use. Midwest summer is prime time for outdoor entertaining.' },
          { title: 'Check attic ventilation', description: 'On hot day, check attic temperature - shouldn\'t exceed 20°F above outdoor temp. Ensure soffit and ridge vents are clear and not blocked by insulation. Verify attic fan runs properly if equipped. Good ventilation prevents roof damage and reduces Midwest cooling costs significantly.' },
          { title: 'Inspect and maintain pool if applicable', description: 'Test and balance pool water daily (pH 7.2-7.8, chlorine 1-3 ppm). Clean filters weekly and skim debris daily. Vacuum pool floor weekly. Check pump and filter for proper operation. Inspect pool equipment for leaks. Midwest summer pool use requires consistent maintenance for safety.' },
          { title: 'Flush water heater', description: 'Turn off power and water supply to heater. Attach hose to drain valve and run water to drain or bucket until it runs clear, removing sediment. Close valve, restore water, then power. Flushing annually extends heater life and improves efficiency through Midwest hard water areas.' },
          { title: 'Test and clean outdoor equipment', description: 'Check lawn mower operation and sharpen blade mid-season for clean cuts. Clean grass buildup from mower deck after each use. Inspect trimmer line and replace as needed. Check garden hoses for leaks and replace worn washers. Maintain equipment through busy Midwest growing season.' },
          { title: 'Inspect plumbing for leaks', description: 'Check under sinks, around toilets, and near water heater for moisture, stains, or drips. Feel pipes for dampness. Look for water meter movement with all water off indicating leak. Fix drips promptly - small leaks waste water and can cause major damage if ignored.' },
          { title: 'Check and maintain dehumidifier', description: 'Empty dehumidifier bucket daily or ensure drain hose works properly. Clean filter monthly. Monitor basement humidity - keep between 30-50% to prevent mold. Midwest summer humidity makes basements damp - dehumidifier prevents moisture damage and musty odors.' },
          { title: 'Inspect exterior for summer damage', description: 'Check siding, trim, and paint for damage from sun, wind, and storms. Look for cracks in caulking around windows and doors. Check foundation for new cracks or settling. Note repairs needed before fall. Midwest summer storms can damage exteriors - inspect regularly.' }
        ],
        weatherSpecific: [
          { title: 'Continue tornado season vigilance', description: 'June still brings tornado risk in Midwest. Keep weather radio charged and monitor forecasts during severe weather. Know safe locations in home. Have emergency kit accessible. Practice quick response when warnings issued. Stay alert - summer tornadoes can be just as dangerous as spring.' },
          { title: 'Prepare for summer heat and humidity', description: 'Stay hydrated when working outdoors. Work in early morning or evening during heat waves. Know signs of heat exhaustion. Ensure AC keeps home comfortable - call for service if struggling. Check on elderly neighbors. Midwest summer heat and humidity can be dangerous.' },
          { title: 'Monitor cooling system capacity', description: 'Verify AC maintains comfortable temperature even on hottest days. System should not run continuously - if it does, may be undersized or need service. Replace filters monthly. Keep vents open and unobstructed. Midwest heat and humidity challenge cooling systems - monitor performance closely.' },
          { title: 'Check for severe weather damage', description: 'After summer thunderstorms, inspect for hail damage on roof, siding, vehicles, and AC unit. Look for dented gutters or broken shingles. Check for water infiltration in attic or basement. Document damage with photos for insurance. Midwest severe storms cause significant damage - inspect after each event.' },
          { title: 'Inspect outdoor electrical systems', description: 'Check outdoor outlets, fixtures, and extension cords for damage, corrosion, or exposed wires. Ensure GFCI outlets work properly - test monthly. Keep electrical connections dry. Never use damaged cords. Unplug outdoor equipment during storms. Midwest summer storms create electrical hazards.' }
        ],
        priority: 'high'
      },
      7: { // July
        seasonal: [
          { title: 'Peak summer heat maintenance', description: 'Replace AC filters monthly during heavy use - dirty filters reduce efficiency. Clean outdoor AC unit fins carefully. Keep thermostat at reasonable temperature (75-78°F). Close blinds during peak sun. Use programmable thermostat to reduce cooling when away. Midwest July heat demands efficient cooling.' },
          { title: 'Monitor energy efficiency', description: 'Compare current electric bills to previous summers - significant increase suggests AC inefficiency or air leaks. Check that windows and doors seal tightly. Verify attic insulation is adequate. Consider energy audit if bills seem high. Midwest summer cooling costs are substantial - monitor carefully.' },
          { title: 'Maintain cooling systems', description: 'Listen for unusual AC noises daily. Check outdoor unit runs smoothly without laboring. Ensure ice doesn\'t form on unit. Verify cool air from all vents. Schedule immediate service if performance drops - don\'t wait during Midwest heat wave. Keep system running efficiently through hottest month.' },
          { title: 'Check outdoor equipment and furniture', description: 'Clean lawn mower after each use. Check oil level weekly. Sharpen mower blade if grass tears instead of clean cuts. Inspect outdoor furniture for sun damage or loose joints. Clean and cover grill after use. Store cushions when not in use. Maintain through peak Midwest summer use.' },
          { title: 'Inspect for heat-related expansion', description: 'Check doors and windows for sticking from heat expansion. Look for cracks in concrete or asphalt from heat. Monitor for gaps opening in siding or trim. Note areas that need attention when temperatures moderate. Midwest summer heat causes materials to expand and contract significantly.' },
          { title: 'Clean washing machine drain filter', description: 'Open access panel at bottom front of washer, place towels underneath, remove and clean filter of lint, coins, and debris. Replace filter and test for leaks. Monthly filter cleaning during summer prevents drainage issues and keeps washer running efficiently through heavy use.' },
          { title: 'Water lawn and gardens efficiently', description: 'Water early morning or evening to reduce evaporation. Water deeply but less frequently - 1 inch per week including rain. Use soaker hoses or drip irrigation for gardens. Mulch plants to retain moisture. Midwest July heat stresses plants - water wisely to conserve while keeping landscapes healthy.' },
          { title: 'Check and maintain dehumidifier operation', description: 'Empty dehumidifier daily or verify continuous drain works. Clean filter weekly during peak humidity. Monitor basement humidity - maintain 30-50%. If unit struggles, clean coils or call for service. Midwest summer humidity requires constant dehumidification to prevent mold and damage.' },
          { title: 'Inspect grills and outdoor cooking equipment', description: 'Check propane tank for adequate fuel. Inspect gas lines for cracks or leaks using soapy water. Clean grill grates thoroughly and remove grease buildup from drip pans. Check burners for even flames. Midwest summer grilling season requires safe, well-maintained equipment.' },
          { title: 'Test and maintain garage door safety features', description: 'Place 2x4 board under closing door - it should reverse immediately. Wave broom under closing door - should reverse. Test wall button and remotes. Lubricate hinges, rollers, and track. Tighten loose hardware. Safety features prevent injuries from heavy doors.' }
        ],
        weatherSpecific: [
          { title: 'Monitor air conditioning during heat waves', description: 'During extended 90°F+ periods, verify AC keeps home comfortable without running continuously. If system struggles, call HVAC technician immediately - waiting risks system failure during peak heat. Keep blinds closed, limit oven use, and avoid opening doors frequently during Midwest heat waves.' },
          { title: 'Check humidity control systems', description: 'Monitor indoor humidity with hygrometer - maintain 30-50% even during humid Midwest summers. Run dehumidifiers in basement. Ensure bathroom and kitchen exhaust fans vent outside. High humidity causes mold, discomfort, and AC inefficiency. Control humidity to protect home and health.' },
          { title: 'Prepare for potential severe summer storms', description: 'Midwest July brings strong thunderstorms with damaging winds, hail, and lightning. Secure loose outdoor items before storms. Unplug sensitive electronics. Have flashlights ready. Monitor weather forecasts. Inspect for storm damage after severe weather. Stay indoors during lightning.' },
          { title: 'Monitor energy usage during peak cooling', description: 'Check electric bills weekly during July. If usage seems excessive, verify AC filter is clean, outdoor unit is clear, and thermostat set reasonably. Look for air leaks around doors and windows. Consider fan use to supplement AC. Midwest peak cooling month drives highest bills - monitor closely.' },
          { title: 'Check heat stress on exterior materials', description: 'Inspect siding and trim for warping, cracking, or pulling away from house due to heat. Look for paint blistering on south and west sides. Check caulking for drying and cracking. Note areas needing repair when temperatures drop. Midwest summer heat and sun damage exterior materials.' }
        ],
        priority: 'high'
      },
      8: { // August
        seasonal: [
          { title: 'Continue peak summer maintenance', description: 'Maintain vigilance with AC system - replace filters monthly, keep outdoor unit clear. Water lawn and gardens as needed. Continue monitoring energy usage. Check dehumidifier operation. Midwest August remains hot and humid - maintain all summer systems through end of peak season.' },
          { title: 'Monitor cooling system performance', description: 'Listen for AC struggling or unusual sounds. Verify system cools adequately without excessive run time. Check for ice formation on outdoor unit. If performance drops, call technician immediately - late summer repairs prevent expensive emergency calls. Keep system running through Midwest August heat.' },
          { title: 'Check and maintain outdoor areas', description: 'Continue lawn care with regular mowing at 2.5-3 inches height. Water deeply but less frequently. Deadhead flowers to encourage fall blooms. Apply fall lawn fertilizer late in month. Clean and organize garage. Midwest late summer is transition time - maintain while planning fall projects.' },
          { title: 'Inspect exterior for summer damage', description: 'Walk around home checking for storm damage, sun damage to paint or siding, or pest infiltration. Look for wasp nests under eaves. Check caulking around windows and doors. Note repairs needed before winter. Midwest summer weather stresses exteriors - assess damage before fall.' },
          { title: 'Prepare for fall transition', description: 'Order supplies for fall projects while still available. Check heating system readiness - schedule fall service appointment. Begin thinking about winterization tasks. Clean and organize tools and equipment. Midwest fall arrives quickly after August - early planning prevents rush.' },
          { title: 'Service lawn mower before end of season', description: 'Change oil, replace spark plug, sharpen blade, and clean thoroughly while still in use. Check belts and cables. Make repairs now before storing for winter. Well-maintained mower through Midwest growing season lasts longer and performs better year after year.' },
          { title: 'Check and clean gutters mid-summer', description: 'Remove leaves, helicopter seeds, and debris from gutters before fall leaf season. Flush with hose and check for proper drainage. Look for wasp or bird nests. Repair any sections pulling away from house. Clean gutters now before autumn debris adds to workload.' },
          { title: 'Inspect deck and outdoor structures', description: 'Check deck boards, railings, and stairs for loose fasteners, rot, or splinters from summer use. Tighten hardware and replace damaged boards. Clean thoroughly and plan for staining/sealing in fall. Address safety issues immediately before cooler weather brings more outdoor activity.' },
          { title: 'Test and maintain smoke and CO detectors', description: 'Press test button on all smoke and carbon monoxide detectors. Replace batteries if needed. Clean dust from sensors with vacuum. Replace smoke detectors over 10 years old and CO detectors over 7 years old. Safety equipment must work reliably year-round.' },
          { title: 'Check and service air conditioner outdoor unit', description: 'Turn off power to AC. Gently spray fins clean from inside out with low-pressure hose. Trim vegetation back to 2 feet clearance. Remove debris from base. Straighten any bent fins carefully with fin comb. Clean unit runs more efficiently through remaining hot weather.' }
        ],
        weatherSpecific: [
          { title: 'Continue monitoring extreme heat effects', description: 'Midwest August can still bring 95°F+ heat waves. Verify AC maintains comfortable temperature. Work outdoors in early morning or evening. Stay hydrated. Check on vulnerable neighbors. Monitor weather forecasts for heat advisories. Take heat seriously - dangerous conditions persist through month.' },
          { title: 'Check cooling system efficiency', description: 'Monitor that AC handles late summer heat without excessive runtime. Compare electric bills to previous years. If costs seem high, check for air leaks, verify adequate insulation, ensure filters are clean. Schedule service for any performance issues before system works through September heat.' },
          { title: 'Monitor for late summer storms', description: 'Midwest August brings powerful thunderstorms with high winds, hail, and heavy rain. Secure loose outdoor items. Trim dead tree branches. Have emergency supplies ready. Check sump pump operation before storms. Inspect for damage after severe weather. Late summer storms can be intense.' },
          { title: 'Check outdoor water systems', description: 'Inspect hoses for cracks or leaks from summer use. Check sprinkler heads for damage or misalignment. Test outdoor faucets for leaks. Verify water flows freely without backing up. Plan for fall winterization. Midwest late summer is time to assess outdoor plumbing before cold weather.' },
          { title: 'Begin fall preparation planning', description: 'Review heating system service needs. Plan leaf management strategy. Order firewood if needed. Schedule chimney inspection. Check weatherstripping condition. List fall maintenance tasks. Midwest summer ends quickly - planning now prevents fall rush and ensures readiness for winter.' }
        ],
        priority: 'high'
      },
      9: { // September
        seasonal: [
          { title: 'Begin fall preparation', description: 'Schedule heating system service before cold weather. Check weatherstripping on doors and windows. Test heating system operation. Clean and organize garage. Order firewood if needed. Midwest fall is short - start winter preparation early to avoid rush.' },
          { title: 'Schedule heating system service', description: 'Contact HVAC company for furnace inspection and service before heating season. Technician will clean burners, check heat exchanger, test safety controls, and ensure efficient operation. Early service avoids busy season wait and ensures reliable heat for Midwest winter.' },
          { title: 'Check weatherproofing and insulation', description: 'Inspect door and window weatherstripping for wear - replace if cracked or compressed. Check caulking around windows and doors. Verify attic insulation depth is adequate (12-14 inches for Midwest). Seal air leaks before heating season to reduce energy costs.' },
          { title: 'Clean gutters before autumn', description: 'Remove summer debris from gutters before fall leaves arrive. Flush with hose to verify proper drainage. Check that downspouts direct water away from foundation. Repair sagging sections. Clean gutters now prevent overflow during fall rains and prepare for leaf season.' },
          { title: 'Inspect exterior maintenance needs', description: 'Walk around home noting repairs needed before winter: loose siding, cracked caulking, peeling paint, damaged trim. Make repairs while weather permits. Check foundation for cracks. Address issues now - Midwest winter weather prevents exterior work for months.' },
          { title: 'Clean washing machine drain filter', description: 'Open access panel at bottom front of washer, place towels underneath, remove and clean filter of lint, coins, and debris. Replace filter and test for leaks. Regular cleaning prevents drainage issues and extends washer life through seasonal transitions.' },
          { title: 'Test heating system operation', description: 'Turn thermostat to heat and verify furnace starts and warms home. Listen for unusual noises. Check that heat flows from all vents. Replace filter. If system doesn\'t work properly, call HVAC technician now before Midwest cold weather arrives.' },
          { title: 'Aerate and overseed lawn', description: 'Aerate lawn to reduce soil compaction - best done in fall for cool-season Midwest grasses. Overseed thin areas immediately after aerating. Apply fall fertilizer high in nitrogen for root development. Water regularly until temperatures drop. Fall lawn care ensures healthy spring lawn.' },
          { title: 'Prepare garden for winter', description: 'Harvest remaining vegetables. Clean up dead plants and debris to prevent disease and pest overwintering. Add compost to beds. Plant spring bulbs before ground freezes. Mulch perennials after first hard frost. Midwest fall garden cleanup prevents spring problems.' },
          { title: 'Store outdoor equipment and furniture', description: 'Clean and store outdoor furniture, cushions, and decorations before frost. Drain and store garden hoses. Clean and sharpen tools before storage. Drain gasoline from lawn equipment or add stabilizer. Midwest frost can arrive unexpectedly - store items early.' }
        ],
        weatherSpecific: [
          { title: 'Prepare for rapid temperature changes', description: 'Midwest September sees wide temperature swings from 80°F days to near-freezing nights. Have both heating and cooling ready. Protect tender plants from early frost. Layer clothing for outdoor work. Be ready to quickly adjust home climate control for comfort and efficiency.' },
          { title: 'Transition HVAC systems for fall', description: 'Test both heating and cooling as September temperatures fluctuate. Replace filters. Schedule heating system service. Clean outdoor AC unit before covering for winter. Ensure thermostat works in both modes. Midwest fall requires both systems ready for unpredictable weather.' },
          { title: 'Monitor for early frost protection', description: 'Watch weather forecasts for first frost warning - typically late September in Midwest. Cover or harvest tender plants. Drain outdoor water features. Bring in potted plants. Disconnect and store hoses. First frost can occur suddenly - be prepared to protect plantings and plumbing.' },
          { title: 'Check heating system before cold weather', description: 'Run heating system on cool day to verify operation before first hard freeze. Listen for concerning noises. Check that home heats evenly. Replace filter. If problems arise, call technician immediately - waiting risks being without heat during Midwest cold snap.' },
          { title: 'Inspect for summer damage repairs', description: 'Complete storm damage repairs from summer before winter. Fix roof damage, siding issues, or foundation cracks now while weather cooperates. Winter will worsen any damage and make repairs impossible. Midwest fall is last chance for exterior repairs before months of cold weather.' }
        ],
        priority: 'medium'
      },
      10: { // October
        seasonal: [
          { title: 'Complete fall preparation', description: 'Finish all outdoor projects before winter. Complete exterior repairs and painting. Clean gutters after leaves fall. Store outdoor furniture and equipment. Check that heating system is serviced and ready. Stock emergency supplies. Midwest October is last chance before winter locks in.' },
          { title: 'Service heating system for winter', description: 'If not done in September, schedule furnace service immediately. Technician will inspect heat exchanger, clean burners, test safety controls, and ensure efficient operation. Cannot wait longer - Midwest heating system must be ready for months of heavy use starting soon.' },
          { 
            title: 'Winterize outdoor water systems (hoses, sprinklers, faucets)', 
            description: 'Complete all outdoor water winterization to prevent costly freeze damage. Locate shut-off valves for outdoor faucets inside home (usually in basement). Turn off water supply to outdoor faucets and open outdoor faucets - leave them open all winter to drain completely. Disconnect and drain all garden hoses and store indoors. Drain irrigation/sprinkler systems completely using compressed air (or hire professional). Install insulated faucet covers on all outdoor spigots for added protection. Midwest winter freezing will burst pipes with any water left inside - this critical winterization prevents thousands in water damage.',
            priority: 'high',
            actionSummary: 'Follow these 5 essential steps to winterize your outdoor water systems and prevent burst pipes.',
            steps: [
              'Locate and close shut-off valves inside your home for all outdoor faucets',
              'Open all outdoor faucets and leave them open all winter to allow drainage',
              'Disconnect all garden hoses, drain them completely, and store indoors',
              'Drain sprinkler/irrigation system using compressed air or hire a professional',
              'Install insulated foam faucet covers on all outdoor spigots for extra protection'
            ],
            toolsAndSupplies: [
              'Adjustable wrench (to turn shut-off valves)',
              'Insulated faucet covers (one for each outdoor faucet)',
              'Air compressor (for sprinkler system winterization, or hire professional)',
              'Bucket (to catch draining water)',
              'Towels or rags',
              'Flashlight (for locating basement shut-off valves)'
            ],
            impact: 'Frozen outdoor pipes can burst, causing catastrophic water damage inside walls and flooding basements. A single burst pipe can release hundreds of gallons of water, damaging floors, walls, and belongings. Sprinkler system freeze damage often costs $500-2,000 to repair.',
            impactCost: '$500 - $5,000 for pipe repairs and water damage; $500 - $2,000 for sprinkler system repairs'
          },
          { title: 'Clean and maintain gutters', description: 'After leaves fall, remove all debris from gutters and downspouts. Flush thoroughly with hose. Ensure water flows freely and drains away from foundation. Make final repairs before winter. Clean gutters critical for Midwest winter snowmelt and ice dam prevention.' },
          { title: 'Check storm windows and doors', description: 'Install storm windows if you have them. Check that storm doors close tightly and latches work. Replace damaged weatherstripping. Ensure seals are tight. Storm windows significantly reduce heat loss and improve comfort during long Midwest winter.' },
          { title: 'Rake and manage fall leaves', description: 'Rake leaves regularly as they fall. Bag for disposal, compost, or mulch with mower. Don\'t leave thick leaf layers on lawn over winter - causes disease and dead spots. Midwest leaf season is brief but intense - stay ahead of accumulation.' },
          { title: 'Inspect and clean chimney and fireplace', description: 'Schedule professional chimney sweep before using fireplace. Sweep removes dangerous creosote buildup and checks for damage or blockages. Test damper operation. Stock firewood in covered area. Midwest homes rely on fireplaces for supplemental winter heat.' },
          { title: 'Test smoke and carbon monoxide detectors', description: 'Press test button on all smoke and CO detectors. Replace batteries if needed - good time is when changing clocks for daylight saving. Clean dust from sensors. Heating season increases CO risks - detectors must work reliably through Midwest winter.' }
        ],
        weatherSpecific: [
          { title: 'Prepare for first freeze', description: 'Midwest October brings first hard freeze. Drain outdoor water systems completely. Cover or bring in plants. Disconnect hoses. Store outdoor furniture. Have snow removal equipment ready - early snow possible. First freeze arrives quickly - complete all winterization immediately.' },
          { title: 'Check insulation before cold weather', description: 'Verify attic insulation is adequate depth (12-14 inches) and evenly distributed. Check for gaps or compressed areas. Insulate basement rim joists. Add insulation where needed before winter. Good insulation critical for comfortable, affordable Midwest winter heating.' },
          { title: 'Inspect heating system capacity', description: 'Run heating system on cold day to verify it maintains comfortable temperature without constant operation. Check that home heats evenly. If system struggles, call HVAC technician immediately. Midwest winter is long and cold - heating system must perform reliably for months.' },
          { title: 'Winterize outdoor equipment', description: 'Drain gasoline from lawn mower and outdoor power equipment or add fuel stabilizer. Clean thoroughly. Change oil. Store in dry location. Prepare snow blower - check belts, auger, and add fresh gas. Switch from summer to winter equipment for Midwest season change.' },
          { title: 'Check foundation and basement preparation', description: 'Inspect foundation for cracks and seal before ground freezes. Ensure basement windows close tightly. Check sump pump operation. Verify basement stays dry during fall rains. Fix water issues now - frozen ground prevents winter repairs and spring melt will worsen problems.' }
        ],
        priority: 'high'
      },
      11: { // November
        seasonal: [
          { title: 'Complete winter preparation', description: 'Verify all winterization complete: outdoor water shut off, gutters clean, storm windows installed, heating serviced. Stock emergency supplies: flashlights, batteries, water, non-perishable food, blankets. Have backup heat plan. Midwest winter is here - final preparations critical.' },
          { title: 'Test and monitor heating system performance', description: 'Run heating system regularly as temperatures drop and monitor that it maintains comfortable temperature without excessive runtime. Listen for unusual noises and verify even heating throughout home. Replace filters monthly during heating season. Monitor energy bills for unusual increases. Call technician immediately if any problems - Midwest winter demands reliable heat.' },
          { title: 'Check insulation and weatherproofing', description: 'On windy day, check for drafts around doors and windows. Add weatherstripping where needed. Ensure door sweeps seal properly. Check attic access door is insulated. Seal air leaks before bitter cold arrives. Midwest winter drafts waste energy and create uncomfortable cold spots.' },
          { title: 'Store outdoor furniture and equipment', description: 'Complete final outdoor storage before snow. Store all furniture, planters, and decorations. Drain and store any remaining hoses. Clean and cover grill. Ensure snow removal equipment is ready and accessible. Midwest November can bring first significant snow.' },
          { title: 'Check holiday decoration safety', description: 'Inspect holiday lights for frayed wires or damaged bulbs before installing. Test GFCI outlets before plugging in outdoor decorations. Don\'t overload circuits. Use outdoor-rated cords and timers. Keep fresh Christmas trees watered. Safe decorations prevent Midwest winter holiday fires.' },
          { title: 'Clean washing machine drain filter', description: 'Open access panel at bottom front of washer, place towels underneath, remove and clean filter of lint, coins, and debris. Replace filter and test for leaks. Keep washer running efficiently through winter months when outdoor drying isn\'t possible.' },
          { title: 'Prepare snow removal equipment', description: 'Service snow blower: change oil, check belts and auger, replace scraper blade if worn, add fresh gas. Stock ice melt and sand. Sharpen snow shovel edge. Mark driveway edges with stakes. Midwest winter snow removal requires ready, reliable equipment.' },
          { title: 'Check roof and gutters before snow', description: 'Make final inspection of roof for damaged or missing shingles. Ensure gutters are completely clean and securely attached. Check that downspouts drain away from foundation. Repair any issues before snow and ice arrive - Midwest winter weather makes roof work impossible.' },
          { title: 'Inspect windows and doors for drafts', description: 'Hold lit candle or incense near window and door edges on windy day - wavering smoke indicates air leaks. Add plastic window insulation kits to drafty windows. Install door sweeps. Seal leaks before deep cold arrives - Midwest winter demands airtight home.' },
          { title: 'Stock emergency heating supplies', description: 'Have backup heat plan for power outages: safe portable heaters, extra blankets, warm clothing. Keep flashlights and batteries accessible. Stock non-perishable food and water. Know how to manually operate garage door. Midwest winter power outages can be dangerous without preparation.' }
        ],
        weatherSpecific: [
          { title: 'Prepare for cold winter conditions', description: 'Midwest November brings real cold with temperatures regularly below freezing. Ensure heating system works reliably. Have emergency supplies ready. Check that pipes in unheated areas are insulated. Test generator if you have one. Winter is here - be fully prepared for months of cold.' },
          { title: 'Monitor for early winter storms', description: 'Midwest November can bring significant snow and ice storms. Monitor weather forecasts closely. Have snow removal equipment ready. Stock supplies before storms. Know how to prevent pipes from freezing. Keep cars fueled. Early winter storms can be severe - stay prepared.' },
          { title: 'Check ice and snow removal preparation', description: 'Test snow blower operation before first major snow. Stock adequate ice melt and sand. Have good snow shovels ready. Clear area around outdoor equipment. Mark driveway edges and obstacles. Midwest winter snow removal starts now - be ready for months of clearing.' },
          { title: 'Ensure emergency heating backup', description: 'Have plan for heating failure: portable heaters (used safely), extra blankets, warm clothes. Know how to close off rooms to conserve heat. Have HVAC technician\'s emergency number. Consider generator for furnace if power outages are common. Midwest winter without heat is dangerous.' }
        ],
        priority: 'high'
      },
      12: { // December
        seasonal: [
          { title: 'Monitor heating system performance', description: 'Check heating system daily during cold weather. Listen for unusual noises or changes in performance. Replace filters monthly. Ensure even heating throughout home. If system runs constantly or struggles to heat, call HVAC technician immediately - Midwest December cold is dangerous without reliable heat.' },
          { title: 'Check holiday decorations and lighting', description: 'Inspect outdoor decorations regularly for damage from wind or snow. Ensure electrical connections stay dry. Don\'t leave lights on when away. Keep fresh trees watered daily to prevent fire hazard. Use timers to control lighting. Check for overloaded circuits - Midwest winter holiday safety is critical.' },
          { title: 'Maintain winter preparations', description: 'Keep emergency supplies current and accessible. Maintain snow removal equipment. Stock ice melt. Monitor weather forecasts. Keep extra food and water on hand. Have backup heating plan ready. Midwest December storms can arrive suddenly - constant preparedness is essential.' },
          { title: 'Monitor energy usage', description: 'Check heating bills weekly and compare to previous years. Unusually high bills suggest system inefficiency or air leaks. Verify thermostat set reasonably (68-70°F). Check for drafts. Monitor usage to control Midwest winter heating costs and identify problems early.' },
          { title: 'Check water heater pressure relief valve (carefully lift lever)', description: 'Carefully lift lever on pressure relief valve at top or side of water heater - should release hot water and snap back. If valve doesn\'t release water or leaks afterward, call plumber immediately. Annual testing prevents dangerous pressure buildup and ensures safety device works.' },
          { title: 'Test indoor circuit breakers (flip each one to ensure not stuck)', description: 'One at a time, flip each circuit breaker off then back on to ensure it\'s not stuck. Label any unlabeled circuits. If breaker won\'t flip or trips immediately when reset, call electrician. Testing prevents fire hazards and identifies problems before emergency.' },
          { title: 'Inspect attic and crawl space for moisture or leaks', description: 'Check attic for water stains, ice buildup, or mold indicating roof leaks or poor ventilation. Inspect crawl space for moisture, standing water, or frozen pipes. Address moisture issues immediately - Midwest winter moisture causes major damage if ignored.' },
          { title: 'Test furnace emergency shut-off switch', description: 'Locate furnace emergency shut-off switch (usually red switch at top of basement stairs or near furnace). Test that it immediately stops furnace. Ensure family members know location and purpose. Working shut-off critical for emergency response during Midwest heating season.' },
          { title: 'Run whole-home safety drill (fire escape plan + extinguisher use)', description: 'Practice fire escape plan with entire family - two ways out of every room, meeting place outside. Show everyone how to use fire extinguisher (PASS method). Test smoke alarms. Practice low-crawl technique. Midwest winter closed-house heating increases fire risk - practice saves lives.' }
        ],
        weatherSpecific: [
          { title: 'Monitor heating during cold snaps', description: 'During extreme Midwest cold (below 0°F), verify heating system maintains comfortable temperature. Feel pipes in unheated areas for cold spots. Open cabinet doors under sinks for warm air. Let faucets drip during extreme cold. Monitor system closely - failure during deep freeze is dangerous.' },
          { title: 'Check for winter storm preparation', description: 'Before each Midwest winter storm, stock food, water, medications. Fill gas tanks. Charge phones and devices. Have flashlights ready. Bring in extra firewood. Clear snow from vents. Know forecast and warnings. Midwest December blizzards can isolate homes for days - prepare before each storm.' },
          { title: 'Monitor ice and snow effects on home', description: 'After storms, check for ice dams forming at roof edges. Remove excessive snow from roof if safe to do so. Clear snow from vents and meters. Check for gutter damage from ice weight. Monitor basement for water infiltration. Midwest winter weather stresses homes - inspect after each storm.' },
          { title: 'Check emergency supplies', description: 'Keep 3-day supply of water, food, medications current. Have batteries, flashlights, battery radio accessible. Stock extra blankets and warm clothes. Keep first aid kit updated. Have backup heating plan. Midwest winter power outages common during storms - maintain constant readiness.' },
          { title: 'Ensure proper ventilation during heating', description: 'Run bathroom and kitchen exhaust fans during use. Crack window briefly each day for fresh air exchange. Never use oven for heating. Ensure dryer vents outside. Monitor for condensation on windows. Midwest winter homes sealed tight need ventilation to prevent moisture, stuffiness, and CO buildup.' }
        ],
        priority: 'high'
      }
    },
    yearRoundTasks: [
      { title: 'Test smoke and carbon monoxide detectors monthly', description: 'Press test button on all smoke and CO detectors every month to verify they beep loudly. Replace batteries twice yearly or when chirping - good times are daylight saving changes. Clean dust from sensors with vacuum attachment. Replace smoke detectors over 10 years old and CO detectors over 7 years old. Working detectors save lives.' },
      { title: 'Check HVAC filters monthly', description: 'Remove furnace/AC filter monthly and hold up to light - if you cannot see light through it clearly, replace immediately. Dirty filters reduce efficiency, increase energy costs, and strain system. Use quality pleated filters rated MERV 8-11 for best balance of filtration and airflow. Midwest climate demands frequent changes.' },
      { title: 'Inspect for seasonal weather damage quarterly', description: 'Every 3 months, walk around home checking for storm damage, pest infiltration, water leaks, or structural issues. Look at roof, siding, foundation, and gutters. Check basement for moisture. Note problems and address promptly. Midwest extreme weather seasons require regular damage assessment.' },
      { title: 'Check sump pump operation seasonally', description: 'Test sump pump quarterly by pouring bucket of water into pit - pump should activate immediately and drain water completely. Check discharge pipe drains 5+ feet from foundation. Clean inlet screen. Test backup battery if equipped. Midwest homes depend on sump pumps to prevent basement flooding.' },
      { title: 'Professional HVAC service twice yearly', description: 'Schedule professional furnace inspection in fall (September/October) and air conditioner service in spring (April/May). Technicians will clean components, check refrigerant, test safety controls, and ensure efficient operation. Biannual service extends equipment life and prevents breakdowns during extreme Midwest seasons.' }
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
          { title: 'Monitor heating system for cool season', description: 'Southwest January nights can drop to 30-40°F. Test your heating system to ensure it runs efficiently. Check thermostat settings, listen for unusual noises, and verify all vents are open and unobstructed. Replace furnace filter if dirty - desert dust clogs filters quickly.' },
          { title: 'Check weatherstripping and insulation', description: 'Inspect door and window weatherstripping for gaps or wear from extreme temperature swings and UV damage. Replace damaged seals to keep cool air in summer and warm air in winter. Check attic insulation depth - should be at least 10-14 inches.' },
          { title: 'Inspect exterior for UV and heat damage', description: 'Walk around your home looking for paint fading, cracking, or peeling caused by intense desert sun. Check siding, trim, and fascia boards for warping or splitting. UV damage accelerates in the Southwest - address issues before they worsen.' },
          { title: 'Test carbon monoxide detectors', description: 'Press the test button on all CO detectors to verify they beep loudly. Replace batteries if needed - good times are New Year. Detectors should be placed near sleeping areas and on every level of your home. Southwest homes use heating and gas appliances in winter - working CO detectors save lives.' },
          { title: 'Check attic insulation', description: 'Inspect attic insulation for proper depth (minimum 10-14 inches) and look for compressed or missing areas. Good insulation keeps home cool in extreme summer heat and warm during cool winters. Southwest temperature swings (40°F-80°F daily) demand quality insulation.' },
          { title: 'Clean washing machine drain filter', description: 'Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, sand, and debris, then replace the filter and test for leaks. Desert dust and sand require frequent cleaning.' }
        ],
        weatherSpecific: [
          { title: 'Monitor for occasional freeze protection', description: 'Southwest January nights occasionally drop to freezing (32°F or below). Cover sensitive desert plants with frost cloth. Drip outdoor faucets during freezing nights. Bring potted plants indoors. Check pool equipment for freeze protection if temperatures will drop below 28°F.' },
          { title: 'Check heating system for winter use', description: 'Ensure furnace operates properly during cool season. Southwest homes often have minimal heating needs but January nights require it. If system hasn\'t run since last winter, listen for unusual noises or smells. Call HVAC technician if you notice issues.' },
          { title: 'Inspect for winter wind damage', description: 'Southwest winter winds can reach 40-50 mph. Check roof shingles, siding, and fencing for wind damage. Secure loose outdoor items. Inspect trees for broken branches that could fall on your home. Wind also drives desert sand into gaps - check seals around doors and windows.' },
          { title: 'Check pool heating systems if applicable', description: 'If you heat your pool in winter, verify the heater operates efficiently. Check for leaks in heating lines. Ensure timer settings match your usage. Monitor pool temperature - maintaining 80°F in 50°F nights is expensive. Consider pool cover to retain heat and reduce evaporation.' },
          { title: 'Monitor humidity levels (winter air is very dry)', description: 'Southwest winter humidity can drop below 10%, causing dry skin, nosebleeds, and static electricity. Use a hygrometer to monitor indoor humidity - ideal is 30-50%. Run a humidifier if needed, but monitor carefully to avoid over-humidifying and causing condensation in cool nights.' }
        ],
        priority: 'medium'
      },
      2: { // February
        seasonal: [
          { title: 'Begin early spring preparation', description: 'Southwest spring comes early - February temperatures reach 70-75°F. Start spring cleaning by washing windows, dusting ceiling fans, and cleaning air vents. Check smoke detectors and replace batteries. Prepare outdoor spaces for increased use as weather warms quickly.' },
          { title: 'Check irrigation and water systems', description: 'Test your irrigation system by running each zone. Look for broken sprinkler heads, leaks, or dry spots. Adjust spray patterns to avoid watering sidewalks - water conservation is critical in the desert. Check drip irrigation emitters for clogs. Repair issues before peak watering season.' },
          { title: 'Inspect exterior paint for UV damage', description: 'Intense Southwest sun causes rapid paint degradation. Inspect all exterior paint for fading, cracking, or peeling. South and west-facing walls suffer most UV damage. Scrape and touch up small areas now. Plan for full repainting if extensive damage - use UV-resistant paint formulas.' },
          { title: 'Check pool and spa equipment', description: 'Inspect pool pump, filter, and heater for leaks or unusual noises. Test GFCI protection on pool electrical connections. Check pool chemistry and adjust as needed. Clean or backwash filter. Ensure pool cover or solar cover is functioning properly. Service equipment now before swim season.' },
          { title: 'Clean and maintain outdoor areas', description: 'Sweep patios and walkways to remove accumulated desert dust and sand. Power wash pavers if needed. Clean outdoor furniture and inspect for sun damage. Check shade structures for stability. Trim desert landscaping and remove dead vegetation before fire season.' }
        ],
        weatherSpecific: [
          { title: 'Prepare for increasing UV exposure', description: 'February UV index rises rapidly in Southwest (reaching 8-9). Inspect window tinting and UV-blocking films. Check outdoor fabric awnings and shade sails for sun damage. Consider adding UV protection to south-facing windows to reduce cooling costs and protect furnishings from fading.' },
          { title: 'Check water conservation systems', description: 'Verify rain barrels, graywater systems, and water-efficient fixtures work properly. Southwest water is precious - fix any leaking faucets immediately. Check toilet tanks for silent leaks using food coloring. Consider upgrading to low-flow fixtures. Monitor water bill for unusual increases.' },
          { title: 'Inspect for wind and dust damage', description: 'February wind storms deposit dust and sand everywhere. Check air filters in HVAC system and replace if dirty - desert homes need monthly changes. Inspect door and window seals for sand infiltration. Clean solar panels if you have them - dust reduces efficiency significantly.' },
          { title: 'Monitor for pest activity increase', description: 'As temperatures warm, scorpions, spiders, and snakes become active. Check weatherstripping under doors for gaps. Seal cracks around pipes and foundations with caulk or foam. Keep landscaping trimmed away from house. Consider professional pest control service before peak activity season.' },
          { title: 'Check outdoor electrical connections', description: 'Inspect outdoor outlets, light fixtures, and pool equipment electrical connections. Desert temperature swings cause expansion/contraction that can loosen connections. Ensure GFCI outlets work properly by pressing test button. Look for corrosion or oxidation on connections. Call electrician for any concerns.' }
        ],
        priority: 'medium'
      },
      3: { // March
        seasonal: [
          { title: 'Begin spring cleaning and maintenance', description: 'Thoroughly clean your home as temperatures reach 75-85°F. Wash walls and baseboards, clean behind appliances, shampoo carpets, and dust ceiling fans. Replace HVAC filters - desert dust clogs filters monthly. Deep clean now before extreme heat makes indoor work uncomfortable.' },
          { title: 'Service air conditioning system early', description: 'Schedule professional AC service NOW before heat arrives and HVAC companies get swamped. Technician will clean coils, check refrigerant, test capacitors, and ensure optimal performance. Early service in mild weather ensures your system is ready for 100°F+ temperatures coming in 6-8 weeks.' },
          { title: 'Check and clean outdoor equipment', description: 'Service lawn mower if you have grass (change oil, replace spark plug, sharpen blade). Clean and oil garden tools. Inspect outdoor power equipment. Check pool cleaning equipment and repair as needed. Clean patio furniture and test outdoor lighting before peak outdoor season.' },
          { title: 'Inspect deck and outdoor structures', description: 'Check deck boards, railings, and pergolas for damage from UV exposure and temperature extremes. Look for warped boards, cracked wood, or loose fasteners. Test stability of shade structures - essential for desert living. Repair or reinforce now before summer heat makes outdoor work dangerous.' },
          { title: 'Maintain landscaping and irrigation', description: 'Adjust irrigation for warming temperatures - desert plants need more water as heat increases. Check all drip lines and sprinkler heads for proper function. Trim dead branches and remove fire hazards. Apply desert-appropriate mulch to retain moisture. Fertilize desert-adapted plants if needed.' },
          { title: 'Clean washing machine drain filter', description: 'Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, sand, and desert debris, then replace the filter and test for leaks. Desert dust and sand require monthly filter cleaning.' }
        ],
        weatherSpecific: [
          { title: 'Prepare cooling system for heat season', description: 'March is last comfortable month before extreme heat. Test your AC now - turn it on and ensure it cools properly. Listen for unusual noises or clicking. Check that air flows from all vents. If system struggles, call for service immediately. Waiting until May heat wave risks expensive emergency repairs.' },
          { title: 'Check dust and sand filtration systems', description: 'March winds kick up massive dust storms. Replace all HVAC filters - use high-MERV filters (8-11) to trap fine desert dust. Check door sweeps and window seals to prevent sand infiltration. Clean or replace cabin air filters in vehicles. Dust storms reduce air quality - good filtration protects health.' },
          { title: 'Monitor water usage and conservation', description: 'As temperatures rise, water usage increases. Check for leaks in irrigation systems, faucets, and toilets. Fix immediately - desert water is precious and expensive. Consider upgrading to low-flow fixtures. Monitor water bill. Install smart irrigation controller to optimize watering schedules and save water.' },
          { title: 'Inspect for increasing pest activity', description: 'March warmth activates scorpions, spiders, snakes, and insects. Seal all cracks and gaps in foundation, around pipes, and under doors. Keep vegetation trimmed 2-3 feet from house. Remove standing water. Consider professional pest control treatment now before peak scorpion season in summer.' },
          { title: 'Check outdoor UV protection measures', description: 'UV index reaches 9-10 in March. Inspect window tinting and UV films for bubbling or peeling. Check outdoor fabric for sun damage - replace worn shade sails or awnings. Consider adding UV protection to south and west-facing windows. Good UV protection reduces cooling costs and protects furnishings.' }
        ],
        priority: 'medium'
      },
      4: { // April
        seasonal: [
          { title: 'Complete air conditioning preparation', description: 'Temperatures now reach 90-95°F. Ensure AC runs flawlessly - check all vents for airflow, replace filters, clean outdoor unit of debris. Schedule professional service if you haven\'t yet. Test system on hottest days. Verify programmable thermostat works properly. AC failure in Southwest summer heat is dangerous and expensive.' },
          { title: 'Deep clean interior before heat season', description: 'Complete final indoor cleaning before it becomes too hot to work inside without AC running constantly. Clean ceiling fans, windows, baseboards, and organize closets. Stock up on cleaning supplies. Once 100°F+ heat arrives in May, you\'ll want to minimize indoor projects.' },
          { title: 'Check attic ventilation and insulation', description: 'Southwest attics can reach 160°F+ in summer. Inspect attic ventilation - ensure soffit and ridge vents are clear. Check insulation depth (minimum 14 inches recommended for desert). Good ventilation and insulation reduce cooling costs by 20-30% and protect your roof from heat damage.' },
          { title: 'Maintain pool and outdoor systems', description: 'Pool becomes essential for surviving desert heat. Check all pool equipment now - pump, filter, heater, automatic cleaner. Balance water chemistry perfectly. Clean or replace cartridge filters. Ensure pool cover works properly. Stock up on pool chemicals before peak season demand raises prices.' },
          { title: 'Inspect exterior for heat preparation', description: 'Walk around your home checking for UV damage before extreme heat. Touch up paint on south and west exposures. Check that window screens are intact. Verify shade structures are secure. Inspect roof for damaged shingles. Heat will accelerate any existing damage - repair now.' }
        ],
        weatherSpecific: [
          { title: 'Prepare for extreme heat season', description: 'April is last mild month - temperatures jump to 100°F+ in May. Stock emergency supplies (water, battery fans, ice packs). Ensure all vehicles have working AC. Test backup power sources. Know cooling center locations. Plan outdoor activities for early morning only. Extreme heat kills - prepare now.' },
          { title: 'Check cooling system capacity', description: 'Run AC continuously on hottest April day (90-95°F) to verify it can maintain 72-75°F indoors. If house stays warm or system runs non-stop, it may need service or be undersized. Call HVAC professional now - don\'t wait until 110°F days when systems fail and technicians are swamped.' },
          { title: 'Monitor dust storm preparation', description: 'April marks beginning of dust storm season (haboobs). Secure all outdoor furniture and decorations. Stock extra AC filters. Keep windows and doors tightly sealed. Clean gutters of accumulated dust. Know when storms approach - bring pets indoors and don\'t drive. Dust storms reduce visibility to zero.' },
          { title: 'Check water systems for increased demand', description: 'April heat increases water usage dramatically. Test irrigation system thoroughly - check all zones for leaks. Adjust watering schedules for 90°F+ heat. Install rain sensor on controller. Check outdoor faucets and hoses for leaks. Water waste is expensive and environmentally irresponsible in desert.' },
          { title: 'Inspect outdoor equipment heat protection', description: 'Extreme heat damages outdoor equipment. Check that AC condenser has shade or reflective shield. Ensure pool equipment is shaded or has ventilation. Move propane tanks to shaded areas. Cover vehicle seats and steering wheels. Heat above 115°F melts plastic and damages electronics.' }
        ],
        priority: 'high'
      },
      5: { // May
        seasonal: [
          { title: 'Begin peak cooling season preparation', description: 'May temperatures reach 100-105°F. Replace AC filters weekly during peak use - desert dust clogs them fast. Keep blinds closed during day. Run ceiling fans counterclockwise. Stock up on emergency water. Program thermostat to reduce cooling when away. Check AC outdoor unit daily for debris - leaf blower works well.' },
          { title: 'Monitor air conditioning efficiency', description: 'Your AC will run almost constantly in May heat. Listen for unusual noises, clicking, or grinding. Check that all vents blow cold air. Monitor electric bills - sudden spikes indicate problems. If system can\'t maintain 75°F when it\'s 105°F outside, call HVAC tech immediately. Don\'t wait for complete failure.' },
          { title: 'Maintain outdoor living spaces', description: 'Outdoor activities move to early morning (before 9am) and late evening (after 7pm). Clean pool daily - high temperatures increase algae growth. Water plants in early morning only. Check shade structures for stability. Spray down patios in evening to reduce retained heat. Keep outdoor furniture in shade.' },
          { title: 'Check pool and water systems', description: 'Pool is essential for summer survival. Test water chemistry twice weekly - heat throws off balance quickly. Run pump longer hours (12-14 hours daily). Clean skimmer baskets daily. Check water level - 100°F+ heat causes rapid evaporation. Add stabilizer to protect chlorine from UV degradation.' },
          { title: 'Inspect exterior heat protection', description: 'Walk exterior in early morning checking for heat damage. Look for warped vinyl siding, cracked caulk, or bubbling paint. Check that sprinklers aren\'t hitting house - water plus 105°F heat causes wood rot. Ensure all windows seal tightly - even small gaps waste expensive cool air.' },
          { title: 'Clean washing machine drain filter', description: 'Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, sand, and desert debris, then replace the filter and test for leaks. May dust storms require weekly filter cleaning.' }
        ],
        weatherSpecific: [
          { title: 'Prepare for extreme heat (100°F+)', description: 'May heat exceeds 100°F daily. Never leave pets or children in vehicles - deadly in minutes. Stock 1 gallon water per person per day. Know heat stroke symptoms. Avoid outdoor activity 10am-6pm. Wear light colors and sunscreen. Check on elderly neighbors. Heat kills dozens annually in Southwest - take seriously.' },
          { title: 'Check cooling system for peak demand', description: 'May is the test - if AC can\'t handle 105°F now, it will fail at 115°F in July. System should maintain 72-75°F indoors. If rooms stay warm, check for blocked vents, dirty filters, or low refrigerant. Schedule immediate service - waiting means days without AC in dangerous heat.' },
          { title: 'Monitor dust and sand infiltration', description: 'May dust storms are severe. After each storm, replace AC filters immediately - running with clogged filter damages compressor. Vacuum floor vents and returns. Clean door sweeps and window tracks. Check weatherstripping. Fine desert dust infiltrates everything - stay vigilant with sealing and filtering.' },
          { title: 'Check water conservation measures', description: 'May heat spikes water usage and costs. Water desert plants early morning only (5-7am). Adjust irrigation run times for heat - increase by 50% from April. Fix all leaks immediately. Consider drought-tolerant landscaping. Never water 10am-4pm - most water evaporates before reaching roots. May water bills shock newcomers.' },
          { title: 'Inspect heat-resistant exterior materials', description: 'Extreme heat damages cheap materials. Check vinyl siding for warping - may need heat shields. Inspect plastic mailboxes, light fixtures, and hose bibs for melting or cracking. Replace with heat-rated materials. Check asphalt driveway for softening. Dark surfaces reach 160°F+ - protect or replace vulnerable items.' }
        ],
        priority: 'high'
      },
      6: { // June
        seasonal: [
          { title: 'Peak air conditioning season begins', description: 'June temperatures hit 110-115°F. Your AC runs 20-24 hours daily. Replace filters weekly - set phone reminders. Listen continuously for unusual sounds indicating impending failure. Keep AC company number handy. If system fails, hotels fill fast and emergency service costs $500+. Monitor obsessively - AC failure in June heat is life-threatening.' },
          { title: 'Monitor energy efficiency', description: 'June electric bills shock newcomers - $400-600 is normal for desert cooling. Close blinds and curtains all day. Set thermostat to 78°F when home, 82°F when away. Run dishwasher and laundry at night when rates drop. Avoid oven use - use microwave or grill outside. Every degree cooler adds $10-15/month.' },
          { title: 'Maintain pool and cooling systems', description: 'Pool water temperature reaches 90°F+. Run pump 14-16 hours daily. Add ice to cool down for swimming. Check chemistry every other day - heat degrades chlorine fast. Clean filter twice weekly. Watch for algae - high heat accelerates growth. Pool is only outdoor relief in June heat - maintain obsessively.' },
          { title: 'Check attic ventilation', description: 'Attics reach 165-175°F in June. Ensure ridge vents and soffit vents are completely clear. Consider adding powered attic fan to reduce load on AC. Check insulation hasn\'t shifted or compressed. Poor attic ventilation can increase cooling costs 30% and damage roof shingles from underneath.' },
          { title: 'Inspect outdoor equipment protection', description: 'June heat melts plastics and damages electronics. Move garbage cans to shade - they will melt in sun. Cover outdoor furniture or move to shaded areas. Check that pool equipment has adequate ventilation. Don\'t touch metal surfaces outdoors - can cause burns. Everything outside bakes at 140-160°F in direct sun.' },
          { title: 'Flush water heater', description: 'Turn off power/gas and water supply to heater. Attach hose to drain valve and run to floor drain or outside. Open valve and flush until water runs clear, removing sediment. Close valve, restore water and power. In desert heat, water heater doesn\'t work hard, but annual flushing extends life.' }
        ],
        weatherSpecific: [
          { title: 'Peak heat season preparation (110°F+)', description: 'June daily highs hit 110-115°F. This is survival mode. Stay indoors 9am-7pm. Keep emergency supplies current - water, battery fans, ice. Know cooling center locations. Never walk dogs on pavement - causes paw burns. Car interiors reach 180°F - crack windows. Monitor weather alerts for excessive heat warnings.' },
          { title: 'Monitor air conditioning capacity', description: 'If AC can\'t keep house at 78°F when it\'s 115°F outside, you have a problem. Check that outdoor unit isn\'t overheating - spray with hose during hottest hours (don\'t spray directly on unit, just wet ground around it). Provide shade if possible. If system fails, call emergency service immediately - this is life-threatening.' },
          { title: 'Check monsoon season preparation', description: 'Monsoon season begins late June. Severe thunderstorms bring flash floods, lightning, dust walls, and high winds. Clean gutters and downspouts. Secure all outdoor items. Stock flashlights and batteries for power outages. Never drive through flooded roads. Have emergency plan ready - monsoons strike with little warning.' },
          { title: 'Inspect dust storm damage prevention', description: 'June dust storms (haboobs) are spectacular and dangerous. Keep several extra AC filters - you\'ll need them after each storm. Seal all gaps around doors and windows. Don\'t use swamp coolers during dust storms. Keep car windows closed. Stock N95 masks for respiratory protection. Dust storms cause multi-car pileups - stay off roads.' },
          { title: 'Check outdoor water and cooling systems', description: 'June heat breaks water lines and irrigation systems. Check for leaks daily - water pressure fluctuates in extreme heat. Test all irrigation zones weekly - emitters clog with minerals from evaporation. Consider misting systems for patios - only outdoor cooling option. Monitor water usage - desert cities impose restrictions during heat waves.' }
        ],
        priority: 'high'
      },
      7: { // July
        seasonal: [
          { title: 'Peak summer heat maintenance', description: 'July is hottest month - 115-118°F. AC runs 24/7. Replace filters twice weekly. Keep spare filter inventory. Monitor system constantly for failure signs. Have backup plan (friend with AC, hotel budget, cooling center locations). Minimize outdoor exposure - early morning only (6-8am). Check on neighbors, especially elderly. This is dangerous heat.' },
          { title: 'Monitor cooling system performance', description: 'AC works hardest in July. Normal for system to run continuously when it\'s 115°F+. Check that indoor temp stays below 80°F. If temp rises above 80°F, call technician immediately - don\'t wait. Listen for unusual sounds. Feel vents for weak airflow. System failure in July heat can be deadly - maintenance is critical.' },
          { title: 'Check monsoon damage prevention', description: 'July is peak monsoon - severe thunderstorms with flash floods, microbursts (100+ mph winds), lightning, and blinding dust. After each storm, inspect roof for damage, check for leaks, clear debris from gutters. Look for cracks in walls or foundation. Document damage immediately for insurance. Storms can be violent.' },
          { title: 'Maintain pool and outdoor systems', description: 'Pool water hits 95°F+ in July - too hot for comfort. Add ice or run water features at night to cool. Test chemistry every other day. Run pump 16-18 hours daily. Watch for algae blooms. Clean filter 2-3 times weekly. Pool is essential for heat relief when maintained properly.' },
          { title: 'Inspect heat stress on home materials', description: 'July heat damages homes. Check vinyl siding for warping or melting. Look for cracks in stucco from expansion/contraction. Inspect caulk around windows - heat dries it out. Check asphalt driveway for softening. Dark roof shingles can reach 180°F - inspect for curling or damage. Heat stress is cumulative - address damage before it worsens.' },
          { title: 'Clean washing machine drain filter', description: 'Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, sand, and monsoon mud debris, then replace the filter and test for leaks. July dust storms and monsoon mud require weekly filter cleaning.' }
        ],
        weatherSpecific: [
          { title: 'Monsoon season preparation', description: 'July monsoons strike afternoon/evening with little warning. Watch sky for building clouds. When storm approaches, bring in all outdoor items, close windows, unplug electronics. Never drive in dust storm or flooded roads. Keep gutters clear. Have flashlights ready - lightning causes power outages. Turn off AC during lightning to protect compressor.' },
          { title: 'Monitor extreme heat effects (115°F+)', description: 'July regularly exceeds 115°F, sometimes hitting 120°F. At these temps, human survival outdoors is limited to minutes. Stay indoors. Never leave anyone in vehicles. Store water in car. Wear oven mitts to touch steering wheel. Metal surfaces cause burns. Heat stroke symptoms: confusion, rapid pulse, hot dry skin - call 911 immediately.' },
          { title: 'Check flash flood preparation', description: 'Monsoons drop inches of rain in minutes on hard desert soil that can\'t absorb water. Flash floods appear instantly, carrying cars away. Never drive through water on roads. Keep drainage channels clear. Move valuables off basement floors. Know if you\'re in flood zone. Arizona has "Stupid Motorist Law" - you pay rescue costs if you drive into floods.' },
          { title: 'Monitor dust storm and wind damage', description: 'Monsoon outflows create massive dust walls (haboobs) 5000+ feet high. Visibility drops to zero in seconds. If caught driving, pull off road completely, turn off lights, feet off brake. Replace AC filters after every dust storm. Check roof for blown-off shingles. Inspect fence for damage. Clean solar panels of dust buildup.' },
          { title: 'Check cooling system during peak demand', description: 'July puts maximum stress on AC - many systems fail. Have emergency service number programmed. If system fails, reduce heat gain: close all blinds, avoid using oven/dryer, go to lowest floor, wet towels to drape on neck. Know cooling center locations. In 115°F+ heat, AC failure is life-threatening emergency - don\'t delay calling for help.' }
        ],
        priority: 'high'
      },
      8: { // August
        seasonal: [
          { title: 'Continue peak heat maintenance', description: 'August heat remains brutal - 110-115°F. Continue obsessive AC maintenance: replace filters twice weekly, listen for problems, monitor performance. Keep emergency supplies current. Watch for signs of heat exhaustion in family members. Heat fatigue is cumulative - August is when desert residents struggle most. Stay vigilant.' },
          { title: 'Monitor monsoon damage', description: 'After each August monsoon, walk your property checking for damage. Look for roof leaks, cracked windows, damaged siding, foundation cracks. Check for standing water or erosion around foundation. Inspect trees for damage. Document everything with photos. File insurance claims promptly. Cumulative monsoon damage needs attention before season ends.' },
          { title: 'Check cooling system efficiency', description: 'After running continuously for 3 months, AC systems show wear. Listen for declining performance - takes longer to cool, runs continuously, weak airflow. Monitor electric bills for spikes indicating inefficiency. If performance drops, schedule service immediately. Don\'t wait for failure - repairs in August heat wave are expensive and urgent.' },
          { title: 'Maintain outdoor equipment protection', description: 'August sun has baked everything for months. Check that shade structures haven\'t failed. Inspect outdoor furniture for sun damage - replace deteriorated fabric. Verify pool equipment still has adequate shade/ventilation. Replace melted garbage cans or plastic fixtures. Three months of 110°F+ takes its toll - assess and replace damaged items.' },
          { title: 'Inspect for heat and UV damage', description: 'August marks end of worst heat - assess cumulative damage from summer. Check exterior paint for fading, blistering, or peeling. Look for cracked caulk around windows. Inspect plastic fixtures for brittleness. Check roof shingles for curling. Make list of repairs needed before next summer. UV and heat damage is relentless in desert - regular maintenance essential.' }
        ],
        weatherSpecific: [
          { title: 'Peak monsoon season vigilance', description: 'August is most active monsoon month. Severe storms strike weekly, sometimes daily. Keep gutters clear. Secure outdoor items before each storm. Stock batteries and flashlights. Have sandbags ready if you\'re in flood zone. Check weather radar frequently. Monsoons bring relief from heat but also damage - stay prepared and alert.' },
          { title: 'Monitor flash flood risks', description: 'August monsoons cause most flash flood deaths. Never drive through flooded roads - water depth is deceptive and current is powerful. Keep emergency kit in car. Avoid camping in washes or arroyos. If water starts rising, move to high ground immediately. Desert floods are fast and violent - respect the danger and take warnings seriously.' },
          { title: 'Check extreme heat protection measures', description: 'August heat continues at 110-115°F. Verify all heat protection still works: window tinting intact, blinds functioning, shade structures stable, AC running efficiently. Check on vulnerable neighbors. Keep heat emergency plan current. Don\'t let guard down - August heat exhaustion common as summer fatigue accumulates. Push through last few weeks carefully.' },
          { title: 'Monitor dust and debris cleanup', description: 'August monsoons deposit mud, leaves, and debris everywhere. Clean gutters after each storm. Power wash patios and walkways. Replace AC filters frequently. Clear storm drains and drainage channels. Remove debris from pool. Clean window screens. Monsoon mess accumulates fast - clean regularly to prevent damage and pest problems.' },
          { title: 'Check cooling system during storms', description: 'Monsoon lightning can damage AC systems. Turn off AC when lightning is close to protect compressor. If power flickers, wait 5 minutes before restarting system. Check that outdoor unit isn\'t damaged by hail or wind-blown debris after storms. Ensure system restarts properly after outages. August AC failure during monsoon heat is double emergency.' }
        ],
        priority: 'high'
      },
      9: { // September
        seasonal: [
          { title: 'Continue monsoon season vigilance', description: 'September monsoons taper off but remain active. Keep gutters clear and outdoor items secured. Continue post-storm inspections for damage. Watch weather radar for developing storms. Stock batteries and flashlights. Monsoon season officially ends September 30th, but late-season storms can be severe. Stay alert through month end.' },
          { title: 'Monitor cooling system performance', description: 'September temps drop to 100-105°F - still very hot. AC runs most of day but gets some breaks. Listen for unusual sounds indicating wear from brutal summer. Monitor performance - if efficiency dropped, schedule service before next summer. Replace filters weekly still. System worked hard for 5 months - check for needed repairs.' },
          { title: 'Check for summer damage', description: 'Assess cumulative damage from 5 months of extreme heat and monsoons. Walk property checking roof, siding, paint, caulk, and outdoor fixtures. Look for cracks in foundation or driveway from expansion/contraction cycles. Make repair list and prioritize. September weather perfect for exterior work - schedule repairs now.' },
          { title: 'Maintain outdoor areas', description: 'As heat moderates to 100-105°F, outdoor work becomes feasible again. Clean patios and walkways of monsoon mud and debris. Power wash if needed. Inspect and repair outdoor lighting. Check irrigation system for monsoon damage. Trim desert plants. Enjoy comfortable mornings and evenings outdoors after brutal summer.' },
          { title: 'Begin gradual fall preparation', description: 'September marks transition season in desert. Clean and organize after summer. Wash windows inside and out. Deep clean floors and carpets. Check smoke detectors and replace batteries. Prepare for comfortable fall months ahead. Desert fall is beautiful - enjoy temperature drop from 115°F to 100°F.' },
          { title: 'Clean washing machine drain filter', description: 'Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, sand, and accumulated monsoon debris, then replace the filter and test for leaks. September is good time for deep clean after summer dust and storms.' }
        ],
        weatherSpecific: [
          { title: 'Late monsoon season monitoring', description: 'September storms can be severe even as season winds down. Late-season monsoons sometimes bring strongest winds and heaviest rainfall. Continue storm vigilance - clear gutters, secure outdoor items, monitor weather. After final storms, do thorough property inspection and complete any monsoon-damage repairs before next summer.' },
          { title: 'Check heat stress damage from summer', description: 'Inspect all exterior materials for summer heat damage. Check vinyl siding for warping, paint for blistering, caulk for cracking, shingles for curling. Look at plastic fixtures for brittleness or cracking. Assess driveway for heat damage. Make repair plan - September-November perfect for exterior work before next summer bakes everything again.' },
          { title: 'Monitor for flash flood damage', description: 'After monsoon season ends, assess flood damage. Check foundation for cracks or settling. Look for erosion around house perimeter. Inspect drainage systems. If flooding occurred, check for water stains in basement or garage. Document damage for insurance. Make improvements to grading or drainage to prevent recurrence next summer.' },
          { title: 'Check dust and debris accumulation', description: 'Summer dust storms and monsoons deposit layers of fine dust and mud everywhere. Deep clean entire house - vacuum vents, wipe surfaces, wash windows. Clean or replace all AC filters. Power wash exterior. Clean solar panels for maximum efficiency. Dust and debris reduce efficiency and air quality - thorough cleaning essential after monsoon season.' },
          { title: 'Continue extreme heat protection', description: 'September still reaches 100-105°F - remain heat-aware. Continue avoiding midday outdoor activity. Keep AC running efficiently. Stay hydrated. Monitor vulnerable family members. Heat season isn\'t over until mid-October. September heat exhaustion common as people get careless thinking summer is over. Maintain heat safety practices few more weeks.' }
        ],
        priority: 'high'
      },
      10: { // October
        seasonal: [
          { title: 'Begin transition to cooler season', description: 'October temperatures drop to pleasant 85-95°F. This is desert prime time - enjoy outdoor activities again. Reduce AC filter changes to bi-weekly. Open windows for natural ventilation on cool mornings. Start using outdoor spaces in afternoons. October weather is why people live in desert - perfect conditions after brutal summer.' },
          { title: 'Check heating system preparation', description: 'October nights can drop to 50-60°F. Test heating system to ensure it works - many desert homes use heat only 2-3 months yearly. Replace furnace filter, check thermostat, listen for unusual sounds. If system doesn\'t work properly, call for service now before winter cold arrives. Heating failures are less urgent but still uncomfortable.' },
          { title: 'Clean and maintain outdoor areas', description: 'Perfect October weather ideal for outdoor maintenance. Clean pool and adjust chemicals for cooler temps. Sweep patios and walkways. Organize outdoor storage areas. Check outdoor furniture for damage. Trim desert plants and remove dead vegetation. Plant cool-season flowers. Enjoy being outside after 6 months indoors.' },
          { title: 'Inspect exterior for summer damage', description: 'Complete all summer damage repairs now while weather is perfect. Paint faded or damaged areas. Replace damaged siding. Re-caulk windows and doors. Repair roof damage from heat or monsoons. October-November are ideal for exterior work - not too hot, not too cold, minimal rain. Get repairs done before next summer.' },
          { title: 'Check pool heating systems', description: 'October pool temps drop to 70-75°F - too cold for comfortable swimming without heat. Test pool heater if you have one. Check for leaks in heating lines. Verify timer and thermostat work properly. Consider pool cover to retain heat at night. Decide if heating pool is worth cost - desert October-March pool use requires heating.' },
          { title: 'Shut off outside house spigots', description: 'Although hard freezes are rare in desert, October nights occasionally drop to freezing. Disconnect and drain garden hoses. Shut off water to outdoor faucets if you have shut-off valves. Drain sprinkler systems if you have traditional grass. Bring in sensitive desert plants. Protect pool equipment if freeze expected below 28°F.' }
        ],
        weatherSpecific: [
          { title: 'End of extreme heat season', description: 'October marks end of dangerous heat - temps drop to comfortable 85-95°F. This is relief after 6 months of 100-115°F. Resume normal outdoor activities. Reduce AC usage and energy bills drop dramatically. Enjoy perfect desert weather - warm days, cool nights, brilliant sunshine. October-April is desert living at its best.' },
          { title: 'Check UV and heat damage repairs', description: 'Complete summer damage repairs in perfect October weather. Fix all UV-damaged paint, cracked caulk, warped materials. Replace heat-damaged fixtures and plastics. Repair roof shingles damaged by heat. Make improvements to reduce next summer\'s damage - add UV protection, heat shields, better ventilation. October is ideal repair month.' },
          { title: 'Monitor for pleasant weather maintenance', description: 'October weather perfect for all outdoor projects delayed during summer heat. Paint exterior, seal driveway, repair roof, organize garage, deep clean outdoor areas. Work outside comfortably all day. This is prime maintenance season - tackle your summer project list now. November-March weather equally good for outdoor work.' },
          { title: 'Check dust and sand cleanup', description: 'Final summer dust cleanup in October. Deep clean entire house of accumulated fine desert dust. Wash all windows inside and out. Clean ceiling fans and light fixtures. Vacuum or replace air vents. Power wash exterior and walkways. Professional carpet cleaning recommended. Fresh clean home feels great after dusty summer.' },
          { title: 'Prepare for mild winter conditions', description: 'Desert winter is mild but real. October-March nights drop to 40-60°F. Ensure heating works properly. Check weatherstripping on doors and windows. Verify fireplace or patio heater works. Stock up on warm bedding. Have light jacket ready. Desert winter is pleasant but preparation prevents discomfort during cool spells.' }
        ],
        priority: 'medium'
      },
      11: { // November
        seasonal: [
          { title: 'Enjoy pleasant weather for maintenance', description: 'November is perfect desert weather - 75-85°F days, 50-60°F nights. This is ideal time for all outdoor projects. Paint exterior, seal driveway, repair roof, organize garage, clean pool, trim landscaping. Work outside all day comfortably. November-March is why retirees move to desert - absolutely perfect weather for enjoying your home and property.' },
          { title: 'Check heating system for winter', description: 'November nights drop to 50-60°F, occasional 40s. Verify heating works reliably. Replace furnace filter, check thermostat programming, test emergency heat if you have heat pump. Listen for unusual sounds. Desert heating systems see light use but must work when needed - November cold snaps require heat. Schedule service if problems found.' },
          { title: 'Complete exterior maintenance', description: 'Finish all outdoor projects before holidays and occasional cold spells. Complete painting, caulking, roof repairs, gutter cleaning, landscaping. Check outdoor lighting for holidays. Clean and organize garage and outdoor storage. November weather perfect for exterior work - comfortable temps, minimal rain, no extreme heat to slow you down.' },
          { title: 'Check weatherproofing', description: 'Inspect all weatherstripping on doors and windows before winter. Although desert winters are mild, cold nights (40-50°F) waste energy if home isn\'t sealed properly. Check caulk around windows and doors. Ensure doors close tightly. Add door sweeps if needed. Good weatherproofing keeps heat in and desert dust out year-round.' },
          { title: 'Maintain outdoor living areas', description: 'November perfect for enjoying outdoor spaces. Clean and organize patio furniture. Check outdoor kitchen equipment. Test patio heaters for cool evenings. Ensure outdoor lighting works for entertaining. Trim trees and plants. November is outdoor entertaining season in desert - prepare spaces for maximum enjoyment through March.' },
          { title: 'Clean washing machine drain filter', description: 'Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, and accumulated debris, then replace the filter and test for leaks. Good time for maintenance as summer dust and monsoon season are over.' }
        ],
        weatherSpecific: [
          { title: 'Optimal weather for outdoor maintenance', description: 'November desert weather is ideal - warm days (75-85°F), cool nights (50-60°F), minimal rain, low humidity, brilliant sunshine. This is best maintenance month of year. Complete all outdoor projects on your list. Work outside anytime without heat or cold concerns. Enjoy perfect conditions - this is desert living at its finest.' },
          { title: 'Check heating system for cool season', description: 'November nights require heat as temps drop to 50s and occasional 40s. Ensure heating system works properly - desert furnaces see limited use but must function when needed. Test system on first cold night. If heat is weak or fails, call for service immediately. Cold snaps are uncomfortable and night temps will drop further in December-January.' },
          { title: 'Monitor for mild winter preparation', description: 'Desert winter is mild but real. November-March nights drop to 40-60°F. Stock up on warm bedding and ensure heater works. Check that patio heaters function for outdoor entertaining. Have light jackets available. Although mild compared to northern winters, preparation prevents discomfort during cool desert nights and mornings.' },
          { title: 'Check dust and allergen control', description: 'Fall desert winds kick up dust even after monsoons end. Continue regular filter changes in HVAC system. Dust home frequently. Consider air purifier if family has allergies. Keep windows closed on windy days. Desert dust is year-round challenge - good filtration and regular cleaning essential for air quality and system efficiency.' },
          { title: 'Inspect for reduced pest activity', description: 'November cooler temps reduce scorpion and snake activity dramatically. They\'re hibernating or much less active. This is safe time to clean outdoor areas, organize storage, and move items without constant pest vigilance. Still check shoes and shake towels, but November-March desert pest activity is minimal compared to summer months.' }
        ],
        priority: 'medium'
      },
      12: { // December
        seasonal: [
          { title: 'Monitor heating system performance', description: 'December nights drop to 40-50°F, occasionally 30s. Heating runs regularly - monitor for consistent performance. Listen for unusual sounds or smells. Check that all rooms heat evenly. Replace furnace filter if dirty. Ensure programmable thermostat works properly. Desert homes have limited heating needs but December-January are coldest months - system must work reliably.' },
          { title: 'Check holiday decorations and lighting', description: 'December is perfect for outdoor holiday decorating - comfortable weather, no snow or ice. Test all holiday lights before hanging - desert sun and heat damage bulbs by November. Check outdoor outlets with GFCI tester. Use weatherproof extension cords. Enjoy decorating in 70°F sunny weather while northern states freeze. Perfect desert winter activity.' },
          { title: 'Maintain mild winter conditions', description: 'December brings mild desert winter - 65-75°F days, 40-50°F nights. Enjoy outdoor activities anytime. Water desert plants monthly - they need less in cool weather but don\'t go dormant. Run pool heater if using pool. Use patio heaters for evening entertaining. December in desert is vacation weather - enjoy your home and outdoor spaces.' },
          { title: 'Test smoke and carbon monoxide detectors', description: 'Press test button on all smoke and CO detectors to verify they beep loudly. Replace batteries - good time is holiday season when you\'re thinking about safety. Clean dust from sensors with vacuum attachment. December increased use of fireplaces, space heaters, and furnaces requires working detectors. Test monthly, replace batteries now.' },
          { title: 'Check pool and spa heating', description: 'December pool water drops to 55-65°F without heating - too cold for swimming. If you heat pool, verify heater works efficiently. Check for leaks and proper operation. Consider pool cover to reduce heating costs. Many desert residents stop using pools December-March. If you heat it, expect high gas/electric bills during winter months.' }
        ],
        weatherSpecific: [
          { title: 'Monitor for cool weather conditions', description: 'December brings coolest desert temps - 65-75°F days, 40-50°F nights, occasional 30s. This is mild compared to most climates but requires adaptation for desert residents. Wear layers, use light blankets at night, run heater on cold mornings. Enjoy beautiful weather - sunny, clear, perfect for outdoor activities, no snow or ice to manage.' },
          { title: 'Check heating system during cold snaps', description: 'December cold snaps drop temps to 30s overnight. Ensure heating maintains comfort during coldest nights. If heating struggles or fails, call for service - although not life-threatening like summer AC failure, cold nights are very uncomfortable. Check that pipes don\'t freeze if temps drop below 32°F - rare but possible in desert.' },
          { title: 'Prepare for occasional winter storms', description: 'December can bring winter storms with rain, wind, and rarely snow in desert valleys. Keep flashlights and batteries current for power outages. Have emergency supplies ready. Monitor weather forecasts. Storms are infrequent but can be severe when they occur. Ensure gutters clear for rain. Bring in outdoor furniture if high winds forecast.' },
          { title: 'Monitor humidity levels (very dry)', description: 'December desert air is extremely dry - often below 15% humidity. This causes dry skin, nosebleeds, static electricity, and cracked wood furniture. Use humidifier to bring indoor humidity to 30-40%. Moisturize skin frequently. Run humidifier especially at night. Don\'t over-humidify - morning condensation on windows indicates too much moisture.' },
          { title: 'Check for minimal freeze protection', description: 'December nights occasionally drop to 32°F or below in desert. Protect sensitive plants with frost cloth on freeze nights. Drip outdoor faucets if hard freeze forecast (below 28°F). Bring in potted plants. Cover pool equipment if temps dropping to 20s. Freezes are infrequent in low desert but can damage unprepared plants and equipment when they occur.' }
        ],
        priority: 'medium'
      }
    },
    yearRoundTasks: [
      { title: 'Test smoke and carbon monoxide detectors monthly', description: 'Press test button on all smoke and CO detectors every month to verify they beep loudly. Replace batteries twice yearly - good times are daylight saving changes or New Year/July 4th. Clean dust from sensors with vacuum attachment. Replace smoke detectors over 10 years old and CO detectors over 7 years old. Desert dust clogs sensors faster than humid climates - monthly testing and cleaning essential. Working detectors save lives.' },
      { title: 'Check HVAC filters frequently (dust/sand)', description: 'Desert dust and sand clog AC filters extremely fast. Check filters every 2 weeks year-round. Replace monthly minimum, weekly during dust storm season (April-September). Use quality pleated filters rated MERV 8-11 for best dust filtration. Never run system with dirty filter - damages compressor and reduces efficiency dramatically. Keep large supply of filters on hand. Desert HVAC maintenance is intense but essential.' },
      { title: 'Monitor water conservation systems monthly', description: 'Check for leaks in irrigation system, faucets, toilets, and water lines monthly. Fix immediately - desert water is scarce and expensive. Test toilet tanks monthly using food coloring to detect silent leaks. Monitor water bill for unusual increases. Adjust irrigation seasonally for temperature changes. Consider drought-tolerant landscaping. Water conservation isn\'t optional in desert - it\'s essential responsibility.' },
      { title: 'Check pool and cooling systems regularly', description: 'If you have pool, test water chemistry 2-3 times weekly in summer, weekly in winter. Clean skimmer baskets daily in summer, weekly in winter. Run pump 12-18 hours daily depending on season. Backwash or clean filter regularly. Monitor for leaks and equipment problems. Pool maintenance is constant in desert - neglect causes expensive algae blooms and equipment failure. Stay vigilant year-round.' },
      { title: 'Inspect for UV and heat damage quarterly', description: 'Every 3 months, walk property checking for UV and heat damage: fading or blistering paint, cracked caulk, warped siding, damaged shingles, brittle plastics. Southwest sun and heat are relentless - damage accelerates rapidly. Address problems immediately before they worsen. Consider UV-resistant materials for replacements. Quarterly inspections catch issues early, saving money on major repairs later.' }
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
          { title: 'Monitor heating system for cool season', description: 'West Coast January temps range from 45-65°F. Check heating system runs efficiently - test thermostat, listen for unusual noises, verify all vents are open. Replace furnace filter if dirty. Mild winters but consistent heating needed for comfort during rainy season.' },
          { title: 'Check for winter storm damage', description: 'After each January storm (common in California), inspect roof for damaged shingles, check for leaks inside, examine gutters for damage. Walk property checking fence, trees, outdoor structures. Pacific winter storms bring heavy rain and wind - damage assessment after each event essential.' },
          { title: 'Inspect weatherstripping', description: 'Check door and window weatherstripping for gaps or wear. January rain reveals air leaks. Replace damaged seals to keep heat in and moisture out. Good weatherstripping prevents water intrusion and reduces heating costs during wet season.' },
          { title: 'Test carbon monoxide detectors', description: 'Press test button on all CO detectors to verify they beep loudly. Replace batteries if needed - New Year is good reminder time. Detectors should be near sleeping areas and on every level. January increased use of heating and fireplaces requires working CO detectors - saves lives.' },
          { title: 'Check attic insulation and ventilation', description: 'Inspect attic for proper insulation depth (minimum 10-14 inches) and check for moisture from winter rains. Ensure soffit and ridge vents are clear. Good insulation keeps home comfortable year-round. Check for roof leaks - wet insulation indicates problems above.' },
          { title: 'Clean washing machine drain filter', description: 'Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, and debris, then replace the filter and test for leaks. Regular cleaning prevents odors and drainage problems.' }
        ],
        weatherSpecific: [
          { title: 'Monitor for winter storm and wind damage', description: 'West Coast January storms bring heavy rain (3-6 inches) and wind gusts to 50+ mph. After each storm, inspect roof, check for water intrusion, examine trees for damage. Secure outdoor furniture before storms. Monitor weather forecasts closely - atmospheric rivers can drop months of rain in days.' },
          { title: 'Check earthquake preparedness supplies', description: 'California sits on major fault lines - earthquakes can strike anytime. Check emergency kit has current water (1 gallon/person/day for 3 days), non-perishable food, medications, flashlights, batteries. Secure water heater and tall furniture. Practice drop-cover-hold. Preparedness saves lives when big one hits.' },
          { title: 'Inspect for rain and moisture damage', description: 'January is wettest month - inspect basement and crawl spaces for water intrusion. Check around windows and doors for leaks. Look for water stains on ceilings and walls. Address leaks immediately to prevent mold. Ensure gutters and downspouts direct water away from foundation.' },
          { title: 'Check heating system for cool weather', description: 'Although mild compared to other regions, West Coast January nights drop to 40-50°F. Ensure heating maintains comfort. If system struggles or makes unusual noises, call for service. January rain and chill make heating essential for comfort.' },
          { title: 'Monitor for mudslide and flooding risks', description: 'Heavy January rains saturate hillsides, causing mudslides and flooding, especially after wildfires. Know if you\'re in risk zone. Never drive through flooded roads. Watch for soil movement around foundation. If in mudslide zone, have evacuation plan ready. Monitor weather alerts during heavy rain.' }
        ],
        priority: 'medium'
      },
      2: { // February
        seasonal: [
          { title: 'Continue winter storm monitoring', description: 'February remains active storm month on West Coast. Keep gutters clear, check weatherstripping, monitor for leaks after each storm. Have emergency supplies ready for power outages. Inspect property after each major storm for wind and water damage.' },
          { title: 'Check drainage systems', description: 'February rain tests drainage. Ensure gutters and downspouts are clear and functioning. Check that yard drainage directs water away from house. Look for pooling water near foundation. Clean storm drains near property. Poor drainage causes foundation damage and basement flooding.' },
          { title: 'Inspect exterior for weather damage', description: 'Walk property checking for storm damage - missing roof shingles, damaged siding, cracked stucco, broken fence panels. Look for peeling paint from moisture. Check window caulking. February storms are cumulative - address damage before it worsens.' },
          { title: 'Check and clean gutters', description: 'Remove leaves, debris, and moss from gutters. Flush with hose to ensure proper flow. Check for leaks and sagging sections. Ensure downspouts extend 5 feet from foundation. Clean gutters prevent water damage, foundation problems, and basement flooding during wet season.' },
          { title: 'Maintain fireplace and chimney', description: 'If you use fireplace, remove ash buildup and have chimney professionally swept if used regularly. Check damper operation. Look for cracks in firebox. Install carbon monoxide detector near fireplace. February is prime fireplace season - proper maintenance prevents fires and CO poisoning.' }
        ],
        weatherSpecific: [
          { title: 'Peak winter storm season', description: 'February brings heaviest West Coast storms. Stock emergency supplies - water, batteries, flashlights, non-perishable food. Charge devices before storms. Know how to shut off gas and water. Trim trees near house. Major storms cause power outages lasting days - preparation essential.' },
          { title: 'Monitor for flooding and water damage', description: 'February atmospheric rivers dump extreme rainfall. Check basement and low areas for water intrusion. Ensure sump pump works if you have one. Move valuables off basement floors. Monitor local flood warnings. Never drive through flooded roads - water is deeper and faster than it appears.' },
          { title: 'Check earthquake preparedness', description: 'Earthquakes don\'t follow seasons. Review emergency plan with family. Check that emergency kit is accessible and current. Ensure water heater is strapped. Secure bookshelves and TVs. Practice drop-cover-hold. After major earthquakes elsewhere, local seismic activity often increases - stay prepared.' },
          { title: 'Inspect for wind damage', description: 'February storms bring 40-60 mph winds, higher in mountains. After wind events, inspect roof for damage, check fence for loose boards, examine trees for broken branches. Secure outdoor furniture and trash cans before storms. Coastal areas face stronger winds and salt air corrosion.' },
          { title: 'Check moisture and mold prevention', description: 'February rain and mild temps create perfect mold conditions. Run bathroom and kitchen exhaust fans during use. Check for condensation on windows. Inspect closets and bathrooms for mold. Use dehumidifier if indoor humidity exceeds 60%. Address mold immediately - health hazard and property damage.' }
        ],
        priority: 'medium'
      },
      3: { // March
        seasonal: [
          { title: 'Begin spring maintenance', description: 'March brings gradual drying and warming on West Coast. Start spring cleaning - wash windows, dust ceiling fans, vacuum vents. Check smoke detectors and replace batteries. Prepare outdoor spaces for increased use as weather improves. Good month for interior projects before summer.' },
          { title: 'Check irrigation systems', description: 'Test irrigation system before dry season arrives. Run each zone checking for leaks, broken sprinkler heads, or coverage gaps. Adjust spray patterns. Check controller and sensors. With drought conditions common, efficient irrigation is essential - repair issues now before water restrictions.' },
          { title: 'Inspect exterior paint and siding', description: 'March weather perfect for exterior inspection. Look for winter storm damage - peeling paint, cracked caulk, damaged siding. UV damage also significant on West Coast. Check south and west exposures. Plan painting projects for spring - address issues before summer sun accelerates damage.' },
          { title: 'Clean and maintain outdoor areas', description: 'March is great time for outdoor work. Power wash patios and walkways. Clean outdoor furniture. Inspect deck for damage. Trim trees and shrubs. Mulch garden beds. Prepare outdoor spaces for spring and summer use. Weather mild and pleasant for outdoor projects.' },
          { title: 'Check pool and spa systems', description: 'If you have pool, verify all equipment works after winter. Test pump, filter, and heater. Balance water chemistry. Clean or replace filter. Check for leaks. March is good time for pool opening and maintenance before swim season. Schedule professional service if needed.' },
          { title: 'Clean washing machine drain filter', description: 'Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, and debris, then replace the filter and test for leaks. Good deep clean after wet winter season.' }
        ],
        weatherSpecific: [
          { title: 'Monitor for late winter storms', description: 'March can still bring significant West Coast storms, though less frequent than January-February. Keep emergency supplies ready. Monitor forecasts. Clear gutters remain important. Some of largest storms occur in March - don\'t put away emergency gear yet.' },
          { title: 'Check wildfire preparedness', description: 'March marks transition to fire season, especially in Southern California. Create defensible space - trim vegetation 30+ feet from house, remove dead plants, clean gutters. Check fire extinguishers. Plan evacuation routes. Stock N95 masks for smoke. Fire season starts earlier each year - prepare now.' },
          { title: 'Inspect for moisture damage from winter', description: 'After wet season, check for water damage - stains on ceilings/walls, soft spots in flooring, mold growth. Inspect basement and crawl spaces for moisture. Check attic for roof leaks. Address issues immediately before they worsen. March inspection catches winter damage early.' },
          { title: 'Check drought-resistant landscaping', description: 'California faces chronic drought. Consider replacing water-hungry lawns with native drought-tolerant plants. Mulch garden beds to retain moisture. Upgrade to drip irrigation. Check for lawn brown spots indicating overwatering or poor coverage. Water conservation is environmental and financial necessity.' },
          { title: 'Monitor for increased pest activity', description: 'March warming activates ants, termites, and rodents. Check for ant trails, termite mud tubes, or mouse droppings. Seal gaps around pipes and foundation. Keep vegetation trimmed away from house. Consider professional pest control treatment before peak activity season.' }
        ],
        priority: 'medium'
      },
      4: { // April
        seasonal: [
          { title: 'Complete spring maintenance tasks', description: 'April weather perfect for outdoor projects - dry and 60-75°F. Complete all spring tasks: paint exterior, repair damage from winter storms, clean gutters, service AC. Tackle project list before hot summer and fire season. Excellent month for all maintenance activities.' },
          { title: 'Service air conditioning system', description: 'Schedule AC service before summer heat. Technician will clean coils, check refrigerant, test capacitors, ensure efficient operation. West Coast summers can hit 90-100°F+ inland. Early service avoids summer rush and ensures comfort when heat arrives.' },
          { title: 'Deep clean interior and exterior', description: 'Deep clean home inside and out. Wash windows, vacuum vents, clean ceiling fans, shampoo carpets. Power wash exterior, clean siding. Organize closets and storage. April weather ideal for all cleaning projects - comfortable temps, low humidity, dry conditions.' },
          { title: 'Check and maintain deck/patio', description: 'Inspect deck boards and railings for damage. Look for rot, loose fasteners, or warped wood. Power wash or stain deck if needed. Clean patio furniture. Test outdoor lighting. Prepare outdoor spaces for summer use - entertaining season approaching.' },
          { title: 'Inspect screens and outdoor furniture', description: 'Check window and door screens for tears or damage. Repair or replace as needed. Clean outdoor furniture and check for damage from winter weather. Replace worn cushions. Prepare for increased outdoor living as weather warms.' }
        ],
        weatherSpecific: [
          { title: 'Begin wildfire season preparation', description: 'April marks fire season start in California. Create defensible space: clear dead vegetation 30-100 feet from house, trim tree branches 6+ feet from roof, remove debris from gutters. Wildfires threaten thousands of homes annually - preparation is life-saving necessity, not option.' },
          { title: 'Check fire suppression systems', description: 'Test sprinkler systems and hoses. Ensure outdoor faucets work and hoses reach all areas. Stock fire extinguishers and check pressure gauges. Clear access to gas shut-off. Have ladder accessible for roof access. During wildfire, every minute counts - equipment must be ready.' },
          { title: 'Monitor drought conditions', description: 'California faces chronic drought. Monitor local water restrictions and comply fully. Fix all leaks immediately. Consider drought-tolerant landscaping. Reduce lawn watering or eliminate lawns. Every gallon saved helps community and reduces fire risk from dead vegetation.' },
          { title: 'Check outdoor water conservation', description: 'Audit irrigation system efficiency. Upgrade to drip irrigation for gardens. Install rain sensors. Water early morning only. Eliminate runoff. Monitor water bill. Drought isn\'t temporary - permanent water conservation measures essential for West Coast living.' },
          { title: 'Inspect for earthquake safety updates', description: 'Review earthquake preparedness annually. Secure water heater with straps. Anchor tall furniture and TVs. Install automatic gas shut-off. Check emergency supplies are accessible. Practice drop-cover-hold with family. California earthquakes inevitable - preparation reduces injury and damage.' }
        ],
        priority: 'medium'
      },
      5: { // May
        seasonal: [
          { title: 'Begin wildfire season preparation', description: 'May fire danger increases significantly. Complete defensible space work: clear brush, remove dead plants, trim trees, clean gutters of flammable debris. Create ember-resistant zone within 5 feet of house - use gravel or pavers, not bark mulch. Fire season lasts through October - prepare now.' },
          { title: 'Maintain air conditioning system', description: 'Test AC as temperatures reach 75-85°F inland, 65-75°F coastal. Replace filters monthly during use. Listen for unusual sounds. Ensure all vents blow cold air. If system struggles, call for service before summer heat arrives. Inland valleys hit 100°F+ by June.' },
          { title: 'Check outdoor equipment and furniture', description: 'Inspect and clean outdoor equipment - grills, lawn mowers, garden tools. Test outdoor kitchen appliances. Clean and arrange patio furniture. Check shade structures for stability. May brings outdoor living season - ensure all equipment functions properly.' },
          { title: 'Maintain landscaping with water conservation', description: 'Transition to drought-tolerant native plants. Mulch heavily to retain moisture. Reduce lawn area or eliminate. Water deeply but infrequently - trains deep roots. Adjust irrigation for warming temps. Fire-safe and water-wise landscaping essential for California.' },
          { title: 'Inspect deck and outdoor structures', description: 'Check deck, pergola, and fences for fire safety and structural integrity. Look for dry rot, termite damage, or loose boards. Apply fire-resistant stain if needed. Ensure structures won\'t contribute to fire spread. Address any safety concerns before summer use.' },
          { title: 'Clean washing machine drain filter', description: 'Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, and debris, then replace the filter and test for leaks. Regular maintenance prevents breakdowns.' }
        ],
        weatherSpecific: [
          { title: 'Peak wildfire season preparation', description: 'May is critical fire prep month. Sign up for emergency alerts. Plan evacuation routes - have two options. Pack go-bags with documents, medications, photos. Know when to evacuate versus shelter. Stock N95 masks for smoke. Wildfires move fast - hesitation kills.' },
          { title: 'Check defensible space around home', description: 'Create three zones: 0-5 feet (ember-resistant), 5-30 feet (reduced fuel), 30-100 feet (thinned vegetation). Remove all dead plants. Trim tree branches 6+ feet from roof and 10+ feet from chimney. Store firewood 30+ feet away. Defensible space is law and life-saver.' },
          { title: 'Monitor drought and water restrictions', description: 'May marks start of dry season - no rain until October/November. Follow all water restrictions strictly. Water outdoor plants early morning only. Fix leaks immediately. Report water waste. Drought emergencies common - conservation is civic duty and fire prevention.' },
          { title: 'Check fire-resistant landscaping', description: 'Replace flammable plants near house with fire-resistant species. Remove junipers, pines, eucalyptus near structures - highly flammable. Choose succulents, hardwoods, natives with high moisture content. Maintain spacing between plants. Proper landscaping stops fires from reaching home.' },
          { title: 'Inspect evacuation route planning', description: 'Drive your evacuation routes at different times - roads become gridlocked during fires. Have backup routes. Know where routes lead. Pack car essentials - water, maps, cash, chargers. Practice evacuation with family. When evacuation ordered, leave immediately - don\'t wait and see.' }
        ],
        priority: 'high'
      },
      6: { // June
        seasonal: [
          { title: 'Peak wildfire season vigilance', description: 'June begins peak fire season. Monitor fire conditions daily. Keep defensible space maintained - vegetation grows fast. Have go-bags ready. Watch for smoke. Sign up for emergency alerts if you haven\'t. June-October is most dangerous period - constant vigilance required.' },
          { title: 'Monitor air conditioning efficiency', description: 'June temps reach 85-95°F inland, 70-80°F coastal. AC runs daily - replace filters monthly. Monitor energy bills for efficiency. Ensure system cools properly. If performance drops, call for service. Summer heat stress tests AC - maintain carefully to avoid breakdowns.' },
          { title: 'Maintain outdoor living spaces', description: 'June perfect for outdoor activities. Keep outdoor areas fire-safe - no dead vegetation, propane stored properly, grills away from structures. Maintain furniture and equipment. Water plants early morning. Enjoy outdoor spaces while maintaining fire safety awareness.' },
          { title: 'Check pool and water systems', description: 'Pool season begins - test chemistry weekly, run pump 8-12 hours daily, clean filter regularly. Monitor for leaks. Use pool cover to reduce evaporation - water conservation important. Ensure pool area is fire-safe and meets safety codes.' },
          { title: 'Inspect exterior for fire safety', description: 'Walk property checking fire safety: gutters clear, no vegetation touching house, no combustibles near structures, vents screened against embers. Remove anything flammable from under deck. June fire inspections common in high-risk areas - be ready anytime.' },
          { title: 'Flush water heater', description: 'Turn off power/gas and water supply. Attach hose to drain valve and flush until water runs clear, removing sediment. Close valve, restore water and power. Annual flushing extends life and efficiency. Simple maintenance prevents failures.' }
        ],
        weatherSpecific: [
          { title: 'Peak wildfire season (June-October)', description: 'June marks start of 5-month peak fire season. Zero rain expected until fall. Vegetation bone-dry. Single spark starts infernos. Monitor fire conditions daily. Have multiple evacuation plans. Keep car gas tank above half. Wildfires can destroy neighborhoods in hours - constant readiness essential.' },
          { title: 'Monitor fire danger conditions', description: 'Check daily fire danger ratings. On high/extreme days, avoid outdoor burning, parking on dry grass, or using power tools on dry vegetation. Have situational awareness - smell smoke, see smoke columns, hear sirens means investigate immediately. Download CAL FIRE app for real-time alerts.' },
          { title: 'Check air quality systems', description: 'Wildfire smoke degrades air quality severely. Stock HEPA air purifiers for each bedroom. Have N95 masks for all family members. Know how to seal home - close windows, turn off whole-house fans. Monitor AQI daily during fire season. Smoke health impacts serious - protect family.' },
          { title: 'Maintain defensible space', description: 'Vegetation management ongoing - plants grow, leaves accumulate. Keep zone 0-5 feet completely clear. Mow grass to 4 inches max. Remove leaves from roof and gutters weekly. Trim new growth away from structures. Defensible space requires constant maintenance, not once-yearly cleaning.' },
          { title: 'Check emergency evacuation supplies', description: 'Verify go-bags current - update medications, batteries, water. Have copies of critical documents. Pack family photos on USB drive. List valuables for insurance. Know what you\'ll grab in 5-minute evacuation. Review family meeting points if separated. Practice makes survival automatic under stress.' }
        ],
        priority: 'high'
      },
      7: { // July
        seasonal: [
          { title: 'Continue wildfire vigilance', description: 'July is peak wildfire month on West Coast. Monitor fire danger daily - red flag warnings mean extreme risk. Check defensible space weekly as vegetation grows. Keep go-bags accessible. Monitor smoke and air quality. Stay alert 24/7 - fires can start and spread in minutes during July heat and dry conditions.' },
          { title: 'Monitor cooling system efficiency', description: 'July temps hit 90-100°F+ inland. AC works hard - replace filters monthly, monitor performance, listen for problems. If cooling declines, call for immediate service. Keep indoor temps comfortable during hot days and poor air quality from fires.' },
          { title: 'Maintain fire-safe landscaping', description: 'July heat stresses plants - dead vegetation is extreme fire hazard. Remove all dead material weekly. Water fire-resistant plants to keep them healthy and moist. Keep grass short. Trim vegetation away from structures. Ongoing maintenance critical during peak fire season.' },
          { title: 'Check outdoor equipment protection', description: 'Protect outdoor equipment from heat and fire risk. Store propane tanks safely away from structures. Keep combustibles away from outdoor kitchen. Ensure grills are clean and away from house. Have fire extinguisher nearby during outdoor cooking. July heat and fire risk demand extra caution.' },
          { title: 'Inspect air quality systems', description: 'July wildfires create severe air quality issues. Run HEPA air purifiers continuously during smoke events. Change filters frequently. Seal home when AQI exceeds 150 - close windows, turn off whole-house fans. Monitor AQI hourly during active fires nearby.' },
          { title: 'Clean washing machine drain filter', description: 'Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, and debris, then replace the filter and test for leaks. Regular maintenance prevents breakdowns during busy summer.' }
        ],
        weatherSpecific: [
          { title: 'Peak wildfire danger period', description: 'July is historically worst fire month - Camp Fire, Carr Fire, others started in July/August. Zero percent humidity some days. Single ember starts catastrophic fires. Have 24/7 situational awareness. Sleep with phone on for emergency alerts. Be ready to evacuate instantly - hesitation is deadly.' },
          { title: 'Monitor air quality during fires', description: 'Wildfire smoke contains dangerous particulates. AQI above 150 is unhealthy - limit outdoor activity. Above 200 very unhealthy - stay indoors. Above 300 hazardous - seal home, run purifiers, wear N95 outdoors if must go out. Smoke exposure causes lasting health damage - protect family aggressively.' },
          { title: 'Check fire suppression readiness', description: 'July fires require immediate action. Have hoses connected and functional. Know gas shut-off location. Keep ladder accessible. Stock fire extinguishers. Have evacuation plan practiced. When fire threatens, wet down house if time permits, then evacuate immediately per emergency orders.' },
          { title: 'Maintain defensible space', description: 'July growth and heat stress create constant fire fuel. Inspect property weekly - remove dead leaves, trim back new growth, clear gutters, mow grass very short. Zone 0-5 feet must be absolutely clear. July maintenance is weekly task, not monthly - fire can strike anytime.' },
          { title: 'Monitor drought stress on landscaping', description: 'July heat kills drought-stressed plants creating fire fuel. Water fire-resistant plants adequately. Remove dead plants immediately. Consider removing non-fire-resistant plants entirely. Brown, dead vegetation is invitation for wildfire. Keep landscaping healthy or remove it.' }
        ],
        priority: 'high'
      },
      8: { // August
        seasonal: [
          { title: 'Continue peak wildfire season vigilance', description: 'August equals July for fire danger - often hotter and drier. Maintain constant awareness. Check property daily for fire hazards. Monitor weather and fire conditions obsessively. Have evacuation readiness as routine. August fires have destroyed entire communities - vigilance is survival requirement.' },
          { title: 'Monitor air conditioning performance', description: 'August heat continues to stress AC. System runs continuously - listen for declining performance, unusual sounds, or weak airflow. Replace filters monthly. If system struggles, call immediately for service. AC failure during August heat wave and smoke events creates health emergency.' },
          { title: 'Check fire-resistant exterior materials', description: 'August heat perfect time to upgrade fire resistance. Check that roof, siding, deck, fence are fire-resistant materials. Replace wood shingles with Class A fire-rated roof. Install ember-resistant vents. Seal gaps where embers enter. Homes with fire-resistant exteriors survive when others burn.' },
          { title: 'Maintain outdoor areas safely', description: 'August outdoor activities must balance enjoyment with fire safety. Never use outdoor fire pits or fireworks. Keep grills away from house and vegetation. No metal objects on dry grass - catalytic converters start fires. Park vehicles on pavement only. One careless moment destroys neighborhoods.' },
          { title: 'Inspect emergency preparedness', description: 'Review evacuation plan with family. Update go-bags with current medications. Test emergency communication plan. Practice evacuation routes. Photograph belongings for insurance. Document valuables. Confirm car has emergency kit. August fires come with zero warning - preparation is survival.' }
        ],
        weatherSpecific: [
          { title: 'Peak wildfire season continues', description: 'August fire risk equals or exceeds July. Diablo winds in North, Santa Anas in South push fires at terrifying speed. Fires cross highways, jump firebreaks, destroy everything in path. When evacuation ordered, leave immediately - fire moves faster than traffic. Minutes decide life or death.' },
          { title: 'Monitor extreme fire danger conditions', description: 'August red flag warnings are life-threatening events. Extreme fire danger means no outdoor activity creating sparks - no mowing, no power tools, no chains dragging, no driving on dry grass. One spark causes inferno. Take red flag warnings as serious as tornado warnings - they are.' },
          { title: 'Check air filtration during fire season', description: 'August fires create weeks of hazardous air. HEPA filters in every bedroom essential. Change filters when dirty - may be weekly during bad fires. Portable purifiers on high continuously during smoke events. Monitor indoor air quality. Good filtration makes difference between breathing safely and permanent lung damage.' },
          { title: 'Maintain clear evacuation routes', description: 'Know two evacuation routes from neighborhood - primary gets gridlocked during fires. Drive routes during different times to know escape time. Keep car above half tank always - gas stations close during evacuations. Have cash for tolls/emergencies. Clear routes save lives when every second counts.' },
          { title: 'Monitor water usage restrictions', description: 'August is driest month - water restrictions often most severe. Follow all restrictions strictly. Water landscaping only during allowed times. Fix all leaks immediately. Report water waste. Drought makes fire season worse - water conservation is fire prevention and community responsibility.' }
        ],
        priority: 'high'
      },
      9: { // September
        seasonal: [
          { title: 'Continue wildfire season vigilance', description: 'September fire season far from over - some worst fires occur September/October. Santa Ana winds bring extreme fire danger. Maintain all fire safety practices - defensible space, emergency readiness, constant monitoring. September fires are often most destructive - don\'t lower guard as summer ends.' },
          { title: 'Check heating system preparation', description: 'Although still warm (75-90°F days), September nights cool to 50-60°F. Test heating system to ensure it works for coming cool season. Replace furnace filter, check thermostat, listen for issues. Schedule professional service if needed. October brings cooler nights requiring heat.' },
          { title: 'Monitor air quality systems', description: 'September often brings worst wildfire smoke as fires spread during Santa Ana winds. HEPA filtration remains essential. Monitor AQI continuously. Keep masks and emergency supplies current. Some September fire events create air quality disasters lasting weeks - protection systems must remain fully functional.' },
          { title: 'Maintain fire-safe practices', description: 'September-October is second peak fire season due to offshore winds. Keep defensible space perfect. Have go-bags ready. Monitor wind forecasts - offshore winds mean extreme fire danger. Never let guard down - September/October fires have destroyed more homes than summer fires in many years.' },
          { title: 'Inspect exterior maintenance needs', description: 'September weather good for exterior work before winter rains. Complete painting, roof repairs, gutter cleaning, siding repairs. Address summer UV damage. This is ideal maintenance month - dry conditions, moderate temps. Get exterior work done now before November-March rain season.' },
          { title: 'Clean washing machine drain filter', description: 'Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, and debris, then replace the filter and test for leaks. Maintenance after busy summer season prevents problems.' }
        ],
        weatherSpecific: [
          { title: 'Peak wildfire season continues', description: 'September is historically deadly fire month - Oakland Hills, Valley Fire, Atlas Fire all September/October. Offshore winds create perfect fire conditions. Fires spread miles in hours. Red flag warnings frequent. Continue maximum fire vigilance through October. Season far from over - deadliest fires often come in fall.' },
          { title: 'Monitor for Santa Ana wind conditions', description: 'September brings first Santa Ana winds (Southern California) and Diablo winds (Northern California). These hot, dry, powerful winds create extreme fire danger. When forecast, cancel outdoor plans, have go-bags ready, monitor alerts constantly. Winds turn small fires into firestorms in minutes.' },
          { title: 'Check fire safety equipment', description: 'Verify all fire safety equipment functional for fall fire season: fire extinguishers charged, hoses working, ladder accessible, N95 masks current, go-bags packed. September-October fire season often worse than summer. Equipment must be ready for instant use - fires move too fast for preparation during event.' },
          { title: 'Monitor air quality and filtration', description: 'September fires create severe prolonged air quality events. Stock extra HEPA filters - you\'ll need them. Monitor AQI multiple times daily. Plan indoor activities for kids during smoke. Have purifiers for every bedroom. Smoke season extends through October - filtration critical for health protection.' },
          { title: 'Check earthquake preparedness updates', description: 'September is California Earthquake Preparedness Month. Review emergency plans with family. Check emergency kit supplies are current. Practice drop-cover-hold-on. Ensure water heater strapped. Check that heavy items secured. Earthquakes strike without warning - annual review keeps family prepared.' }
        ],
        priority: 'high'
      },
      10: { // October
        seasonal: [
          { title: 'Continue wildfire vigilance', description: 'October remains peak fire season - Tubbs Fire, Wine Country Fires, Kincade Fire all October. Santa Ana/Diablo winds at peak strength. Fire danger equal to September. Maintain perfect defensible space, monitor conditions, have evacuation readiness. Fire season doesn\'t end until November rains - stay alert.' },
          { title: 'Begin heating system preparation', description: 'October nights drop to 45-55°F. Ensure heating works reliably for coming cool season. Replace filter, check thermostat programming, test system. Listen for unusual sounds. If problems found, schedule service now before winter demand. Heating needs minimal but must function when required.' },
          { title: 'Clean gutters before winter rains', description: 'October is critical gutter cleaning month - must be done before November rains. Remove all leaves, needles, debris. Check for leaks and proper drainage. Ensure downspouts extend 5 feet from foundation. Clean gutters prevent water damage during wet season and are fire safety requirement during dry season.' },
          { title: 'Check weatherproofing', description: 'October is last month before rain season. Inspect all weatherstripping on doors and windows. Check caulking around windows, doors, exterior penetrations. Replace damaged seals. Good weatherproofing prevents water intrusion during November-March rains. Do this now before wet season starts.' },
          { title: 'Maintain outdoor areas', description: 'October weather perfect for outdoor work. Complete all exterior maintenance before rains. Clean patios, organize outdoor storage, trim trees, maintain landscaping. Enjoy pleasant weather while preparing for winter. Once rains start in November, outdoor work becomes difficult for months.' },
          { title: 'Shut off outside house spigots', description: 'Although freezes rare on most of West Coast, October nights can drop to freezing in inland valleys. Disconnect and drain hoses. Shut off water to exterior faucets if you have valves. Drain irrigation systems in freeze-prone areas. Better safe than dealing with burst pipes.' }
        ],
        weatherSpecific: [
          { title: 'Peak wildfire season continues', description: 'October is climatologically most dangerous fire month - hottest, driest, strongest winds combine. Major October fires are annual event in California. Maintain maximum fire vigilance. When red flag warning issued, be ready to evacuate. Most destructive fires in state history occurred in October. This is the peak.' },
          { title: 'Monitor for dry wind conditions', description: 'October offshore winds (Santa Anas/Diablos) reach peak strength - 60-80+ mph gusts common. These hot, dry winds desiccate vegetation and push fires at terrifying speed. When wind event forecast, cancel plans, stay alert, monitor conditions continuously. These winds make fires unstoppable.' },
          { title: 'Prepare for winter storm season', description: 'October marks transition from fire to flood season. First rains often come late October. Clean gutters and drains before rains. Check emergency supplies for winter storms. Know flood and mudslide risk zones. After fire season, heavy rains cause floods and mudslides - different emergency but equally dangerous.' },
          { title: 'Check fire and flood preparedness', description: 'October requires dual preparedness - still fire season but rain season approaching. Maintain fire readiness while preparing for floods. Areas burned by wildfire face extreme mudslide risk when rains come. Have evacuation plans for both fire and flood. October transition month demands vigilance for multiple hazards.' },
          { title: 'Monitor for earthquake safety', description: 'October is California Great ShakeOut earthquake drill month. Review earthquake preparedness annually. Check water heater straps tight. Ensure emergency kit accessible. Practice drop-cover-hold-on with family. Secure heavy furniture and water heater. Major earthquake is certain eventually - preparation reduces casualties.' }
        ],
        priority: 'high'
      },
      11: { // November
        seasonal: [
          { title: 'End of wildfire season vigilance', description: 'November rains usually end fire season, but late-season fires still possible. Maintain defensible space until consistent rains establish. Monitor forecast - dry November extends fire season. Once rains start, transition to flood/mudslide awareness. Fire season officially ends with significant rain accumulation.' },
          { title: 'Prepare for winter storm season', description: 'November brings first major winter storms. Stock emergency supplies - water, batteries, flashlights, non-perishable food. Charge devices before storms. Know how to shut off utilities. Trim trees near house. Clear gutters and drains. Winter storms cause power outages and flooding - preparation essential.' },
          { title: 'Check heating system operation', description: 'November nights drop to 40-50°F. Ensure heating works reliably for winter. Test system, replace filters, check that all rooms heat evenly. If problems found, call for service now. Although mild compared to other regions, consistent heating needed for comfort during wet, cool winter months.' },
          { title: 'Clean and maintain outdoor areas', description: 'November weather still allows outdoor work between storms. Complete final exterior maintenance before winter rain season. Clean gutters thoroughly, secure outdoor items, organize storage. Once heavy rains start, outdoor work becomes unpleasant for months. Do it now while possible.' },
          { title: 'Check holiday decoration safety', description: 'November brings holiday season. Test all lights before hanging - check for damaged cords or bulbs. Use outdoor-rated lights and weatherproof cords. Test GFCI outlets. Secure decorations against winter winds. Keep live trees watered to prevent fire hazard. Safety first during celebrations.' },
          { title: 'Clean washing machine drain filter', description: 'Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, and debris, then replace the filter and test for leaks. Good maintenance before wet season when laundry increases.' }
        ],
        weatherSpecific: [
          { title: 'Transition from fire to flood season', description: 'November marks dramatic transition - fire danger ends, flood/mudslide season begins. First heavy rains after dry summer cause flooding and mudslides, especially in recent burn areas. Monitor weather forecasts. Know flood/mudslide risk zones. Never drive through flooded roads. Different hazard, equal danger.' },
          { title: 'Check winter storm preparedness', description: 'November storms can be severe - atmospheric rivers bring heavy rain, wind, power outages. Have emergency supplies ready. Know how to report downed power lines. Charge devices before each storm. Stock food for potential multi-day outages. Coastal areas face storm surge - know your risk zones.' },
          { title: 'Monitor for mudslide risks', description: 'Areas burned by wildfires face severe mudslide risk during heavy November rains. Fire removes vegetation that holds soil - mudslides occur rapidly during intense rainfall. If you live below recently burned areas, have evacuation plan ready. Monitor rainfall rates - inches per hour matters more than total accumulation.' },
          { title: 'Check heating system for winter', description: 'November cool, wet weather requires reliable heating. Ensure system maintains comfort during 45-55°F rainy days and nights. Monitor for unusual sounds or smells. If heating seems inadequate, call for service. Mild winters but consistent heating needed - system must work reliably November-March.' },
          { title: 'Inspect for fire season damage', description: 'After fire season ends, assess any damage from smoke, ash, or nearby fires. Check air filters throughout house - replace all. Clean exterior of ash/soot if affected by nearby fires. Inspect roof and gutters for ember damage. Address any issues before winter rains potentially make damage worse.' }
        ],
        priority: 'medium'
      },
      12: { // December
        seasonal: [
          { title: 'Monitor heating system performance', description: 'December nights drop to 40-50°F, occasionally 30s inland. Heating runs regularly - monitor for consistent performance. Check that all rooms heat properly. Replace filter if dirty. Ensure thermostat works correctly. December-February are coolest months - system must function reliably throughout winter.' },
          { title: 'Check winter storm preparation', description: 'December brings more winter storms. Keep emergency supplies current - batteries, flashlights, water, food. Charge devices before each storm. Have backup plans for power outages. Monitor weather forecasts closely. Major December storms are common - preparation prevents emergency becoming crisis.' },
          { title: 'Test smoke and carbon monoxide detectors', description: 'Press test button on all smoke and CO detectors to verify they beep loudly. Replace batteries - holiday season good reminder time. Clean dust from sensors. December increased use of fireplaces, space heaters, and heating systems requires working detectors. Test monthly, replace batteries now.' },
          { title: 'Check holiday decorations safety', description: 'December holiday season requires safety awareness. Don\'t overload electrical circuits. Use outdoor-rated lights and cords. Test GFCIs. Water live trees daily - dry trees are extreme fire hazard. Turn off decorative lights when leaving or sleeping. Secure outdoor decorations against storms.' },
          { title: 'Maintain mild winter conditions', description: 'December brings mild but wet winter - 55-65°F days, 40-50°F nights, regular rain. Monitor for leaks during storms. Run dehumidifiers if needed. Ensure drainage systems work properly. Check for mold in damp areas. Mild temperatures but high moisture - different maintenance needs than cold climates.' }
        ],
        weatherSpecific: [
          { title: 'Winter storm season begins', description: 'December through March is peak winter storm season. Atmospheric rivers bring extreme rainfall - multiple inches in hours or days. Flooding, mudslides, wind damage, power outages all common. Have emergency plan for each hazard. Stock supplies for multi-day outages. Storms can be severe and prolonged.' },
          { title: 'Monitor for flooding and wind damage', description: 'December storms bring flooding and wind damage. Check property after each storm - inspect for water intrusion, roof damage, fallen branches. Clear storm drains near property. Never drive through flooded roads. Secure outdoor items before wind events. Cumulative storm damage adds up - inspect after each event.' },
          { title: 'Check earthquake preparedness supplies', description: 'Review earthquake emergency kit as year ends - ensure water hasn\'t expired, rotate food supplies, check batteries, update medications. Earthquakes strike without warning or seasonal pattern. Annual review keeps supplies current. Living on major fault lines requires constant preparedness - make it year-end tradition.' },
          { title: 'Monitor heating during cool weather', description: 'December cool, wet weather requires consistent heating. Monitor energy usage - sudden spikes indicate inefficiency. Ensure heating maintains comfort during wet, cool days and nights. Although mild compared to other regions, damp cold feels uncomfortable - reliable heating essential for winter comfort.' },
          { title: 'Check moisture control during rains', description: 'December rain creates moisture problems. Run bathroom and kitchen exhaust fans during use. Check for condensation on windows - indicates excess humidity. Use dehumidifiers in damp basements. Inspect for mold in closets and bathrooms. Address moisture immediately - mold grows fast in wet season.' }
        ],
        priority: 'medium'
      }
    },
    yearRoundTasks: [
      { title: 'Test smoke and carbon monoxide detectors monthly', description: 'Press test button on all smoke and CO detectors every month to verify they beep loudly. Replace batteries twice yearly - good times are daylight saving changes. Clean dust from sensors with vacuum attachment. Replace smoke detectors over 10 years old and CO detectors over 7 years old. California wildfires and earthquake risks make working detectors life-critical.' },
      { title: 'Check earthquake emergency supplies quarterly', description: 'Every 3 months, verify earthquake kit has current water (1 gallon/person/day for 3 days minimum), non-perishable food, medications, batteries, flashlights, first aid supplies. Rotate food and water annually. Check that water heater is strapped and heavy furniture secured. Earthquakes strike without warning - quarterly checks ensure readiness.' },
      { title: 'Monitor air quality systems regularly', description: 'During wildfire season (May-October), check HEPA air purifier filters weekly - replace when dirty. Monitor AQI daily during fire season. Stock N95 masks year-round. Keep extra purifier filters on hand. Wildfire smoke is annual health threat on West Coast - good filtration is health necessity, not luxury.' },
      { title: 'Check water conservation systems monthly', description: 'Monthly check for leaks in irrigation, faucets, toilets. Fix immediately - California water scarcity makes conservation essential and legally required. Test toilet tanks with food coloring for silent leaks. Monitor water bill for unusual increases. Audit irrigation efficiency. Water conservation is environmental necessity and wildfire prevention.' },
      { title: 'Professional HVAC service twice yearly', description: 'Schedule AC service in spring (March/April) before heat and fire season, furnace check in fall (October/November) before winter. Professional service extends equipment life, ensures efficiency, prevents failures during extreme weather. West Coast climate demands reliable cooling during wildfire season and heating during wet winter.' }
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
          { title: 'Peak winter heating season', description: 'January brings Mountain West coldest temps (-20°F to 20°F). Heating runs 24/7 - monitor performance constantly. Replace furnace filter monthly minimum. Check for unusual sounds or smells. If system struggles, call for emergency service immediately. January heating failure at altitude can be life-threatening. System must work reliably through March.' },
          { title: 'Check heating system efficiency', description: 'Monitor energy bills for sudden spikes indicating inefficiency. Ensure all vents are open and unobstructed. Check that thermostat works correctly. Verify all rooms heat evenly. Listen for cycling sounds - frequent short cycles indicate problems. At altitude, heating systems work harder - efficiency critical for comfort and cost.' },
          { title: 'Monitor for extreme cold effects', description: 'January cold snaps drop temps to -30°F in valleys, colder on mountains. Let faucets drip during extreme cold. Open cabinet doors under sinks for air circulation. Keep garage doors closed. Dress in layers indoors. Stock emergency supplies in case of power outage. Extreme cold is life-threatening - take seriously.' },
          { title: 'Inspect fireplace and chimney', description: 'If using wood heat, remove ash buildup regularly and have chimney professionally swept annually. Check damper seals properly when not in use - massive heat loss through open damper. Stock firewood in covered dry area. Install CO detector near fireplace. Wood heat common at altitude - maintain safely.' },
          { title: 'Check insulation and weatherproofing', description: 'Inspect attic for adequate insulation depth (minimum 14-20 inches at altitude). Check for ice dams indicating heat loss. Ensure basement and crawl space insulation adequate. Check weatherstripping on doors and windows - replace if worn. Good insulation essential at altitude where heating season runs October-May.' },
          { title: 'Clean washing machine drain filter', description: 'Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, and debris, then replace the filter and test for leaks. Winter months generate heavy laundry loads - keep machine maintained.' }
        ],
        weatherSpecific: [
          { title: 'Extreme cold weather preparation (-20°F+)', description: 'January brings life-threatening cold at altitude. Stock emergency supplies - food, water, batteries, flashlights, blankets for multi-day power outages common during winter storms. Have backup heat source (fireplace, wood stove). Never use generators indoors - CO poisoning kills. Extreme cold preparation is survival necessity.' },
          { title: 'Check for ice dam formation', description: 'Look for icicles and ice buildup at roof edges - indicates heat escaping through roof melting snow unevenly. Ice dams cause major water damage when melting. Clear snow from roof edges using roof rake from ground. Improve attic insulation and ventilation to prevent heat loss. Ice dams common at altitude with heavy snowfall.' },
          { title: 'Monitor heating system during cold snaps', description: 'When temps drop below -20°F, check heating system every few hours. Listen for struggling sounds. Monitor thermostat - if temp drops despite system running, call for emergency service. Have backup heat ready. Keep emergency numbers accessible. At altitude during cold snaps, heating failure is emergency requiring immediate action.' },
          { title: 'Check altitude-specific considerations', description: 'Altitude affects everything in winter. Water boils at lower temp making humidifiers less effective. Dry air more severe - use multiple humidifiers to maintain 30-40% humidity. UV radiation more intense even in winter - sun damage continues. Altitude sickness can worsen in dry, cold air. Monitor family health carefully.' },
          { title: 'Monitor for winter storm damage', description: 'Mountain winter storms bring extreme wind, heavy snow, dangerous cold. After each storm, inspect roof for damage, check for downed tree branches, clear snow from vents and furnace exhausts. Never let snow block furnace intake/exhaust - CO hazard. Check that satellite dishes and antennas clear. Storm damage compounds - inspect after each event.' }
        ],
        priority: 'high'
      },
      2: { // February
        seasonal: [
          { title: 'Continue peak winter maintenance', description: 'February remains brutal at altitude - temps -10°F to 25°F. Continue all January practices. Replace furnace filters monthly. Monitor heating performance constantly. Check for ice dams after each snow. Keep emergency supplies current. February is often coldest month - vigilance essential for safety and comfort.' },
          { title: 'Check heating system performance', description: 'After two months of continuous use, heating systems show wear. Listen for declining performance, unusual sounds, or weak airflow. Monitor energy bills - sudden increases indicate problems. If system struggles or fails, call immediately for service. February heating failure dangerous at altitude - address problems immediately.' },
          { title: 'Monitor energy usage efficiency', description: 'Review monthly energy bills and compare to previous years. Sudden spikes indicate inefficiency - poor insulation, air leaks, or system problems. Conduct home energy audit - check for drafts, inspect insulation, verify windows seal properly. At altitude with long heating season, efficiency matters for budget and comfort.' },
          { title: 'Check attic insulation and ventilation', description: 'Mid-winter inspection of attic critical. Check insulation depth adequate (14-20 inches minimum). Look for compressed or wet insulation. Ensure soffit and ridge vents clear of snow and ice. Check for ice dams indicating poor insulation. Proper attic insulation prevents heat loss and ice dam formation.' },
          { title: 'Inspect for winter damage', description: 'February accumulates winter damage. Check for cracks in foundation from freeze-thaw cycles. Look for ice damage to gutters and downspouts. Inspect exterior for wind damage. Check indoor ceilings/walls for water stains from ice dams. Address problems before they worsen - February damage worsens with each freeze-thaw cycle.' }
        ],
        weatherSpecific: [
          { title: 'Monitor for extreme weather conditions', description: 'February brings severe Mountain West storms. Stock up before storms hit - power outages last days at altitude. Have 7-day supply of food, water, medications. Keep vehicles fueled - gas stations close during storms. Monitor weather forecasts obsessively. Have communication plan if cell towers fail. February storms can isolate mountain communities for days.' },
          { title: 'Check snow load on roof structures', description: 'Heavy wet February snow creates dangerous roof loads. If accumulation exceeds 3 feet or you hear creaking, remove snow using roof rake from ground. Watch for sagging roof sections. Never climb on snow-loaded roof. Flat or low-pitch roofs particularly at risk. Roof collapse kills - take snow load seriously at altitude.' },
          { title: 'Monitor heating efficiency at altitude', description: 'Altitude reduces oxygen available for combustion - furnaces and water heaters work less efficiently. Ensure adequate ventilation for combustion appliances. Have CO detectors on every level. Monitor for soot buildup indicating incomplete combustion. Schedule professional service if efficiency declining. Altitude affects all combustion systems.' },
          { title: 'Check for winter storm preparation', description: 'Verify emergency supplies remain current mid-winter. Rotate food stocks, check battery freshness, ensure flashlights work. Have backup heating ready. Stock sand/salt for icy walkways. Keep extra medications on hand. Test generator if you have one. February storms most severe - preparation prevents emergency becoming crisis.' },
          { title: 'Monitor for avalanche safety if applicable', description: 'Mountain areas face avalanche risk after heavy snow. Know your risk zones - areas below steep slopes dangerous. Never enter closed avalanche zones. Have avalanche beacon if backcountry activities. Monitor avalanche forecasts. If you hear rumbling, move away from valley bottoms immediately. Avalanches kill - respect mountain hazards.' }
        ],
        priority: 'high'
      },
      3: { // March
        seasonal: [
          { title: 'Begin spring preparation', description: 'March transitions from winter to spring at altitude - temps -5°F to 40°F. Continue heating system vigilance - season far from over. Start planning spring projects. Order supplies before busy season. Clean and organize garage. March is shoulder season - still cold but thinking ahead to spring essential.' },
          { title: 'Check HVAC system transition', description: 'March brings wild temperature swings - 10°F at night, 50°F during day. HVAC may switch between heating and cooling daily. Test AC before needed - schedule service if problems found. Continue replacing furnace filters monthly. Spring maintenance season approaching - get HVAC service scheduled now before rush.' },
          { title: 'Inspect exterior for winter damage', description: 'Walk property checking winter damage - cracked siding from freeze-thaw, damaged roof shingles from snow/ice, broken fences from wind, foundation cracks from frost heave. Make repair list and prioritize. March-May weather permits exterior work - address damage before summer storms arrive.' },
          { title: 'Begin outdoor equipment preparation', description: 'Prepare lawn equipment for spring. Change oil in mowers and trimmers, sharpen blades, clean air filters. Test irrigation system once frost danger passes (late May typically). Check deck for winter damage. Service outdoor power equipment now before spring rush. May comes fast at altitude - prepare early.' },
          { title: 'Check water systems for spring thaw', description: 'March brings freeze-thaw cycles stressing water systems. Check for leaking pipes from winter freezing. Test outdoor faucets once weather permits - turn on slowly watching for leaks. Inspect water heater for leaks or corrosion. Spring thaw reveals winter pipe damage - catch early before major failures.' },
          { title: 'Clean washing machine drain filter', description: 'Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, and debris, then replace the filter and test for leaks. Deep clean after heavy winter use prepares for spring.' }
        ],
        weatherSpecific: [
          { title: 'Monitor for spring flooding from snowmelt', description: 'March snowmelt combined with spring rain causes flooding at altitude. Ensure gutters and downspouts clear and draining away from foundation. Check basement and crawl space for water intrusion. Direct downspouts at least 5 feet from house. Monitor low-lying areas for pooling water. Spring flooding damages foundations - prevention essential.' },
          { title: 'Check foundation drainage systems', description: 'Inspect foundation for cracks from winter frost heave. Check that grading slopes away from house. Ensure window wells drain properly. Look for water stains in basement. Install or check sump pump operation. March snowmelt tests drainage - inadequate drainage causes foundation failure and basement flooding.' },
          { title: 'Prepare for rapid weather changes', description: 'March at altitude brings crazy weather - snow, rain, sun, wind, freezing temps all in one day. Layer clothing for rapid changes. Keep winter and spring gear accessible. Monitor weather forecasts daily. Have emergency supplies ready - March storms can be severe. Rapid changes stress homes - inspect for damage after weather events.' },
          { title: 'Monitor altitude weather effects', description: 'March marks start of severe weather season at altitude. Monitor for spring blizzards - more snow falls in March than January at some elevations. Watch for wind damage - March winds strongest of year. UV radiation increases rapidly with spring sun - snow blindness risk. March weather at altitude unpredictable and potentially dangerous.' },
          { title: 'Check for spring storm preparation', description: 'March through May brings severe spring storms at altitude. Stock emergency supplies for heavy wet snow bringing power outages. Have generator fuel current. Clear dead tree branches before spring winds. Trim trees away from power lines. Spring storms different from winter - heavy wet snow, lightning, severe winds. Different hazards require different preparation.' }
        ],
        priority: 'medium'
      },
      4: { // April
        seasonal: [
          { title: 'Complete spring maintenance', description: 'April weather moderates at altitude (20-60°F). Complete spring projects - clean gutters, wash windows, organize garage, service lawn equipment. Check exterior paint for winter damage. Repair fence damaged by snow. April-June are prime maintenance months - tackle project list before summer wildfire season.' },
          { title: 'Service air conditioning system', description: 'Schedule AC service before summer heat. Altitude affects AC efficiency - thin air means less cooling capacity. Technician should check refrigerant, clean coils, test capacitors. Summer temps can hit 90-100°F+ at lower elevations. Early service avoids rush and ensures comfort when heat arrives.' },
          { title: 'Clean and inspect outdoor areas', description: 'April perfect for outdoor work at altitude. Power wash deck and patios. Clean outdoor furniture. Organize storage areas. Inspect outdoor structures for winter damage. Enjoy comfortable spring weather while preparing outdoor spaces for summer use. Window between snow and fire season short - work efficiently.' },
          { title: 'Check irrigation and water systems', description: 'Test irrigation system once frost danger passes (usually late April-early May at altitude). Check for broken sprinkler heads, leaks, or freeze damage. Adjust coverage and timing for altitude conditions. Water is scarce at altitude and fire season approaching - efficient irrigation essential.' },
          { title: 'Inspect exterior paint and maintenance', description: 'UV radiation intense at altitude - paint fades and degrades faster than sea level. Inspect all exterior surfaces for damage. Look for peeling paint, cracked caulk, damaged siding. Plan painting projects for May-June before summer storms. Altitude UV damage accelerates - regular maintenance prevents major problems.' }
        ],
        weatherSpecific: [
          { title: 'Monitor for spring storms and flooding', description: 'April brings severe spring storms at altitude - heavy wet snow, lightning, high winds, rapid snowmelt flooding. Monitor weather forecasts closely. Have emergency supplies ready. Check drainage systems handle snowmelt. Spring storms at altitude can be more severe than winter storms - different hazards require vigilance.' },
          { title: 'Check wildfire preparedness', description: 'April marks start of fire season at altitude. Create defensible space - trim vegetation 30-100 feet from house, remove dead plants, clean gutters. Check fire extinguishers. Plan evacuation routes. Fire season runs May-September but preparation starts now. Altitude fires spread fast due to low humidity and wind.' },
          { title: 'Monitor for rapid temperature changes', description: 'April at altitude brings wild swings - freezing nights, warm days, sudden snow squalls, then sunshine. Layer clothing. Keep winter and summer clothes accessible. Protect plants from late frost. Temperature changes stress homes - expansion/contraction causes cracks. Monitor for damage after temperature extremes.' },
          { title: 'Check outdoor equipment for altitude', description: 'Altitude affects all combustion equipment. Carburetors need altitude adjustment for proper fuel/air mix. Generators, lawn mowers, chain saws all need altitude-specific tuning. Performance declines at altitude without adjustment. Have equipment serviced by altitude-experienced technician for proper operation.' },
          { title: 'Prepare for severe weather season', description: 'April through September brings severe weather at altitude - lightning storms, hail, high winds, flash flooding, wildfires. Stock emergency supplies. Have multiple communication methods - cell service unreliable. Install lightning rods if on exposed ridge. Severe weather at altitude intense and sudden - preparation essential.' }
        ],
        priority: 'medium'
      },
      5: { // May
        seasonal: [
          { title: 'Begin wildfire season preparation', description: 'May starts fire season at altitude. Complete defensible space work now - trim all vegetation, remove dead material, clean gutters, create ember-resistant zone within 5 feet of house. Stock N95 masks, fire extinguishers, hoses. Plan evacuation. Fire season May-September - prepare while weather permits outdoor work.' },
          { title: 'Complete outdoor maintenance', description: 'May is prime outdoor maintenance month at altitude (30-70°F, occasional snow). Complete all outdoor projects - painting, deck repairs, roof maintenance, fence work. Once fire season peaks in June-July, outdoor work restricted on high fire danger days. Get projects done now.' },
          { title: 'Service lawn and garden equipment', description: 'Service all outdoor power equipment before summer. Change oil, sharpen blades, clean air filters, check spark plugs. At altitude, equipment needs altitude-specific carburetor tuning for proper operation. Stock fuel and oil. Growing season short at altitude - equipment must work when needed.' },
          { title: 'Check deck and outdoor structures', description: 'Inspect decks, pergolas, fences for winter damage and fire safety. Look for rot, loose fasteners, or structural issues. Apply fire-resistant stain if needed. Ensure structures won\'t contribute to fire spread. Altitude UV damage and freeze-thaw cycles stress wood - regular inspection prevents failures.' },
          { title: 'Maintain outdoor living areas', description: 'Prepare outdoor spaces for short but intense summer season at altitude. Clean and arrange furniture. Test outdoor lighting and cooking equipment. Prepare fire pit areas (follow fire restrictions). Summer at altitude is precious - make outdoor spaces ready for maximum enjoyment during brief warm season.' },
          { title: 'Clean washing machine drain filter', description: 'Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, and debris, then replace the filter and test for leaks. Good maintenance before busy summer season.' }
        ],
        weatherSpecific: [
          { title: 'Begin wildfire season vigilance', description: 'May wildfire season begins at altitude. Low humidity (often below 15%), abundant dry vegetation, increasing temps create fire danger. Monitor fire restrictions - often ban open flames even on private property. Sign up for emergency alerts. Practice evacuation. Wildfires at altitude spread rapidly due to wind and terrain - preparation critical.' },
          { title: 'Check fire suppression systems', description: 'Test all fire safety equipment before fire season. Ensure hoses reach all areas. Check fire extinguisher pressure gauges. Verify outdoor faucets work. Stock ladder for roof access. Have chainsaw fueled for clearing firebreaks. During wildfire, every tool must work - test everything now before fires start.' },
          { title: 'Monitor drought conditions', description: 'Mountain West faces chronic drought. Monitor local water restrictions and comply fully. Fix all leaks. Transition to drought-tolerant landscaping. Reduce lawn watering. Drought creates fire fuel from dead vegetation and reduces water available for firefighting. Water conservation is fire prevention and community responsibility.' },
          { title: 'Check defensible space maintenance', description: 'Create three defensible space zones: 0-5 feet (ember-resistant), 5-30 feet (reduced fuel), 30-100 feet (thinned vegetation). Remove all dead plants. Trim tree branches 10+ feet from structures. Stack firewood 30+ feet away. Altitude winds spread embers over 1 mile - defensible space is survival necessity.' },
          { title: 'Prepare for altitude weather changes', description: 'May at altitude brings extreme variability - sunny and 70°F one day, snow squall the next. Keep winter clothes accessible through May. Protect sensitive plants from late frost. Monitor weather constantly. Altitude weather changes in minutes - afternoon thunderstorms common. Preparation for all conditions essential through May.' }
        ],
        priority: 'high'
      },
      6: { // June
        seasonal: [
          { title: 'Peak wildfire season preparation', description: 'June begins peak fire season at altitude. Monitor fire danger daily - red flag warnings mean extreme risk. Keep defensible space maintained. Have go-bags ready. Stock N95 masks for smoke. Sign up for emergency alerts. June-September is critical fire period - constant vigilance required at altitude.' },
          { title: 'Monitor air conditioning efficiency', description: 'June temps reach 80-95°F at lower mountain elevations, cooler higher up. At altitude, AC works harder due to thin air. Monitor performance, replace filters monthly, listen for problems. If cooling declines, call for service. Summer heat and wildfire smoke make indoor comfort essential.' },
          { title: 'Maintain outdoor equipment', description: 'June outdoor equipment gets heavy use. Keep lawn mowers, trimmers, chain saws well-maintained. At altitude, carburetor adjustments critical for proper operation. Stock fuel, oil, spare parts. Growing season and fire mitigation work both demand reliable equipment - maintain carefully.' },
          { title: 'Check pool and water systems', description: 'At lower elevations with pools, June begins swim season. Test chemistry weekly, run pump daily, check filters. At altitude, UV radiation more intense - chlorine depletes faster. Use pool cover to reduce evaporation - water conservation essential. Monitor for leaks constantly.' },
          { title: 'Inspect fire-safe landscaping', description: 'Remove all dead vegetation weekly - critical during fire season. Water fire-resistant plants to keep them healthy and moist. Mow grass short (4 inches max). Trim vegetation away from structures. June heat at altitude dries vegetation rapidly - constant maintenance prevents fire fuel accumulation.' },
          { title: 'Flush water heater', description: 'Turn off power/gas and water supply. Attach hose to drain valve and flush until water runs clear, removing sediment. At altitude, mineral content often higher - sediment accumulates faster. Close valve, restore water and power. Annual flushing extends life and efficiency.' }
        ],
        weatherSpecific: [
          { title: 'Peak wildfire season (June-September)', description: 'June marks start of most dangerous fire months at altitude. Low humidity (10-20%), dry lightning, high winds, abundant fuel create perfect fire conditions. Monitor conditions obsessively. When red flag warning issued, be ready to evacuate instantly. Altitude wildfires move incredibly fast - hesitation kills.' },
          { title: 'Monitor fire danger at altitude', description: 'Altitude amplifies fire danger. Low humidity, high winds, intense UV drying vegetation, steep terrain spreading fires rapidly. Check daily fire danger ratings. On extreme days, no outdoor activities creating sparks - no mowing, no power tools, no driving on dry vegetation. Altitude fire behavior extreme and unpredictable.' },
          { title: 'Check air quality systems', description: 'Wildfire smoke degrades air quality at altitude. Stock HEPA air purifiers for every bedroom. Have N95 masks for all family members. Know how to seal home during smoke events. Monitor AQI daily during fire season. Smoke at altitude can be severe and prolonged - good filtration essential for health.' },
          { title: 'Monitor water usage and conservation', description: 'June begins dry season at altitude - minimal rain until September. Follow all water restrictions. Water outdoor plants efficiently - early morning only. Fix leaks immediately. Consider removing non-essential landscaping. Water scarcity worsens each year - conservation essential for community and fire prevention.' },
          { title: 'Check emergency evacuation planning', description: 'Review evacuation routes - altitude terrain limits escape options. Have two routes planned. Know where routes lead. Pack car essentials - water, maps, cash, emergency supplies. Practice evacuation with family. Keep car fueled above half tank. At altitude during wildfire, roads gridlock immediately - planning saves lives.' }
        ],
        priority: 'high'
      },
      7: { // July
        seasonal: [
          { title: 'Continue wildfire vigilance', description: 'July is peak fire danger at altitude - driest month with lowest humidity (5-15%). Maintain defensible space obsessively - remove dead vegetation daily. Monitor fire restrictions constantly - often no outdoor activities allowed. Keep go-bags ready and car fueled. Check fire danger ratings multiple times daily. Peak fire season demands constant vigilance.' },
          { title: 'Monitor cooling system efficiency', description: 'July temps reach 85-100°F+ at lower elevations, cooler higher up but still warm. At altitude, AC works harder due to thin air. Replace filters monthly minimum. Listen for struggling sounds. Monitor energy bills for efficiency. Indoor refuge from heat and smoke essential - keep system maintained.' },
          { title: 'Maintain fire-safe practices', description: 'No open flames outdoors during July. Use electric equipment only on low fire danger days. Never mow during hottest hours - sparks ignite fires. Keep vehicles off dry grass - hot exhaust starts fires. No fireworks even where legal. One spark during July can destroy entire communities. Fire safety is not optional.' },
          { title: 'Check outdoor equipment protection', description: 'July heat and UV intense at altitude. Store equipment in shade or cover to prevent sun damage. Check plastic components for cracking. Fuel evaporates quickly - use fuel stabilizer. At altitude, UV degrades materials rapidly - protection extends equipment life significantly.' },
          { title: 'Inspect air quality management', description: 'July smoke from wildfires common at altitude. Run HEPA air purifiers continuously when AQI exceeds 100. Check filters weekly - replace when dirty. Keep N95 masks accessible. Seal home during severe smoke events. Monitor AQI hourly during nearby fires. Good air filtration protects health during prolonged smoke exposure.' },
          { title: 'Clean washing machine drain filter', description: 'Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, and debris, then replace the filter and test for leaks. Summer outdoor activities generate heavy laundry - maintain machine for peak performance.' }
        ],
        weatherSpecific: [
          { title: 'Peak wildfire season continues', description: 'July statistically worst fire month at altitude. Combination of driest conditions, lightning storms, accumulated fuel load, and human activity creates maximum danger. Fires at altitude spread miles in hours. Have multiple evacuation routes planned. When told to evacuate, leave immediately - returning for belongings kills people.' },
          { title: 'Monitor for lightning-caused fires', description: 'July brings dry lightning at altitude - lightning without rain igniting fires across wide areas. After thunderstorms, watch for smoke. Report fires immediately - minutes matter. Lightning fires often start in remote areas and grow undetected. Altitude terrain makes firefighting difficult - early detection critical.' },
          { title: 'Check monsoon preparation in some areas', description: 'Southern Mountain West gets July monsoons - afternoon thunderstorms bringing flash flooding, lightning, hail, sudden temperature drops. Clear storm drains. Secure outdoor items. Never drive through flooded areas. Monsoons cool temps but bring different hazards - flooding, lightning strikes, hail damage all common.' },
          { title: 'Monitor air quality during fires', description: 'July wildfire smoke degrades air quality severely at altitude. AQI can exceed 300 (hazardous) during nearby fires. Limit outdoor activities when AQI over 150. Stay indoors with filtered air when over 200. Altitude residents may experience weeks of poor air quality during bad fire seasons.' },
          { title: 'Check altitude-specific fire risks', description: 'Altitude amplifies fire danger in July. Low humidity, high winds, steep terrain, limited escape routes, sparse firefighting resources all increase risk. Homes at altitude face higher insurance costs and evacuation challenges. Some insurance companies now refuse altitude coverage. Fire risk at altitude is existential threat requiring constant management.' }
        ],
        priority: 'high'
      },
      8: { // August
        seasonal: [
          { title: 'Continue peak wildfire season', description: 'August remains critical fire danger at altitude. Continue all July fire practices - maintain defensible space, monitor fire danger daily, keep evacuation plans current. Fire season extends through September at altitude. Fatigue sets in during prolonged high-alert periods - maintain discipline. One lapse in August can be catastrophic.' },
          { title: 'Monitor cooling system performance', description: 'August continues hot at altitude (80-95°F+ at lower elevations). AC system under stress from prolonged summer use. Listen for declining performance or unusual sounds. Check refrigerant levels if cooling seems weak. Replace filters. Consider professional mid-season service check if issues arise.' },
          { title: 'Check for summer damage', description: 'Mid-summer inspection reveals accumulated damage. Check exterior paint for UV fading - altitude sun intense. Look for deck and fence damage from use. Inspect irrigation for leaks - water conservation critical. Address problems before fall weather changes arrive. Summer at altitude stresses all materials.' },
          { title: 'Maintain outdoor areas safely', description: 'August outdoor maintenance limited by fire restrictions. Water plants early morning only. Keep landscaping maintained but avoid power tools on high fire danger days. Enjoy outdoor spaces during safe periods. August is last full month of warm weather at altitude - balance enjoyment with safety.' },
          { title: 'Prepare for fall transition', description: 'Late August begins fall transition at altitude. Nights cool significantly - 30-40°F temperature swings common. Begin thinking about winter preparation. Order firewood, schedule furnace service, plan fall projects. September weather changes rapidly - planning ahead essential at altitude.' }
        ],
        weatherSpecific: [
          { title: 'Peak wildfire danger continues', description: 'August equals July for fire danger at altitude. Vegetation completely dried, humidity still low (10-20%), winds can be strong. Fires in August have entire summer fuel accumulation to burn. Continue maximum vigilance - season not over. Many major altitude fires start in August-September.' },
          { title: 'Monitor for dry lightning storms', description: 'August dry lightning continues at altitude - severe thunderstorms with lightning but minimal rain. Lightning ignites fires across wide areas simultaneously overwhelming firefighting resources. After storms, watch for smoke. Multiple fire starts from one storm system common. Report any smoke immediately.' },
          { title: 'Check fire suppression readiness', description: 'Verify fire suppression equipment remains ready - hoses functional, fire extinguishers charged, water sources accessible. August fires happen fast. Every minute matters. Tools that fail during crisis cost lives. Test everything monthly during fire season - garden hoses, sprinklers, pumps, generators all must work instantly.' },
          { title: 'Monitor monsoon effects if applicable', description: 'Southern Mountain West August monsoons can be severe. Flash flooding, hail, lightning, sudden windstorms all occur. Monsoon moisture provides minimal fire relief but creates new hazards. Clear drainage systems. Secure outdoor items before storms. Never drive through flooded roads - deadly mistake at altitude.' },
          { title: 'Check altitude weather monitoring', description: 'August weather at altitude unpredictable. Morning calm becomes afternoon thunderstorm. Sunny day turns to smoke-filled hazard from distant fire. Monitor weather and fire conditions constantly. Have multiple information sources - weather radio, phone alerts, local news. Altitude weather changes rapidly - constant monitoring necessary.' }
        ],
        priority: 'high'
      },
      9: { // September
        seasonal: [
          { title: 'Continue wildfire vigilance', description: 'September wildfire season continues at altitude - often worst fires occur in September. Fall winds increase fire spread rates dramatically. Maintain defensible space and evacuation readiness through September. First significant snow ends fire season but timing varies - stay vigilant until snow arrives.' },
          { title: 'Begin fall preparation', description: 'September brings rapid transition at altitude - warm days, freezing nights common. Test heating system before needed. Schedule furnace service. Stock firewood. Prepare for sudden weather changes. September at altitude transitions from summer to winter rapidly - sometimes weeks, sometimes days. Be ready for both seasons simultaneously.' },
          { title: 'Check heating system preparation', description: 'Test furnace before cold weather hits - turn on heat and verify it works. Listen for unusual sounds. Check that all vents heat properly. Schedule professional service if not done recently. At altitude, heating season can start in September. System must work when first cold snap arrives.' },
          { title: 'Monitor outdoor equipment', description: 'Prepare to winterize outdoor equipment. Drain fuel from seasonal equipment before storage. Change oil while warm. Clean equipment thoroughly. Service items needing repair. At altitude, outdoor season ends abruptly - equipment properly stored prevents spring frustrations and extends life.' },
          { title: 'Inspect exterior maintenance needs', description: 'September last month for outdoor projects at altitude. Complete any remaining exterior work - painting, caulking, deck repairs, roof maintenance. October weather unreliable, November frozen. Get projects done while weather still permits. September work prevents winter damage.' },
          { title: 'Clean washing machine drain filter', description: 'Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, and debris, then replace the filter and test for leaks. Clean machine before heavy winter use season begins.' }
        ],
        weatherSpecific: [
          { title: 'Wildfire season continues', description: 'September dangerous fire month at altitude. Vegetation dried from entire summer. Fall winds strongest of year. Low humidity continues. Combination creates extreme fire behavior - fires spread miles in hours. September fires historically most destructive at altitude. Continue maximum fire vigilance until significant snow.' },
          { title: 'Prepare for rapid fall weather changes', description: 'September at altitude brings extreme weather variability. 70°F and sunny one day, blizzard the next. Keep both summer and winter clothes accessible. Have snow removal equipment ready. Monitor weather forecasts constantly. Rapid changes stress homes and catch people unprepared - September kills at altitude through weather complacency.' },
          { title: 'Monitor for early winter preparation', description: 'Some years bring September snow at altitude - other years November. Prepare for early winter possibility. Have emergency supplies ready. Stock food and medications. Test backup heating. Ensure vehicles have winter tires ready. September snow can be heavy and prolonged - early preparation prevents emergency becoming crisis.' },
          { title: 'Check altitude-specific fall risks', description: 'September at altitude presents unique hazards - wildfire season overlapping with winter preparation needs. Must maintain fire vigilance while preparing for snow. Roads can be snow-covered on shaded slopes, dry elsewhere. Temperature swings extreme. Altitude fall is transition season requiring dual awareness.' },
          { title: 'Begin winter storm preparation', description: 'Stock winter emergency supplies in September. Have 7-day supply of food, water, medications. Test generator. Stock batteries and flashlights. Check snow removal equipment works. Ensure adequate fuel. Winter at altitude can arrive suddenly in September - early preparation prevents panic buying during first storm.' }
        ],
        priority: 'high'
      },
      10: { // October
        seasonal: [
          { title: 'End wildfire season vigilance', description: 'October typically ends fire season at altitude with first significant snow. Continue fire awareness until snow covers ground. Some years remain dry through October keeping fire danger high. Monitor conditions - do not assume season over until snow sticks. Once snow arrives, shift focus to winter hazards.' },
          { title: 'Complete fall preparation', description: 'October last chance for outdoor work at altitude. Complete all winterization tasks now. Weather in October varies from pleasant to blizzards. Work on nice days - they become rare. November freezes projects in place. October completion prevents winter regrets at altitude.' },
          { title: 'Service heating system for winter', description: 'Have professional HVAC service in October if not done - system about to work for 6-7 months straight. Technician checks burners, heat exchangers, electrical components, carbon monoxide levels. Service in October avoids November rush. Heating failure in November at altitude is emergency.' },
          { title: 'Check insulation and weatherproofing', description: 'Inspect attic insulation before winter (14-20 inches minimum at altitude). Check weatherstripping on doors and windows. Caulk gaps in exterior. Insulate pipes in unheated areas. Good insulation essential at altitude where heating season October through May. Prevention now saves money and prevents freezing disasters.' },
          { 
            title: 'Winterize outdoor water systems (hoses, sprinklers, faucets)', 
            description: 'Complete all outdoor water winterization to prevent costly freeze damage. At altitude, freezing is guaranteed - preparation mandatory, not optional. Shut off water to outdoor faucets from inside shut-off valves. Open outdoor faucets and leave them open through winter to drain completely. Remove, drain, and store all hoses indoors. Drain irrigation systems completely - blow out sprinkler lines with compressed air or hire professional. Drain outdoor fountains and water features. Install insulated faucet covers for added protection. Water remaining in pipes freezes and bursts pipes, causing thousands in water damage.',
            priority: 'high',
            actionSummary: 'Follow these 5 essential steps to winterize your outdoor water systems and prevent burst pipes.',
            steps: [
              'Locate and close shut-off valves inside your home for all outdoor faucets',
              'Open all outdoor faucets and leave them open all winter to allow drainage',
              'Disconnect all garden hoses, drain them completely, and store indoors',
              'Drain sprinkler/irrigation system using compressed air or hire a professional',
              'Install insulated foam faucet covers on all outdoor spigots for extra protection'
            ],
            toolsAndSupplies: [
              'Adjustable wrench (to turn shut-off valves)',
              'Insulated faucet covers (one for each outdoor faucet)',
              'Air compressor (for sprinkler system winterization, or hire professional)',
              'Bucket (to catch draining water)',
              'Towels or rags',
              'Flashlight (for locating basement shut-off valves)'
            ],
            impact: 'At altitude, frozen outdoor pipes will burst, causing catastrophic water damage inside walls and flooding basements. A single burst pipe can release hundreds of gallons of water, damaging floors, walls, and belongings. Sprinkler system freeze damage often costs $500-2,000 to repair.',
            impactCost: '$500 - $5,000 for pipe repairs and water damage; $500 - $2,000 for sprinkler system repairs'
          }
        ],
        weatherSpecific: [
          { title: 'Prepare for rapid temperature drops', description: 'October at altitude brings dramatic temperature changes - 65°F one day, blizzard the next. Have winter clothes readily accessible. Keep vehicles equipped for winter. Monitor forecasts closely. Altitude weather changes in hours, not days. Rapid temperature drops stress homes and catch people unprepared.' },
          { title: 'Check heating system for altitude', description: 'Verify heating system works properly before cold arrives. At altitude, systems work harder and longer than lower elevations. Ensure adequate capacity for structure and altitude. Test system under load - run for several hours. Address problems now before November cold makes failures life-threatening.' },
          { title: 'Monitor for early winter storms', description: 'October blizzards at altitude can be severe - heavy snow, high winds, rapid temperature crashes. First storms catch people unprepared. Have winter emergency supplies ready. Test snow removal equipment. Stock up before storms hit. October storms can bring 1-3 feet of snow and multi-day power outages.' },
          { title: 'Prepare for potential extreme cold', description: 'October can bring temperatures below 0°F at altitude. Test heating system capacity. Have backup heat source ready. Stock emergency supplies. Prevent pipes from freezing - let faucets drip, open cabinet doors. Extreme cold in October while people still in fall mindset causes emergencies.' },
          { title: 'Check winter storm supplies', description: 'Verify winter emergency kit complete before November. Seven-day supply minimum of food, water, medications. Have batteries, flashlights, radio, first aid, blankets. Stock up before first big storm - stores empty during storm warnings. Altitude isolation during winter storms can last days - preparation essential.' }
        ],
        priority: 'high'
      },
      11: { // November
        seasonal: [
          { title: 'Complete winter preparation', description: 'November fully winter at altitude. Complete any remaining winterization immediately. Windows frozen shut by month end. Outdoor work dangerous in November cold and snow. Verify all systems ready for 5+ months of winter. November completion essential - December fixes nearly impossible at altitude.' },
          { title: 'Test heating system thoroughly', description: 'November begins months of continuous heating at altitude. Monitor system performance carefully first weeks. Listen for unusual sounds. Check all rooms heat evenly. Monitor energy usage. Address problems immediately - winter has just started. System must work reliably through April at altitude.' },
          { title: 'Check winter emergency supplies', description: 'Verify emergency supplies complete and accessible. November storms at altitude can be severe and prolonged. Seven-day supply minimum of food, water, medications. Have backup heating ready. Test generator if equipped. Stock batteries, flashlights, radio. November storms test preparation - be ready.' },
          { title: 'Store outdoor equipment', description: 'Store all seasonal outdoor equipment properly in November. Drain fuel, change oil, clean thoroughly, cover or store indoors. Protect from moisture and rodents. At altitude, equipment sits unused 6+ months - proper storage prevents spring headaches and extends equipment life significantly.' },
          { title: 'Check holiday decoration safety', description: 'Use LED lights for holiday decorating - less heat, lower fire risk, work better in cold. Test lights before installing. Secure outdoor decorations against altitude winds. Use outdoor-rated extension cords. November wind at altitude can be extreme - decorations become projectiles if not properly secured.' },
          { title: 'Clean washing machine drain filter', description: 'Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, and debris, then replace the filter and test for leaks. Winter months generate heavy laundry - maintain machine before peak winter use.' }
        ],
        weatherSpecific: [
          { title: 'Prepare for extreme winter conditions', description: 'November at altitude can bring temperatures -20°F to 20°F. Heavy snow, extreme winds, dangerous cold all arrive in November. Verify home ready for worst conditions. Have backup plans for heating, water, food. November starts months of potential extreme weather - preparation now prevents winter crises.' },
          { title: 'Check heating efficiency at altitude', description: 'Monitor heating costs and performance as November cold intensifies. At altitude, heating systems work harder than lower elevations. Ensure proper efficiency - poor efficiency unaffordable over long winter. Check insulation, seal air leaks, verify thermostats work correctly. Efficiency matters during 6-month heating season.' },
          { title: 'Monitor for winter storm preparation', description: 'November brings serious winter storms at altitude. Before each storm, stock up on essentials. Fill prescriptions. Get groceries. Fuel vehicles. Check generator. November storms can dump 2+ feet of snow and cause multi-day power outages. Preparation before each storm prevents hardship during storms.' },
          { title: 'Check emergency backup systems', description: 'Test backup heating systems in November before depending on them. Verify fireplace or wood stove works properly. Test generator under load. Have adequate fuel stored. At altitude, backup systems are not luxury - they are survival necessity during extended power outages in extreme cold.' },
          { title: 'Prepare for potential isolation conditions', description: 'November storms at altitude can isolate communities for days. Roads impassable, power out, no emergency services possible. Have plan for medical emergencies. Stock adequate medications. Know neighbors and check on each other. Altitude winter isolation is reality - community preparation and cooperation essential.' }
        ],
        priority: 'high'
      },
      12: { // December
        seasonal: [
          { title: 'Monitor heating system performance', description: 'December mid-winter at altitude with months of heating ahead. Monitor system constantly for declining performance. Replace filters monthly minimum. Listen for struggling sounds. Watch energy bills for efficiency spikes. Address problems immediately - December through February are coldest months requiring maximum system reliability.' },
          { title: 'Check winter storm preparation', description: 'December brings severe winter storms at altitude. Before each storm, verify emergency supplies current. Stock food and water. Fill prescriptions. Have backup heating ready. December storms can bring extreme cold, heavy snow, multi-day power outages. Storm preparation routine prevents emergency panic.' },
          { title: 'Test emergency systems', description: 'Mid-winter check of all emergency systems. Test generator under load. Verify backup heating works. Check that flashlights and radios have fresh batteries. Ensure communication plans current. December storms test emergency preparations - systems must work when power fails in extreme cold.' },
          { title: 'Monitor energy usage', description: 'Review December energy usage and compare to previous years. Altitude heating costs significant in winter. Sudden spikes indicate problems - air leaks, insulation issues, system inefficiency. Address inefficiencies quickly - three more months of winter ahead. Energy efficiency at altitude winter essential for budget and comfort.' },
          { title: 'Check holiday safety measures', description: 'December holiday safety critical at altitude. Keep fresh Christmas trees watered - dry trees with altitude low humidity are extreme fire hazards. Use LED lights only. Turn off decorations when away or sleeping. Have fire extinguisher accessible. Altitude dryness makes fire risk higher - careful holiday practices essential.' }
        ],
        weatherSpecific: [
          { title: 'Peak winter weather monitoring', description: 'December through February are peak winter at altitude. Temperatures -20°F to 20°F common. Blizzards, extreme wind, dangerous cold all routine. Monitor weather forecasts constantly. Have multiple information sources. December weather at altitude can be life-threatening - constant awareness essential for safety.' },
          { title: 'Check extreme cold preparations', description: 'December brings extreme cold to altitude - sometimes below -30°F. During cold snaps, let faucets drip, open cabinet doors, check heating every few hours. Have emergency heat ready. Keep emergency numbers accessible. Extreme cold kills - take seriously and monitor family health carefully.' },
          { title: 'Monitor heating during severe weather', description: 'During December storms and cold snaps, monitor heating obsessively. Check system several times daily during extreme cold. Listen for struggling. Verify all rooms staying warm. Have backup heat ready to deploy. At altitude in extreme cold, heating failure is immediate emergency requiring action.' },
          { title: 'Check emergency supplies access', description: 'Verify emergency supplies remain accessible through December. Snow can block access to stored items. Keep essentials inside main living area. Rotate food stocks. Check battery freshness. December storms can strike quickly - supplies must be immediately accessible, not buried in garage or shed.' },
          { title: 'Monitor for winter storm effects', description: 'After each December storm, inspect for damage. Check roof for snow load - remove if excessive. Look for ice dam formation. Ensure vents and exhausts clear of snow. Check for downed branches. December accumulates storm damage - inspect after each event and address problems before they worsen.' }
        ],
        priority: 'high'
      }
    },
    yearRoundTasks: [
      { title: 'Test smoke and carbon monoxide detectors monthly', description: 'Press test button on all smoke and CO detectors every month to verify they beep loudly. Replace batteries twice yearly at daylight saving changes. Clean dust from sensors with vacuum attachment. Replace smoke detectors over 10 years old and CO detectors over 7 years old. At altitude where wildfire smoke, winter heating, and thin air all increase risks, working detectors are life-critical.' },
      { title: 'Check HVAC filters monthly (altitude effects)', description: 'Check furnace filters monthly - replace when dirty or every 1-3 months. Altitude air is drier and dustier, clogging filters faster. During wildfire season (May-Sept), check weekly - smoke particles clog filters rapidly. During heating season (Oct-May), monthly replacement essential. Clean filters critical for altitude HVAC efficiency.' },
      { title: 'Monitor emergency supplies quarterly', description: 'Every 3 months verify emergency kit has current water (1 gallon/person/day for 7 days minimum), non-perishable food, medications, batteries, flashlights, first aid supplies. Rotate food and water every 6 months. At altitude where winter isolation and wildfire evacuation are both real threats, current emergency supplies essential for survival.' },
      { title: 'Check altitude-specific equipment annually', description: 'Annually inspect equipment affected by altitude - carburetors on lawn equipment need altitude adjustment, generators need proper tuning, vehicles need higher octane fuel. Review insurance coverage - wildfire risk may affect availability. Check structural issues from freeze-thaw cycles. Altitude creates unique maintenance needs requiring annual review.' },
      { title: 'Professional HVAC service twice yearly', description: 'Schedule furnace service in fall (September/October) before heating season, AC service in spring (April/May) before cooling season. At altitude, HVAC systems work harder and longer than lower elevations. Professional service extends equipment life, ensures efficiency, prevents failures during extreme weather. Altitude HVAC demands professional maintenance.' }
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
          { title: 'Monitor heating system for cool, wet season', description: 'January cool and wet in Pacific Northwest (35-50°F). While not extreme cold, dampness makes heating essential for comfort. Monitor system performance and replace filters monthly. Check all rooms stay comfortable. Damp cold feels uncomfortable - reliable heating maintains quality of life during wet winter months.', priority: 'medium' },
          { title: 'Check for winter storm damage', description: 'January storms bring heavy rain, wind, and occasional snow to Pacific Northwest. After storms, inspect for roof leaks, siding damage, fallen branches, and flooding. Check gutters remain attached and downspouts drain properly. Cumulative storm damage adds up - inspect after each significant weather event.', priority: 'high' },
          { title: 'Inspect weatherstripping and insulation', description: 'Check door and window weatherstripping for gaps or damage. Feel for drafts. Good seals reduce moisture intrusion and improve heating efficiency. Inspect attic and basement insulation for dampness. Pacific Northwest dampness degrades insulation over time - regular inspection prevents mold and heat loss.', priority: 'low' },
          { title: 'Test carbon monoxide detectors', description: 'Press test button on all CO detectors to verify they beep loudly. Replace batteries if needed. Detectors should be placed near sleeping areas and on every level. Winter heating season increases CO risk. Test monthly to ensure protection for your family during heating season.', priority: 'high' },
          { title: 'Check moisture control systems', description: 'Run bathroom and kitchen exhaust fans during and after use. Check for condensation on windows indicating excess humidity. Use dehumidifiers in basements keeping humidity 30-50%. Inspect for new water stains on ceilings or walls. January rain makes moisture control critical for preventing mold and structural damage.', priority: 'medium' },
          { title: 'Clean washing machine drain filter', description: 'Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, and debris, then replace the filter and test for leaks. Winter generates heavy laundry loads - keep machine maintained.', priority: 'low' }
        ],
        weatherSpecific: [
          { title: 'Peak winter storm season', description: 'January through March brings most severe Pacific Northwest storms. Atmospheric rivers deliver extreme rainfall - multiple inches in 24 hours. High winds cause power outages. Occasional heavy snow disrupts region unaccustomed to it. Stock emergency supplies before each storm - power outages last days in rural areas.', priority: 'high' },
          { title: 'Monitor for flooding and wind damage', description: 'January rain and wind cause flooding and damage. Check property after storms for water intrusion, roof damage, and fallen branches. Never drive through flooded roads - Pacific Northwest flooding kills annually. Clear storm drains near property. Secure outdoor items before windstorms. Storm damage compounds - inspect after each event.', priority: 'high' },
          { title: 'Check moisture and mold prevention', description: 'January constant rain creates perfect mold conditions. Inspect closets, bathrooms, and basements for mold growth. Address immediately - mold spreads rapidly in damp conditions. Improve ventilation in problem areas. Use dehumidifiers. Clean gutters to prevent water intrusion. Moisture is constant January challenge in Pacific Northwest.', priority: 'medium' },
          { title: 'Monitor heating during wet conditions', description: 'Damp Pacific Northwest cold penetrates deeply. While temps seem mild (40°F), dampness makes it feel much colder. Ensure heating maintains comfortable indoor environment. Monitor for unusual condensation indicating ventilation problems. Good heating and ventilation essential during wet season for comfort and mold prevention.', priority: 'medium' },
          { title: 'Check earthquake preparedness', description: 'Pacific Northwest sits on major earthquake zones - Cascadia Subduction Zone capable of 9.0+ quake. January good time to review preparedness. Check emergency kit has water, food, medications for 2 weeks. Strap water heater and secure heavy furniture. Practice drop-cover-hold. Earthquakes strike without warning - annual review essential.', priority: 'high' }
        ],
        priority: 'medium'
      },
      2: { // February
        seasonal: [
          { title: 'Continue winter storm monitoring', description: 'February extends wet season in Pacific Northwest with continued atmospheric river storms. Heavy rain, wind, and occasional snow continue. Monitor weather forecasts before storms. Stock supplies. Check for cumulative damage - February storms add to January wear. Inspect after each significant weather event.', priority: 'high' },
          { title: 'Check drainage and water management', description: 'February rain saturates ground. Check that gutters and downspouts flow freely and drain away from foundation. Ensure window wells drain properly. Look for basement or crawl space water intrusion. Grade should slope away from house. February cumulative rainfall tests drainage - inadequate systems cause foundation damage and flooding.', priority: 'high' },
          { title: 'Inspect exterior for moisture damage', description: 'Walk around home checking for moisture damage. Look for peeling paint, soft or discolored wood, moss growth on siding or roof. Check caulking around windows and doors. Pacific Northwest constant moisture accelerates wood rot - catch early before structural issues develop. Paint and seal vulnerable areas in spring.', priority: 'medium' },
          { title: 'Maintain heating system efficiency', description: 'February continues heating season. Replace furnace filter monthly. Monitor performance and energy bills. Ensure all vents open and unobstructed. While Pacific Northwest winters mild, constant damp chill requires reliable heating for comfort. Address declining performance immediately to prevent mid-winter failures.', priority: 'medium' },
          { title: 'Check attic ventilation', description: 'Proper attic ventilation prevents moisture buildup that causes mold and wood rot. Check that soffit and ridge vents clear and functioning. Look for condensation or frost on underside of roof sheathing. Musty odor indicates moisture problems. Pacific Northwest dampness requires excellent attic ventilation year-round.', priority: 'low' }
        ],
        weatherSpecific: [
          { title: 'Continue winter storm vigilance', description: 'February storms can be most severe of Pacific Northwest winter. Atmospheric rivers bring extreme rainfall and flooding. High winds cause extensive power outages and tree damage. Heavy snow occasionally disrupts region. Have emergency supplies current. Monitor forecasts. Prepare before each storm - February weather patterns can be relentless.', priority: 'high' },
          { title: 'Monitor for water and moisture damage', description: 'February cumulative rainfall reveals drainage and waterproofing weaknesses. Check for new water stains in ceilings, walls, basements. Feel for dampness in carpets near exterior walls. Inspect under sinks and around windows. Address leaks immediately - February moisture penetrates everywhere. Small problems become major issues quickly in persistent damp.', priority: 'high' },
          { title: 'Check mold and mildew prevention', description: 'February damp creates ideal mold conditions. Inspect bathrooms, kitchens, basements, closets for mold growth. Clean immediately with appropriate cleaners. Improve ventilation in problem areas. Use dehumidifiers to maintain 30-50% humidity. Constant February moisture makes mold vigilance essential for health and property protection.', priority: 'medium' },
          { title: 'Monitor heating system performance', description: 'Verify heating maintains comfort during February damp chill. Listen for unusual sounds indicating problems. Check that thermostat responds correctly. Monitor energy usage for sudden changes. February damp cold penetrates deeply despite mild temps - reliable heating essential for comfort and preventing moisture condensation issues.', priority: 'medium' },
          { title: 'Check for wind damage', description: 'February windstorms can be severe in Pacific Northwest. After wind events, inspect roof for missing shingles, check fences and structures for damage, clear fallen branches. Trim dead or weak branches before next storm. Secure outdoor items that could become projectiles. February wind combined with saturated soil topples trees easily.', priority: 'medium' }
        ],
        priority: 'medium'
      },
      3: { // March
        seasonal: [
          { title: 'Begin spring maintenance', description: 'March transitions to spring in Pacific Northwest but rain continues. Start spring cleaning on dry days. Wash windows, clean gutters, organize garage. Check smoke detectors and replace batteries. March good time to address winter damage before summer arrives. Work between rainstorms - dry days still limited.' },
          { title: 'Check drainage systems thoroughly', description: 'After winter rain, thoroughly inspect entire drainage system. Clean gutters and downspouts of accumulated debris. Flush with hose checking for proper flow. Ensure downspouts extend 5 feet from foundation. Check for settled or eroded areas around foundation. March assessment prevents issues during remaining spring rains.' },
          { title: 'Inspect exterior paint for weather damage', description: 'March inspection reveals winter weather damage. Look for peeling or cracking paint, damaged siding, or wood rot. Check caulking around windows and doors. Pacific Northwest moisture accelerates paint deterioration. Plan spring painting projects for April-May when weather improves. Early detection prevents extensive damage.' },
          { title: 'Clean gutters and downspouts', description: 'Remove leaves, moss, needles, and debris from gutters accumulated over winter. Flush with hose verifying proper flow and checking for leaks. Ensure gutter hangers secure and downspouts drain away from foundation. Pacific Northwest debris buildup can be heavy - clean gutters prevent overflow and water damage.' },
          { title: 'Check outdoor equipment', description: 'March time to service lawn mowers and garden tools. Change oil, sharpen blades, clean air filters, replace spark plugs. Service irrigation systems once frost danger passes. Check hoses for damage. April brings active outdoor season - prepare equipment now before busy season arrives.' },
          { title: 'Clean washing machine drain filter', description: 'Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, and debris, then replace the filter and test for leaks. Spring cleaning generates heavy laundry - maintain machine for peak performance.' }
        ],
        weatherSpecific: [
          { title: 'Monitor for flooding from spring rains', description: 'March rain combined with snowmelt from mountains creates flooding potential. Monitor weather forecasts for flood watches. Check basement and crawl spaces for water intrusion. Ensure sump pumps work. Never drive through flooded roads. Clear storm drains near property. March flooding can be extensive - vigilance essential.' },
          { title: 'Check moisture control throughout home', description: 'March continues damp conditions requiring ongoing moisture management. Run exhaust fans during use. Check for condensation on windows. Use dehumidifiers in basements. Inspect for new mold growth and address immediately. March still wet enough for mold growth - continue winter moisture control practices through March.' },
          { title: 'Prepare for increasing daylight', description: 'March brings noticeable daylight increase lifting winter gloom. Time to plan outdoor projects and garden preparation. Check outdoor lighting still works. Clean windows to maximize natural light. Increasing daylight shifts focus from indoor to outdoor - use March to plan spring and summer projects.' },
          { title: 'Monitor for mold and mildew issues', description: 'March dampness continues creating mold conditions. Inspect entire home for mold - bathrooms, basements, closets, under sinks. Clean with appropriate solutions. Improve ventilation in problem areas. Address sources of moisture intrusion. March mold prevention avoids summer mold problems requiring expensive remediation.' },
          { title: 'Check earthquake preparedness updates', description: 'Quarterly earthquake preparedness review. Rotate emergency water and food supplies. Check that heavy furniture and water heater remain secured. Update family communication plan. Practice drop-cover-hold-on. Pacific Northwest major earthquake is not "if" but "when" - quarterly reviews keep preparation current.' }
        ],
        priority: 'medium'
      },
      4: { // April
        seasonal: [
          { title: 'Complete spring cleaning', description: 'April brings improving weather for deep cleaning. Wash windows inside and out, clean gutters, power wash siding and decks. Shampoo carpets to remove winter moisture and mold spores. Clean behind appliances. Organize storage areas. April cleaning removes winter dampness and prepares home for drier summer months.' },
          { title: 'Service air conditioning if applicable', description: 'While Pacific Northwest summers cool, many homes have AC. April good time for service before summer. Technician cleans coils, checks refrigerant, tests components. Wildfire smoke makes AC valuable for filtered air during fire season. Early service avoids summer rush and ensures comfort when needed.' },
          { title: 'Deep clean to remove winter moisture', description: 'April deep cleaning removes accumulated winter moisture. Wash walls and baseboards. Clean and dry basement thoroughly. Inspect closets for mold or mildew. Run dehumidifiers in damp areas. April drying out prevents summer mold growth. Pacific Northwest homes accumulate significant moisture requiring thorough spring cleaning.' },
          { title: 'Check outdoor living areas', description: 'Prepare outdoor spaces for increasing use. Clean and repair deck or patio. Arrange outdoor furniture. Check outdoor lighting and outlets. Power wash surfaces. Inspect railings for stability. April weather permits outdoor work - prepare spaces for summer enjoyment while conditions favorable.' },
          { title: 'Maintain landscaping drainage', description: 'April continue monitoring drainage as spring rains persist. Ensure gutters and downspouts clear. Check grading slopes away from foundation. Clear storm drains. Address erosion or settling areas. Good drainage prevents foundation damage and basement flooding during remaining spring rains.' }
        ],
        weatherSpecific: [
          { title: 'Monitor for continued rain and moisture', description: 'April still wet in Pacific Northwest though intensity declining. Continue moisture control practices - run exhaust fans, use dehumidifiers, inspect for mold. Monitor weather before outdoor projects. While spring advancing, April rain still significant requiring ongoing moisture management.' },
          { title: 'Check air quality and ventilation', description: 'April good time to improve ventilation after closed-up winter. Open windows on dry days for air exchange. Check that exhaust fans work properly. Consider air purifiers for mold spore removal. Good ventilation and filtration remove accumulated winter moisture and prepare for summer air quality needs.' },
          { title: 'Prepare for mild warming trend', description: 'April temps increase to 50-60°F in Pacific Northwest. Adjust clothing and bedding. Reduce heating use. Check AC if applicable. Plant gardens once frost danger passes. April warming brings outdoor activity season - prepare while weather remains mild and comfortable.' },
          { title: 'Check for pest activity increase', description: 'April warming brings increased pest activity. Check for carpenter ants attracted to moist wood. Look for signs of rodents. Seal gaps in foundation and where utilities enter. Address moisture issues that attract pests. Pacific Northwest moisture creates ideal pest habitat - April prevention prevents summer infestations.' },
          { title: 'Monitor wildfire preparedness', description: 'While Pacific Northwest wildfire season later than other regions, April time to begin preparation. Create defensible space, clear gutters, check fire extinguishers. Stock N95 masks and air purifiers. Summer smoke from distant fires common - April preparation ensures readiness before fire season begins.' }
        ],
        priority: 'medium'
      },
      5: { // May
        seasonal: [
          { title: 'Begin wildfire season preparation', description: 'May marks transition to drier weather and wildfire preparation. Clear vegetation from around structures. Clean gutters of needles and leaves. Create ember-resistant zone within 5 feet of home. Stock N95 masks and air purifiers. While Pacific Northwest fires typically later, distant fire smoke arrives early - prepare now.' },
          { title: 'Maintain outdoor equipment and areas', description: 'May brings active outdoor season. Service lawn equipment - change oil, sharpen blades, replace filters. Check irrigation systems for leaks. Clean and arrange outdoor living spaces. Inspect outdoor structures. May weather ideal for outdoor work - complete projects now before summer heat or smoke.' },
          { title: 'Check air conditioning preparation', description: 'Test AC before summer if equipped. Change filters, clear debris from outdoor units, verify proper cooling. While Pacific Northwest summers mild, occasional heat waves and wildfire smoke make AC valuable. Ensure system ready for when needed during summer months.' },
          { title: 'Inspect deck and outdoor structures', description: 'Check decks, fences, pergolas for winter damage. Look for loose boards, rot, or structural issues. Power wash and apply sealant or stain if needed. Check railings for stability. May ideal for outdoor projects - complete maintenance before summer outdoor living season fully arrives.' },
          { title: 'Check water conservation systems', description: 'While Pacific Northwest wetter than other regions, summer drought still occurs. Check irrigation for leaks and efficiency. Adjust watering schedules. Consider drought-tolerant landscaping. Water conservation reduces wildfire fuel from dead vegetation and ensures adequate water for firefighting if needed.' },
          { title: 'Clean washing machine drain filter', description: 'Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, and debris, then replace the filter and test for leaks. Spring outdoor activities generate heavy laundry - maintain machine.' }
        ],
        weatherSpecific: [
          { title: 'Begin dry season and wildfire preparation', description: 'May begins Pacific Northwest dry season. Rain decreases significantly. Vegetation dries creating fire fuel. While local fires rare in May, smoke from distant fires can arrive. Complete defensible space work. Stock emergency supplies. Sign up for fire alerts. May preparation ensures readiness for summer fire season.' },
          { title: 'Check air quality monitoring systems', description: 'Set up air quality monitoring for summer. Download AQI apps, check EPA air quality website, sign up for alerts. Stock HEPA air purifier filters. Have N95 masks for all family members. Pacific Northwest summer smoke from distant wildfires increasingly common - monitoring essential for health protection.' },
          { title: 'Monitor drought preparation', description: 'May begins summer drought period. Check water conservation measures. Fix leaks immediately. Adjust irrigation for efficiency. Transition to drought-tolerant plants. Pacific Northwest summers increasingly dry - water conservation prevents fire fuel buildup from dead vegetation and ensures water availability.' },
          { title: 'Check fire suppression systems', description: 'Verify outdoor hoses reach all areas of property. Check fire extinguisher pressure gauges. Test outdoor water faucets work properly. Stock ladder for roof access. While Pacific Northwest wildfire risk lower than other regions, preparation ensures readiness. Smoke management capabilities critical for summer air quality.' },
          { title: 'Prepare for warm, dry weather', description: 'May transitions to warmer, drier conditions (60-70°F). Adjust wardrobe and home for summer. Reduce heating, increase ventilation. Prepare gardens for growing season. May pleasant month in Pacific Northwest - enjoy comfortable weather while preparing for occasional summer heat and smoke events.' }
        ],
        priority: 'medium'
      },
      6: { // June
        seasonal: [
          { title: 'Wildfire season vigilance begins', description: 'June officially begins Pacific Northwest wildfire season. While fires more common July-September, distant fire smoke arrives June. Monitor air quality daily. Keep defensible space maintained. Have go-bags ready. Stock N95 masks. June preparation prevents August panic when smoke arrives.' },
          { title: 'Monitor air conditioning efficiency', description: 'June temps reach 70-80°F with occasional heat waves higher. For homes with AC, monitor performance. Replace filters monthly during use. Listen for problems. AC provides refuge during heat waves and filtered air during smoke events. Maintain system for summer reliability.' },
          { title: 'Maintain fire-safe landscaping', description: 'June continue vegetation management. Water plants to keep them healthy and fire-resistant. Remove dead material regularly. Keep grass mowed. Trim branches away from structures. While Pacific Northwest vegetation stays greener than other regions, fire-safe practices still essential during dry season.' },
          { title: 'Check outdoor water systems', description: 'Verify irrigation systems work properly for summer watering. Check hoses for leaks or damage. Test outdoor faucets. Monitor for water waste. Efficient water use keeps landscaping healthy and fire-resistant while conserving resources during summer dry period.' },
          { title: 'Inspect exterior for summer preparation', description: 'June inspection reveals any remaining winter damage needing attention. Check paint, siding, caulking, roof for issues. Address before summer heat or smoke events. June still good weather for exterior work - complete projects before fire season limits outdoor activities.' },
          { title: 'Flush water heater', description: 'Turn off power/gas and water supply. Attach hose to drain valve and flush until water runs clear, removing sediment. Close valve, restore water and power. Annual flushing extends heater life and improves efficiency. June ideal time before summer use season.' }
        ],
        weatherSpecific: [
          { title: 'Begin dry season and wildfire vigilance', description: 'June marks full transition to dry season in Pacific Northwest. Rain becomes rare. Vegetation dries. Monitor fire danger and air quality daily. While local fires less common than other regions, smoke from regional fires affects Pacific Northwest regularly. Vigilance begins June and continues through September.' },
          { title: 'Monitor air quality during fire season', description: 'June smoke from distant fires increasingly common in Pacific Northwest. Download air quality apps. Check AQI daily. Limit outdoor activities when AQI exceeds 100. Run air purifiers when needed. Smoke can persist for weeks during active fire seasons elsewhere - monitoring essential for health protection.' },
          { title: 'Check drought-resistant landscaping', description: 'June begin summer drought period. Ensure landscaping can handle dry conditions. Water efficiently and deeply. Add mulch to retain moisture. Consider replacing high-water plants with drought-tolerant alternatives. Healthy, drought-resistant landscaping reduces fire risk and water usage.' },
          { title: 'Prepare for warm, dry conditions', description: 'June brings warmest, driest weather of Pacific Northwest year (65-75°F typically). Adjust home for summer - increase ventilation, reduce heating, prepare for occasional heat waves. While milder than other regions, Pacific Northwest lacks AC in many homes making heat wave preparation important.' },
          { title: 'Check defensible space maintenance', description: 'June verify defensible space complete. Clear zone 0-5 feet of all vegetation and combustibles. Reduce fuel load 5-30 feet. Trim trees away from structures. Keep gutters clean. Defensible space protects against ember attack which can occur from fires miles away.' }
        ],
        priority: 'high'
      },
      7: { // July
        seasonal: [
          { title: 'Peak dry season and wildfire vigilance', description: 'July is driest month in Pacific Northwest. While local fires possible, smoke from regional fires more common. Monitor air quality daily. Keep windows closed on smoky days. Run air purifiers continuously when AQI exceeds 100. Have N95 masks ready. July smoke can persist for weeks affecting outdoor activities and health.' },
          { title: 'Monitor cooling system if needed', description: 'July brings warmest temps (70-85°F typical, heat waves to 95-100°F). For homes with AC, monitor performance during use. Replace filters monthly. Many Pacific Northwest homes lack AC - prepare alternative cooling strategies like fans, closed blinds, cool basements. Heat waves challenging without AC.' },
          { title: 'Maintain water conservation', description: 'July peak water demand month. Water lawn deeply but infrequently. Water early morning to reduce evaporation. Fix leaks immediately. Consider reducing lawn size or transitioning to drought-tolerant plants. July water conservation reduces fire risk and ensures adequate water for firefighting and drinking.' },
          { title: 'Check fire-safe practices', description: 'July maintain defensible space diligently. Remove dead vegetation. Water plants to keep them healthy and fire-resistant. Keep grass mowed. Avoid outdoor burning. Use caution with power tools creating sparks. While Pacific Northwest wetter than other regions, July fire danger real - maintain fire-safe practices.' },
          { title: 'Inspect outdoor equipment protection', description: 'July sun and occasional heat stress outdoor equipment. Store in shade or cover to prevent UV damage. Check hoses and plastic components for cracking. Maintain lawn equipment carefully - breakdowns during July peak use frustrating. July optimal outdoor time in Pacific Northwest - keep equipment functional.' },
          { title: 'Clean washing machine drain filter', description: 'Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, and debris, then replace the filter and test for leaks. Summer outdoor activities and smoke-affected clothing generate heavy laundry loads.' }
        ],
        weatherSpecific: [
          { title: 'Peak dry season and wildfire risk', description: 'July Pacific Northwest vegetation dried from weeks without rain. While local fire risk moderate compared to other regions, smoke from fires in California, Oregon, Eastern Washington creates hazardous air quality. Monitor AQI obsessively. Plan indoor activities on smoky days. July smoke events last days to weeks.' },
          { title: 'Monitor extreme fire danger', description: 'July occasional extreme fire danger days when winds combine with dry conditions. Follow all fire restrictions on these days. No outdoor burning. Avoid activities creating sparks. Report any smoke immediately. While major Pacific Northwest fires rarer than other regions, extreme conditions do occur requiring vigilance.' },
          { title: 'Check air filtration systems', description: 'July air filtration critical for health during smoke events. Run HEPA air purifiers continuously when AQI exceeds 100. Replace filters as needed - smoke clogs them rapidly. Keep windows and doors closed during smoke. Create clean room with best air purifier for sleeping. July smoke is annual health threat.' },
          { title: 'Monitor water usage restrictions', description: 'July often brings water use restrictions. Follow all local regulations. Water only during permitted times. Reduce non-essential water use. Monitor for leaks and fix immediately. Pacific Northwest summer drought increasingly severe - community compliance essential for adequate water supply.' },
          { title: 'Check emergency evacuation planning', description: 'While Pacific Northwest wildfire evacuations less common than other regions, they do occur. Have evacuation plan and go-bags ready. Know evacuation routes. Sign up for emergency alerts. Keep vehicle fueled. Practice evacuation with family. July preparation ensures readiness if evacuation needed.' }
        ],
        priority: 'high'
      },
      8: { // August
        seasonal: [
          { title: 'Continue wildfire season vigilance', description: 'August maintains July fire danger in Pacific Northwest. Continue monitoring air quality daily. Keep defensible space maintained. Water plants to maintain fire resistance. Have go-bags and evacuation plans current. August smoke events can be prolonged and severe - vigilance essential through month.' },
          { title: 'Monitor cooling systems', description: 'August can bring late summer heat waves to Pacific Northwest. For homes with AC, maintain system carefully. Replace filters, clean outdoor units, monitor performance. Homes without AC need alternative cooling - fans, basement refuge, cool showers. August heat waves challenge region unaccustomed to sustained heat.' },
          { title: 'Maintain fire-safe outdoor areas', description: 'August continue vegetation management. Remove dead material weekly. Water plants early morning to keep healthy. Keep gutters clean. Mow grass regularly. August dryness peaked - vegetation management prevents fire fuel accumulation and maintains fire-resistant landscaping.' },
          { title: 'Check water conservation measures', description: 'August peak drought stress month. Maintain all water conservation practices. Water efficiently, fix leaks, reduce non-essential use. Let lawn go dormant rather than over-watering. August water conservation protects resources and reduces fire risk from dead vegetation.' },
          { title: 'Prepare for fall transition', description: 'Late August begin thinking about fall. Order firewood if needed. Schedule heating system service. Plan fall projects. August is last full summer month in Pacific Northwest - enjoy outdoor time while preparing for autumn transition approaching in September.' }
        ],
        weatherSpecific: [
          { title: 'Peak wildfire season continues', description: 'August equals July for Pacific Northwest fire danger. Vegetation completely dried. Smoke from regional fires common. Monitor AQI hourly during smoke events. Limit outdoor activities on unhealthy air days. Stock up on air purifier filters - August smoke events can be most severe of season.' },
          { title: 'Monitor air quality during fires', description: 'August smoke can be hazardous for extended periods. AQI frequently exceeds 150 (unhealthy) during active fire seasons. Stay indoors with filtered air on bad days. Wear N95 masks if must go outside. Cancel outdoor events on smoky days. August air quality significantly impacts quality of life.' },
          { title: 'Check fire suppression readiness', description: 'Verify all fire suppression equipment remains functional. Test hoses and sprinklers. Check fire extinguisher pressure. Ensure water sources accessible. While Pacific Northwest evacuations rare, preparation ensures capability to protect property if needed. August peak fire season demands readiness.' },
          { title: 'Monitor drought stress effects', description: 'August drought stress affects landscaping. Look for stressed plants and water appropriately. Let lawn go dormant rather than over-watering. Remove dead vegetation promptly. August drought combines with smoke creating challenging outdoor environment requiring careful plant management.' },
          { title: 'Prepare for smoke management', description: 'August smoke events common and prolonged. Seal home when smoky - close windows, doors, fireplace dampers. Run air purifiers on high. Create clean room with best filtration. Stock N95 masks. Limit outdoor exposure. August smoke management practices protect health during worst air quality of year.' }
        ],
        priority: 'high'
      },
      9: { // September
        seasonal: [
          { title: 'Continue wildfire vigilance', description: 'September fire season continues in Pacific Northwest. Smoke from regional fires persists through September. Monitor air quality daily. Maintain defensible space until significant rain arrives. First autumn rains usually end fire season but timing varies - maintain vigilance until rain established.' },
          { title: 'Begin fall preparation', description: 'September transitions from summer to fall in Pacific Northwest. Test heating system before cool weather. Schedule HVAC service. Begin fall cleaning. Prepare gardens for winter. Order firewood. September transition month - prepare for rainy season while enjoying last dry weather.' },
          { title: 'Check heating system preparation', description: 'Test furnace before cool, wet fall weather arrives. Turn on heat and verify proper operation. Listen for unusual sounds. Schedule professional service if not done recently. Fall heating season begins in September or October - system must work when first cool, damp weather arrives.' },
          { title: 'Monitor air quality systems', description: 'September continue air quality monitoring as fire season persists. Stock up on replacement air purifier filters while sales occur. Clean existing filters. September smoke can linger until autumn rains arrive - maintain air filtration capabilities through month.' },
          { title: 'Inspect for summer damage', description: 'September inspection reveals summer wear. Check exterior paint for sun damage. Look for dry, cracked caulking. Inspect irrigation for leaks. Address issues before fall rains. September still dry enough for exterior work - complete repairs while weather permits.' },
          { title: 'Clean washing machine drain filter', description: 'Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, and debris, then replace the filter and test for leaks. Clean machine before heavy fall and winter laundry season.' }
        ],
        weatherSpecific: [
          { title: 'Wildfire season continues', description: 'September fire season continues until autumn rains arrive. Smoke from regional fires can persist through September. Some years see September wildfires in Pacific Northwest. Maintain fire vigilance and air quality monitoring until sustained rain begins typically late September or October.' },
          { title: 'Begin transition to wet season', description: 'September marks transition from dry to wet season. First fall rains usually arrive late September. Monitor weather forecasts. Prepare for increasing rain - clean gutters, check drainage, inspect weatherproofing. September transitions Pacific Northwest from fire season to rain season.' },
          { title: 'Monitor for early fall rains', description: 'September brings first significant rain after summer drought. Rain starts gradually - light showers increasing through month. Verify drainage systems handle returning rains. Check gutters work properly. Ensure outdoor items can handle wet weather. September rains welcome after summer drought.' },
          { title: 'Check air quality and filtration', description: 'September smoke can persist until autumn rains arrive. Continue monitoring AQI daily. Run air purifiers as needed. Once consistent rain starts, air quality improves dramatically. September marks end of summer smoke season - rain brings relief for respiratory health.' },
          { title: 'Prepare for weather transition', description: 'September weather highly variable in Pacific Northwest - sunny and 75°F one day, rainy and 55°F the next. Keep both summer and fall clothing accessible. Have rain gear ready. Monitor forecasts daily. September transition requires flexibility for rapidly changing conditions.' }
        ],
        priority: 'high'
      },
      10: { // October
        seasonal: [
          { title: 'End wildfire season vigilance', description: 'October rain typically ends Pacific Northwest fire season. Air quality improves dramatically with autumn rains. Store air purifiers and N95 masks for next year. Shift focus from fire to rain hazards. October marks welcome end to summer smoke season in Pacific Northwest.' },
          { title: 'Begin winter storm preparation', description: 'October rain increases preparing for winter storm season. Stock emergency supplies before winter storms begin. Check flashlights and batteries. Have emergency food and water. Verify backup heating ready. October preparation prevents November storm panic in Pacific Northwest.' },
          { title: 'Check heating system operation', description: 'October weather cools requiring heat. Verify system works properly. Monitor performance as use increases. Replace filters monthly. Address problems before November when system runs constantly. October heating system check prevents mid-winter failures during damp, cool weather.' },
          { title: 'Clean gutters before winter rains', description: 'October critical gutter cleaning before winter. Remove summer debris - leaves, needles, moss, seeds. Flush with hose checking for proper flow and leaks. Ensure downspouts drain away from foundation. October gutter maintenance prevents winter overflow and water damage.' },
          { title: 'Check weatherproofing', description: 'October inspect weatherproofing before winter rains intensify. Check door and window weatherstripping. Inspect caulking around exterior penetrations. Look for gaps in siding. Seal before heavy rains arrive. October weatherproofing prevents winter moisture intrusion and heat loss.' },
          { title: 'Shut off outside house spigots', description: 'Drain and shut off outdoor faucets in October if freezing possible. Remove hoses and drain. Open outdoor faucets to drain lines. Protect pipes from winter freezing. While Pacific Northwest winters mild, occasional freezes damage unprotected outdoor plumbing.' }
        ],
        weatherSpecific: [
          { title: 'Transition from dry to wet season', description: 'October completes transition from dry summer to wet winter. Rain becomes regular and heavy. Ground saturates after summer drought. Check drainage handles returning water. Monitor basement and crawl spaces for moisture. October rain welcome relief after smoke but creates new moisture challenges.' },
          { title: 'Begin winter storm preparation', description: 'October begins Pacific Northwest winter storm season. Atmospheric rivers bring heavy rain, wind, and occasional snow. Stock emergency supplies before first big storms. Have plan for power outages. Secure outdoor items before windstorms. October through March brings most severe weather.' },
          { title: 'Check moisture control systems', description: 'October restart winter moisture control practices. Run exhaust fans during use. Check dehumidifier readiness for basements. Inspect for condensation on windows. Look for early mold growth. October moisture management prevents winter mold problems in damp Pacific Northwest climate.' },
          { title: 'Prepare for increasing rainfall', description: 'October rainfall increases significantly. Check gutters and downspouts handle water volume. Ensure grading slopes away from foundation. Verify drainage systems work. Monitor basement and crawl spaces for water intrusion. October rain tests drainage systems after summer dormancy.' },
          { title: 'Monitor for earthquake preparedness', description: 'Quarterly earthquake preparedness check. Rotate emergency supplies. Verify water heater strapping and furniture securing. Practice drop-cover-hold-on. Pacific Northwest sits on major earthquake zone - quarterly checks maintain readiness for inevitable major quake.' }
        ],
        priority: 'medium'
      },
      11: { // November
        seasonal: [
          { title: 'Complete winter storm preparation', description: 'November begins peak Pacific Northwest storm season. Complete all winter preparations now. Stock emergency supplies. Prepare for power outages. Check heating system thoroughly. Secure outdoor items. November through February brings most severe storms - preparation essential before storms intensify.' },
          { title: 'Check heating system efficiency', description: 'November heating system works continuously during cool, damp weather. Monitor performance and efficiency. Replace filters monthly. Address declining performance immediately. November through March requires reliable heating for comfort in damp Pacific Northwest cold penetrating deeply despite mild temperatures.' },
          { title: 'Prepare moisture control systems', description: 'November ramping up moisture control for winter. Run dehumidifiers in basements. Use exhaust fans religiously. Inspect for new mold growth. Check weatherstripping prevents moisture intrusion. November starts months of constant moisture management in Pacific Northwest climate.' },
          { title: 'Check outdoor equipment storage', description: 'Store summer equipment properly in November. Drain fuel from mowers and trimmers. Clean equipment thoroughly. Cover and store indoors if possible. Protect from moisture and rodents. Pacific Northwest moisture ruins equipment left exposed - proper November storage prevents spring headaches.' },
          { title: 'Inspect holiday decoration safety', description: 'November holiday decorating begins. Use outdoor-rated lights and extension cords. Secure decorations against Pacific Northwest winds. Test lights before installing. Use LED lights for lower heat. November wind and rain stress decorations - secure properly to prevent damage and hazards.' },
          { title: 'Clean washing machine drain filter', description: 'Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, and debris, then replace the filter and test for leaks. Winter wet season generates heavy laundry loads - maintain machine.' }
        ],
        weatherSpecific: [
          { title: 'Begin peak wet season', description: 'November begins peak Pacific Northwest wet season. Heavy rain, strong winds, occasional snow all arrive. November through February brings most precipitation. Stock emergency supplies. Have backup heating ready. Prepare for storm damage. November marks beginning of challenging winter weather season.' },
          { title: 'Check drainage and water management', description: 'November heavy rains test drainage systems. Monitor gutters handle water volume. Check downspouts drain away from foundation. Inspect basement and crawl spaces after heavy rains. Address drainage problems immediately - November is first month of sustained heavy rain requiring functional drainage.' },
          { title: 'Monitor heating system for wet conditions', description: 'November damp cold requires constant heating. Damp penetrates deeply making 45°F feel much colder. Ensure heating maintains comfortable indoor environment. Monitor for condensation indicating ventilation problems. November through March heating essential for comfort in Pacific Northwest damp climate.' },
          { title: 'Prepare for wind and storm damage', description: 'November windstorms can be severe. Trim dead branches before storms. Secure outdoor items. Have plan for power outages. Check generator if equipped. November storms bring tree damage and extended outages - preparation prevents storm hardships in Pacific Northwest.' },
          { title: 'Check mold and mildew prevention', description: 'November constant moisture creates perfect mold conditions. Inspect entire home for mold growth. Clean immediately. Improve ventilation in problem areas. Use dehumidifiers to maintain 30-50% humidity. November starts mold season - aggressive prevention prevents expensive remediation later.' }
        ],
        priority: 'medium'
      },
      12: { // December
        seasonal: [
          { title: 'Monitor heating system performance', description: 'December mid-winter requiring constant heating. Monitor system carefully for declining performance. Replace filters monthly. Listen for unusual sounds. Address problems immediately - December through February coldest, wettest months requiring maximum heating reliability for comfort in damp Pacific Northwest climate.' },
          { title: 'Check winter storm damage prevention', description: 'December storms continue. Before each storm, secure outdoor items and check property for vulnerabilities. After storms, inspect for damage - roof leaks, siding damage, flooding, fallen branches. December cumulative storm damage adds up requiring regular inspection and immediate repairs.' },
          { title: 'Test emergency systems', description: 'December mid-winter check of emergency preparedness. Test flashlights and radios. Verify backup heating works. Check emergency food and water supplies. Test generator if equipped. December storms can cause extended power outages - emergency systems must work when power fails.' },
          { title: 'Monitor moisture control', description: 'December peak moisture management month. Run dehumidifiers continuously in basements. Use exhaust fans diligently. Check for new mold growth. Address condensation immediately. December constant rain makes moisture control critical for preventing mold and maintaining comfortable indoor environment.' },
          { title: 'Check holiday safety measures', description: 'December holiday safety important. Keep fresh Christmas trees watered. Use LED lights only. Turn off decorations when away or sleeping. Have fire extinguisher accessible. Secure outdoor decorations against wind. December holiday season requires safety awareness to prevent fires and storm damage.' }
        ],
        weatherSpecific: [
          { title: 'Winter storm season begins', description: 'December through March is peak Pacific Northwest winter storm season. Atmospheric rivers bring extreme rainfall - multiple inches in 24 hours. High winds cause power outages. Occasional heavy snow disrupts region unaccustomed to it. Stock emergency supplies before each storm - power outages last days in rural areas.' },
          { title: 'Monitor for flooding and wind damage', description: 'December storms bring heavy rain, flooding, and wind damage. Check property after each storm for water intrusion, roof damage, fallen branches. Never drive through flooded roads. Clear storm drains near property. Secure outdoor items before windstorms. December storm damage compounds - inspect after each event.' },
          { title: 'Check heating during wet conditions', description: 'December damp cold penetrates deeply. While temps seem mild (38-48°F), dampness makes it feel much colder. Ensure heating maintains comfortable indoor environment. Monitor for unusual condensation indicating ventilation problems. Good heating and ventilation essential during wet season for comfort and mold prevention.' },
          { title: 'Monitor moisture and mold control', description: 'December constant rain creates perfect mold conditions. Inspect closets, bathrooms, and basements for mold growth. Address immediately - mold spreads rapidly in damp conditions. Improve ventilation in problem areas. Use dehumidifiers. Clean gutters to prevent water intrusion. Moisture is constant December challenge.' },
          { title: 'Check earthquake preparedness', description: 'Year-end earthquake preparedness review. Check emergency kit has water, food, medications for 2 weeks. Strap water heater and secure heavy furniture. Practice drop-cover-hold. Earthquakes strike without warning or seasonal pattern. Living on major fault lines requires constant preparedness - year-end review keeps supplies current.' }
        ],
        priority: 'medium'
      }
    },
    yearRoundTasks: [
      { title: 'Test smoke and carbon monoxide detectors monthly', description: 'Press test button on all smoke and CO detectors every month to verify they beep loudly. Replace batteries twice yearly - good times are daylight saving changes. Clean dust from sensors with vacuum attachment. Replace smoke detectors over 10 years old and CO detectors over 7 years old. Pacific Northwest wildfire smoke and earthquake risks make working detectors life-critical.' },
      { title: 'Check moisture control systems monthly', description: 'Monthly inspect entire home for moisture and mold. Run bathroom and kitchen exhaust fans during and after use. Operate dehumidifiers in basements maintaining 30-50% humidity. Check for condensation on windows. Look for water stains, musty odors, or visible mold. Pacific Northwest constant moisture makes monthly mold vigilance essential for health and property protection.' },
      { title: 'Monitor air quality during fire season', description: 'During fire season (June-September), check AQI daily using EPA AirNow or smartphone apps. Run HEPA air purifiers when AQI exceeds 100. Limit outdoor activities when AQI over 150. Stock N95 masks year-round. Keep extra purifier filters on hand. Pacific Northwest summer smoke from regional fires is annual health threat requiring constant monitoring and filtration.' },
      { title: 'Check earthquake emergency supplies quarterly', description: 'Every 3 months verify earthquake kit has current water (1 gallon/person/day for 2 weeks minimum), non-perishable food, medications, batteries, flashlights, first aid supplies. Rotate food and water every 6 months. Check that water heater is strapped and heavy furniture secured. Earthquakes strike without warning - quarterly checks ensure readiness for inevitable Cascadia megaquake.' },
      { title: 'Professional HVAC service twice yearly', description: 'Schedule heating system service in fall (September/October) before wet season, AC service in spring (April/May) if applicable before summer. Professional service extends equipment life, ensures efficiency, prevents failures during extreme weather. Pacific Northwest climate demands reliable heating during damp cool seasons and occasional AC during heat waves and smoke events - professional maintenance essential.' }
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

// International expansion data for UK, Canada, and Australia
export const INTERNATIONAL_COUNTRIES = [
  {
    code: "US",
    name: "United States", 
    defaultCurrency: "USD",
    isActive: true
  },
  {
    code: "CA",
    name: "Canada",
    defaultCurrency: "CAD", 
    isActive: true
  },
  {
    code: "AU",
    name: "Australia",
    defaultCurrency: "AUD",
    isActive: true  
  },
  {
    code: "GB",
    name: "United Kingdom",
    defaultCurrency: "GBP",
    isActive: true
  }
];

export const INTERNATIONAL_REGIONS = {
  CA: [
    { code: "AB", name: "Alberta", type: "province" },
    { code: "BC", name: "British Columbia", type: "province" },
    { code: "MB", name: "Manitoba", type: "province" },
    { code: "NB", name: "New Brunswick", type: "province" },
    { code: "NL", name: "Newfoundland and Labrador", type: "province" },
    { code: "NS", name: "Nova Scotia", type: "province" },
    { code: "ON", name: "Ontario", type: "province" },
    { code: "PE", name: "Prince Edward Island", type: "province" },
    { code: "QC", name: "Quebec", type: "province" },
    { code: "SK", name: "Saskatchewan", type: "province" },
    { code: "NT", name: "Northwest Territories", type: "territory" },
    { code: "NU", name: "Nunavut", type: "territory" },
    { code: "YT", name: "Yukon", type: "territory" }
  ],
  AU: [
    { code: "NSW", name: "New South Wales", type: "state" },
    { code: "VIC", name: "Victoria", type: "state" },
    { code: "QLD", name: "Queensland", type: "state" },
    { code: "WA", name: "Western Australia", type: "state" },
    { code: "SA", name: "South Australia", type: "state" },
    { code: "TAS", name: "Tasmania", type: "state" },
    { code: "ACT", name: "Australian Capital Territory", type: "territory" },
    { code: "NT", name: "Northern Territory", type: "territory" }
  ],
  GB: [
    { code: "ENG", name: "England", type: "country" },
    { code: "SCT", name: "Scotland", type: "country" },
    { code: "WLS", name: "Wales", type: "country" },
    { code: "NIR", name: "Northern Ireland", type: "country" }
  ]
};

export const INTERNATIONAL_CLIMATE_ZONES = {
  CA: [
    { code: "zone-4", name: "Zone 4 - Warmest", description: "Heating degree days 3000-3999 (warmest Canadian zone)" },
    { code: "zone-5", name: "Zone 5 - Warm", description: "Heating degree days 4000-4999" },
    { code: "zone-6", name: "Zone 6 - Moderate", description: "Heating degree days 5000-5999" },
    { code: "zone-7a", name: "Zone 7A - Cold", description: "Heating degree days 6000-6999" },
    { code: "zone-7b", name: "Zone 7B - Very Cold", description: "Heating degree days 7000-7999" },
    { code: "zone-8", name: "Zone 8 - Coldest", description: "Heating degree days 8000+ (Arctic/sub-Arctic)" }
  ],
  AU: [
    { code: "zone-1", name: "Zone 1 - Hot Humid Summer", description: "Northern Australia - hot humid summer, warm winter" },
    { code: "zone-2", name: "Zone 2 - Warm Humid Summer", description: "Coastal Queensland - warm humid summer, mild winter" },
    { code: "zone-3", name: "Zone 3 - Hot Dry Summer", description: "Hot dry summer, warm winter" },
    { code: "zone-4", name: "Zone 4 - Hot Dry Summer", description: "Hot dry summer, cool winter" },
    { code: "zone-5", name: "Zone 5 - Warm Temperate", description: "Warm temperate climate" },
    { code: "zone-6", name: "Zone 6 - Mild Temperate", description: "Mild temperate climate" },
    { code: "zone-7", name: "Zone 7 - Cool Temperate", description: "Cool temperate climate" },
    { code: "zone-8", name: "Zone 8 - Alpine", description: "Alpine areas of southeastern Australia" }
  ],
  GB: [
    { code: "southern", name: "Southern England", description: "Milder temperatures, lower rainfall" },
    { code: "northern", name: "Northern England", description: "Cooler temperatures, higher rainfall" },
    { code: "scotland", name: "Scotland", description: "Cool temperatures, high rainfall, frost risk" },
    { code: "wales", name: "Wales", description: "Mild temperatures, high rainfall, mountain climate" },
    { code: "ni", name: "Northern Ireland", description: "Mild maritime climate, high rainfall" }
  ]
};

export const INTERNATIONAL_REGULATORY_BODIES = {
  GB: [
    { name: "Gas Safe Register", type: "licensing", website: "https://www.gassaferegister.co.uk", description: "Mandatory for all gas work in UK" },
    { name: "Federation of Master Builders", type: "certification", website: "https://www.fmb.org.uk", description: "UK's largest construction trade association" },
    { name: "TrustMark", type: "certification", website: "https://www.trustmark.org.uk", description: "Government-endorsed quality scheme" },
    { name: "NICEIC", type: "certification", website: "https://www.niceic.com", description: "Electrical contractor certification" }
  ],
  CA: {
    ON: [
      { name: "Skilled Trades Ontario", type: "licensing", website: "https://www.skilledtradesontario.ca", description: "Trade certification and licensing" },
      { name: "Electrical Safety Authority", type: "licensing", website: "https://www.esasafe.com", description: "Electrical contractor licensing" }
    ],
    QC: [
      { name: "Régie du bâtiment du Québec", type: "licensing", website: "https://www.rbq.gouv.qc.ca", description: "Construction contractor licensing" },
      { name: "Corporation des maîtres électriciens du Québec", type: "licensing", website: "https://www.cmeq.org", description: "Electrical contractor licensing" }
    ],
    BC: [
      { name: "BC Housing", type: "registration", website: "https://www.bchousing.org", description: "Residential builder registration" }
    ]
  },
  AU: {
    NSW: [
      { name: "NSW Fair Trading", type: "licensing", website: "https://www.fairtrading.nsw.gov.au", description: "Building contractor licensing >$5,000" }
    ],
    VIC: [
      { name: "Victorian Building Authority", type: "registration", website: "https://www.vba.vic.gov.au", description: "Building practitioner registration" }
    ],
    QLD: [
      { name: "Queensland Building and Construction Commission", type: "licensing", website: "https://www.qbcc.qld.gov.au", description: "Building contractor licensing >$3,300" }
    ]
  }
};

export const INTERNATIONAL_MAINTENANCE_TASKS = {
  GB: [
    {
      taskId: "gb-damp-prevention",
      title: "Damp Prevention and Ventilation",
      description: "Monitor for condensation, check ventilation, inspect for rising damp. Critical in UK climate.",
      category: "Moisture Control",
      priority: "high",
      season: "year-round",
      months: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
      estimatedTime: "1-2 hours monthly",
      difficulty: "easy",
      tools: ["Dehumidifier", "Moisture meter", "Ventilation fans"],
      cost: "£20-200 depending on severity"
    },
    {
      taskId: "gb-roof-moss-removal",
      title: "Roof Moss Removal and Prevention", 
      description: "Remove moss growth from roof tiles and gutters. Install zinc/copper strips to prevent regrowth.",
      category: "Roofing",
      priority: "high",
      season: "spring",
      months: ["3", "4", "5"],
      estimatedTime: "1-2 days",
      difficulty: "medium",
      tools: ["Roof brush", "Moss killer", "Safety equipment", "Ladder"],
      cost: "£150-500 depending on roof size"
    },
    {
      taskId: "gb-radiator-bleeding-autumn",
      title: "Radiator Bleeding Before Winter",
      description: "Bleed all radiators to remove air pockets, check heating system efficiency before winter.",
      category: "HVAC", 
      priority: "high",
      season: "autumn",
      months: ["9", "10"],
      estimatedTime: "2-3 hours",
      difficulty: "easy",
      tools: ["Radiator key", "Cloth", "Small container"],
      cost: "£0-100 (DIY vs professional)"
    },
    {
      taskId: "gb-chimney-sweeping-autumn",
      title: "Annual Chimney Sweeping",
      description: "Professional chimney sweep before winter heating season. Remove soot and check for blockages.",
      category: "HVAC",
      priority: "high", 
      season: "autumn",
      months: ["9", "10", "11"],
      estimatedTime: "2-3 hours",
      difficulty: "hard",
      tools: ["Professional service required"],
      cost: "£50-120 for standard chimney"
    }
  ],
  CA: [
    {
      taskId: "ca-extreme-weatherization",
      title: "Extreme Weather Preparation",
      description: "Comprehensive winterization for Canadian climate zones 6-8. Critical for preventing freeze damage.",
      category: "Winterization",
      priority: "high",
      season: "autumn", 
      months: ["9", "10"],
      estimatedTime: "2-3 days",
      difficulty: "medium",
      tools: ["Insulation materials", "Heat tape", "Caulking", "Weather stripping"],
      cost: "CAD $300-1000 depending on zone"
    },
    {
      taskId: "ca-ice-dam-prevention",
      title: "Ice Dam Prevention System",
      description: "Install heat cables, improve attic ventilation. Critical for zones 6-8 to prevent roof damage.",
      category: "Roofing",
      priority: "high",
      season: "autumn",
      months: ["10", "11"], 
      estimatedTime: "1-2 days",
      difficulty: "hard",
      tools: ["Heat cables", "Roof rake", "Attic ventilation"],
      cost: "CAD $500-2000 depending on roof size"
    },
    {
      taskId: "ca-heating-system-inspection",
      title: "Heating System Maximum Efficiency",
      description: "Comprehensive heating system service for extreme Canadian winters. Test all safety systems.",
      category: "HVAC",
      priority: "high",
      season: "autumn",
      months: ["9", "10"],
      estimatedTime: "3-4 hours", 
      difficulty: "medium",
      tools: ["HVAC service tools", "Carbon monoxide detector", "Filters"],
      cost: "CAD $200-500 for professional service"
    }
  ],
  AU: [
    {
      taskId: "au-cyclone-preparation",
      title: "Cyclone Season Preparation",
      description: "Secure outdoor items, trim trees, check roof fastenings. Critical for tropical zones 1-2.",
      category: "Storm Preparation",
      priority: "high",
      season: "summer",
      months: ["11", "12", "1", "2", "3", "4"],
      estimatedTime: "2-3 days",
      difficulty: "medium",
      tools: ["Rope", "Tarps", "Pruning tools", "Emergency supplies"],
      cost: "AUD $300-1000 depending on property size"
    },
    {
      taskId: "au-termite-inspection",
      title: "Comprehensive Termite Inspection",
      description: "Professional termite inspection every 12 months. Critical for all Australian homes.",
      category: "Pest Control", 
      priority: "high",
      season: "year-round",
      months: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
      estimatedTime: "2-3 hours",
      difficulty: "hard",
      tools: ["Professional inspection required"],
      cost: "AUD $300-600 for professional inspection"
    },
    {
      taskId: "au-bushfire-preparation",
      title: "Bushfire Season Preparation", 
      description: "Clear vegetation, clean gutters, prepare evacuation plan. Critical for zones 3-7.",
      category: "Fire Safety",
      priority: "high",
      season: "spring",
      months: ["9", "10", "11"],
      estimatedTime: "3-5 days",
      difficulty: "medium",
      tools: ["Clearing tools", "Water systems", "Fire-resistant materials"],
      cost: "AUD $500-2000 depending on property"
    },
    {
      taskId: "au-air-conditioning-service",
      title: "Pre-Summer AC Service", 
      description: "Comprehensive air conditioning service before hot season. Clean filters, check refrigerant.",
      category: "HVAC",
      priority: "high",
      season: "spring",
      months: ["9", "10", "11"],
      estimatedTime: "2-3 hours",
      difficulty: "medium",
      tools: ["AC service tools", "Filters", "Cleaning materials"],
      cost: "AUD $150-400 for professional service"
    }
  ]
};