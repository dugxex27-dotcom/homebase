# US_MAINTENANCE_DATA — complete regional maintenance-task catalog

Generated directly from the current `US_MAINTENANCE_DATA` object in `artifacts/api-server/src/shared/location-maintenance-data.ts`.

## Ground-truth structure

- Region keys: 7
- Monthly task occurrences: 1056
- Year-round task entries: 42
- Total task occurrences/entries in this dump: 1098
- Monthly tasks are stored under a numeric month (1–12) and one of two arrays: `seasonal` or `weatherSpecific`.
- The catalog does not store a separate season assignment such as spring/summer/fall/winter. Month placement is the only calendar assignment for monthly entries.
- `MaintenanceTaskItem` has no structured recurrence/frequency field. Any recurrence is prose inside the title or description. This report preserves the full description and also repeats sentences containing literal recurrence wording.
- Monthly priority is inherited from the month object when a task has no task-level priority. Year-round entries have no containing priority and currently define no task-level priorities.

## Supported region keys

| Data key | `region` value | Climate zone | Monthly occurrences | Year-round entries | Total |
|---|---|---|---:|---:|---:|
| Northeast | Northeast | Cold/Humid Continental | 189 | 12 | 201 |
| Southeast | Southeast | Humid Subtropical | 193 | 5 | 198 |
| Midwest | Midwest | Continental/Humid Continental | 163 | 5 | 168 |
| Southwest | Southwest | Arid/Desert | 128 | 5 | 133 |
| West Coast | West Coast | Mediterranean/Marine West Coast | 128 | 5 | 133 |
| Mountain West | Mountain West | High Desert/Alpine | 127 | 5 | 132 |
| Pacific Northwest | Pacific Northwest | Marine West Coast | 128 | 5 | 133 |

## Year-round-list diagnosis

- The 42 year-round entries are **not one shared list**. Each region owns its own `yearRoundTasks` array. Northeast has 12 entries; Southeast, Midwest, Southwest, West Coast, Mountain West, and Pacific Northwest each have 5.
- Some titles recur across regions, but they are separate task objects and their descriptions are region-specific.
- The delivery bug is that `getCurrentMonthTasks(region, month)` returns only `regionData.monthlyTasks[month]`. That object contains only `seasonal`, `weatherSpecific`, and the month priority.
- The weekly homeowner reminder scheduler calls `getCurrentMonthTasks` and iterates only `monthTasks.seasonal` and `monthTasks.weatherSpecific`. It never reads or merges `regionData.yearRoundTasks`.
- The maintenance-notification route, maintenance-coach/current-month route, resale-readiness outstanding-task logic, and contractor current-month task route likewise read monthly arrays only. None of those delivery paths adds `yearRoundTasks`.
- Therefore the year-round objects exist in data but are orphaned from homeowner task delivery. The issue is omission at selection/assembly time, not a shared-list lookup failure and not missing catalog data.

## Complete literal task dump

# Region: Northeast

- Data key: Northeast
- Region value: Northeast
- Climate zone: Cold/Humid Continental

## January

### seasonal

1. **Check heating system efficiency**

   - Description: Ensure your heating system is running efficiently during peak winter. Check thermostat settings, listen for unusual noises, and verify all vents are open and unobstructed. Consider scheduling professional maintenance if performance seems reduced.
   - Assignment: January
   - Type: seasonal
   - Priority: high (task-level)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Inspect and clean fireplace/chimney**

   - Description: Remove ash buildup from fireplace and inspect chimney for creosote deposits or blockages. Check damper operation and look for cracks in firebox. Schedule professional chimney sweep if heavily used.
   - Assignment: January
   - Type: seasonal
   - Priority: medium (task-level)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Check for ice dams on roof**

   - Description: Look for icicles or ice buildup at roof edges that can cause water damage. Clear snow from gutters and roof edges if safe to do so. Ensure attic insulation and ventilation are adequate to prevent warm air from melting snow unevenly.
   - Assignment: January
   - Type: seasonal
   - Priority: high (task-level)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Test carbon monoxide detectors**

   - Description: Press the test button on all CO detectors to verify they are working. Replace batteries if needed. Detectors should be placed near sleeping areas and on every level of your home.
   - Assignment: January
   - Type: seasonal
   - Priority: high (task-level)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Inspect weatherstripping on doors and windows**

   - Description: Check all door and window seals for gaps, cracks, or worn areas. Replace damaged weatherstripping to prevent heat loss and drafts. Use a lit candle or incense stick near edges to detect air leaks.
   - Assignment: January
   - Type: seasonal
   - Priority: medium (task-level)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

6. **Inspect furnace filter and replace if dirty**

   - Description: Remove furnace filter and hold it up to light - if you cannot see through it clearly, replace it. Dirty filters reduce efficiency and air quality. Most filters should be changed every 1-3 months during heating season.
   - Assignment: January
   - Type: seasonal
   - Priority: high (task-level)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Most filters should be changed every 1-3 months during heating season.

7. **Test GFCI outlets in kitchen, bathrooms, garage, and exterior**

   - Description: Press the "test" button on each GFCI outlet - it should click and cut power. Then press "reset" to restore power. If it does not trip, the outlet needs replacement for safety.
   - Assignment: January
   - Type: seasonal
   - Priority: medium (task-level)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

8. **Inspect sump pump (if applicable) — pour water to confirm it activates**

   - Description: Pour a bucket of water into the sump pit to ensure the pump activates and drains properly. Check that the discharge pipe is clear and draining away from your foundation. Clean the inlet screen if present.
   - Assignment: January
   - Type: seasonal
   - Priority: medium (task-level)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

9. **Clean washing machine drain filter**

   - Description: Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, and debris, then replace the filter and test for leaks.
   - Assignment: January
   - Type: seasonal
   - Priority: low (task-level)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Remove snow from roof if excessive buildup**

   - Description: If snow accumulation exceeds 2 feet or you notice sagging, carefully remove snow using a roof rake from the ground. Never climb on a snow-covered roof. Focus on removing snow from roof edges to prevent ice dams.
   - Assignment: January
   - Type: weatherSpecific
   - Priority: high (task-level)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check pipes for freezing in unheated areas**

   - Description: Inspect pipes in basements, crawl spaces, attics, and exterior walls. Feel pipes for cold spots. Let faucets drip slightly during extreme cold. Open cabinet doors under sinks to allow warm air circulation.
   - Assignment: January
   - Type: weatherSpecific
   - Priority: high (task-level)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Ensure adequate insulation in attic and basement**

   - Description: Check attic insulation depth - it should be at least 10-14 inches for cold climates. Look for gaps or compressed areas. Ensure basement rim joists and walls are insulated. Add insulation where needed to prevent heat loss.
   - Assignment: January
   - Type: weatherSpecific
   - Priority: medium (task-level)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Monitor humidity levels (30-50%)**

   - Description: Use a hygrometer to check indoor humidity. Too low causes dry skin and static; too high causes condensation and mold. Run a humidifier if too dry, or improve ventilation and use a dehumidifier if too humid.
   - Assignment: January
   - Type: weatherSpecific
   - Priority: low (task-level)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Check for drafts around windows and doors**

   - Description: On a windy day, hold a lit candle or incense stick near window and door edges. If smoke wavers, you have air leaks. Seal gaps with caulk or weatherstripping. Consider using temporary plastic window insulation kits.
   - Assignment: January
   - Type: weatherSpecific
   - Priority: medium (task-level)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## February

### seasonal

1. **Service heating system before peak winter ends**

   - Description: Schedule a professional HVAC technician to inspect your furnace or boiler for efficiency and safety. They will check burners, heat exchangers, and electrical components. Address any issues now before the system shuts down for spring.
   - Assignment: February
   - Type: seasonal
   - Priority: high (task-level)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check attic insulation and ventilation**

   - Description: Inspect attic insulation for proper depth (10-14 inches minimum in cold climates) and look for compressed or missing areas. Ensure soffit vents and ridge vents are clear of snow and debris to prevent moisture buildup and ice dams.
   - Assignment: February
   - Type: seasonal
   - Priority: medium (task-level)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Inspect roof for winter damage**

   - Description: From the ground or with binoculars, look for missing, cracked, or curled shingles caused by ice and snow. Check flashing around chimneys and vents. Call a professional roofer for any visible damage to prevent leaks.
   - Assignment: February
   - Type: seasonal
   - Priority: high (task-level)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Test sump pump if applicable**

   - Description: Pour a bucket of water into the sump pit to ensure the pump activates and drains properly. Check that the discharge pipe is clear and draining away from your foundation. Clean the inlet screen if present.
   - Assignment: February
   - Type: seasonal
   - Priority: medium (task-level)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Check storm doors and windows**

   - Description: Inspect weatherstripping and seals on storm doors and windows for gaps or damage. Tighten loose hinges and closers. Clean tracks and ensure proper operation. Replace damaged weatherstripping before spring.
   - Assignment: February
   - Type: seasonal
   - Priority: low (task-level)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

6. **Test GFCI/AFCI circuit breakers in electrical panel**

   - Description: Open your electrical panel and press the "test" button on each GFCI and AFCI breaker - it should trip. Then flip it back to "on." If any breaker fails to trip or won't reset, call an electrician immediately.
   - Assignment: February
   - Type: seasonal
   - Priority: high (task-level)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

7. **Inspect water heater for leaks and check temperature (~120°F)**

   - Description: Look around the base of your water heater for puddles or rust. Use a thermometer on hot tap water or check the thermostat setting - it should be around 120°F to prevent scalding and save energy. Wipe away any moisture and monitor.
   - Assignment: February
   - Type: seasonal
   - Priority: medium (task-level)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

8. **Flush toilets and sinks that aren't used often to prevent dry traps**

   - Description: Run water in guest bathrooms, basement sinks, and other rarely used fixtures for 30 seconds. This refills the drain trap and prevents sewer gases from entering your home. Do this monthly for unused fixtures.
   - Assignment: February
   - Type: seasonal
   - Priority: low (task-level)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Do this monthly for unused fixtures.

9. **Check bathroom exhaust fans for proper airflow**

   - Description: Turn on each bathroom fan and hold a tissue near the grille - it should be pulled against the vent. Clean the grille with a vacuum attachment. Proper ventilation prevents moisture damage and mold growth.
   - Assignment: February
   - Type: seasonal
   - Priority: medium (task-level)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

10. **Inspect fire extinguishers for charge and expiration date**

   - Description: Check the pressure gauge on each fire extinguisher - the needle should be in the green zone. Look for the expiration date or inspection tag. If expired or pressure is low, replace or have it professionally recharged.
   - Assignment: February
   - Type: seasonal
   - Priority: high (task-level)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Monitor for ice damage on gutters**

   - Description: Look for bent, sagging, or detached gutters caused by ice weight. Check for ice dams forming at roof edges. Safely remove accessible ice with warm (not hot) water. Heavy ice may require professional removal to avoid injury.
   - Assignment: February
   - Type: weatherSpecific
   - Priority: high (task-level)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check basement for moisture issues**

   - Description: Look for water stains on walls, floors, and around windows. Feel walls for dampness and check for musty odors indicating mold. Use a dehumidifier if humidity exceeds 50%. Address leaks immediately to prevent structural damage.
   - Assignment: February
   - Type: weatherSpecific
   - Priority: medium (task-level)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Ensure proper ventilation to prevent condensation**

   - Description: Run bathroom and kitchen exhaust fans during and after showers and cooking. Open windows briefly on mild days to exchange air. Check that attic and crawl space vents are clear to prevent moisture buildup and mold.
   - Assignment: February
   - Type: weatherSpecific
   - Priority: low (task-level)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Inspect exterior caulking**

   - Description: Check caulk around windows, doors, and where siding meets trim for cracks or gaps. Scrape out old, damaged caulk and reapply with exterior-grade caulk on days above 40°F. Proper sealing prevents water intrusion and heat loss.
   - Assignment: February
   - Type: weatherSpecific
   - Priority: medium (task-level)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Check for frozen pipe prevention measures**

   - Description: Feel pipes in unheated areas (basement, crawl space, attic) for cold spots. Open cabinet doors under sinks to allow warm air circulation. Let faucets drip during extreme cold. Add pipe insulation where needed to prevent freezing and bursting.
   - Assignment: February
   - Type: weatherSpecific
   - Priority: high (task-level)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## March

### seasonal

1. **Begin spring cleaning preparation**

   - Description: Start deep cleaning as weather warms. Wash windows inside and out, vacuum air vents and baseboards, and clean behind appliances. Check smoke detectors and replace batteries. This is a good time to declutter and organize storage areas.
   - Assignment: March
   - Type: seasonal
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Schedule HVAC system transition maintenance**

   - Description: Contact an HVAC professional to service your air conditioning before warm weather. They will clean coils, check refrigerant levels, test the compressor, and ensure efficient operation. Schedule now before the busy season rush.
   - Assignment: March
   - Type: seasonal
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Inspect exterior for winter damage**

   - Description: Walk around your home looking for damaged siding, trim, or fascia boards. Check for peeling paint, cracks in stucco, or loose boards. Take photos of damage for insurance claims if needed. Schedule repairs before spring rains.
   - Assignment: March
   - Type: seasonal
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Check deck and patio for winter damage**

   - Description: Look for loose boards, popped nails, or cracked concrete. Test deck railings for stability - they should not wobble. Check for wood rot by probing with a screwdriver. Make repairs before using outdoor spaces this season.
   - Assignment: March
   - Type: seasonal
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Test outdoor water spigots**

   - Description: Turn on each outdoor faucet fully and check for leaks at the handle and where the pipe enters the house. If water drips inside or flow is weak, the pipe may have frozen and cracked - call a plumber immediately.
   - Assignment: March
   - Type: seasonal
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

6. **Test sump pump again before spring rains**

   - Description: Pour a bucket of water into the sump pit to ensure the pump activates and drains properly. Check that the discharge pipe is clear and draining away from your foundation. Clean the inlet screen if present. Test backup battery if equipped.
   - Assignment: March
   - Type: seasonal
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

7. **Test outdoor faucets for leaks once thawed**

   - Description: Turn on each outdoor faucet and let water run for a few minutes. Check for leaks at the handle, spout, and where the pipe enters the house. Feel inside the basement or crawl space near the faucet connection for moisture.
   - Assignment: March
   - Type: seasonal
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

8. **Inspect foundation for cracks or water entry points**

   - Description: Walk around your foundation looking for cracks wider than 1/4 inch, crumbling concrete, or water stains. Mark problem areas with chalk. Seal small cracks with concrete caulk. Call a structural engineer for large cracks or bowing walls.
   - Assignment: March
   - Type: seasonal
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

9. **Clean and test dryer vent and exhaust duct for airflow**

   - Description: Disconnect the dryer and remove lint from the vent hose and duct. Use a dryer vent brush or vacuum to clean the entire duct to the exterior. Ensure the outside vent flap opens freely. Poor airflow causes fires and inefficiency.
   - Assignment: March
   - Type: seasonal
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

10. **Check window screens for tears; repair before spring**

   - Description: Remove screens and inspect for holes, tears, or damaged frames. Small holes can be patched with screen repair kits. Replace torn screens or bent frames before you want to open windows for fresh air.
   - Assignment: March
   - Type: seasonal
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

11. **Clean washing machine drain filter**

   - Description: Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, and debris, then replace the filter and test for leaks.
   - Assignment: March
   - Type: seasonal
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Begin monitoring for spring flooding**

   - Description: Check basement and crawl spaces for water intrusion during spring thaw and rains. Ensure sump pump is working. Keep valuables off basement floors. If flooding occurs regularly, consider installing a French drain or improving grading around your foundation.
   - Assignment: March
   - Type: weatherSpecific
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check gutters and downspouts for winter damage**

   - Description: Look for bent, sagging, or separated gutter sections. Ensure downspouts are securely attached and extend at least 5 feet from the foundation. Clear any debris. Repair or replace damaged sections before spring rains cause water damage.
   - Assignment: March
   - Type: weatherSpecific
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Inspect driveway for frost heave damage**

   - Description: Look for new cracks, buckling, or sections that have lifted from freeze-thaw cycles. Small cracks can be filled with asphalt or concrete patch. Large damage may require professional resurfacing. Address before cracks expand.
   - Assignment: March
   - Type: weatherSpecific
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Remove any remaining ice dam protection**

   - Description: Once temperatures consistently stay above freezing, carefully remove roof heating cables or other ice dam prevention measures. Inspect for any damage caused during installation or by ice. Store cables properly for next winter.
   - Assignment: March
   - Type: weatherSpecific
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Check foundation for frost damage**

   - Description: Look for new cracks, spalling (flaking concrete), or shifts in foundation walls. Feel for air leaks from cracks. Small cracks can be sealed with concrete caulk. Call a structural engineer if you see large cracks or horizontal cracks.
   - Assignment: March
   - Type: weatherSpecific
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## April

### seasonal

1. **Deep clean interior after winter**

   - Description: Thoroughly clean your home from top to bottom. Wash walls and baseboards, shampoo carpets, clean behind appliances, and dust ceiling fans. Replace HVAC filters, clean window tracks, and organize closets. Open windows on nice days for fresh air circulation.
   - Assignment: April
   - Type: seasonal
   - Priority: medium (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Service air conditioning before summer**

   - Description: Have an HVAC professional inspect and service your AC system. They will clean coils, check refrigerant levels, test capacitors and contactors, and ensure optimal performance. Early service ensures your system is ready for hot weather and may prevent breakdowns.
   - Assignment: April
   - Type: seasonal
   - Priority: medium (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Clean and inspect gutters**

   - Description: Remove leaves, twigs, and debris from gutters and downspouts. Flush with a hose to check flow and look for leaks. Ensure downspouts direct water at least 5 feet from foundation. Repair sagging sections or loose brackets now.
   - Assignment: April
   - Type: seasonal
   - Priority: medium (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Check exterior paint and siding**

   - Description: Walk around your home looking for peeling or cracking paint, damaged siding, or wood rot. Scrape and repaint small areas. For extensive damage, plan for professional painting this season. Address wood rot immediately to prevent structural issues.
   - Assignment: April
   - Type: seasonal
   - Priority: medium (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Inspect roof shingles and flashing**

   - Description: From the ground with binoculars, look for missing, cracked, or curled shingles. Check flashing around chimneys, vents, and skylights for rust or gaps. Look for granules in gutters (sign of shingle wear). Call a roofer for any concerns.
   - Assignment: April
   - Type: seasonal
   - Priority: medium (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

6. **Test HVAC system (switch between heat and cooling modes)**

   - Description: Turn your thermostat to heat and ensure the furnace runs properly, then switch to cool and verify the AC starts and cools. Listen for unusual noises. If either mode doesn't work correctly, call an HVAC technician before you need it urgently.
   - Assignment: April
   - Type: seasonal
   - Priority: medium (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

7. **Schedule AC service/inspection before summer**

   - Description: Contact an HVAC company to service your air conditioner before peak cooling season. They will clean coils, check refrigerant, test electrical components, and replace filters. Scheduling early avoids the rush and ensures comfort when heat arrives.
   - Assignment: April
   - Type: seasonal
   - Priority: medium (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

8. **Test irrigation/sprinkler system for leaks and coverage**

   - Description: Turn on each irrigation zone and watch for broken or misaligned sprinkler heads, leaks, or dry spots. Adjust heads to avoid watering sidewalks. Replace damaged components. Proper watering saves water and keeps your lawn healthy.
   - Assignment: April
   - Type: seasonal
   - Priority: medium (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

9. **Inspect deck, porch, and railings for rot or loose boards**

   - Description: Walk your deck testing each board for soft spots (wood rot) using a screwdriver. Shake railings to check for stability. Look for popped nails or loose screws. Replace rotten boards and tighten fasteners before someone gets hurt.
   - Assignment: April
   - Type: seasonal
   - Priority: medium (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

10. **Check garage door auto-reverse safety feature**

   - Description: Place a 2x4 board on the ground in the door's path and close it. The door should reverse when it touches the board. Also wave a broom under the closing door - it should reverse immediately. If not, adjust the sensors or call a technician.
   - Assignment: April
   - Type: seasonal
   - Priority: medium (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

11. **Test safety lighting (motion sensor and exterior lights)**

   - Description: Walk around your home at dusk to ensure all exterior lights turn on. Test motion sensors by walking in their detection zone. Replace burnt bulbs and clean sensor lenses. Good lighting deters intruders and prevents trips and falls.
   - Assignment: April
   - Type: seasonal
   - Priority: medium (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Check for spring flooding in basement**

   - Description: Inspect basement for water stains, dampness, or standing water during spring rains. Ensure sump pump is working. Check for cracks in foundation walls. If flooding occurs, improve exterior grading or install interior drainage systems. Call a waterproofing specialist if needed.
   - Assignment: April
   - Type: weatherSpecific
   - Priority: medium (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Inspect and clean storm drains**

   - Description: Remove leaves and debris from storm drains near your property. Ensure water flows freely into drains during rain. Clogged drains can cause street flooding that may enter your basement or garage. Report city-owned drains to your municipality.
   - Assignment: April
   - Type: weatherSpecific
   - Priority: medium (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Check grading around foundation**

   - Description: Walk around your foundation during or after rain. Ground should slope away from your house (6 inches drop over 10 feet). Look for pooling water or erosion. Add soil to low spots and ensure water flows away from foundation to prevent basement leaks.
   - Assignment: April
   - Type: weatherSpecific
   - Priority: medium (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Monitor for pest activity as weather warms**

   - Description: Look for signs of ants, termites, or rodents entering your home as temperatures warm. Check for gaps around pipes, vents, and foundations. Seal openings with steel wool or caulk. If you see active infestations, contact a pest control professional.
   - Assignment: April
   - Type: weatherSpecific
   - Priority: medium (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Inspect outdoor furniture and equipment**

   - Description: Clean and inspect patio furniture, grills, and outdoor equipment stored over winter. Look for rust, rot, or damage. Replace damaged furniture cushions. Service lawn mowers and check garden hoses for leaks. Store or cover items not yet in use.
   - Assignment: April
   - Type: weatherSpecific
   - Priority: medium (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## May

### seasonal

1. **Complete spring lawn care**

   - Description: Fertilize your lawn with appropriate spring formula. Aerate compacted areas and overseed thin spots. Begin regular mowing at proper height (2.5-3 inches for most grasses). Edge borders and mulch garden beds. Water deeply but infrequently to encourage deep roots.
   - Assignment: May
   - Type: seasonal
   - Priority: medium (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Clean and maintain outdoor equipment**

   - Description: Service your lawn mower (change oil, replace spark plug, sharpen blade). Clean and oil garden tools. Check hoses for cracks and replace worn washers. Inspect outdoor power equipment and make repairs now before peak use season.
   - Assignment: May
   - Type: seasonal
   - Priority: medium (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Inspect and clean deck/patio**

   - Description: Sweep and wash your deck or patio with appropriate cleaner. Check for loose boards, nails, or rotted wood. Apply deck stain or sealer if needed. Clean and arrange outdoor furniture. Ensure railings are secure and stairs are stable.
   - Assignment: May
   - Type: seasonal
   - Priority: medium (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Check screens on windows and doors**

   - Description: Inspect all window and door screens for tears, holes, or bent frames. Repair small holes with screen patch kits or replace damaged screens. Clean screens with soap and water. Ensure screens fit tightly to keep insects out.
   - Assignment: May
   - Type: seasonal
   - Priority: medium (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Service lawn mower and garden tools**

   - Description: Change mower oil, replace spark plug and air filter, and sharpen the blade for clean cuts. Clean debris from mower deck. Sharpen pruning shears and spade edges. Oil moving parts on tools. Check string trimmer line and fuel lines.
   - Assignment: May
   - Type: seasonal
   - Priority: medium (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

6. **Test outdoor GFCI outlets with a tester**

   - Description: Plug a GFCI outlet tester or lamp into each outdoor outlet. Press the "test" button - power should cut off immediately. Press "reset" to restore power. If outlets don't trip or won't reset, call an electrician - this is a serious safety issue.
   - Assignment: May
   - Type: seasonal
   - Priority: medium (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

7. **Inspect and clean gutters and downspouts after spring pollen/debris**

   - Description: Remove accumulated pollen, seeds, and spring debris from gutters. Flush with a hose to ensure proper flow. Check that downspouts drain freely and extend at least 5 feet from foundation. Clean or install gutter guards to reduce future maintenance.
   - Assignment: May
   - Type: seasonal
   - Priority: medium (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

8. **Check lawn equipment (mower blades, fuel lines, spark plugs)**

   - Description: Remove mower blade and sharpen or replace if nicked or dull. Check fuel lines for cracks or leaks. Replace spark plug if dark or worn. Clean or replace air filter. These simple tasks prevent breakdowns and improve performance.
   - Assignment: May
   - Type: seasonal
   - Priority: medium (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

9. **Inspect fences and gates for stability**

   - Description: Push on fence posts to check for wobble or rot. Look for loose boards, rusted hardware, or leaning sections. Test gate latches and hinges. Tighten screws, replace rotten posts, and repaint or stain weathered wood to maintain property security and appearance.
   - Assignment: May
   - Type: seasonal
   - Priority: medium (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

10. **Test window locks and lubricate if needed**

   - Description: Check that all window locks engage properly and hold windows securely closed. Lubricate sticky locks with graphite powder or silicone spray (not oil, which attracts dirt). Tighten loose screws. Working locks improve security and energy efficiency.
   - Assignment: May
   - Type: seasonal
   - Priority: medium (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

11. **Check exterior caulking (windows, doors, siding, trim)**

   - Description: Inspect caulk around all windows, doors, and where different materials meet. Look for cracks, gaps, or missing caulk. Scrape out old damaged caulk and reapply with exterior-grade silicone or acrylic caulk. Proper sealing prevents water damage and pest entry.
   - Assignment: May
   - Type: seasonal
   - Priority: medium (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

12. **Clean washing machine drain filter**

   - Description: Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, and debris, then replace the filter and test for leaks.
   - Assignment: May
   - Type: seasonal
   - Priority: medium (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Check air conditioning system before summer heat**

   - Description: Turn on your AC and ensure it cools properly. Listen for unusual noises or clicking. Check that air flows from all vents. Replace the air filter. If the system struggles or doesn't cool, call an HVAC technician now before heat waves arrive.
   - Assignment: May
   - Type: weatherSpecific
   - Priority: medium (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Inspect for pest entry points**

   - Description: Walk around your home looking for gaps around pipes, vents, windows, and where utilities enter. Seal openings larger than 1/4 inch with caulk, steel wool, or spray foam. Check for signs of ant trails or mouse droppings and address immediately.
   - Assignment: May
   - Type: weatherSpecific
   - Priority: medium (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Clean outdoor HVAC unit**

   - Description: Turn off power to the AC unit. Remove debris, leaves, and grass clippings from around the unit. Gently spray the fins with a hose from inside out (low pressure only). Trim vegetation to allow 2 feet of clearance on all sides for proper airflow.
   - Assignment: May
   - Type: weatherSpecific
   - Priority: medium (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Check irrigation system if applicable**

   - Description: Run each zone of your sprinkler system and look for broken heads, leaks, or poor coverage. Adjust spray patterns to avoid watering pavement. Check the controller settings for your climate. Fix leaks to conserve water and prevent foundation issues.
   - Assignment: May
   - Type: weatherSpecific
   - Priority: medium (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Inspect exterior wood for moisture damage**

   - Description: Check deck boards, siding, window trim, and door frames for soft spots indicating rot. Probe suspected areas with a screwdriver - soft wood needs replacement. Look for peeling paint which allows moisture penetration. Paint or seal exposed wood immediately.
   - Assignment: May
   - Type: weatherSpecific
   - Priority: medium (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## June

### seasonal

1. **Monitor air conditioning efficiency**

   - Description: Check that your AC cools your home adequately. Replace filters monthly during heavy use. Listen for unusual noises or frequent cycling. Monitor your energy bills for unexpected increases. If performance drops, schedule service before a heatwave hits.
   - Assignment: June
   - Type: seasonal
   - Priority: medium (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Replace filters monthly during heavy use.

2. **Inspect and maintain outdoor spaces**

   - Description: Maintain lawn with regular mowing and watering. Weed garden beds and add fresh mulch. Deadhead flowers to encourage blooming. Clean and seal deck or patio if needed. Check outdoor lighting and replace bulbs. Enjoy your outdoor living areas.
   - Assignment: June
   - Type: seasonal
   - Priority: medium (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Check attic ventilation for summer heat**

   - Description: On a hot day, check your attic temperature - it shouldn't exceed 20°F above outdoor temp. Ensure soffit and ridge vents are clear. Check that attic fans work properly. Good ventilation prevents roof damage and reduces cooling costs.
   - Assignment: June
   - Type: seasonal
   - Priority: medium (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Clean and inspect swimming pool if applicable**

   - Description: Test and balance pool water chemistry (pH 7.2-7.8, chlorine 1-3 ppm). Clean filters and skim debris daily. Check pool equipment for leaks or unusual noises. Inspect safety equipment like pool covers and fencing. Consider professional service for major issues.
   - Assignment: June
   - Type: seasonal
   - Priority: medium (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Clean filters and skim debris daily.

5. **Maintain landscaping and irrigation**

   - Description: Water deeply but less frequently to encourage deep roots. Adjust sprinkler heads for optimal coverage. Mulch plants to retain moisture. Prune dead branches and shape shrubs. Check for pest or disease issues and treat promptly. Fertilize as appropriate for plant types.
   - Assignment: June
   - Type: seasonal
   - Priority: medium (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

6. **Flush water heater**

   - Description: Turn off power/gas and water supply. Attach a hose to the drain valve and run water into a bucket or drain until clear (removing sediment). Close valve, restore water and power. This extends heater life and improves efficiency. Do annually.
   - Assignment: June
   - Type: seasonal
   - Priority: medium (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Do annually.

7. **Inspect attic ventilation fans and confirm proper airflow**

   - Description: Turn on attic fans and ensure they run smoothly without rattling. Check that vents and louvers open fully. Feel for airflow at vents. Clean any dust from fan blades. Proper ventilation prevents heat buildup that damages shingles and increases cooling costs.
   - Assignment: June
   - Type: seasonal
   - Priority: medium (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

8. **Test ceiling fans for wobble/balance**

   - Description: Run each ceiling fan on high speed and watch for excessive wobbling. Tighten mounting screws and blade brackets. Use a balancing kit if needed (attach weights to blades). Clean blades to prevent dust buildup. Reverse direction seasonally - counterclockwise for summer.
   - Assignment: June
   - Type: seasonal
   - Priority: medium (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Reverse direction seasonally - counterclockwise for summer.

9. **Inspect plumbing under sinks for leaks**

   - Description: Open cabinets under kitchen and bathroom sinks. Feel pipes and connections for moisture. Look for water stains, rust, or mineral deposits. Run water and watch for drips. Tighten loose connections or replace worn washers. Call a plumber for persistent leaks.
   - Assignment: June
   - Type: seasonal
   - Priority: medium (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

10. **Test outdoor water pressure and hoses for leaks**

   - Description: Turn on outdoor faucets fully and note water pressure. Check hoses for cracks, bulges, or leaks at connections. Replace worn washers in hose ends. Consider upgrading old rubber hoses to durable reinforced hoses. Good water pressure indicates healthy plumbing.
   - Assignment: June
   - Type: seasonal
   - Priority: medium (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

11. **Check pest control barriers and look for termite activity**

   - Description: Inspect foundation for mud tubes (termite highways). Look for discarded wings near windows. Check wood for hollow sounds when tapped. Keep mulch 6 inches from siding. If you see signs of termites, call a pest control professional immediately for treatment.
   - Assignment: June
   - Type: seasonal
   - Priority: medium (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

12. **Inspect grout and caulking in showers, tubs, and sinks**

   - Description: Check tile grout for cracks or missing sections. Inspect caulk around tubs, showers, and sinks for gaps or mold. Remove old caulk and reapply with mildew-resistant silicone caulk. Seal grout if porous. This prevents water damage behind walls.
   - Assignment: June
   - Type: seasonal
   - Priority: medium (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Ensure adequate cooling system capacity**

   - Description: Verify your AC keeps your home comfortable during hot days. If rooms stay warm or the system runs constantly, it may be undersized or need service. Check that registers are open and unobstructed. Consider a professional load calculation if issues persist.
   - Assignment: June
   - Type: weatherSpecific
   - Priority: medium (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check humidity levels and dehumidifier**

   - Description: Use a hygrometer to measure indoor humidity - ideal is 30-50%. High humidity causes mold and discomfort. Run dehumidifiers in damp basements. Ensure bathroom and kitchen exhaust fans vent outside. Consider a whole-house dehumidifier if problems persist.
   - Assignment: June
   - Type: weatherSpecific
   - Priority: medium (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Inspect for summer storm damage preparation**

   - Description: Trim dead tree branches that could fall on your home. Secure loose outdoor items. Check that gutters and downspouts are clear. Test sump pump. Have a generator or backup plan for power outages. Keep emergency supplies stocked.
   - Assignment: June
   - Type: weatherSpecific
   - Priority: medium (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Monitor energy efficiency of cooling system**

   - Description: Compare current electric bills to previous summers. Replace AC filters monthly. Ensure windows and doors seal tightly. Use programmable thermostat to reduce cooling when away. Close blinds during peak sun. Clean AC coils for better efficiency. Consider attic insulation improvements.
   - Assignment: June
   - Type: weatherSpecific
   - Priority: medium (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Replace AC filters monthly.

5. **Check outdoor electrical connections**

   - Description: Inspect outdoor outlets, light fixtures, and extension cords for damage, corrosion, or loose connections. Ensure GFCI outlets work properly. Keep electrical connections dry and protected from weather. Never use damaged cords outdoors. Call an electrician for any safety concerns.
   - Assignment: June
   - Type: weatherSpecific
   - Priority: medium (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## July

### seasonal

1. **Peak air conditioning maintenance**

   - Description: Replace AC filters monthly during peak use. Check outdoor unit for debris and clear vegetation. Listen for unusual noises indicating worn components. Ensure all vents are open and unobstructed. If system struggles to cool, call for service before equipment fails.
   - Assignment: July
   - Type: seasonal
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Replace AC filters monthly during peak use.

2. **Monitor energy usage and efficiency**

   - Description: Compare current utility bills to previous years. Unexpectedly high bills suggest inefficient appliances or air leaks. Use programmable thermostat to reduce cooling when away. Close blinds during hottest hours. Consider energy audit if costs seem excessive.
   - Assignment: July
   - Type: seasonal
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Maintain outdoor living spaces**

   - Description: Sweep and clean decks and patios regularly. Water plants and lawn as needed. Check outdoor furniture for wear or damage. Keep pool clean and balanced if applicable. Enjoy outdoor activities while maintaining your investment.
   - Assignment: July
   - Type: seasonal
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Check and clean outdoor equipment**

   - Description: Clean lawn mower after each use to prevent grass buildup. Check oil levels and sharpen blades mid-season. Clean and store garden tools properly. Maintain grills by cleaning grates and checking propane connections for leaks using soapy water.
   - Assignment: July
   - Type: seasonal
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Clean lawn mower after each use to prevent grass buildup.

5. **Inspect deck and outdoor structures**

   - Description: Check deck boards and railings for new cracks, splinters, or loose fasteners. Look for signs of wood rot or insect damage. Tighten any loose screws or bolts. Consider applying fresh sealant or stain if wood looks weathered.
   - Assignment: July
   - Type: seasonal
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

6. **Test home security system and update codes if needed**

   - Description: Test all door and window sensors by triggering them. Replace low batteries in wireless sensors. Update access codes if you've had contractors or guests with codes. Ensure monitoring service contact info is current. Check camera views and recording function.
   - Assignment: July
   - Type: seasonal
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

7. **Inspect driveway and walkways for cracks**

   - Description: Fill small cracks in asphalt or concrete before they expand. Use appropriate crack filler for your surface type. Seal asphalt driveways every 2-3 years. Replace broken or heaving concrete sections to prevent trip hazards and further damage.
   - Assignment: July
   - Type: seasonal
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Seal asphalt driveways every 2-3 years.

8. **Test outdoor drainage after heavy rain**

   - Description: During or after heavy rain, check that water flows away from your foundation. Look for pooling near the house. Ensure downspouts extend at least 5 feet from foundation. Clear any clogged drains. Poor drainage causes basement leaks and foundation damage.
   - Assignment: July
   - Type: seasonal
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

9. **Check refrigerator door seals (paper test)**

   - Description: Close a dollar bill in the refrigerator door. If you can pull it out easily, the seal is worn and cold air is escaping. Check the entire seal perimeter. Clean seals with soap and water or replace if cracked. Proper seals save energy and keep food safe.
   - Assignment: July
   - Type: seasonal
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

10. **Inspect pool equipment (if applicable) for safety and leaks**

   - Description: Check pool pump, filter, and heater for leaks or unusual noises. Test GFCI protection on pool electrical connections. Ensure pool covers and safety fencing are secure. Check pool lights for cracks. Call a pool professional for electrical or major equipment issues.
   - Assignment: July
   - Type: seasonal
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

11. **Test garage door keypad and remotes**

   - Description: Test each garage door opener remote and keypad code. Replace batteries in remotes showing weak signals. Update keypad codes if needed for security. Ensure opener responds consistently. Program new remotes according to manufacturer instructions.
   - Assignment: July
   - Type: seasonal
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

12. **Clean washing machine drain filter**

   - Description: Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, and debris, then replace the filter and test for leaks.
   - Assignment: July
   - Type: seasonal
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Monitor air conditioning filters frequently**

   - Description: Check and replace AC filters monthly during peak cooling season. Dirty filters reduce efficiency and air quality significantly. Hold filter to light - if you can't see through it, replace it. Consider upgrading to better quality filters for improved air quality.
   - Assignment: July
   - Type: weatherSpecific
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Check and replace AC filters monthly during peak cooling season.

2. **Check for proper attic ventilation**

   - Description: On a hot day, check attic temperature - it should be within 20°F of outdoor temperature. Ensure soffit and ridge vents are not blocked. Check that powered attic fans are working. Inadequate ventilation damages shingles and increases cooling costs dramatically.
   - Assignment: July
   - Type: weatherSpecific
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Ensure adequate cooling system capacity**

   - Description: Verify AC keeps all rooms comfortable during peak heat. If some rooms stay warm or system runs constantly without adequate cooling, it may be undersized or failing. Check all vents are open. Call HVAC professional if performance is inadequate.
   - Assignment: July
   - Type: weatherSpecific
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Monitor for summer storm damage**

   - Description: After storms, inspect for roof damage, fallen branches, or flooding. Check gutters for clogs from debris. Look for water intrusion in basement. Trim overhanging tree branches before they fall. Document storm damage with photos for insurance claims if needed.
   - Assignment: July
   - Type: weatherSpecific
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Check outdoor water systems**

   - Description: Monitor sprinkler system for broken heads or leaks. Adjust watering schedule based on rainfall. Check outdoor faucets and hoses for leaks. Ensure hose bibs shut off completely. Fix leaks promptly to conserve water and prevent foundation issues from excessive moisture.
   - Assignment: July
   - Type: weatherSpecific
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## August

### seasonal

1. **Continue peak cooling system maintenance**

   - Description: Replace AC filters monthly and keep outdoor unit clear of debris. Monitor system performance during peak heat. Listen for unusual sounds indicating wear. Schedule service if cooling seems inadequate before fall when HVAC companies get busy with heating system calls.
   - Assignment: August
   - Type: seasonal
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Replace AC filters monthly and keep outdoor unit clear of debris.

2. **Prepare for fall transition**

   - Description: Order heating system fuel if needed (oil, propane). Schedule heating system inspection for September. Check fireplace chimney and stock firewood. Begin planning fall cleanup projects. Purchase furnace filters to have on hand when you switch from cooling to heating.
   - Assignment: August
   - Type: seasonal
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Check exterior painting needs**

   - Description: Inspect paint on siding, trim, doors, and windows for peeling or fading. Late summer/early fall is ideal for exterior painting. Get quotes now if major painting is needed. Touch up small areas yourself with matching paint. Proper paint protects wood from moisture damage.
   - Assignment: August
   - Type: seasonal
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Maintain outdoor equipment and furniture**

   - Description: Clean and inspect lawn mowers and garden tools. Touch up rust spots on metal furniture. Check cushions for mildew and clean as needed. Repair or replace damaged items before storing for winter. Proper maintenance extends equipment life significantly.
   - Assignment: August
   - Type: seasonal
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Monitor lawn and garden irrigation**

   - Description: Adjust watering based on rainfall and temperature. Check for dry spots indicating sprinkler issues. Reduce watering as temperatures cool. Ensure you're not overwatering, which wastes water and promotes fungus. Prepare to winterize irrigation system in coming months.
   - Assignment: August
   - Type: seasonal
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

6. **Inspect roof shingles for summer storm damage**

   - Description: Using binoculars from the ground, look for missing, cracked, or curled shingles after summer storms. Check flashing around chimneys and vents. Look for granules accumulating in gutters (indicates shingle wear). Schedule roofing repairs before winter weather arrives.
   - Assignment: August
   - Type: seasonal
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

7. **Test HVAC performance (is the AC cooling properly?)**

   - Description: Verify your AC maintains comfortable temperatures during peak heat. Check that cold air flows from all vents. Listen for unusual noises or frequent cycling. If performance seems reduced, call for service - a small issue now prevents costly emergency repairs.
   - Assignment: August
   - Type: seasonal
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

8. **Test water pressure regulator (should be ~40–60 psi)**

   - Description: Install a pressure gauge on an outdoor faucet and turn on the water. Pressure should read 40-60 psi. Too high damages pipes and appliances; too low indicates supply problems. If outside this range, call a plumber to adjust the regulator or investigate issues.
   - Assignment: August
   - Type: seasonal
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

9. **Inspect chimney exterior for cracks or leaning**

   - Description: From the ground, look at your chimney for cracks in masonry, missing mortar, or any lean. Check that the chimney cap is secure and intact. Binoculars help see detail. Call a chimney professional for any damage - chimney issues create fire hazards and carbon monoxide risks.
   - Assignment: August
   - Type: seasonal
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

10. **Check septic system filter/inspection port (if applicable)**

   - Description: Locate your septic tank inspection port (usually a green or black lid in the yard). Check the filter for buildup and rinse if needed. Look for sewage odors or soggy areas in the drain field. Have tank pumped every 3-5 years or as recommended by professional.
   - Assignment: August
   - Type: seasonal
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Have tank pumped every 3-5 years or as recommended by professional.

11. **Flush garbage disposal with ice and vinegar to clean blades**

   - Description: Pour 2 cups of ice cubes into the disposal and grind with cold water running. Then pour 1 cup of vinegar and let sit for a few minutes. Run with cold water to flush. This cleans blades, removes odors, and helps prevent clogs. Do monthly.
   - Assignment: August
   - Type: seasonal
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Do monthly.

### weatherSpecific

1. **Check cooling system efficiency during peak heat**

   - Description: During the hottest days, monitor how well your AC keeps up. If it runs constantly without maintaining comfort, filters may be dirty or system needs service. Check that outdoor unit isn't blocked. Consider shade for outdoor unit to improve efficiency.
   - Assignment: August
   - Type: weatherSpecific
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Monitor humidity control systems**

   - Description: Use a hygrometer to check indoor humidity (ideal 30-50%). High humidity makes heat feel worse and promotes mold. Ensure AC is removing moisture properly. Run dehumidifiers in basement if needed. Check that bathroom and kitchen fans vent outside, not into attic.
   - Assignment: August
   - Type: weatherSpecific
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Inspect for heat-related expansion damage**

   - Description: Check for new cracks in drywall, sticking doors or windows from wood expansion. Look for gaps that opened in exterior caulking. Most minor expansion is normal and will reverse with cooler weather, but document any significant structural movement for professional evaluation.
   - Assignment: August
   - Type: weatherSpecific
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Check outdoor electrical systems**

   - Description: Inspect outdoor outlets, lights, and any landscape lighting for corrosion or damage from summer weather. Ensure GFCI outlets still trip when tested. Check for frayed wires or loose connections. Summer storms can damage outdoor electrical, creating hazards that need immediate professional attention.
   - Assignment: August
   - Type: weatherSpecific
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Prepare for potential severe summer weather**

   - Description: Have emergency supplies ready including flashlights, batteries, water, and non-perishable food. Trim dead tree branches before they fall. Secure outdoor furniture and decorations. Test sump pump and have generator ready if you own one. Know your area's severe weather shelter location.
   - Assignment: August
   - Type: weatherSpecific
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## September

### seasonal

1. **Begin fall preparation tasks**

   - Description: Create a list of outdoor maintenance to complete before cold weather. Check gutters, roof, weatherstripping. Test heating system. Stock up on supplies like furnace filters and ice melt. Schedule professional services now before contractors get busy with emergency heating calls.
   - Assignment: September
   - Type: seasonal
   - Priority: medium (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Schedule heating system service**

   - Description: Contact an HVAC professional to inspect and service your furnace or boiler. They will check safety controls, heat exchanger, burners, and efficiency. Early service ensures your system is safe and ready when you need heat, and prevents emergency breakdowns during cold snaps.
   - Assignment: September
   - Type: seasonal
   - Priority: medium (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Clean and inspect gutters before autumn**

   - Description: Remove debris from gutters and downspouts before leaves fall. Flush with a hose to check for clogs and leaks. Tighten loose brackets. Ensure downspouts extend 5 feet from foundation. Consider gutter guards to reduce fall leaf maintenance. Clean gutters prevent ice dams.
   - Assignment: September
   - Type: seasonal
   - Priority: medium (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Check weatherstripping and caulking**

   - Description: Inspect weatherstripping around all doors and windows for gaps, cracks, or compression. Replace worn sections. Check exterior caulk around windows, doors, and penetrations for cracks. Reapply as needed. Good sealing reduces heating costs and prevents drafts and ice dams.
   - Assignment: September
   - Type: seasonal
   - Priority: medium (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Prepare outdoor equipment for storage**

   - Description: Drain gas from lawn mower and trimmer or add fuel stabilizer. Clean equipment thoroughly. Sharpen blades and make repairs. Drain garden hoses and store indoors. Clean and oil garden tools. Proper winterization prevents damage and ensures equipment is ready for spring.
   - Assignment: September
   - Type: seasonal
   - Priority: medium (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

6. **Test smoke and carbon monoxide detectors**

   - Description: Press the test button on all smoke and CO detectors to verify they work. Replace batteries (or do it on Daylight Saving Time change). Clean dust from sensors with a vacuum. Replace smoke detectors older than 10 years and CO detectors older than 7 years. Install detectors on every level and near bedrooms. These devices save lives.
   - Assignment: September
   - Type: seasonal
   - Priority: high (task-level)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

7. **Test thermostat programming**

   - Description: Verify your programmable thermostat switches between heating and cooling correctly. Update the schedule for fall (more heating in morning and evening). Replace thermostat batteries if applicable. Consider upgrading to a smart thermostat to reduce energy costs with better control.
   - Assignment: September
   - Type: seasonal
   - Priority: medium (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

8. **Inspect weatherstripping and door seals before cold weather**

   - Description: Check all exterior door sweeps and weatherstripping for wear or gaps. Close door on a piece of paper - you should feel resistance when pulling it out. Replace worn weatherstripping. Install or adjust door sweeps to eliminate gaps that waste energy and let in pests.
   - Assignment: September
   - Type: seasonal
   - Priority: medium (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

9. **Check attic for pests (rodents often enter in fall)**

   - Description: Look for droppings, nesting materials, or chewed items in your attic. Listen for scratching sounds at night. Check for entry points like gaps around vents, pipes, or eaves. Seal openings with steel wool and caulk. Set traps or call pest control for active infestations.
   - Assignment: September
   - Type: seasonal
   - Priority: medium (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

10. **Test outdoor handrails and steps for safety**

   - Description: Shake handrails firmly to check for wobble or loose mounting. Tighten any loose screws or bolts. Check stairs for rot, cracks, or loose treads. Repair or replace damaged components before ice and snow make stairs treacherous. Secure railings prevent falls and injuries.
   - Assignment: September
   - Type: seasonal
   - Priority: medium (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

11. **Clean washing machine drain filter**

   - Description: Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, and debris, then replace the filter and test for leaks.
   - Assignment: September
   - Type: seasonal
   - Priority: medium (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Transition HVAC from cooling to heating mode**

   - Description: Switch thermostat from cool to heat and test that heating system starts. Replace filters before heating season. Close AC circuit breaker for winter (if recommended by manufacturer). Cover outdoor AC unit loosely to protect from debris but allow air circulation. Check registers are open.
   - Assignment: September
   - Type: weatherSpecific
   - Priority: medium (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check insulation before cold weather**

   - Description: Inspect attic insulation depth - minimum 10-14 inches in cold climates. Look for compressed or missing areas. Check for gaps around recessed lights, pipes, or wiring. Add insulation if needed. Ensure attic vents remain clear. Good insulation significantly reduces heating costs.
   - Assignment: September
   - Type: weatherSpecific
   - Priority: medium (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Inspect roof for summer damage**

   - Description: Look for missing, cracked, or curled shingles from summer storms. Check flashing around chimneys and vents. Look for granule loss in gutters. Schedule repairs before winter snow and ice cause leaks. A damaged roof can lead to expensive interior water damage during winter.
   - Assignment: September
   - Type: weatherSpecific
   - Priority: medium (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Begin winterizing outdoor water systems**

   - Description: Start early winterization as temperatures begin to drop. Drain and store garden hoses indoors. Locate interior shut-off valves for outdoor faucets. If freezing weather is forecast, shut off these valves, open outdoor faucets to drain, and consider installing freeze-proof faucet covers. For sprinkler systems, schedule professional winterization or prepare to drain system yourself. Remove window AC units or cover permanently installed units. Store or cover outdoor furniture.
   - Assignment: September
   - Type: weatherSpecific
   - Priority: medium (task-level)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Check foundation and basement for moisture**

   - Description: Look for water stains, efflorescence (white powder), or dampness on foundation walls. Check for cracks or gaps. Ensure ground slopes away from foundation. Clean window wells and ensure covers fit properly. Address moisture issues before they freeze and expand in winter, causing major damage.
   - Assignment: September
   - Type: weatherSpecific
   - Priority: medium (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## October

### seasonal

1. **Complete fall cleanup and preparation**

   - Description: Rake leaves and remove from gutters. Trim dead branches. Aerate and overseed lawn. Mulch garden beds. Store or cover outdoor furniture. Check all exterior maintenance before winter locks you out of outdoor work.
   - Assignment: October
   - Type: seasonal
   - Priority: high (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Service heating system for winter**

   - Description: Have HVAC professional inspect furnace or boiler before heating season. They will check safety controls, burners, heat exchanger, and carbon monoxide levels. Replace furnace filter. This prevents dangerous malfunctions and ensures efficient operation all winter.
   - Assignment: October
   - Type: seasonal
   - Priority: high (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Clean gutters and install leaf guards**

   - Description: After leaves fall, thoroughly clean gutters and downspouts. Remove all debris and flush with hose. Check for leaks and secure loose sections. Consider installing gutter guards to reduce future maintenance. Clean gutters prevent ice dams and water damage.
   - Assignment: October
   - Type: seasonal
   - Priority: high (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Winterize outdoor water systems (hoses, sprinklers, faucets)**

   - Description: Complete all outdoor water winterization to prevent costly freeze damage. Shut off interior valves to outdoor faucets (usually in basement or crawl space). Open outdoor faucets and leave open all winter to drain completely. Remove, drain, and store all garden hoses indoors. Drain and winterize sprinkler/irrigation system (blow out with compressed air or hire professional). Install insulated faucet covers for added protection. This critical winterization prevents burst pipes that cause thousands in water damage.
   - Assignment: October
   - Type: seasonal
   - Priority: high (task-level)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Check and seal exterior gaps**

   - Description: Inspect foundation, siding, and around all penetrations (pipes, wires, vents) for gaps. Seal cracks and openings with appropriate caulk or spray foam. Check door thresholds and weatherstripping. Prevents pest entry, heat loss, and moisture intrusion.
   - Assignment: October
   - Type: seasonal
   - Priority: high (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

6. **Test outdoor lighting (especially pathway and security lights)**

   - Description: Walk your property at dusk to check all outdoor lights. Replace burnt bulbs. Clean fixtures and motion sensor lenses. Adjust sensor angles if needed. Good lighting prevents accidents on dark winter paths and deters crime. Consider LED bulbs for winter durability.
   - Assignment: October
   - Type: seasonal
   - Priority: high (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

7. **Test emergency generator if you have one**

   - Description: Run generator monthly with a load for 15-30 minutes. Check oil level and change as recommended. Test automatic transfer switch if equipped. Keep extra gas, oil, and filters on hand. Ensure generator is outside and at least 20 feet from your home to prevent carbon monoxide poisoning.
   - Assignment: October
   - Type: seasonal
   - Priority: high (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Run generator monthly with a load for 15-30 minutes.

8. **Inspect fireplace and chimney flue; schedule cleaning if needed**

   - Description: Look inside fireplace for creosote buildup (shiny black residue). Check damper operation. Look for cracks in firebox. Have chimney professionally swept if used regularly (1+ cord of wood per year). Creosote causes dangerous chimney fires.
   - Assignment: October
   - Type: seasonal
   - Priority: high (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Have chimney professionally swept if used regularly (1+ cord of wood per year).

9. **Test smoke and carbon monoxide detectors**

   - Description: Press test button on all smoke and CO detectors to verify they work. Replace batteries (or do it on Daylight Saving Time change in November). Clean dust from sensors with a vacuum. Replace smoke detectors older than 10 years and CO detectors older than 7 years. Install detectors on every level, near bedrooms, and near fuel-burning appliances. These devices save lives.
   - Assignment: October
   - Type: seasonal
   - Priority: high (task-level)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

10. **Check insulation around pipes to prevent winter freezing**

   - Description: Inspect pipe insulation in unheated areas (basement, crawl space, attic). Look for gaps, compressed, or missing sections. Add foam pipe insulation to exposed pipes, especially those on exterior walls. Pay special attention to pipes in unheated garages.
   - Assignment: October
   - Type: seasonal
   - Priority: high (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

11. **Test ground drainage with garden hose**

   - Description: Run water near your foundation and watch where it flows. Water should drain away from house, not pool near foundation. Fix low spots by adding soil to slope away from house (6 inch drop over 10 feet). Good drainage prevents basement flooding and foundation damage.
   - Assignment: October
   - Type: seasonal
   - Priority: high (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Insulate pipes in unheated areas**

   - Description: Wrap exposed pipes in basements, crawl spaces, attics, and garages with foam pipe insulation. Pay attention to pipes on exterior walls. Open cabinet doors during extreme cold. Let faucets drip when temperatures drop below 20°F. Burst pipes cause massive damage.
   - Assignment: October
   - Type: weatherSpecific
   - Priority: high (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check storm windows and doors**

   - Description: Install storm windows if removable. Check for broken glass or damaged frames. Ensure they seal tightly. Replace worn weatherstripping. Lock all windows for tightest seal. Storm windows significantly reduce heat loss and prevent drafts in older homes.
   - Assignment: October
   - Type: weatherSpecific
   - Priority: high (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Inspect chimney and fireplace for winter use**

   - Description: Ensure damper opens and closes properly. Check for debris or animal nests in chimney. Have professional inspection and cleaning if used regularly. Stock up on firewood and store off ground, covered but with air circulation. Never burn treated wood or trash.
   - Assignment: October
   - Type: weatherSpecific
   - Priority: high (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Check outdoor equipment winterization**

   - Description: Store gas lawn equipment with empty tank or fuel stabilizer added. Clean equipment thoroughly. Change oil in mower. Drain and store all hoses. Cover AC unit loosely. Bring in anything that could be damaged by freezing temperatures.
   - Assignment: October
   - Type: weatherSpecific
   - Priority: high (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## November

### seasonal

1. **Complete winter preparation**

   - Description: Finish all outdoor winterization tasks before harsh weather arrives. Confirm heating system is serviced, outdoor water is winterized, gutters are clean, and windows are sealed. Stock emergency supplies (flashlights, batteries, water, non-perishable food). Check home insurance coverage.
   - Assignment: November
   - Type: seasonal
   - Priority: high (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Test and monitor heating system performance**

   - Description: Run heating system for several hours to ensure it maintains comfortable temperature. Listen for unusual noises and check that all rooms heat evenly. Replace filters monthly during heating season. Verify thermostat accuracy with a separate thermometer. Monitor for cold spots or excessive cycling. Schedule immediate service if any issues arise before winter cold intensifies.
   - Assignment: November
   - Type: seasonal
   - Priority: high (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Replace filters monthly during heating season.

3. **Final exterior maintenance before cold**

   - Description: Complete any outdoor painting or repairs before freezing temperatures. Check that all winterization is complete (hoses stored, faucets drained). Secure loose siding or trim. Apply deicer to steps. Once ground freezes, exterior work becomes difficult or impossible.
   - Assignment: November
   - Type: seasonal
   - Priority: high (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Check insulation and weatherproofing**

   - Description: Inspect attic insulation depth and coverage. Seal any gaps in weatherstripping or caulking you may have missed. Check for drafts around windows and doors. Add door sweeps where needed. Good insulation and sealing significantly reduces heating costs all winter.
   - Assignment: November
   - Type: seasonal
   - Priority: high (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Store outdoor furniture and equipment**

   - Description: Clean and store patio furniture, grills, and decorations in garage or shed. Cover items that must stay outside with waterproof covers. Bring in sensitive plants. Drain and store fountain pumps. Proper storage extends furniture life and prevents winter damage.
   - Assignment: November
   - Type: seasonal
   - Priority: high (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

6. **Test garage door auto-reverse safety again**

   - Description: Place a 2x4 board in the door's path and close the door - it should reverse when touching the board. Wave a broom under the closing door - it should reverse immediately. This safety feature prevents injuries and deaths. Adjust sensors or call technician if it fails.
   - Assignment: November
   - Type: seasonal
   - Priority: high (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

7. **Inspect and clean gutters of fall leaves**

   - Description: Do final gutter cleaning after all leaves have fallen. Remove all debris and flush with hose. Ensure downspouts flow freely and extend 5 feet from foundation. Repair any loose or damaged sections now. Clean gutters prevent ice dams and foundation problems.
   - Assignment: November
   - Type: seasonal
   - Priority: high (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

8. **Test backup sump pump battery (if applicable)**

   - Description: Unplug primary sump pump and pour water in pit - backup should activate. Ensure battery is fully charged. Replace battery every 3-5 years. Test monthly during spring and fall. A working backup prevents basement flooding during power outages or primary pump failure.
   - Assignment: November
   - Type: seasonal
   - Priority: high (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Replace battery every 3-5 years.
     - Test monthly during spring and fall.

9. **Inspect snow removal equipment (snowblower, shovels, salt)**

   - Description: Service snowblower: change oil, check spark plug, inspect belts and shear pins, ensure auger turns freely. Stock up on ice melt and sand. Have working shovels with ergonomic handles. Being prepared for first snow prevents stress and prevents back injuries.
   - Assignment: November
   - Type: seasonal
   - Priority: high (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

10. **Test outdoor outlets (holiday lighting safety)**

   - Description: Test outdoor GFCI outlets by pressing test button - they should trip and cut power. Use ground-fault protection for all outdoor holiday lights. Check extension cords for damage. Never overload circuits. Use timers to control lights. Follow all safety guidelines to prevent electrical fires.
   - Assignment: November
   - Type: seasonal
   - Priority: high (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

11. **Inspect weatherproofing on exterior doors/windows**

   - Description: Check all exterior door weatherstripping and sweeps for gaps. Test windows for drafts using candle test. Apply plastic window insulation kits for extra protection on single-pane windows. Seal any gaps found. Proper weatherproofing keeps you comfortable and reduces heating bills.
   - Assignment: November
   - Type: seasonal
   - Priority: high (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

12. **Clean washing machine drain filter**

   - Description: Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, and debris, then replace the filter and test for leaks.
   - Assignment: November
   - Type: seasonal
   - Priority: high (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Check for drafts and air leaks**

   - Description: On a windy day, hold lit candle or incense stick near windows, doors, outlets, and baseboards. Wavering smoke indicates air leaks. Seal gaps with weatherstripping, caulk, or foam. Add outlet insulators. Preventing drafts improves comfort and significantly reduces heating costs.
   - Assignment: November
   - Type: weatherSpecific
   - Priority: high (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Prepare for first freeze conditions**

   - Description: Ensure all outdoor water is winterized and drained. Disconnect and store hoses. Protect tender plants or bring indoors. Open cabinet doors under sinks during freeze warnings. Let faucets drip if pipes are vulnerable. Keep garage doors closed to protect pipes.
   - Assignment: November
   - Type: weatherSpecific
   - Priority: high (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Check emergency heating backup systems**

   - Description: If you have a backup heating source (fireplace, wood stove, space heater), ensure it's ready and safe. Stock firewood or fuel. Test operation. Have fire extinguisher nearby. Never use outdoor heaters (grills, generators) indoors due to carbon monoxide danger.
   - Assignment: November
   - Type: weatherSpecific
   - Priority: high (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Monitor humidity levels as heating begins**

   - Description: Use hygrometer to check indoor humidity - ideal is 30-50%. Winter heating dries air, causing health issues and wood damage. Run humidifier if below 30%. Too high causes condensation and mold. Balance is important for comfort and home preservation.
   - Assignment: November
   - Type: weatherSpecific
   - Priority: high (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## December

### seasonal

1. **Monitor heating system performance**

   - Description: Watch for unusual noises, odors, or cycling issues from your heating system. Replace filters monthly during winter. Ensure all rooms heat evenly. Listen for banging pipes or hissing sounds. Call HVAC technician immediately if performance declines - don't wait for a breakdown in winter.
   - Assignment: December
   - Type: seasonal
   - Priority: high (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Replace filters monthly during winter.

2. **Check holiday decorations safety**

   - Description: Inspect all light strings for frayed wires or damaged sockets before hanging. Use outdoor-rated lights outside only. Don't overload circuits. Keep live trees watered to prevent fire hazard. Turn off decorative lights when leaving home or sleeping. Use LED lights to reduce fire risk and energy costs.
   - Assignment: December
   - Type: seasonal
   - Priority: high (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Inspect and maintain fireplace**

   - Description: Check that damper opens fully and closes tightly. Remove ash buildup regularly (when cool). Keep glass doors closed when fire is burning. Use a fireplace screen with open fireplaces. Never leave fire unattended. Only burn seasoned hardwood, never treated wood or trash.
   - Assignment: December
   - Type: seasonal
   - Priority: high (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Monitor energy usage and efficiency**

   - Description: Compare current utility bills to previous winters. Unexpectedly high usage suggests air leaks, inefficient heating, or equipment problems. Use programmable thermostat to reduce heating when sleeping or away. Seal any drafts. Consider energy audit if costs seem excessive.
   - Assignment: December
   - Type: seasonal
   - Priority: high (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Check water heater pressure relief valve (carefully lift lever)**

   - Description: With bucket underneath, carefully lift the pressure relief valve lever slightly until water flows, then release. This tests valve function and flushes sediment. Water should stop when released. If valve leaks continuously after, it needs replacement. Do this annually for safety.
   - Assignment: December
   - Type: seasonal
   - Priority: high (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Do this annually for safety.

6. **Test indoor circuit breakers (flip each one to ensure not stuck)**

   - Description: At your electrical panel, flip each breaker to OFF then back to ON to ensure they move freely. Stuck breakers won't protect circuits during overloads. Label any unlabeled breakers while testing. If breakers feel stiff or won't stay on, call an electrician immediately.
   - Assignment: December
   - Type: seasonal
   - Priority: high (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

7. **Inspect attic and crawl space for moisture or leaks**

   - Description: Check attic for water stains on roof decking, mold, or dampness indicating roof leaks or ice dams. Inspect crawl space for standing water, moisture on walls, or musty odors. Address leaks immediately to prevent structural damage. Ensure ventilation is adequate.
   - Assignment: December
   - Type: seasonal
   - Priority: high (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

8. **Test furnace emergency shut-off switch**

   - Description: Locate emergency shut-off switch (usually red, near furnace or at top of basement stairs). Flip off - furnace should stop immediately. Flip back on - furnace should restart. Everyone in household should know this location for emergency situations. Test annually.
   - Assignment: December
   - Type: seasonal
   - Priority: high (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Test annually.

9. **Run whole-home safety drill (fire escape plan + extinguisher use)**

   - Description: Practice fire escape plan with all household members. Ensure everyone knows two exits from each room and meeting spot outside. Practice low-crawling under smoke. Show adults how to use fire extinguisher (PASS method). Replace plan as needed. Practice twice yearly.
   - Assignment: December
   - Type: seasonal
   - Priority: high (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Practice twice yearly.

### weatherSpecific

1. **Prepare for winter storm conditions**

   - Description: Stock emergency supplies: flashlights, batteries, water (1 gallon per person per day), non-perishable food, blankets, first aid kit, medications, battery/hand-crank radio. Have backup heat source. Keep gas tank above half. Know how to manually open electric garage door. Charge all devices before storms.
   - Assignment: December
   - Type: weatherSpecific
   - Priority: high (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Stock emergency supplies: flashlights, batteries, water (1 gallon per person per day), non-perishable food, blankets, first aid kit, medications, battery/hand-crank radio.

2. **Check ice and snow removal equipment**

   - Description: Ensure snowblower runs properly - test before each storm. Keep gas and oil on hand. Have working shovels and ice melt readily accessible. Apply ice melt before snow for easier removal. Shovel frequently during heavy snow rather than waiting for accumulation.
   - Assignment: December
   - Type: weatherSpecific
   - Priority: high (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Ensure snowblower runs properly - test before each storm.

3. **Monitor heating system during cold snaps**

   - Description: During extreme cold, check that heating system maintains comfortable temperature without excessive cycling. Open cabinets under sinks to prevent pipe freezing. Let faucets drip if pipes are vulnerable. Don't turn heat down below 55°F even when away to prevent frozen pipes.
   - Assignment: December
   - Type: weatherSpecific
   - Priority: high (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Check for ice dam formation on roof**

   - Description: Look for icicles or ice buildup at roof edges indicating ice dams. Check attic for warm spots causing uneven snow melt. Ensure attic is properly insulated and ventilated. Use roof rake from ground to remove snow from roof edges. Never climb on icy roof.
   - Assignment: December
   - Type: weatherSpecific
   - Priority: high (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Ensure adequate emergency supplies**

   - Description: Maintain 3-day supply of water, food, medications, and batteries. Have flashlights, radio, and blankets accessible. Keep phone chargers and power banks charged. Store supplies in accessible location. Check expiration dates. Winter storms can cause extended power outages and impassable roads.
   - Assignment: December
   - Type: weatherSpecific
   - Priority: high (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## Year-round

1. **Test smoke and carbon monoxide detectors monthly**

   - Description: Press the test button on all smoke and CO detectors to verify they work. Replace batteries twice yearly or when chirping. Clean dust from sensors with vacuum. Replace smoke detectors over 10 years old and CO detectors over 7 years old.
   - Assignment: yearRound
   - Type: yearRound
   - Priority: not specified (no task-level priority and no year-round fallback priority)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Test smoke and carbon monoxide detectors monthly
     - Replace batteries twice yearly or when chirping.

2. **Check HVAC filters monthly**

   - Description: Remove furnace/AC filter and hold to light - if you cannot see through it clearly, replace it. Check monthly during heavy use seasons. Dirty filters reduce efficiency, increase energy costs, and strain your system. Use quality pleated filters for better air quality.
   - Assignment: yearRound
   - Type: yearRound
   - Priority: not specified (no task-level priority and no year-round fallback priority)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Check HVAC filters monthly
     - Check monthly during heavy use seasons.

3. **Inspect plumbing for leaks quarterly**

   - Description: Check under all sinks, around toilets, and near water heater for moisture, stains, or drips. Listen for running water when nothing is on. Check water meter before and after 2-hour no-use period - if it changes, you have a leak. Address leaks immediately to prevent damage.
   - Assignment: yearRound
   - Type: yearRound
   - Priority: not specified (no task-level priority and no year-round fallback priority)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Inspect plumbing for leaks quarterly

4. **Check electrical systems annually**

   - Description: Test all GFCI and AFCI outlets and breakers. Look for warm outlets or switch plates. Check for flickering lights or frequently tripping breakers. Ensure electrical panel labels are accurate. Call electrician for any electrical issues - never ignore warning signs of electrical problems.
   - Assignment: yearRound
   - Type: yearRound
   - Priority: not specified (no task-level priority and no year-round fallback priority)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Check electrical systems annually

5. **Professional HVAC service twice yearly**

   - Description: Schedule professional furnace inspection in fall and AC inspection in spring. Technicians will check safety controls, clean coils, test refrigerant, inspect heat exchangers, and ensure efficient operation. Regular service prevents breakdowns and extends equipment life significantly.
   - Assignment: yearRound
   - Type: yearRound
   - Priority: not specified (no task-level priority and no year-round fallback priority)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Professional HVAC service twice yearly

6. **Whole-home electrical inspection by electrician (every 3–5 years)**

   - Description: Have licensed electrician inspect entire electrical system including panel, wiring, outlets, and grounding. They will identify outdated components, safety hazards, and code violations. Essential for homes over 25 years old or before major renovations. Can prevent electrical fires.
   - Assignment: yearRound
   - Type: yearRound
   - Priority: not specified (no task-level priority and no year-round fallback priority)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Whole-home electrical inspection by electrician (every 3–5 years)

7. **Whole-home plumbing inspection (annually)**

   - Description: Have plumber inspect water heater, check all fixtures for leaks, test water pressure, inspect exposed pipes, check sump pump, and assess overall system condition. Annual inspection catches small issues before they become expensive emergencies. Especially important in older homes.
   - Assignment: yearRound
   - Type: yearRound
   - Priority: not specified (no task-level priority and no year-round fallback priority)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Whole-home plumbing inspection (annually)
     - Annual inspection catches small issues before they become expensive emergencies.

8. **Pest inspection (annually or as needed)**

   - Description: Have professional pest control inspect for termites, carpenter ants, rodents, and other pests. They will check foundation, attic, crawl spaces, and vulnerable areas. Annual inspection is critical for early detection. Immediate inspection needed if you see signs of infestation.
   - Assignment: yearRound
   - Type: yearRound
   - Priority: not specified (no task-level priority and no year-round fallback priority)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Pest inspection (annually or as needed)
     - Annual inspection is critical for early detection.

9. **Radon test (at least once, more if in high-risk area)**

   - Description: Test basement or lowest living level for radon gas using DIY kit or professional service. Radon is colorless, odorless, and causes lung cancer. Test initially when buying home, then every 2 years or after major foundation work. Mitigation systems are effective if levels are elevated.
   - Assignment: yearRound
   - Type: yearRound
   - Priority: not specified (no task-level priority and no year-round fallback priority)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Test initially when buying home, then every 2 years or after major foundation work.

10. **Well water test (if applicable, annually)**

   - Description: Have well water tested annually for bacteria, nitrates, and other contaminants. Test more frequently if you notice changes in taste, odor, or appearance, or after flooding or nearby contamination. Safe drinking water is essential for health. Keep records of all test results.
   - Assignment: yearRound
   - Type: yearRound
   - Priority: not specified (no task-level priority and no year-round fallback priority)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Well water test (if applicable, annually)
     - Have well water tested annually for bacteria, nitrates, and other contaminants.

11. **Septic inspection/pumping (every 3–5 years)**

   - Description: Have septic tank inspected and pumped every 3-5 years (more often for large households or garbage disposals). Professional will check tank levels, inspect baffles and filter, and assess drain field condition. Regular pumping prevents system failure and costly replacement.
   - Assignment: yearRound
   - Type: yearRound
   - Priority: not specified (no task-level priority and no year-round fallback priority)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Septic inspection/pumping (every 3–5 years)
     - Have septic tank inspected and pumped every 3-5 years (more often for large households or garbage disposals).

12. **Roof inspection (annually)**

   - Description: Have professional roofer inspect shingles, flashing, gutters, and overall roof condition annually. They will identify damage, wear, and potential leaks. Best done in spring or fall. Early detection of roof issues prevents expensive interior water damage and extends roof life.
   - Assignment: yearRound
   - Type: yearRound
   - Priority: not specified (no task-level priority and no year-round fallback priority)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Roof inspection (annually)
     - Have professional roofer inspect shingles, flashing, gutters, and overall roof condition annually.

# Region: Southeast

- Data key: Southeast
- Region value: Southeast
- Climate zone: Humid Subtropical

## January

### seasonal

1. **Service heating system during cooler months**

   - Description: Have HVAC professional inspect heating system during mild winter. They will check burners, heat exchanger, and efficiency. Southeast winters are mild but heating reliability is important for comfort. Address any issues before next winter.
   - Assignment: January
   - Type: seasonal
   - Priority: medium (inherited from January month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Service heating system during cooler months

2. **Check and clean fireplace if applicable**

   - Description: Remove ash when cool and inspect for cracks in firebox. Check damper operation. If used regularly, schedule chimney sweep to remove creosote. Many Southeast homes use fireplaces occasionally during cooler months for ambiance and supplemental heat.
   - Assignment: January
   - Type: seasonal
   - Priority: medium (inherited from January month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Many Southeast homes use fireplaces occasionally during cooler months for ambiance and supplemental heat.

3. **Inspect weatherstripping**

   - Description: Check door and window weatherstripping for gaps or wear. While winters are mild, proper sealing improves heating efficiency and reduces humidity infiltration. Replace worn sections and add door sweeps where needed.
   - Assignment: January
   - Type: seasonal
   - Priority: medium (inherited from January month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Test carbon monoxide detectors**

   - Description: Press test button on all CO detectors to verify operation. Replace batteries if needed. Place detectors near bedrooms and on every level. Even mild heating season use requires CO detector safety.
   - Assignment: January
   - Type: seasonal
   - Priority: medium (inherited from January month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Check attic insulation**

   - Description: Inspect attic insulation for proper depth (R-30 to R-38 for Southeast). Look for gaps, compression, or moisture damage. Good insulation keeps home cool in summer and warm in mild winter. Ensure vents remain clear for airflow.
   - Assignment: January
   - Type: seasonal
   - Priority: medium (inherited from January month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

6. **Inspect furnace filter and replace if dirty**

   - Description: Remove filter and hold to light - replace if you can't see through it clearly. Change monthly during use. Clean filters improve efficiency and air quality. Important in Southeast where humidity and pollen affect indoor air.
   - Assignment: January
   - Type: seasonal
   - Priority: medium (inherited from January month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Change monthly during use.

7. **Test GFCI outlets in kitchen, bathrooms, garage, and exterior**

   - Description: Press "test" button on each GFCI outlet - it should trip and cut power. Press "reset" to restore. If any fail to trip or won't reset, replace immediately. Critical safety device especially in humid Southeast climate.
   - Assignment: January
   - Type: seasonal
   - Priority: medium (inherited from January month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

8. **Inspect sump pump (if applicable) — pour water to confirm it activates**

   - Description: Pour bucket of water into sump pit to test pump activation. Check discharge pipe drains away from foundation. Clean inlet screen. While less common in Southeast, sump pumps in low-lying areas are critical for preventing flooding.
   - Assignment: January
   - Type: seasonal
   - Priority: medium (inherited from January month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

9. **Clean washing machine drain filter**

   - Description: Locate access panel at bottom front of washer. Place towels underneath, remove filter, and clean out lint and debris. Replace filter and test for leaks. Prevents drainage issues and extends washer life.
   - Assignment: January
   - Type: seasonal
   - Priority: medium (inherited from January month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Monitor for freeze protection of pipes**

   - Description: During occasional freezes, open cabinet doors under sinks to allow warm air circulation. Let faucets drip when temperatures drop near freezing. Protect outdoor faucets with covers. Southeast freezes are brief but can damage unprepared pipes.
   - Assignment: January
   - Type: weatherSpecific
   - Priority: medium (inherited from January month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check humidity levels (winter can be dry)**

   - Description: Use hygrometer to monitor indoor humidity - ideal 30-50%. Winter heating can dry air in Southeast. Run humidifier if needed for comfort and to protect wood furniture. Too dry causes health issues and wood cracking.
   - Assignment: January
   - Type: weatherSpecific
   - Priority: medium (inherited from January month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Inspect exterior for mild winter damage**

   - Description: Check siding, trim, and paint for damage from occasional winter storms. Look for loose boards or peeling paint. Address issues now during mild weather before spring humidity and summer heat worsen damage.
   - Assignment: January
   - Type: weatherSpecific
   - Priority: medium (inherited from January month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Ensure proper ventilation during heating season**

   - Description: Run bathroom and kitchen exhaust fans during use. Open windows briefly on mild days for fresh air. Southeast homes prone to moisture buildup need good ventilation even in winter to prevent mold.
   - Assignment: January
   - Type: weatherSpecific
   - Priority: medium (inherited from January month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Ensure proper ventilation during heating season

5. **Check for pest activity (active year-round)**

   - Description: Inspect for signs of ants, termites, or rodents. Mild Southeast winters mean pests stay active year-round. Check for entry points around foundation, pipes, and vents. Seal gaps and call pest control if needed.
   - Assignment: January
   - Type: weatherSpecific
   - Priority: medium (inherited from January month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Check for pest activity (active year-round)
     - Mild Southeast winters mean pests stay active year-round.

## February

### seasonal

1. **Begin early spring preparation**

   - Description: Start planning spring projects like painting, landscaping, and exterior repairs. Order supplies and materials now before spring rush. Check garage and shed organization. Mild Southeast February weather is ideal for outdoor project planning and prep work.
   - Assignment: February
   - Type: seasonal
   - Priority: medium (inherited from February month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check irrigation system for spring startup**

   - Description: Turn on irrigation system and inspect each zone for broken heads, leaks, or clogs. Adjust spray patterns and coverage. Replace damaged components. Southeast landscapes need proper watering as warm season approaches. Test now before heat arrives.
   - Assignment: February
   - Type: seasonal
   - Priority: medium (inherited from February month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Inspect exterior paint and siding**

   - Description: Walk around home checking for peeling paint, damaged siding, or wood rot. High humidity damages exterior finishes faster in Southeast. Look for cracks, holes, or gaps. Plan repairs and painting for spring when temperatures are moderate.
   - Assignment: February
   - Type: seasonal
   - Priority: medium (inherited from February month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Clean and maintain lawn equipment**

   - Description: Service lawn mower by changing oil, replacing spark plug and air filter, and sharpening blade. Clean grass buildup from deck. Check fuel lines and belts. Southeast lawns grow year-round so equipment needs regular maintenance for reliable operation.
   - Assignment: February
   - Type: seasonal
   - Priority: medium (inherited from February month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Southeast lawns grow year-round so equipment needs regular maintenance for reliable operation.

5. **Check deck and outdoor furniture**

   - Description: Inspect deck for loose boards, popped nails, or wood rot. Probe suspect areas with screwdriver. Clean outdoor furniture and check for rust or damage. Apply sealant to deck if needed. Prepare outdoor spaces for spring entertaining season.
   - Assignment: February
   - Type: seasonal
   - Priority: medium (inherited from February month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

6. **Test GFCI/AFCI circuit breakers in electrical panel**

   - Description: Open electrical panel and press "test" button on each GFCI and AFCI breaker - it should trip to off position. Then flip back to on. If any breaker fails to trip or won't reset, call licensed electrician immediately for safety.
   - Assignment: February
   - Type: seasonal
   - Priority: medium (inherited from February month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

7. **Inspect water heater for leaks and check temperature (~120°F)**

   - Description: Look around base of water heater for puddles, rust, or moisture. Test hot water temperature with thermometer - set to 120°F to prevent scalding and save energy. Look for corrosion on connections. Schedule replacement if unit is over 10 years old.
   - Assignment: February
   - Type: seasonal
   - Priority: medium (inherited from February month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

8. **Flush toilets and sinks that aren't used often to prevent dry traps**

   - Description: Run water for 30 seconds in guest bathrooms, basement sinks, and rarely used fixtures. This refills drain trap (U-bend) which prevents sewer gases from entering home. Do monthly for all unused fixtures to maintain water seal.
   - Assignment: February
   - Type: seasonal
   - Priority: medium (inherited from February month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Do monthly for all unused fixtures to maintain water seal.

9. **Check bathroom exhaust fans for proper airflow**

   - Description: Turn on each bathroom fan and hold tissue near grille - it should be pulled firmly against vent. Clean grille with vacuum attachment. Bathroom fans are critical in humid Southeast to prevent moisture damage and mold growth in bathrooms.
   - Assignment: February
   - Type: seasonal
   - Priority: medium (inherited from February month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

10. **Inspect fire extinguishers for charge and expiration date**

   - Description: Check pressure gauge on each fire extinguisher - needle should be in green zone. Look for expiration date or inspection tag. Ensure they're accessible and everyone knows locations. Replace or recharge if expired or pressure is low.
   - Assignment: February
   - Type: seasonal
   - Priority: medium (inherited from February month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Prepare for early spring weather changes**

   - Description: Check that AC system is ready for sudden warm spells common in Southeast February. Test thermostat switching between heat and cool. Clean outdoor AC unit of debris. Monitor weather forecasts for late cold snaps that may require plant protection.
   - Assignment: February
   - Type: weatherSpecific
   - Priority: medium (inherited from February month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check air conditioning system before warm season**

   - Description: Turn on AC and verify it cools properly. Change filter and clean area around indoor and outdoor units. Listen for unusual noises. Schedule professional AC service now before spring rush and hot weather arrives. Southeast cooling season starts early.
   - Assignment: February
   - Type: weatherSpecific
   - Priority: medium (inherited from February month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Monitor for early pest activity**

   - Description: Inspect for ants, termites, and other pests that become active in warming Southeast weather. Check foundation, window sills, and entry points. Seal gaps and cracks. Call pest control if you see mud tubes, ant trails, or droppings.
   - Assignment: February
   - Type: weatherSpecific
   - Priority: medium (inherited from February month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Inspect drainage systems before spring rains**

   - Description: Clean gutters and downspouts of winter debris. Ensure downspouts extend 5+ feet from foundation. Check grading slopes away from house. Test drainage during rain. Poor drainage causes foundation issues in heavy Southeast spring storms.
   - Assignment: February
   - Type: weatherSpecific
   - Priority: medium (inherited from February month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Check outdoor electrical connections**

   - Description: Inspect outdoor outlets, light fixtures, and wiring for damage, corrosion, or loose connections. Test all GFCI outlets. Replace cracked outlet covers. Ensure connections are weatherproof. High humidity in Southeast accelerates electrical corrosion.
   - Assignment: February
   - Type: weatherSpecific
   - Priority: medium (inherited from February month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## March

### seasonal

1. **Begin spring cleaning and maintenance**

   - Description: Deep clean home from top to bottom. Wash windows, vacuum vents, clean behind appliances, and shampoo carpets. Replace HVAC filters and check smoke detectors. Southeast spring arrives early - start fresh air circulation and declutter stored winter items.
   - Assignment: March
   - Type: seasonal
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Service air conditioning system**

   - Description: Schedule professional AC service before cooling season. Technician will clean coils, check refrigerant levels, test electrical components, and ensure efficient operation. Critical in Southeast where AC runs most of the year. Book early to avoid spring rush.
   - Assignment: March
   - Type: seasonal
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Clean and inspect gutters**

   - Description: Remove leaves, pollen, and debris from gutters and downspouts. Flush with hose to check flow and leaks. Ensure downspouts extend 5+ feet from foundation. Southeast spring storms require clear gutters to prevent water damage and foundation issues.
   - Assignment: March
   - Type: seasonal
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Check screens and outdoor areas**

   - Description: Inspect window and door screens for tears or damage. Repair or replace before opening windows for spring air. Clean and arrange patio furniture. Power wash deck and outdoor areas. Prepare outdoor spaces for spring and summer use.
   - Assignment: March
   - Type: seasonal
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Start landscaping and lawn care**

   - Description: Begin spring fertilization and weed control. Aerate compacted areas and overseed thin spots. Mulch garden beds and plant warm-season flowers. Southeast growing season starts early - establish lawn health now for hot summer ahead.
   - Assignment: March
   - Type: seasonal
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

6. **Test sump pump again before spring rains**

   - Description: Pour bucket of water into sump pit to ensure pump activates and drains properly. Check discharge pipe is clear and extends away from foundation. Clean inlet screen. Test backup battery if equipped. Southeast spring storms can be heavy.
   - Assignment: March
   - Type: seasonal
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

7. **Test outdoor faucets for leaks once thawed**

   - Description: Turn on each outdoor faucet and let water run several minutes. Check for leaks at handle, spout, and where pipe enters house. Inspect inside near connections for moisture. Replace worn washers or call plumber for pipe damage from rare freezes.
   - Assignment: March
   - Type: seasonal
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

8. **Inspect foundation for cracks or water entry points**

   - Description: Walk around foundation looking for cracks wider than 1/4 inch, crumbling concrete, or water stains. Mark problems with chalk. Seal small cracks with concrete caulk. High Southeast rainfall makes foundation waterproofing critical - call specialist for major issues.
   - Assignment: March
   - Type: seasonal
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

9. **Clean and test dryer vent and exhaust duct for airflow**

   - Description: Disconnect dryer and remove lint from vent hose and duct. Use dryer vent brush to clean entire duct to exterior. Ensure outside vent flap opens freely. Clogged vents cause fires and force dryer to work harder. Clean annually minimum.
   - Assignment: March
   - Type: seasonal
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Clean annually minimum.

10. **Check window screens for tears; repair before spring**

   - Description: Remove and inspect all window screens for holes, tears, or bent frames. Patch small holes with screen repair kits or replace damaged screens. Clean screens with soap and water. Essential for bug-free fresh air in humid Southeast springs.
   - Assignment: March
   - Type: seasonal
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

11. **Clean washing machine drain filter**

   - Description: Locate access panel at bottom front of washer. Place towels underneath, open panel, and remove filter. Clean out lint, coins, and debris. Replace filter and test for leaks. Prevents drainage problems and extends washer life in humid climate.
   - Assignment: March
   - Type: seasonal
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Prepare cooling system for warm weather**

   - Description: Replace AC filter with fresh one. Clean outdoor condenser unit of debris and vegetation. Turn on system and verify cooling. Check that all vents open and blow cool air. Southeast warm weather arrives early - ensure system is ready now.
   - Assignment: March
   - Type: weatherSpecific
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check for tornado season preparation**

   - Description: Identify safe interior room or storm shelter. Stock emergency supplies including flashlight, radio, batteries, water, and first aid kit. Review family emergency plan. Trim dead tree branches. Southeast tornado season peaks in spring - be prepared.
   - Assignment: March
   - Type: weatherSpecific
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Inspect for spring storm damage prevention**

   - Description: Secure loose outdoor items that could blow away. Check roof shingles and flashing. Ensure gutters are clear. Trim overhanging branches. Southeast spring brings severe thunderstorms with high winds - prevent damage before storms hit.
   - Assignment: March
   - Type: weatherSpecific
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Monitor humidity levels as weather warms**

   - Description: Use hygrometer to check indoor humidity - ideal 30-50%. Run dehumidifiers in damp areas like basements. Southeast humidity rises rapidly in spring. Excess moisture causes mold and structural damage. Ensure exhaust fans vent outside.
   - Assignment: March
   - Type: weatherSpecific
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Check foundation drainage**

   - Description: During rain, verify water flows away from house. Ground should slope 6 inches down over 10 feet. Look for pooling water or erosion near foundation. Add soil to low spots. Poor drainage causes basement leaks in heavy Southeast rains.
   - Assignment: March
   - Type: weatherSpecific
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## April

### seasonal

1. **Complete spring maintenance tasks**

   - Description: Finish all spring cleaning and maintenance projects. Touch up paint, complete landscaping, and repair any winter damage. Check off all pending maintenance items. Southeast April weather is ideal for outdoor work before summer heat and humidity arrive.
   - Assignment: April
   - Type: seasonal
   - Priority: high (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Deep clean interior and exterior**

   - Description: Thoroughly clean entire home inside and out. Wash exterior siding, clean windows, power wash driveway and deck. Inside, deep clean carpets, wash walls, and organize closets. Fresh start for summer season in Southeast.
   - Assignment: April
   - Type: seasonal
   - Priority: high (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Service and test air conditioning**

   - Description: Ensure AC system is professionally serviced and running efficiently. Test cooling in all rooms. Replace filter and verify thermostat works properly. Southeast summer heat is intense - confirm system is ready for months of heavy use ahead.
   - Assignment: April
   - Type: seasonal
   - Priority: high (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Maintain outdoor living spaces**

   - Description: Clean and seal deck or patio. Arrange outdoor furniture and check cushions. Test outdoor kitchen equipment and lighting. Prepare pool area if applicable. Southeast outdoor living season is year-round - ensure spaces are ready for spring and summer enjoyment.
   - Assignment: April
   - Type: seasonal
   - Priority: high (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Southeast outdoor living season is year-round - ensure spaces are ready for spring and summer enjoyment.

5. **Check pool and spa systems**

   - Description: Test and balance pool water chemistry (pH 7.2-7.8, chlorine 1-3 ppm). Clean filters and inspect pump and heater operation. Check for leaks in equipment. Ensure safety equipment is functional. Southeast pools get heavy use - proper maintenance is critical.
   - Assignment: April
   - Type: seasonal
   - Priority: high (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

6. **Test HVAC system (switch between heat and cooling modes)**

   - Description: Set thermostat to heat and verify furnace runs properly, then switch to cool and confirm AC starts and cools effectively. Listen for unusual noises in both modes. If either fails, call HVAC technician before you need it urgently.
   - Assignment: April
   - Type: seasonal
   - Priority: high (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

7. **Schedule AC service/inspection before summer**

   - Description: Book professional AC service if not done already. Technician will clean coils, check refrigerant levels, test capacitors, and ensure peak performance. Schedule now before summer rush. Southeast AC systems work hard and need annual service.
   - Assignment: April
   - Type: seasonal
   - Priority: high (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Southeast AC systems work hard and need annual service.

8. **Test irrigation/sprinkler system for leaks and coverage**

   - Description: Run each zone and watch for broken heads, leaks, or dry spots. Adjust spray patterns to avoid watering pavement. Replace damaged components. Proper irrigation is essential for Southeast landscapes during hot, dry periods.
   - Assignment: April
   - Type: seasonal
   - Priority: high (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

9. **Inspect deck, porch, and railings for rot or loose boards**

   - Description: Walk deck testing boards for soft spots (rot) with screwdriver. Shake railings to check stability. Look for popped nails or loose screws. High Southeast humidity accelerates wood decay - replace rotten boards and tighten fasteners before injury occurs.
   - Assignment: April
   - Type: seasonal
   - Priority: high (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

10. **Check garage door auto-reverse safety feature**

   - Description: Place 2x4 board on ground in door path and close door - it should reverse when touching board. Wave broom under closing door - should reverse immediately. If not, adjust sensors or call technician. Critical safety feature.
   - Assignment: April
   - Type: seasonal
   - Priority: high (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

11. **Test safety lighting (motion sensor and exterior lights)**

   - Description: Walk around home at dusk ensuring all exterior lights activate. Test motion sensors by walking through detection zones. Replace burnt bulbs and clean sensor lenses. Good lighting deters intruders and prevents accidents on walks and stairs.
   - Assignment: April
   - Type: seasonal
   - Priority: high (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Prepare for severe weather season**

   - Description: Stock emergency supplies including water, non-perishable food, flashlights, batteries, first aid kit, and important documents in waterproof container. Review evacuation routes. Southeast spring brings severe storms and early hurricane preparation is wise.
   - Assignment: April
   - Type: weatherSpecific
   - Priority: high (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check cooling system capacity**

   - Description: Verify AC keeps home comfortable on hot days. If system runs constantly or rooms stay warm, it may need service or be undersized. Check that all vents are open and unobstructed. Address issues now before peak summer heat.
   - Assignment: April
   - Type: weatherSpecific
   - Priority: high (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Monitor for increased pest activity**

   - Description: Inspect for ants, termites, mosquitoes, and other pests active in warm Southeast weather. Check for mud tubes on foundation, standing water for mosquitoes, and ant trails. Seal entry points and consider professional pest control for prevention.
   - Assignment: April
   - Type: weatherSpecific
   - Priority: high (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Inspect exterior for weather damage**

   - Description: Check siding, roof, windows, and doors for storm damage. Look for loose shingles, damaged gutters, or cracks in siding. Repair now before hurricane season. Southeast weather is harsh on exteriors - stay ahead of damage.
   - Assignment: April
   - Type: weatherSpecific
   - Priority: high (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Check hurricane/storm preparedness supplies**

   - Description: Review hurricane kit including generator fuel, storm shutters, plywood, batteries, water, food, and medications. Test generator operation. Hurricane season starts in June - Southeast residents must prepare early and thoroughly every year.
   - Assignment: April
   - Type: weatherSpecific
   - Priority: high (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Hurricane season starts in June - Southeast residents must prepare early and thoroughly every year.

## May

### seasonal

1. **Peak air conditioning preparation**

   - Description: Verify AC system is running at peak efficiency. Replace filters monthly during heavy use. Monitor energy bills for unusual increases. Listen for strange noises. Southeast May heat arrives - ensure cooling system can handle months of constant use ahead.
   - Assignment: May
   - Type: seasonal
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Replace filters monthly during heavy use.

2. **Complete outdoor maintenance**

   - Description: Finish all outdoor projects before summer heat intensifies. Complete painting, deck sealing, and landscaping. Service lawn equipment and irrigation. Southeast summer heat makes outdoor work difficult - complete tasks now while weather is still manageable.
   - Assignment: May
   - Type: seasonal
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Check and maintain pool systems**

   - Description: Test pool water chemistry daily and adjust as needed. Clean filters weekly. Skim debris and vacuum pool. Check pump and filter operation. Inspect for leaks. Southeast pools see heavy use in summer - maintain water quality and equipment.
   - Assignment: May
   - Type: seasonal
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Test pool water chemistry daily and adjust as needed.
     - Clean filters weekly.

4. **Inspect deck and outdoor structures**

   - Description: Check deck boards, railings, and stairs for rot, splinters, or loose fasteners. Tighten screws and replace damaged wood. Inspect pergolas and gazebos for stability. High Southeast humidity accelerates wood deterioration - maintain outdoor structures regularly.
   - Assignment: May
   - Type: seasonal
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Maintain landscaping systems**

   - Description: Adjust irrigation for warmer weather - water deeply but less frequently. Mulch plants to retain moisture. Fertilize appropriately for Southeast growing season. Monitor for disease and pests. Prune overgrown shrubs and remove dead plant material.
   - Assignment: May
   - Type: seasonal
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

6. **Test outdoor GFCI outlets with a tester**

   - Description: Plug GFCI tester into each outdoor outlet and press test button - power should cut immediately. Press reset to restore. Replace outlets that don't trip or won't reset. Critical safety for outdoor electrical use in humid Southeast climate.
   - Assignment: May
   - Type: seasonal
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

7. **Inspect and clean gutters and downspouts after spring pollen/debris**

   - Description: Remove heavy pollen, seed pods, and spring debris from gutters. Flush with hose to ensure proper flow. Southeast spring pollen is heavy - clean gutters before summer storms to prevent water damage and foundation issues.
   - Assignment: May
   - Type: seasonal
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

8. **Check lawn equipment (mower blades, fuel lines, spark plugs)**

   - Description: Sharpen or replace dull mower blades for clean cuts. Check fuel lines for cracks and replace if brittle. Replace spark plug if dark or worn. Clean air filter. Southeast lawns grow rapidly - maintain equipment for reliable performance.
   - Assignment: May
   - Type: seasonal
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

9. **Inspect fences and gates for stability**

   - Description: Push on fence posts checking for wobble or rot. Look for loose boards, rusted hardware, or leaning sections. Test gate latches and hinges. Tighten screws and replace rotten posts. High humidity and storms stress fences - maintain security and appearance.
   - Assignment: May
   - Type: seasonal
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

10. **Test window locks and lubricate if needed**

   - Description: Check all window locks engage properly and hold securely. Lubricate sticky locks with graphite powder or silicone spray (not oil). Tighten loose screws. Working locks improve security and energy efficiency during Southeast AC season.
   - Assignment: May
   - Type: seasonal
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Working locks improve security and energy efficiency during Southeast AC season.

11. **Check exterior caulking (windows, doors, siding, trim)**

   - Description: Inspect caulk around all windows, doors, and where materials meet. Look for cracks, gaps, or missing caulk. Remove old damaged caulk and reapply with exterior-grade silicone. Proper sealing prevents water and pest entry in humid Southeast.
   - Assignment: May
   - Type: seasonal
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

12. **Clean washing machine drain filter**

   - Description: Place towels under washer, open access panel at bottom front, and remove filter. Clean out lint, debris, and coins. Replace filter and check for leaks during next wash. Prevents clogs and extends washer life in humid climate.
   - Assignment: May
   - Type: seasonal
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Ensure air conditioning system is ready for heat**

   - Description: Test AC runs continuously and cools adequately during hot days. Replace filter monthly. Keep outdoor unit clear of debris. If system struggles or makes noise, call HVAC technician immediately - Southeast summer depends on working AC.
   - Assignment: May
   - Type: weatherSpecific
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Replace filter monthly.

2. **Check humidity control systems**

   - Description: Monitor indoor humidity with hygrometer - ideal 30-50%. Run dehumidifiers in damp areas. Ensure bathroom and kitchen fans vent outside. Southeast summer humidity causes mold and discomfort - control moisture levels actively.
   - Assignment: May
   - Type: weatherSpecific
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Prepare for hurricane season**

   - Description: Hurricane season begins June 1st. Stock supplies now: water, food, batteries, flashlights, medications, cash, important documents. Install or test storm shutters. Review evacuation plan. Southeast residents must be fully prepared before storms threaten.
   - Assignment: May
   - Type: weatherSpecific
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Monitor for summer storm damage prevention**

   - Description: Trim dead tree branches near house. Secure loose outdoor items. Clear gutters and drains. Check roof for loose shingles. Southeast summer brings severe thunderstorms and hurricanes - prevent damage proactively.
   - Assignment: May
   - Type: weatherSpecific
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Check outdoor water and electrical systems**

   - Description: Ensure outdoor outlets are GFCI protected and weatherproof. Check hoses for leaks. Test irrigation system operation. Inspect outdoor lighting. High Southeast humidity and storms make outdoor systems vulnerable - verify safe operation.
   - Assignment: May
   - Type: weatherSpecific
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## June

### seasonal

1. **Peak cooling season maintenance**

   - Description: Replace AC filters monthly during peak use. Check that system cools effectively and runs smoothly. Monitor thermostat settings and ensure vents are open. Southeast June heat is intense - AC system will run almost constantly for next several months.
   - Assignment: June
   - Type: seasonal
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Replace AC filters monthly during peak use.

2. **Monitor air conditioning efficiency**

   - Description: Track energy bills for unexpected increases suggesting inefficiency. Listen for unusual noises or frequent cycling. Ensure all rooms cool evenly. If performance drops, call HVAC technician immediately - Southeast summers are unbearable without working AC.
   - Assignment: June
   - Type: seasonal
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Maintain pool and outdoor systems**

   - Description: Test pool chemistry twice weekly minimum. Clean filters regularly and vacuum pool. Skim daily to remove debris. Check equipment for leaks and proper operation. Southeast pool season is in full swing - maintain water quality for safe swimming.
   - Assignment: June
   - Type: seasonal
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Test pool chemistry twice weekly minimum.
     - Skim daily to remove debris.

4. **Check attic ventilation**

   - Description: On hot day, check attic temperature - shouldn't exceed 20°F above outdoor temp. Ensure soffit and ridge vents are clear. Verify attic fans work properly. Poor ventilation damages roof and increases cooling costs in intense Southeast summer heat.
   - Assignment: June
   - Type: seasonal
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Inspect for heat-related expansion**

   - Description: Look for gaps in caulking around windows and doors from heat expansion. Check for cracks in concrete or stucco. Monitor for doors or windows sticking. Southeast extreme heat causes materials to expand - address issues to prevent damage.
   - Assignment: June
   - Type: seasonal
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

6. **Flush water heater**

   - Description: Turn off power/gas and water supply. Attach hose to drain valve and run water into bucket or drain until clear, removing sediment. Close valve, restore water and power. Extends heater life and improves efficiency. Do annually in hard water areas.
   - Assignment: June
   - Type: seasonal
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Do annually in hard water areas.

7. **Inspect attic ventilation fans and confirm proper airflow**

   - Description: Turn on attic fans and ensure they run smoothly without rattling. Check that vents open fully and feel for strong airflow. Clean dust from fan blades. Southeast attics can reach 150°F - proper ventilation is critical to protect roof and reduce cooling costs.
   - Assignment: June
   - Type: seasonal
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

8. **Test ceiling fans for wobble/balance**

   - Description: Run each ceiling fan on high and watch for excessive wobbling. Tighten mounting screws and blade brackets. Use balancing kit if needed (attach weights to blades). Clean blades. Set counterclockwise rotation for summer to push air downward for cooling.
   - Assignment: June
   - Type: seasonal
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

9. **Inspect plumbing under sinks for leaks**

   - Description: Open cabinets under all sinks and feel pipes for moisture. Look for water stains, rust, or mineral deposits. Run water and watch for drips at connections. Tighten loose fittings or replace worn washers. High Southeast humidity can hide small leaks - check regularly.
   - Assignment: June
   - Type: seasonal
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

10. **Test outdoor water pressure and hoses for leaks**

   - Description: Turn on outdoor faucets fully and note pressure. Check hoses for cracks, bulges, or leaks at connections. Replace worn washers. Upgrade old rubber hoses to reinforced ones. Good water pressure indicates healthy plumbing and supports irrigation needs.
   - Assignment: June
   - Type: seasonal
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

11. **Check pest control barriers and look for termite activity**

   - Description: Inspect foundation for mud tubes (termite highways). Look for discarded wings near windows and doors. Check wood for hollow sounds when tapped. Southeast has high termite activity - professional inspection annually is essential. Call immediately if signs detected.
   - Assignment: June
   - Type: seasonal
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Southeast has high termite activity - professional inspection annually is essential.

12. **Inspect grout and caulking in showers, tubs, and sinks**

   - Description: Check tile grout for cracks or missing sections. Inspect caulk around tubs, showers, and sinks for gaps or mold. Remove old caulk and reapply with mildew-resistant silicone. Seal porous grout. Southeast humidity makes bathroom waterproofing critical.
   - Assignment: June
   - Type: seasonal
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Hurricane season preparation**

   - Description: Hurricane season is active June-November. Ensure emergency supplies are stocked and fresh. Know evacuation routes. Install or inspect storm shutters. Trim dangerous tree branches. Have generator fuel ready. Southeast hurricanes are serious - maintain constant readiness.
   - Assignment: June
   - Type: weatherSpecific
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check cooling system capacity for extreme heat**

   - Description: Verify AC maintains comfortable temperature during hottest parts of day. If system runs constantly but doesn't cool adequately, call HVAC technician. May need additional capacity or repairs. Southeast extreme heat demands properly functioning cooling system.
   - Assignment: June
   - Type: weatherSpecific
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Monitor humidity and mold prevention**

   - Description: Use hygrometer to check indoor humidity - keep 30-50%. Run dehumidifiers continuously in damp areas. Ensure exhaust fans vent outside. Check for musty odors indicating mold. Southeast summer humidity promotes mold growth - control moisture aggressively.
   - Assignment: June
   - Type: weatherSpecific
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Inspect for storm damage preparation**

   - Description: Before storm season peaks, secure all loose outdoor items. Check roof and gutters are sound. Ensure windows and doors seal properly. Have emergency supplies ready. Southeast summer storms can be severe - prepare home thoroughly.
   - Assignment: June
   - Type: weatherSpecific
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Check emergency generator if applicable**

   - Description: Test generator operation monthly. Run for 15-20 minutes under load. Check oil level and fuel. Keep fresh fuel stored properly. Hurricane season power outages are common in Southeast - ensure backup power works reliably.
   - Assignment: June
   - Type: weatherSpecific
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Test generator operation monthly.

## July

### seasonal

1. **Peak summer maintenance**

   - Description: Keep up with all maintenance during intense Southeast heat. Replace AC filters monthly. Maintain pool chemistry. Water lawn during coolest parts of day. Monitor systems for stress from constant use. Check on elderly neighbors during heat waves.
   - Assignment: July
   - Type: seasonal
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Replace AC filters monthly.

2. **Monitor energy efficiency**

   - Description: Compare current electric bills to previous summers. Unexpectedly high bills suggest AC inefficiency or air leaks. Keep blinds closed during hottest hours. Use programmable thermostat. Southeast summer cooling costs are high - maximize efficiency to control expenses.
   - Assignment: July
   - Type: seasonal
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Maintain cooling systems**

   - Description: Check AC filter monthly and replace when dirty. Keep outdoor unit clear of debris and vegetation. Listen for unusual noises. Ensure all vents blow cold air. Call technician immediately for any performance issues - Southeast heat is dangerous without AC.
   - Assignment: July
   - Type: seasonal
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Check AC filter monthly and replace when dirty.

4. **Check and clean pool systems**

   - Description: Test and balance pool water chemistry 2-3 times weekly during peak use. Backwash filter weekly. Skim and vacuum pool regularly. Check chlorinator and salt cell if applicable. Southeast pools need intensive maintenance in heavy use season.
   - Assignment: July
   - Type: seasonal
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Test and balance pool water chemistry 2-3 times weekly during peak use.
     - Backwash filter weekly.

5. **Inspect outdoor equipment**

   - Description: Clean lawn mower after each use. Check oil and blade sharpness. Clean and maintain garden tools. Inspect grill for grease buildup and propane leaks. Service irrigation system. Southeast outdoor equipment works hard in heat and humidity.
   - Assignment: July
   - Type: seasonal
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Clean lawn mower after each use.

6. **Test home security system and update codes if needed**

   - Description: Test all door and window sensors. Replace low batteries in wireless sensors. Update access codes if contractors or guests had codes. Ensure monitoring service contact info is current. Check camera operation. Summer vacation season requires security vigilance.
   - Assignment: July
   - Type: seasonal
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

7. **Inspect driveway and walkways for cracks**

   - Description: Fill small cracks in asphalt or concrete before they expand from heat. Use appropriate crack filler for surface type. Consider seal coating asphalt driveways. Replace broken or heaving concrete sections to prevent trips. Southeast heat accelerates pavement deterioration.
   - Assignment: July
   - Type: seasonal
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

8. **Test outdoor drainage after heavy rain**

   - Description: During summer thunderstorms, check that water flows away from foundation. Look for pooling near house. Ensure downspouts extend 5+ feet from foundation. Clear any clogged drains. Southeast summer storms are intense - verify drainage works properly.
   - Assignment: July
   - Type: seasonal
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

9. **Check refrigerator door seals (paper test)**

   - Description: Close dollar bill in refrigerator door - if you can pull it out easily, seal is worn and cold air escaping. Check entire seal perimeter. Clean seals with soap and water or replace if cracked. Proper seals save energy during Southeast summer cooling costs.
   - Assignment: July
   - Type: seasonal
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

10. **Inspect pool equipment (if applicable) for safety and leaks**

   - Description: Check pool pump, filter, and heater for leaks or unusual noises. Test GFCI protection on all pool electrical. Ensure pool covers and safety fencing secure. Check pool lights for cracks. Southeast pool season peaks - safety is critical.
   - Assignment: July
   - Type: seasonal
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

11. **Test garage door keypad and remotes**

   - Description: Test each garage door opener remote and keypad code. Replace batteries in weak remotes. Update keypad codes if needed for security. Ensure opener responds consistently. Program new remotes per manufacturer instructions.
   - Assignment: July
   - Type: seasonal
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

12. **Clean washing machine drain filter**

   - Description: Place towels under washer, open bottom access panel, and remove filter. Clean lint, coins, and debris. Replace filter and test next load for leaks. Prevents drainage issues and extends washer life. Do every 2-3 months in humid Southeast climate.
   - Assignment: July
   - Type: seasonal
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Do every 2-3 months in humid Southeast climate.

### weatherSpecific

1. **Peak hurricane season vigilance**

   - Description: July-September is peak Atlantic hurricane season. Monitor weather forecasts closely. Keep emergency supplies fresh and accessible. Know evacuation routes. Have important documents ready. Fill prescriptions. Southeast coastal residents must stay alert and prepared to act quickly.
   - Assignment: July
   - Type: weatherSpecific
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Monitor air conditioning during extreme heat**

   - Description: During heat waves, check AC runs smoothly and cools adequately. Don't set thermostat too low (strains system). Close blinds and limit oven use. If system fails, seek cooling center. Southeast July heat is dangerous - monitor vulnerable family members.
   - Assignment: July
   - Type: weatherSpecific
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Check for heat stress on exterior materials**

   - Description: Inspect siding, trim, and caulking for damage from extreme heat. Look for warping, cracking, or gaps. Check roof shingles for curling. Monitor deck for splintering. Southeast summer heat stresses materials - catch damage early.
   - Assignment: July
   - Type: weatherSpecific
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Monitor humidity and moisture control**

   - Description: Keep indoor humidity 30-50% using dehumidifiers and AC. Run bathroom and kitchen exhaust fans during use. Check for condensation on windows or pipes. Look for musty odors. Southeast summer humidity is oppressive - active moisture control prevents mold and damage.
   - Assignment: July
   - Type: weatherSpecific
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Inspect storm shutters and protection**

   - Description: Test storm shutters deploy properly. Check hardware and tracks. Ensure plywood and mounting brackets are ready if applicable. Verify generator operates. Keep fuel fresh. Southeast hurricane threats require shutters ready to deploy on short notice.
   - Assignment: July
   - Type: weatherSpecific
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## August

### seasonal

1. **Continue peak summer maintenance**

   - Description: Maintain vigilance with all systems during hottest month. Replace AC filters, monitor pool chemistry, water lawn appropriately. Check on vulnerable neighbors. Southeast August is typically hottest month - keep all systems running optimally.
   - Assignment: August
   - Type: seasonal
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Maintain vigilance with all systems during hottest month.

2. **Monitor cooling system performance**

   - Description: Track AC performance during peak use. Listen for strain or unusual noises. Ensure adequate cooling in all rooms. Monitor energy consumption. If system shows wear, schedule service now - Southeast AC systems face months more of heavy use.
   - Assignment: August
   - Type: seasonal
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Maintain outdoor living areas**

   - Description: Keep outdoor spaces clean despite limited use in extreme heat. Maintain pool area, clean furniture, and protect surfaces from sun damage. Water plants during coolest hours. Southeast August heat limits outdoor activities but spaces still need care.
   - Assignment: August
   - Type: seasonal
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Check pool and spa equipment**

   - Description: Inspect pool pump and filter for signs of strain from heavy use. Listen for unusual noises. Check for leaks around equipment. Ensure adequate water circulation. Monitor chlorine consumption. Southeast pools work overtime in August - watch for equipment stress.
   - Assignment: August
   - Type: seasonal
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Inspect exterior for heat damage**

   - Description: Look for warped siding, cracked caulk, or faded paint from intense sun exposure. Check for gaps around windows and doors. Monitor wood surfaces for splitting. Southeast August heat is punishing on exteriors - identify damage before it worsens.
   - Assignment: August
   - Type: seasonal
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

6. **Inspect roof shingles for summer storm damage**

   - Description: From ground with binoculars, look for missing, cracked, or curled shingles after summer storms. Check flashing around chimneys and vents. Look for granule loss in gutters. Southeast summer storms are severe - inspect after each major storm event.
   - Assignment: August
   - Type: seasonal
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Southeast summer storms are severe - inspect after each major storm event.

7. **Test HVAC performance (is the AC cooling properly?)**

   - Description: Measure temperature at vents with thermometer - should be 15-20°F cooler than room air. Check that all rooms cool evenly. Listen for system cycling properly. If cooling is inadequate, call technician immediately - Southeast heat is dangerous.
   - Assignment: August
   - Type: seasonal
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

8. **Test water pressure regulator (should be ~40–60 psi)**

   - Description: Attach pressure gauge to outdoor faucet and turn on water. Reading should be 40-60 psi. Too high damages plumbing and appliances; too low indicates issues. If outside range, have plumber adjust regulator or investigate problems.
   - Assignment: August
   - Type: seasonal
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

9. **Inspect chimney exterior for cracks or leaning**

   - Description: From ground, look at chimney for cracks in masonry, leaning, or loose bricks. Check flashing where chimney meets roof. While rarely used in Southeast, chimneys still need structural integrity. Call mason for significant cracks or leaning.
   - Assignment: August
   - Type: seasonal
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

10. **Check septic system filter/inspection port (if applicable)**

   - Description: Open septic tank inspection port and check filter for clogs. Clean or replace filter as needed. Note tank levels. If tank is over half full or you see backup signs, schedule pumping. Southeast septic systems need regular monitoring.
   - Assignment: August
   - Type: seasonal
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

11. **Flush garbage disposal with ice and vinegar to clean blades**

   - Description: Fill disposal with ice cubes and run with cold water to sharpen blades and clean buildup. Then flush with vinegar and baking soda to deodorize. Run cold water 30 seconds after grinding anything. Keeps disposal fresh in humid Southeast climate.
   - Assignment: August
   - Type: seasonal
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Peak hurricane season preparation**

   - Description: August-September is statistical peak of hurricane season. Monitor National Hurricane Center forecasts daily. Keep emergency supplies stocked and vehicle fueled. Be ready to evacuate on short notice. Southeast coastal areas face highest risk now.
   - Assignment: August
   - Type: weatherSpecific
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Monitor National Hurricane Center forecasts daily.

2. **Monitor extreme heat effects on home**

   - Description: Watch for heat-stressed materials: cracking concrete, warping wood, failing caulk. Ensure AC keeps up with demand. Monitor for power brownouts. Check that attic ventilation is adequate. Southeast August heat tests home systems to their limits.
   - Assignment: August
   - Type: weatherSpecific
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Check moisture and humidity control**

   - Description: Monitor dehumidifier operation and empty reservoirs regularly. Check for condensation on windows, pipes, or in closets. Look for musty odors. Run exhaust fans religiously. Southeast August humidity is oppressive - aggressive moisture control prevents mold.
   - Assignment: August
   - Type: weatherSpecific
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Inspect for storm damage prevention**

   - Description: Keep emergency supplies fresh and accessible. Ensure storm shutters function properly. Trim dead branches before they fall. Clear gutters and drains. Southeast August tropical systems can develop quickly - stay prepared at all times.
   - Assignment: August
   - Type: weatherSpecific
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Check cooling system efficiency**

   - Description: Monitor electric bills compared to previous years. Ensure insulation is adequate and windows seal properly. Consider adding shade to south and west windows. Keep outdoor AC unit clean. Southeast August cooling costs peak - maximize efficiency.
   - Assignment: August
   - Type: weatherSpecific
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## September

### seasonal

1. **Continue hurricane season vigilance**

   - Description: September is statistically most active hurricane month. Monitor weather forecasts constantly. Keep emergency supplies ready and fresh. Know evacuation routes. Fill prescriptions early. Have generator fuel ready. Southeast September requires maximum hurricane preparedness and awareness.
   - Assignment: September
   - Type: seasonal
   - Priority: high (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Maintain cooling systems**

   - Description: Continue monthly AC filter changes. Monitor system performance as it enters final months of heavy use. Keep outdoor unit clean. Watch for signs of wear. Southeast September is still hot - cooling system remains critical for comfort and safety.
   - Assignment: September
   - Type: seasonal
   - Priority: high (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Continue monthly AC filter changes.

3. **Begin gradual fall preparation**

   - Description: Start planning for minimal Southeast fall season. Order HVAC service for heating system check. Plan exterior maintenance projects. Prepare lawn for fall fertilization. While still hot, Southeast fall arrives gradually - begin preparing for seasonal transition.
   - Assignment: September
   - Type: seasonal
   - Priority: high (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Check exterior maintenance needs**

   - Description: Inspect siding, trim, and paint for summer damage. Look for needed repairs or repainting. Check roof condition. Plan projects for cooler October-November weather. Southeast exteriors take beating from summer - address damage before winter.
   - Assignment: September
   - Type: seasonal
   - Priority: high (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Inspect pool and outdoor equipment**

   - Description: If reducing pool use as kids return to school, adjust chemical routine accordingly. Service pool equipment before reduced use season. Check outdoor furniture for damage. Southeast pools may see less use in fall but still need maintenance.
   - Assignment: September
   - Type: seasonal
   - Priority: high (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

6. **Test smoke and carbon monoxide detectors**

   - Description: Press test button on all smoke and CO detectors. Replace batteries in any with low battery warnings. Clean dust from sensors with vacuum attachment. Replace smoke detectors older than 10 years and CO detectors older than 7 years. Install detectors on every level and near bedrooms. Quarterly testing ensures these critical safety devices work properly in Southeast homes.
   - Assignment: September
   - Type: seasonal
   - Priority: high (task-level)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Quarterly testing ensures these critical safety devices work properly in Southeast homes.

7. **Test thermostat programming**

   - Description: Verify programmable thermostat settings are appropriate for early fall. Test switching between cool and heat modes. Replace thermostat batteries if applicable. Program for energy savings as weather begins gradual cooling. Proper programming saves money.
   - Assignment: September
   - Type: seasonal
   - Priority: high (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

8. **Inspect weatherstripping and door seals before cold weather**

   - Description: Check door and window weatherstripping for gaps or wear. While Southeast winters are mild, proper sealing improves heating efficiency and keeps out humidity. Replace worn sections and add door sweeps where needed before heating season.
   - Assignment: September
   - Type: seasonal
   - Priority: high (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

9. **Check attic for pests (rodents often enter in fall)**

   - Description: Inspect attic for signs of rodents, raccoons, or other pests seeking shelter. Look for droppings, nesting materials, or entry holes. Seal gaps larger than 1/4 inch. Southeast pests stay active year-round but fall brings new shelter-seeking behavior.
   - Assignment: September
   - Type: seasonal
   - Priority: high (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Southeast pests stay active year-round but fall brings new shelter-seeking behavior.

10. **Test outdoor handrails and steps for safety**

   - Description: Grab handrails and shake firmly - they should not wobble. Check that fasteners are tight. Look for rot in wood railings. Test deck stairs for stability. Repair loose or rotten components immediately to prevent falls and injuries.
   - Assignment: September
   - Type: seasonal
   - Priority: high (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

11. **Clean washing machine drain filter**

   - Description: Open access panel at bottom front of washer and remove filter. Clean out accumulated lint, coins, and debris. Replace filter and run test load watching for leaks. Do every 2-3 months in humid Southeast climate to prevent drainage issues.
   - Assignment: September
   - Type: seasonal
   - Priority: high (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Do every 2-3 months in humid Southeast climate to prevent drainage issues.

### weatherSpecific

1. **Peak hurricane season continues**

   - Description: September is peak month for major hurricanes. Stay alert to National Hurricane Center forecasts. Keep emergency kit ready. Know evacuation zones and routes. Have shutters ready to install quickly. Southeast September requires constant weather awareness and readiness.
   - Assignment: September
   - Type: weatherSpecific
   - Priority: high (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Monitor for storm damage and preparation**

   - Description: After summer storms, inspect for accumulated damage. Check roof, gutters, and exterior. Repair damage before hurricane season ends. Keep emergency supplies stocked. Southeast September storms can still be severe - stay prepared and vigilant.
   - Assignment: September
   - Type: weatherSpecific
   - Priority: high (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Check cooling system as heat continues**

   - Description: AC still runs heavily in September Southeast heat. Monitor performance and efficiency. Change filters monthly. Watch for signs of wear after long cooling season. Schedule maintenance if performance drops. System still has weeks more of heavy use ahead.
   - Assignment: September
   - Type: weatherSpecific
   - Priority: high (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Change filters monthly.

4. **Inspect drainage and water management**

   - Description: Ensure gutters and downspouts are clear before fall rains. Check that grading slopes away from foundation. Test drainage during rain events. September tropical systems bring heavy rain - verify your drainage system handles water properly.
   - Assignment: September
   - Type: weatherSpecific
   - Priority: high (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Monitor for continued pest activity**

   - Description: Pests remain very active in warm Southeast September. Watch for increased ant activity, termites, and mosquitoes. Keep standing water eliminated. Check for entry points and seal gaps. Consider professional pest control if infestations develop.
   - Assignment: September
   - Type: weatherSpecific
   - Priority: high (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## October

### seasonal

1. **Begin transition to cooler weather**

   - Description: Start preparing for mild Southeast fall and winter. Schedule heating system service. Plan outdoor maintenance projects for pleasant weather. Reduce pool maintenance as use decreases. October brings comfortable weather - tackle delayed outdoor projects.
   - Assignment: October
   - Type: seasonal
   - Priority: medium (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check heating system preparation**

   - Description: Schedule professional furnace or heat pump inspection before cool weather. Technician will check burners, heat exchanger, and safety controls. While Southeast winters are mild, reliable heating is important for comfort during occasional cold snaps.
   - Assignment: October
   - Type: seasonal
   - Priority: medium (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Clean gutters and drainage systems**

   - Description: Remove fall leaves and debris from gutters and downspouts. Flush with hose to ensure flow. Check that downspouts extend away from foundation. Southeast fall rains require clean gutters to prevent water damage and foundation problems.
   - Assignment: October
   - Type: seasonal
   - Priority: medium (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Inspect exterior paint and siding**

   - Description: Check siding and paint for summer storm damage, fading, or peeling. Look for wood rot from high humidity. Plan repainting or repairs for comfortable fall weather. Southeast exteriors suffer from intense summer sun and humidity - assess damage now.
   - Assignment: October
   - Type: seasonal
   - Priority: medium (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Maintain outdoor equipment**

   - Description: Service or store seasonal equipment. Drain and store pool equipment if closing pool. Service lawn equipment before reduced use season. Clean and store outdoor furniture if desired. Southeast outdoor maintenance continues but at reduced intensity.
   - Assignment: October
   - Type: seasonal
   - Priority: medium (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

6. **Winterize outdoor water systems (optional in most Southeast areas)**

   - Description: In northern parts of Southeast region or during occasional freeze warnings, drain and store garden hoses indoors. Shut off interior valves to outdoor faucets and drain remaining water. Install insulated foam faucet covers for freeze protection. Most Southeast areas don't require full winterization, but occasional freezes can damage unprepared pipes. Better safe than dealing with burst pipe repairs.
   - Assignment: October
   - Type: seasonal
   - Priority: low (task-level)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

7. **Test outdoor lighting (especially pathway and security lights)**

   - Description: Test all outdoor lights as days shorten. Replace burnt bulbs and clean fixtures. Check motion sensors work properly. Ensure pathway and security lighting adequate for darker evenings. Good lighting prevents accidents and deters intruders.
   - Assignment: October
   - Type: seasonal
   - Priority: medium (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

8. **Test emergency generator if you have one**

   - Description: Run generator for 15-20 minutes under load. Check oil level and change if due. Verify battery charge. Keep fuel stabilizer in stored gas. Southeast homes rely on generators for hurricane season - test before storing or during off-season.
   - Assignment: October
   - Type: seasonal
   - Priority: medium (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Southeast homes rely on generators for hurricane season - test before storing or during off-season.

9. **Inspect fireplace and chimney flue; schedule cleaning if needed**

   - Description: Open damper and look up chimney with flashlight for creosote buildup or obstructions. Schedule chimney sweep if heavily used last season. Check firebox for cracks. Southeast fireplaces used occasionally - ensure safe before cool weather use.
   - Assignment: October
   - Type: seasonal
   - Priority: medium (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

10. **Test smoke and carbon monoxide detectors**

   - Description: Press test button on all smoke and CO detectors to verify operation. Replace batteries if needed. Clean dust from sensors with vacuum. Replace smoke detectors older than 10 years and CO detectors older than 7 years. Detectors should be near sleeping areas and on every level. Even mild Southeast heating season requires CO detector safety - test before using heating systems.
   - Assignment: October
   - Type: seasonal
   - Priority: high (task-level)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

11. **Check insulation around pipes to prevent winter freezing**

   - Description: In attics, crawl spaces, and exterior walls, verify pipes have insulation. While Southeast freezes are rare, they do occur and can burst unprepared pipes. Focus on north-facing walls and unheated areas. Inexpensive foam pipe insulation provides protection.
   - Assignment: October
   - Type: seasonal
   - Priority: medium (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

12. **Test ground drainage with garden hose**

   - Description: Run hose at various locations around foundation to verify water flows away from house. Ground should slope 6 inches down over 10 feet. Look for pooling water. Poor drainage causes foundation problems in Southeast heavy rains.
   - Assignment: October
   - Type: seasonal
   - Priority: medium (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **End of hurricane season vigilance**

   - Description: Hurricane season officially ends November 30th, but October can still bring storms. Stay weather aware through October. Once season ends, assess and replenish emergency supplies for next year. Southeast October still requires hurricane awareness until month ends.
   - Assignment: October
   - Type: weatherSpecific
   - Priority: medium (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Transition HVAC systems for cooler weather**

   - Description: As cooling needs decrease, verify heating system works properly. Test thermostat switching between modes. Change to heating filters if different. Southeast October sees transition from AC to occasional heat - ensure both systems function properly.
   - Assignment: October
   - Type: weatherSpecific
   - Priority: medium (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Check for mild fall weather preparation**

   - Description: Prepare for comfortable Southeast fall weather. Plan outdoor projects while temperatures are pleasant. Check windows and doors for air leaks. Light maintenance now prevents issues in winter. October is ideal for outdoor work.
   - Assignment: October
   - Type: weatherSpecific
   - Priority: medium (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Monitor humidity changes**

   - Description: As outdoor humidity decreases with cooler weather, monitor indoor levels with hygrometer. May need less dehumidification. Ensure humidity stays 30-50% for comfort. Southeast fall brings welcome relief from oppressive summer humidity - enjoy comfortable conditions.
   - Assignment: October
   - Type: weatherSpecific
   - Priority: medium (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Inspect for storm season damage**

   - Description: With hurricane season ending, thoroughly inspect for accumulated storm damage. Check roof, gutters, siding, and landscape. Document damage for insurance if needed. Repair issues now during pleasant weather before next storm season begins.
   - Assignment: October
   - Type: weatherSpecific
   - Priority: medium (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Repair issues now during pleasant weather before next storm season begins.

## November

### seasonal

1. **Prepare for mild winter season**

   - Description: Get ready for Southeast mild winter. Ensure heating system works properly. Check weatherstripping. Stock firewood if applicable. Prepare for occasional cold snaps. Southeast winters are generally mild but occasional freezes require preparation.
   - Assignment: November
   - Type: seasonal
   - Priority: medium (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check heating system operation**

   - Description: Run heat and verify warm air flows from all vents. Listen for unusual noises. Check thermostat operation. Replace filter. While rarely used, Southeast heating should work reliably for occasional cool days. Call HVAC technician if issues arise.
   - Assignment: November
   - Type: seasonal
   - Priority: medium (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Clean and maintain outdoor areas**

   - Description: Rake leaves and remove fall debris from lawn and beds. Clean and store pool equipment if closing pool for winter. Trim back perennials. Southeast fall cleanup is lighter than northern regions but outdoor spaces still need attention.
   - Assignment: November
   - Type: seasonal
   - Priority: medium (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Inspect weatherproofing**

   - Description: Check weatherstripping on doors and windows. Look for gaps that allow air leaks. Add door sweeps where needed. While Southeast winters are mild, proper sealing improves heating efficiency and keeps out humidity and pests. Replace worn weatherstripping.
   - Assignment: November
   - Type: seasonal
   - Priority: medium (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Check holiday decoration safety**

   - Description: Inspect holiday lights for frayed wires or broken sockets before installing. Test outdoor outlets are GFCI protected. Don't overload circuits. Use outdoor-rated decorations outside. Ensure ladders are stable. Southeast holiday decorating is popular - prioritize safety.
   - Assignment: November
   - Type: seasonal
   - Priority: medium (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

6. **Test garage door auto-reverse safety again**

   - Description: Place board on ground in door path and close - door should reverse when touching board. Wave broom under closing door - should reverse immediately. Adjust sensors if needed. Test periodically to ensure this critical safety feature functions properly.
   - Assignment: November
   - Type: seasonal
   - Priority: medium (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

7. **Inspect and clean gutters of fall leaves**

   - Description: Remove accumulated fall leaves from gutters and downspouts. Flush with hose to ensure flow. Check for sagging or damage. Southeast fall leaf drop is lighter than North but gutters still need clearing before winter rains arrive.
   - Assignment: November
   - Type: seasonal
   - Priority: medium (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

8. **Test backup sump pump battery (if applicable)**

   - Description: Pour water in sump pit to activate pump. Then disconnect power and verify backup battery system activates and pumps water. Charge or replace battery if weak. Southeast low areas need reliable sump pumps for heavy winter rains.
   - Assignment: November
   - Type: seasonal
   - Priority: medium (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

9. **Inspect snow removal equipment (snowblower, shovels, salt)**

   - Description: Not applicable for most Southeast locations. In northern parts of region (mountains, upper South), check equipment now. Most Southeast homes don't need snow removal equipment - occasional snow melts quickly on its own.
   - Assignment: November
   - Type: seasonal
   - Priority: medium (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

10. **Test outdoor outlets (holiday lighting safety)**

   - Description: Plug lamp or tester into each outdoor outlet and press GFCI test button - should trip immediately. Reset to restore power. Replace outlets that don't trip. Essential safety before plugging in holiday lights and decorations outdoors.
   - Assignment: November
   - Type: seasonal
   - Priority: medium (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

11. **Inspect weatherproofing on exterior doors/windows**

   - Description: Check caulk around door and window frames for cracks or gaps. Inspect weatherstripping on doors for wear. Replace damaged caulk and weatherstripping. Southeast humidity and storms stress seals - maintain weatherproofing for efficiency and protection.
   - Assignment: November
   - Type: seasonal
   - Priority: medium (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

12. **Clean washing machine drain filter**

   - Description: Open access panel at washer bottom front, place towels underneath, and remove filter. Clean out lint and debris. Replace and test for leaks. Humid Southeast climate requires regular filter cleaning every 2-3 months to prevent drainage issues.
   - Assignment: November
   - Type: seasonal
   - Priority: medium (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Humid Southeast climate requires regular filter cleaning every 2-3 months to prevent drainage issues.

### weatherSpecific

1. **Prepare for cooler but mild winter**

   - Description: Southeast winters bring pleasant daytime temperatures but occasional cold snaps. Prepare light outerwear, ensure heating works, protect sensitive plants. Stock supplies for rare ice or snow events. Enjoy comfortable winter while staying prepared for occasional extreme weather.
   - Assignment: November
   - Type: weatherSpecific
   - Priority: medium (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check heating system for occasional use**

   - Description: Verify heat works properly for occasional cool days and nights. Southeast homes don't use heat constantly, but reliable heating is important for comfort. Test system early in season to address issues before you need it during cold snap.
   - Assignment: November
   - Type: weatherSpecific
   - Priority: medium (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Monitor humidity levels during heating**

   - Description: Occasional heat use can dry indoor air in Southeast. Monitor humidity with hygrometer - ideal 30-50%. May need humidifier during heating periods. Too dry causes discomfort and static. Balance heating needs with humidity comfort.
   - Assignment: November
   - Type: weatherSpecific
   - Priority: medium (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Check for minimal freeze protection needs**

   - Description: Southeast rarely freezes, but when it does, unprepared homes suffer damage. Cover outdoor faucets, know how to drip faucets, protect sensitive plants. Have freeze emergency plan ready for occasional Arctic fronts that reach Southeast.
   - Assignment: November
   - Type: weatherSpecific
   - Priority: medium (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Inspect for reduced pest activity**

   - Description: Pests remain active year-round in mild Southeast climate, though activity decreases slightly in winter. Continue monitoring for ants, termites, and rodents. Maintain pest control measures. Southeast winter doesn't provide pest-killing freezes like northern regions.
   - Assignment: November
   - Type: weatherSpecific
   - Priority: medium (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Pests remain active year-round in mild Southeast climate, though activity decreases slightly in winter.

## December

### seasonal

1. **Monitor heating system performance**

   - Description: As Southeast experiences coolest weather, monitor heating system operation. Listen for unusual noises. Check all rooms heat adequately. Replace filter monthly during use. If system struggles or makes noise, call HVAC technician for repair before holidays.
   - Assignment: December
   - Type: seasonal
   - Priority: medium (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Replace filter monthly during use.

2. **Check holiday decorations and lighting**

   - Description: Inspect all holiday lights and decorations for safety. Check for frayed wires, broken bulbs, or damaged connections. Don't overload outlets. Use outdoor-rated items outside. Turn off lights when away or sleeping. Southeast holiday displays are beautiful - keep them safe.
   - Assignment: December
   - Type: seasonal
   - Priority: medium (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Maintain mild winter preparations**

   - Description: Keep home ready for Southeast winter variability. Monitor weather forecasts for occasional cold snaps or freezes. Protect sensitive plants when freezes threaten. Ensure heating works reliably. Stock supplies for rare winter weather events.
   - Assignment: December
   - Type: seasonal
   - Priority: medium (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Test smoke and carbon monoxide detectors**

   - Description: Press test button on all smoke and CO detectors. Replace batteries in chirping units. Clean dust from sensors with vacuum. Detectors should be on every level and near sleeping areas. Holiday season requires extra fire safety vigilance with candles and decorations.
   - Assignment: December
   - Type: seasonal
   - Priority: medium (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Check weatherstripping and insulation**

   - Description: Inspect door and window seals for gaps allowing cold air or humidity entry. Replace worn weatherstripping. Check attic insulation is adequate and evenly distributed. Southeast mild winters still benefit from good weatherproofing for comfort and efficiency.
   - Assignment: December
   - Type: seasonal
   - Priority: medium (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

6. **Check water heater pressure relief valve (carefully lift lever)**

   - Description: Carefully lift lever on pressure relief valve at top or side of water heater. Water should discharge through drain pipe. Release lever - discharge should stop. If valve doesn't work or won't stop dripping after test, call plumber immediately for safety.
   - Assignment: December
   - Type: seasonal
   - Priority: medium (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

7. **Test indoor circuit breakers (flip each one to ensure not stuck)**

   - Description: Open electrical panel and flip each breaker to off then back to on. Stuck breakers won't protect circuits. Breakers should snap firmly. If any feel loose or won't reset, call electrician. Working breakers are essential safety protection.
   - Assignment: December
   - Type: seasonal
   - Priority: medium (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

8. **Inspect attic and crawl space for moisture or leaks**

   - Description: Check attic and crawl space for water stains, dampness, or active leaks. Look for mold or musty odors. Ensure adequate ventilation. Southeast humidity requires good moisture control even in winter. Address leaks and ventilation issues immediately.
   - Assignment: December
   - Type: seasonal
   - Priority: medium (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

9. **Test furnace emergency shut-off switch**

   - Description: Locate red emergency shut-off switch near furnace (looks like light switch). Flip to off - furnace should stop immediately. Flip back on - furnace should restart. Working emergency switch critical for safety if furnace problems occur.
   - Assignment: December
   - Type: seasonal
   - Priority: medium (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

10. **Run whole-home safety drill (fire escape plan + extinguisher use)**

   - Description: Practice fire escape plan with entire household. Know two exits from each room. Designate outside meeting place. Show everyone fire extinguisher locations and how to use. Holiday season with candles, lights, and cooking requires extra fire safety awareness and preparation.
   - Assignment: December
   - Type: seasonal
   - Priority: medium (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Monitor for occasional freeze conditions**

   - Description: Southeast can experience occasional freezes December through February. Monitor weather forecasts for freeze warnings. Cover outdoor faucets, drip indoor faucets, protect sensitive plants. Bring pets inside. Southeast freezes are brief but can damage unprepared homes and gardens.
   - Assignment: December
   - Type: weatherSpecific
   - Priority: medium (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check heating system during cold snaps**

   - Description: During occasional Southeast cold snaps, verify heating system maintains comfortable temperature. Don't set thermostat unusually high - systems not designed for extreme demand. If inadequate heating, use space heaters safely or call HVAC technician.
   - Assignment: December
   - Type: weatherSpecific
   - Priority: medium (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Prepare for mild winter storm conditions**

   - Description: Southeast winter storms bring rain, occasional ice, and rare snow. Stock basic emergency supplies. Know how to turn off water main if pipes freeze. Have flashlights and batteries ready. Most winter weather is mild but be prepared for exceptions.
   - Assignment: December
   - Type: weatherSpecific
   - Priority: medium (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Monitor humidity during heating season**

   - Description: Occasional heat use can dry indoor air. Monitor with hygrometer - maintain 30-50% humidity. Use humidifier if too dry. Southeast winters generally humid but indoor heating creates dry pockets. Balance comfort with preventing excess moisture.
   - Assignment: December
   - Type: weatherSpecific
   - Priority: medium (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Monitor humidity during heating season

5. **Check for continued year-round pest activity**

   - Description: Mild Southeast winters allow pests to remain active year-round. Continue monitoring for ants, roaches, termites, and rodents. Check for entry points and seal gaps. Professional pest control may be needed. Southeast doesn't get killing freezes that eliminate pests.
   - Assignment: December
   - Type: weatherSpecific
   - Priority: medium (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Check for continued year-round pest activity
     - Mild Southeast winters allow pests to remain active year-round.

## Year-round

1. **Test smoke and carbon monoxide detectors monthly**

   - Description: Press test button on all smoke and CO detectors monthly to verify operation. Replace batteries twice yearly or when chirping. Clean dust from sensors with vacuum. Replace smoke detectors over 10 years old and CO detectors over 7 years old for safety.
   - Assignment: yearRound
   - Type: yearRound
   - Priority: not specified (no task-level priority and no year-round fallback priority)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Test smoke and carbon monoxide detectors monthly
     - Press test button on all smoke and CO detectors monthly to verify operation.
     - Replace batteries twice yearly or when chirping.

2. **Check HVAC filters monthly (more frequent due to humidity)**

   - Description: Remove AC/furnace filter monthly and hold to light - replace if you cannot see through it clearly. Southeast humidity and long cooling season require frequent filter changes. Dirty filters reduce efficiency, increase costs, and strain system. Use quality pleated filters.
   - Assignment: yearRound
   - Type: yearRound
   - Priority: not specified (no task-level priority and no year-round fallback priority)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Check HVAC filters monthly (more frequent due to humidity)
     - Remove AC/furnace filter monthly and hold to light - replace if you cannot see through it clearly.

3. **Inspect for mold and moisture quarterly**

   - Description: Check bathrooms, basements, attics, and closets for mold, mildew, or musty odors every 3 months. Look for water stains or dampness. Monitor humidity with hygrometer - keep 30-50%. Southeast humidity promotes mold - early detection prevents health issues and damage.
   - Assignment: yearRound
   - Type: yearRound
   - Priority: not specified (no task-level priority and no year-round fallback priority)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Inspect for mold and moisture quarterly
     - Check bathrooms, basements, attics, and closets for mold, mildew, or musty odors every 3 months.

4. **Professional pest control quarterly**

   - Description: Schedule professional pest control service every 3 months for preventive treatment. Southeast climate supports year-round pest activity including termites, ants, roaches, and mosquitoes. Regular professional service is more effective and economical than reactive treatments.
   - Assignment: yearRound
   - Type: yearRound
   - Priority: not specified (no task-level priority and no year-round fallback priority)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Professional pest control quarterly
     - Schedule professional pest control service every 3 months for preventive treatment.
     - Southeast climate supports year-round pest activity including termites, ants, roaches, and mosquitoes.

5. **Hurricane preparedness supplies check quarterly**

   - Description: Every 3 months review hurricane emergency kit: water, non-perishable food, batteries, flashlights, medications, first aid, cash, important documents. Replace expired items. Test generator. Refresh supplies before hurricane season. Southeast coastal living demands constant preparedness.
   - Assignment: yearRound
   - Type: yearRound
   - Priority: not specified (no task-level priority and no year-round fallback priority)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Hurricane preparedness supplies check quarterly
     - Every 3 months review hurricane emergency kit: water, non-perishable food, batteries, flashlights, medications, first aid, cash, important documents.

# Region: Midwest

- Data key: Midwest
- Region value: Midwest
- Climate zone: Continental/Humid Continental

## January

### seasonal

1. **Peak heating season maintenance**

   - Description: Monitor furnace during coldest months. Listen for unusual noises. Replace filters monthly during heavy use. Ensure all vents are open and unobstructed. Midwest January cold is extreme - heating system must run reliably for months ahead.
   - Assignment: January
   - Type: seasonal
   - Priority: high (inherited from January month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Monitor furnace during coldest months.
     - Replace filters monthly during heavy use.

2. **Check heating system efficiency**

   - Description: Monitor heating performance and energy bills. Ensure home heats evenly. Listen for concerning sounds like banging or grinding. If system runs constantly but doesn't heat well, call HVAC technician. Midwest winter is long and cold - efficiency matters.
   - Assignment: January
   - Type: seasonal
   - Priority: high (inherited from January month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Inspect and clean fireplace/chimney**

   - Description: Remove ash buildup when cool. Check damper operation. Look for cracks in firebox. If used regularly, schedule professional chimney sweep to remove dangerous creosote. Midwest homes rely on fireplaces for supplemental heat during harsh winters.
   - Assignment: January
   - Type: seasonal
   - Priority: high (inherited from January month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Test carbon monoxide detectors**

   - Description: Press test button on all CO detectors to verify operation. Replace batteries if needed. Place detectors near bedrooms and on every level. Midwest winter heating season with closed windows makes CO detector testing critical for safety.
   - Assignment: January
   - Type: seasonal
   - Priority: high (inherited from January month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Check insulation and weatherstripping**

   - Description: Inspect attic insulation depth (should be 12-14 inches in Midwest). Look for gaps or compressed areas. Check door and window weatherstripping for wear. Good insulation critical for keeping Midwest homes warm and reducing heating costs in brutal winter.
   - Assignment: January
   - Type: seasonal
   - Priority: high (inherited from January month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

6. **Clean washing machine drain filter**

   - Description: Open access panel at bottom front of washer. Place towels underneath and remove filter. Clean out lint, coins, and debris. Replace filter and check for leaks. Prevents drainage issues and extends washer life through winter months.
   - Assignment: January
   - Type: seasonal
   - Priority: high (inherited from January month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Monitor for extreme cold effects on pipes**

   - Description: During subzero weather, feel pipes in unheated areas for cold spots. Open cabinet doors under sinks for warm air circulation. Let faucets drip when temps drop below zero. Midwest extreme cold can freeze and burst pipes - prevention is critical.
   - Assignment: January
   - Type: weatherSpecific
   - Priority: high (inherited from January month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check for ice dams and roof snow load**

   - Description: Look for icicles and ice buildup at roof edges indicating ice dams. If snow exceeds 2 feet or roof sags, carefully remove snow with roof rake from ground. Never climb snow-covered roof. Midwest heavy snow causes ice dams and structural stress.
   - Assignment: January
   - Type: weatherSpecific
   - Priority: high (inherited from January month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Ensure adequate heating system capacity**

   - Description: Verify furnace keeps home comfortable during coldest days. System should not run constantly. If it struggles to maintain temperature, it may need service or be undersized. Midwest January cold tests heating systems to their limits.
   - Assignment: January
   - Type: weatherSpecific
   - Priority: high (inherited from January month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Monitor humidity levels (winter air is dry)**

   - Description: Use hygrometer to check indoor humidity - ideal 30-50%. Midwest winter air is very dry indoors. Run humidifier if too dry to prevent health issues, static, and wood cracking. Balance with preventing excess condensation on windows.
   - Assignment: January
   - Type: weatherSpecific
   - Priority: high (inherited from January month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Check for drafts and heat loss**

   - Description: On windy winter day, hold candle or incense near windows and doors. Wavering smoke indicates air leaks. Seal gaps with caulk or weatherstripping. Midwest winter drafts waste energy and create uncomfortable cold spots in home.
   - Assignment: January
   - Type: weatherSpecific
   - Priority: high (inherited from January month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## February

### seasonal

1. **Continue peak winter maintenance**

   - Description: Maintain vigilance with heating system during continued cold. Replace furnace filters monthly. Check for ice dams after storms. Monitor energy usage for unusual increases. Midwest February remains harsh - keep all winter systems functioning optimally.
   - Assignment: February
   - Type: seasonal
   - Priority: high (inherited from February month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Replace furnace filters monthly.

2. **Service heating system**

   - Description: Schedule professional HVAC inspection while still in heating season. Technician will check burners, heat exchanger, and safety controls. Address any issues before spring. Midwest furnaces work hard all winter - professional service ensures safety and efficiency.
   - Assignment: February
   - Type: seasonal
   - Priority: high (inherited from February month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Check attic insulation and ventilation**

   - Description: Inspect attic insulation for proper depth and coverage. Ensure soffit and ridge vents are clear of snow and ice. Good insulation and ventilation prevent ice dams and reduce heating costs. Midwest attics need both for winter performance.
   - Assignment: February
   - Type: seasonal
   - Priority: high (inherited from February month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Inspect storm doors and windows**

   - Description: Check storm windows and doors for tight seals. Look for condensation between glass panes indicating seal failure. Ensure latches work properly. Storm windows critical for Midwest homes to reduce heat loss and improve comfort during long winters.
   - Assignment: February
   - Type: seasonal
   - Priority: high (inherited from February month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Monitor energy usage**

   - Description: Compare winter heating bills to previous years. Unexpectedly high bills suggest system inefficiency or air leaks. Note patterns and investigate causes. Midwest winter heating costs are significant - monitoring helps control expenses and identify problems early.
   - Assignment: February
   - Type: seasonal
   - Priority: high (inherited from February month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Prepare for potential severe winter weather**

   - Description: Keep emergency supplies stocked: flashlights, batteries, water, non-perishable food, blankets. Have backup heat source plan. Stock snow removal supplies. Midwest late winter can bring severe blizzards - maintain constant readiness for major storms.
   - Assignment: February
   - Type: weatherSpecific
   - Priority: high (inherited from February month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check ice and snow removal equipment**

   - Description: Ensure snowblower runs properly. Check belts, auger, and chute operation. Replace worn scraper on snow blower. Sharpen shovel edges. Stock ice melt. Midwest February still brings heavy snow - equipment must work reliably through end of winter.
   - Assignment: February
   - Type: weatherSpecific
   - Priority: high (inherited from February month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Monitor heating system during cold snaps**

   - Description: During extreme cold, verify furnace maintains comfortable temperature without constant running. Listen for unusual noises. Check filter is clean. If system struggles, call HVAC technician immediately - Midwest cold is dangerous without reliable heat.
   - Assignment: February
   - Type: weatherSpecific
   - Priority: high (inherited from February month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Check for winter damage to exterior**

   - Description: Look for ice damage to gutters, siding, or trim. Check for cracks in concrete from freeze-thaw cycles. Note damage for spring repairs. Midwest winter weather is harsh on exteriors - documenting damage helps plan spring maintenance.
   - Assignment: February
   - Type: weatherSpecific
   - Priority: high (inherited from February month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Ensure proper ventilation during heating**

   - Description: Run bathroom and kitchen exhaust fans during use. Crack windows briefly on mild days for fresh air. Check that dryer vents outside. Midwest winter homes sealed tight need ventilation to prevent moisture buildup, stuffiness, and mold growth.
   - Assignment: February
   - Type: weatherSpecific
   - Priority: high (inherited from February month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## March

### seasonal

1. **Begin spring transition planning**

   - Description: As Midwest begins slow thaw, plan spring projects. Order supplies for painting, landscaping, repairs. Check garage organization. Prepare for mud season and rapid weather changes. March brings variable weather - use mild days for outdoor project planning.
   - Assignment: March
   - Type: seasonal
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check HVAC system for seasonal change**

   - Description: Test both heating and cooling modes as spring approaches. Schedule professional AC service before warm weather. Replace filter. Midwest March sees wild temperature swings - both systems must work reliably for unpredictable weather.
   - Assignment: March
   - Type: seasonal
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Inspect exterior for winter damage**

   - Description: Walk around home checking for damaged siding, gutters, or trim from ice and snow. Look for cracks in foundation or concrete. Note repairs needed. Midwest winter is harsh - thoroughly assess damage before starting spring repairs.
   - Assignment: March
   - Type: seasonal
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Begin spring cleaning preparation**

   - Description: Start deep cleaning after long winter indoors. Open windows on mild days. Wash winter-sealed windows. Vacuum vents and baseboards. Organize closets. Midwest spring cleaning refreshes home after months of closed-up winter living.
   - Assignment: March
   - Type: seasonal
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Check outdoor equipment for spring startup**

   - Description: Inspect lawn mower, remove snowblower. Check garden tools and hoses. Test outdoor faucets once thawed. Prepare equipment for spring yard work. Midwest spring arrives gradually - check equipment during mild weather windows.
   - Assignment: March
   - Type: seasonal
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

6. **Clean washing machine drain filter**

   - Description: Open access panel at washer bottom, place towels underneath, remove and clean filter of lint and debris. Replace and test for leaks. Regular filter cleaning prevents drainage issues and extends washer life through seasonal changes.
   - Assignment: March
   - Type: seasonal
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Monitor for spring flooding potential**

   - Description: As snow melts, check basement for water infiltration. Test sump pump regularly. Clear floor drains. Monitor weather for heavy spring rains. Midwest spring melt and rains cause flooding - stay vigilant and keep sump pump working.
   - Assignment: March
   - Type: weatherSpecific
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check basement and foundation drainage**

   - Description: Ensure water flows away from foundation as snow melts. Check for basement dampness or leaks. Verify downspouts extend 5+ feet from house. Poor drainage during Midwest spring thaw causes foundation damage and basement flooding.
   - Assignment: March
   - Type: weatherSpecific
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Inspect roof for winter damage**

   - Description: From ground with binoculars, look for missing or damaged shingles from ice and wind. Check flashing around chimneys. Look for signs of ice dam damage. Midwest winter is hard on roofs - assess condition before spring rains.
   - Assignment: March
   - Type: weatherSpecific
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Begin severe weather season preparation**

   - Description: As tornado season approaches, identify safe interior room. Stock emergency supplies. Review family plan. Trim dead tree branches. Midwest March marks start of severe weather season - prepare early for spring and summer storms.
   - Assignment: March
   - Type: weatherSpecific
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Check sump pump operation**

   - Description: Pour bucket of water into sump pit to test pump activation. Check discharge pipe is clear and draining away from foundation. Clean inlet screen. Test backup battery if equipped. Critical as Midwest spring melt brings water.
   - Assignment: March
   - Type: weatherSpecific
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## April

### seasonal

1. **Complete spring maintenance tasks**

   - Description: Thoroughly clean and inspect your home after winter. Wash windows inside and out, check screens for damage, inspect exterior paint and caulking. Clean gutters and test downspouts. Check foundation for cracks. Midwest spring is ideal for catching winter damage before summer weather.
   - Assignment: April
   - Type: seasonal
   - Priority: high (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Service air conditioning system**

   - Description: Schedule professional AC service before hot weather arrives. Technician will clean coils, check refrigerant levels, test electrical components, and ensure system runs efficiently. Early service avoids summer rush and ensures comfort when Midwest heat and humidity arrive.
   - Assignment: April
   - Type: seasonal
   - Priority: high (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Deep clean interior after winter**

   - Description: Open windows on nice days for fresh air. Wash walls, baseboards, and ceiling fans. Shampoo carpets and clean behind appliances. Vacuum air vents and replace HVAC filters. Midwest homes sealed tight all winter need thorough spring cleaning to refresh indoor air quality.
   - Assignment: April
   - Type: seasonal
   - Priority: high (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Clean and inspect gutters**

   - Description: Remove leaves, twigs, and spring debris from gutters and downspouts. Flush with hose to check flow and look for leaks. Ensure downspouts direct water 5+ feet from foundation. Repair sagging sections. Midwest spring rains require clean gutters to prevent foundation damage.
   - Assignment: April
   - Type: seasonal
   - Priority: high (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Check exterior paint and maintenance needs**

   - Description: Walk around home inspecting for peeling or cracking paint, damaged siding, or wood rot. Scrape and touch up small areas now. Note larger projects for summer. Address wood rot immediately to prevent structural issues. Midwest freeze-thaw cycles are hard on exteriors.
   - Assignment: April
   - Type: seasonal
   - Priority: high (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

6. **Test outdoor faucets and irrigation systems**

   - Description: Turn on each outdoor faucet fully and check for leaks at handle and where pipe enters house. If water drips inside or flow is weak, pipe may have frozen - call plumber. Test irrigation zones for broken heads or leaks. Midwest freezing can damage outdoor plumbing.
   - Assignment: April
   - Type: seasonal
   - Priority: high (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

7. **Inspect deck, porch, and stairs for winter damage**

   - Description: Check all deck boards for soft spots indicating rot - probe with screwdriver. Shake railings to test stability. Look for popped nails, loose screws, or cracked boards. Tighten fasteners and replace damaged wood before someone gets hurt from Midwest winter damage.
   - Assignment: April
   - Type: seasonal
   - Priority: high (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

8. **Check and test sump pump**

   - Description: Pour bucket of water into sump pit to ensure pump activates and drains properly. Verify discharge pipe is clear and draining 5+ feet from foundation. Clean inlet screen. Test backup battery if equipped. Critical as Midwest spring rains and snowmelt bring water.
   - Assignment: April
   - Type: seasonal
   - Priority: high (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

9. **Inspect roof and attic after winter**

   - Description: From ground with binoculars, look for missing, damaged, or curled shingles from ice and wind. Check flashing around chimneys and vents. Inspect attic for water stains or daylight showing through. Midwest winter is harsh on roofs - repair damage before spring rains.
   - Assignment: April
   - Type: seasonal
   - Priority: high (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

10. **Service lawn mower and outdoor power equipment**

   - Description: Change mower oil, replace spark plug and air filter, sharpen blade. Check belts and cables. Clean debris from deck. Service string trimmer and check fuel lines. Fill with fresh gas. Midwest lawn care season is starting - equipment must be ready.
   - Assignment: April
   - Type: seasonal
   - Priority: high (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Prepare for tornado season**

   - Description: Identify interior safe room or basement location away from windows. Stock emergency supplies: water, flashlight, battery radio, first aid kit. Review family emergency plan. Trim dead tree branches that could become projectiles. Midwest tornado season runs April through June - prepare early.
   - Assignment: April
   - Type: weatherSpecific
   - Priority: high (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check severe weather preparedness**

   - Description: Test weather radio and smartphone alerts. Ensure everyone knows tornado warning signals. Practice moving to safe location quickly. Keep shoes and flashlight by bed. Review insurance coverage. Midwest severe weather can develop rapidly - preparedness saves lives.
   - Assignment: April
   - Type: weatherSpecific
   - Priority: high (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Monitor for spring flooding**

   - Description: Check basement for water stains or dampness during spring rains and snowmelt. Keep sump pump working. Move valuables off basement floor. Monitor weather forecasts for heavy rain. Clear storm drains near property. Midwest spring flooding can happen quickly with heavy rains.
   - Assignment: April
   - Type: weatherSpecific
   - Priority: high (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Inspect drainage systems**

   - Description: Walk property during or after rain watching water flow. Ground should slope away from house - add soil to low spots if needed. Ensure downspouts drain far from foundation. Clear debris from yard drains. Poor drainage causes Midwest basement flooding and foundation damage.
   - Assignment: April
   - Type: weatherSpecific
   - Priority: high (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Check storm shelter or safe room**

   - Description: If you have basement or safe room, ensure it's accessible and stocked with emergency supplies. Clear clutter blocking quick access. Test battery radio and flashlight. Keep emergency kit current. Midwest tornado season requires functional safe shelter ready for immediate use.
   - Assignment: April
   - Type: weatherSpecific
   - Priority: high (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## May

### seasonal

1. **Peak tornado season preparation**

   - Description: May is peak tornado month in Midwest. Review emergency plan with family weekly. Test weather radio daily. Keep safe room stocked and accessible. Monitor weather forecasts closely. Have multiple ways to receive warnings. Know difference between watch and warning. Be ready to take shelter within seconds.
   - Assignment: May
   - Type: seasonal
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Review emergency plan with family weekly.
     - Test weather radio daily.

2. **Complete outdoor maintenance**

   - Description: Fertilize lawn with appropriate spring formula. Aerate compacted soil and overseed thin areas. Mulch garden beds 2-3 inches deep. Prune dead branches from trees and shrubs. Edge borders and plant annuals. Midwest May weather is ideal for establishing lawn and gardens before summer heat.
   - Assignment: May
   - Type: seasonal
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Service lawn equipment and tools**

   - Description: Change mower oil mid-season and check blade sharpness - sharpen if needed for clean cuts. Clean air filter and check spark plug. Sharpen pruning shears and spade edges. Oil moving parts on tools. Replace worn trimmer line. Well-maintained equipment performs better through busy Midwest growing season.
   - Assignment: May
   - Type: seasonal
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Check and maintain deck/patio**

   - Description: Sweep and power wash deck or patio. Check for loose boards, nails, or rotted wood on deck - repair immediately. Test railing stability. Apply deck stain or sealer if wood looks weathered. Clean and arrange patio furniture. Ensure outdoor spaces are safe and ready for Midwest summer entertaining.
   - Assignment: May
   - Type: seasonal
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Inspect screens and outdoor furniture**

   - Description: Check all window and door screens for tears or holes - repair with patch kits or replace damaged screens. Clean screens with soap and water. Inspect outdoor furniture for rust, loose joints, or torn fabric. Make repairs before heavy use. Good screens keep bugs out during Midwest summer.
   - Assignment: May
   - Type: seasonal
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

6. **Clean washing machine drain filter**

   - Description: Open access panel at washer bottom front, place towels underneath, remove and clean filter of lint, coins, and debris. Replace filter and test for leaks during next wash. Clean filter prevents drainage issues and extends washer life through seasonal changes and heavy use.
   - Assignment: May
   - Type: seasonal
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

7. **Plant gardens and maintain landscaping**

   - Description: After last frost (typically early May in Midwest), plant vegetable gardens and tender annuals. Water new plants deeply. Deadhead spring bulbs and divide overcrowded perennials. Apply pre-emergent weed control. Midwest May is prime planting time with warm soil and reliable rainfall.
   - Assignment: May
   - Type: seasonal
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

8. **Test outdoor GFCI outlets**

   - Description: Press "test" button on each outdoor GFCI outlet - power should cut immediately. Press "reset" to restore power. If outlet doesn't trip or won't reset, call electrician - this is serious safety issue. Outdoor GFCI protection is critical for Midwest summer power tool and equipment use.
   - Assignment: May
   - Type: seasonal
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

9. **Check air conditioning system operation**

   - Description: Turn AC to cooling mode and verify it cools properly. Listen for unusual noises. Check that cold air flows from all vents. Replace filter. If system struggles or makes strange sounds, call HVAC technician now before Midwest heat and humidity arrive in earnest.
   - Assignment: May
   - Type: seasonal
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

10. **Inspect and clean gutters after spring pollen**

   - Description: Remove accumulated pollen, seeds, oak tassels, and spring debris from gutters. Flush with hose to check flow. Ensure downspouts drain 5+ feet from foundation. Check for wasp nests forming in gutters. Midwest spring pollen can clog gutters before summer storms arrive.
   - Assignment: May
   - Type: seasonal
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Peak tornado season vigilance**

   - Description: May brings highest tornado risk in Midwest. Monitor weather constantly during severe weather outbreaks. Have weather radio on when storms threaten. Know your county name for warnings. Practice drills with family. Go to shelter immediately when warning issued - don't wait to see the tornado.
   - Assignment: May
   - Type: weatherSpecific
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check severe weather warning systems**

   - Description: Test all methods of receiving warnings: weather radio, smartphone apps, outdoor sirens. Ensure everyone in household can receive alerts. Have backup battery power for radios and phones. Keep chargers handy. Midwest severe weather can knock out power - have multiple warning sources.
   - Assignment: May
   - Type: weatherSpecific
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Prepare air conditioning for summer heat**

   - Description: Ensure AC is serviced and ready before Midwest heat and humidity arrive. Clean outdoor unit of debris. Trim vegetation to 2 feet clearance. Replace filters. Test system on hot day to verify adequate cooling. Schedule service now if any issues - don't wait for first 95°F day.
   - Assignment: May
   - Type: weatherSpecific
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Monitor for hail and storm damage**

   - Description: After severe storms, inspect roof, siding, and vehicles for hail damage. Look for dented gutters, damaged shingles, or broken siding. Check air conditioner fins for damage. Document with photos for insurance. Midwest May hail storms can cause thousands in damage - inspect promptly.
   - Assignment: May
   - Type: weatherSpecific
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Check emergency supplies and communications**

   - Description: Restock tornado emergency kit: water, non-perishable food, flashlights, batteries, first aid, medications. Test weather radio and charge backup batteries. Program emergency contacts in phone. Review insurance coverage. Midwest severe weather season requires constant emergency readiness.
   - Assignment: May
   - Type: weatherSpecific
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## June

### seasonal

1. **Begin summer cooling season**

   - Description: Ensure AC runs efficiently as Midwest heat and humidity arrive. Replace filters monthly during peak use. Keep outdoor unit clear of grass clippings and debris. Close blinds during hottest hours. Use ceiling fans to circulate air. Monitor energy bills for unusual increases indicating system problems.
   - Assignment: June
   - Type: seasonal
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Replace filters monthly during peak use.

2. **Monitor air conditioning efficiency**

   - Description: Check that AC cools home adequately without running constantly. Listen for unusual noises, clicking, or grinding sounds. Verify cold air flows from all vents. If ice forms on outdoor unit or system struggles, call HVAC technician immediately. Midwest summer heat demands reliable cooling.
   - Assignment: June
   - Type: seasonal
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Maintain outdoor living spaces**

   - Description: Sweep deck and patio regularly. Water lawn and gardens deeply but less frequently to encourage deep roots. Deadhead flowers weekly. Trim hedges and shrubs. Check outdoor furniture for wear. Clean grill grates after each use. Midwest summer is prime time for outdoor entertaining.
   - Assignment: June
   - Type: seasonal
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Deadhead flowers weekly.
     - Clean grill grates after each use.

4. **Check attic ventilation**

   - Description: On hot day, check attic temperature - shouldn't exceed 20°F above outdoor temp. Ensure soffit and ridge vents are clear and not blocked by insulation. Verify attic fan runs properly if equipped. Good ventilation prevents roof damage and reduces Midwest cooling costs significantly.
   - Assignment: June
   - Type: seasonal
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Inspect and maintain pool if applicable**

   - Description: Test and balance pool water daily (pH 7.2-7.8, chlorine 1-3 ppm). Clean filters weekly and skim debris daily. Vacuum pool floor weekly. Check pump and filter for proper operation. Inspect pool equipment for leaks. Midwest summer pool use requires consistent maintenance for safety.
   - Assignment: June
   - Type: seasonal
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Test and balance pool water daily (pH 7.
     - Clean filters weekly and skim debris daily.
     - Vacuum pool floor weekly.

6. **Flush water heater**

   - Description: Turn off power and water supply to heater. Attach hose to drain valve and run water to drain or bucket until it runs clear, removing sediment. Close valve, restore water, then power. Flushing annually extends heater life and improves efficiency through Midwest hard water areas.
   - Assignment: June
   - Type: seasonal
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Flushing annually extends heater life and improves efficiency through Midwest hard water areas.

7. **Test and clean outdoor equipment**

   - Description: Check lawn mower operation and sharpen blade mid-season for clean cuts. Clean grass buildup from mower deck after each use. Inspect trimmer line and replace as needed. Check garden hoses for leaks and replace worn washers. Maintain equipment through busy Midwest growing season.
   - Assignment: June
   - Type: seasonal
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Clean grass buildup from mower deck after each use.

8. **Inspect plumbing for leaks**

   - Description: Check under sinks, around toilets, and near water heater for moisture, stains, or drips. Feel pipes for dampness. Look for water meter movement with all water off indicating leak. Fix drips promptly - small leaks waste water and can cause major damage if ignored.
   - Assignment: June
   - Type: seasonal
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

9. **Check and maintain dehumidifier**

   - Description: Empty dehumidifier bucket daily or ensure drain hose works properly. Clean filter monthly. Monitor basement humidity - keep between 30-50% to prevent mold. Midwest summer humidity makes basements damp - dehumidifier prevents moisture damage and musty odors.
   - Assignment: June
   - Type: seasonal
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Empty dehumidifier bucket daily or ensure drain hose works properly.
     - Clean filter monthly.

10. **Inspect exterior for summer damage**

   - Description: Check siding, trim, and paint for damage from sun, wind, and storms. Look for cracks in caulking around windows and doors. Check foundation for new cracks or settling. Note repairs needed before fall. Midwest summer storms can damage exteriors - inspect regularly.
   - Assignment: June
   - Type: seasonal
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Continue tornado season vigilance**

   - Description: June still brings tornado risk in Midwest. Keep weather radio charged and monitor forecasts during severe weather. Know safe locations in home. Have emergency kit accessible. Practice quick response when warnings issued. Stay alert - summer tornadoes can be just as dangerous as spring.
   - Assignment: June
   - Type: weatherSpecific
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Prepare for summer heat and humidity**

   - Description: Stay hydrated when working outdoors. Work in early morning or evening during heat waves. Know signs of heat exhaustion. Ensure AC keeps home comfortable - call for service if struggling. Check on elderly neighbors. Midwest summer heat and humidity can be dangerous.
   - Assignment: June
   - Type: weatherSpecific
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Monitor cooling system capacity**

   - Description: Verify AC maintains comfortable temperature even on hottest days. System should not run continuously - if it does, may be undersized or need service. Replace filters monthly. Keep vents open and unobstructed. Midwest heat and humidity challenge cooling systems - monitor performance closely.
   - Assignment: June
   - Type: weatherSpecific
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Replace filters monthly.

4. **Check for severe weather damage**

   - Description: After summer thunderstorms, inspect for hail damage on roof, siding, vehicles, and AC unit. Look for dented gutters or broken shingles. Check for water infiltration in attic or basement. Document damage with photos for insurance. Midwest severe storms cause significant damage - inspect after each event.
   - Assignment: June
   - Type: weatherSpecific
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Midwest severe storms cause significant damage - inspect after each event.

5. **Inspect outdoor electrical systems**

   - Description: Check outdoor outlets, fixtures, and extension cords for damage, corrosion, or exposed wires. Ensure GFCI outlets work properly - test monthly. Keep electrical connections dry. Never use damaged cords. Unplug outdoor equipment during storms. Midwest summer storms create electrical hazards.
   - Assignment: June
   - Type: weatherSpecific
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Ensure GFCI outlets work properly - test monthly.

## July

### seasonal

1. **Peak summer heat maintenance**

   - Description: Replace AC filters monthly during heavy use - dirty filters reduce efficiency. Clean outdoor AC unit fins carefully. Keep thermostat at reasonable temperature (75-78°F). Close blinds during peak sun. Use programmable thermostat to reduce cooling when away. Midwest July heat demands efficient cooling.
   - Assignment: July
   - Type: seasonal
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Replace AC filters monthly during heavy use - dirty filters reduce efficiency.

2. **Monitor energy efficiency**

   - Description: Compare current electric bills to previous summers - significant increase suggests AC inefficiency or air leaks. Check that windows and doors seal tightly. Verify attic insulation is adequate. Consider energy audit if bills seem high. Midwest summer cooling costs are substantial - monitor carefully.
   - Assignment: July
   - Type: seasonal
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Maintain cooling systems**

   - Description: Listen for unusual AC noises daily. Check outdoor unit runs smoothly without laboring. Ensure ice doesn't form on unit. Verify cool air from all vents. Schedule immediate service if performance drops - don't wait during Midwest heat wave. Keep system running efficiently through hottest month.
   - Assignment: July
   - Type: seasonal
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Listen for unusual AC noises daily.

4. **Check outdoor equipment and furniture**

   - Description: Clean lawn mower after each use. Check oil level weekly. Sharpen mower blade if grass tears instead of clean cuts. Inspect outdoor furniture for sun damage or loose joints. Clean and cover grill after use. Store cushions when not in use. Maintain through peak Midwest summer use.
   - Assignment: July
   - Type: seasonal
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Clean lawn mower after each use.
     - Check oil level weekly.

5. **Inspect for heat-related expansion**

   - Description: Check doors and windows for sticking from heat expansion. Look for cracks in concrete or asphalt from heat. Monitor for gaps opening in siding or trim. Note areas that need attention when temperatures moderate. Midwest summer heat causes materials to expand and contract significantly.
   - Assignment: July
   - Type: seasonal
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

6. **Clean washing machine drain filter**

   - Description: Open access panel at bottom front of washer, place towels underneath, remove and clean filter of lint, coins, and debris. Replace filter and test for leaks. Monthly filter cleaning during summer prevents drainage issues and keeps washer running efficiently through heavy use.
   - Assignment: July
   - Type: seasonal
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Monthly filter cleaning during summer prevents drainage issues and keeps washer running efficiently through heavy use.

7. **Water lawn and gardens efficiently**

   - Description: Water early morning or evening to reduce evaporation. Water deeply but less frequently - 1 inch per week including rain. Use soaker hoses or drip irrigation for gardens. Mulch plants to retain moisture. Midwest July heat stresses plants - water wisely to conserve while keeping landscapes healthy.
   - Assignment: July
   - Type: seasonal
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Water deeply but less frequently - 1 inch per week including rain.

8. **Check and maintain dehumidifier operation**

   - Description: Empty dehumidifier daily or verify continuous drain works. Clean filter weekly during peak humidity. Monitor basement humidity - maintain 30-50%. If unit struggles, clean coils or call for service. Midwest summer humidity requires constant dehumidification to prevent mold and damage.
   - Assignment: July
   - Type: seasonal
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Empty dehumidifier daily or verify continuous drain works.
     - Clean filter weekly during peak humidity.

9. **Inspect grills and outdoor cooking equipment**

   - Description: Check propane tank for adequate fuel. Inspect gas lines for cracks or leaks using soapy water. Clean grill grates thoroughly and remove grease buildup from drip pans. Check burners for even flames. Midwest summer grilling season requires safe, well-maintained equipment.
   - Assignment: July
   - Type: seasonal
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

10. **Test and maintain garage door safety features**

   - Description: Place 2x4 board under closing door - it should reverse immediately. Wave broom under closing door - should reverse. Test wall button and remotes. Lubricate hinges, rollers, and track. Tighten loose hardware. Safety features prevent injuries from heavy doors.
   - Assignment: July
   - Type: seasonal
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Monitor air conditioning during heat waves**

   - Description: During extended 90°F+ periods, verify AC keeps home comfortable without running continuously. If system struggles, call HVAC technician immediately - waiting risks system failure during peak heat. Keep blinds closed, limit oven use, and avoid opening doors frequently during Midwest heat waves.
   - Assignment: July
   - Type: weatherSpecific
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check humidity control systems**

   - Description: Monitor indoor humidity with hygrometer - maintain 30-50% even during humid Midwest summers. Run dehumidifiers in basement. Ensure bathroom and kitchen exhaust fans vent outside. High humidity causes mold, discomfort, and AC inefficiency. Control humidity to protect home and health.
   - Assignment: July
   - Type: weatherSpecific
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Prepare for potential severe summer storms**

   - Description: Midwest July brings strong thunderstorms with damaging winds, hail, and lightning. Secure loose outdoor items before storms. Unplug sensitive electronics. Have flashlights ready. Monitor weather forecasts. Inspect for storm damage after severe weather. Stay indoors during lightning.
   - Assignment: July
   - Type: weatherSpecific
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Monitor energy usage during peak cooling**

   - Description: Check electric bills weekly during July. If usage seems excessive, verify AC filter is clean, outdoor unit is clear, and thermostat set reasonably. Look for air leaks around doors and windows. Consider fan use to supplement AC. Midwest peak cooling month drives highest bills - monitor closely.
   - Assignment: July
   - Type: weatherSpecific
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Check electric bills weekly during July.

5. **Check heat stress on exterior materials**

   - Description: Inspect siding and trim for warping, cracking, or pulling away from house due to heat. Look for paint blistering on south and west sides. Check caulking for drying and cracking. Note areas needing repair when temperatures drop. Midwest summer heat and sun damage exterior materials.
   - Assignment: July
   - Type: weatherSpecific
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## August

### seasonal

1. **Continue peak summer maintenance**

   - Description: Maintain vigilance with AC system - replace filters monthly, keep outdoor unit clear. Water lawn and gardens as needed. Continue monitoring energy usage. Check dehumidifier operation. Midwest August remains hot and humid - maintain all summer systems through end of peak season.
   - Assignment: August
   - Type: seasonal
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Maintain vigilance with AC system - replace filters monthly, keep outdoor unit clear.

2. **Monitor cooling system performance**

   - Description: Listen for AC struggling or unusual sounds. Verify system cools adequately without excessive run time. Check for ice formation on outdoor unit. If performance drops, call technician immediately - late summer repairs prevent expensive emergency calls. Keep system running through Midwest August heat.
   - Assignment: August
   - Type: seasonal
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Check and maintain outdoor areas**

   - Description: Continue lawn care with regular mowing at 2.5-3 inches height. Water deeply but less frequently. Deadhead flowers to encourage fall blooms. Apply fall lawn fertilizer late in month. Clean and organize garage. Midwest late summer is transition time - maintain while planning fall projects.
   - Assignment: August
   - Type: seasonal
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Inspect exterior for summer damage**

   - Description: Walk around home checking for storm damage, sun damage to paint or siding, or pest infiltration. Look for wasp nests under eaves. Check caulking around windows and doors. Note repairs needed before winter. Midwest summer weather stresses exteriors - assess damage before fall.
   - Assignment: August
   - Type: seasonal
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Prepare for fall transition**

   - Description: Order supplies for fall projects while still available. Check heating system readiness - schedule fall service appointment. Begin thinking about winterization tasks. Clean and organize tools and equipment. Midwest fall arrives quickly after August - early planning prevents rush.
   - Assignment: August
   - Type: seasonal
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

6. **Service lawn mower before end of season**

   - Description: Change oil, replace spark plug, sharpen blade, and clean thoroughly while still in use. Check belts and cables. Make repairs now before storing for winter. Well-maintained mower through Midwest growing season lasts longer and performs better year after year.
   - Assignment: August
   - Type: seasonal
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

7. **Check and clean gutters mid-summer**

   - Description: Remove leaves, helicopter seeds, and debris from gutters before fall leaf season. Flush with hose and check for proper drainage. Look for wasp or bird nests. Repair any sections pulling away from house. Clean gutters now before autumn debris adds to workload.
   - Assignment: August
   - Type: seasonal
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

8. **Inspect deck and outdoor structures**

   - Description: Check deck boards, railings, and stairs for loose fasteners, rot, or splinters from summer use. Tighten hardware and replace damaged boards. Clean thoroughly and plan for staining/sealing in fall. Address safety issues immediately before cooler weather brings more outdoor activity.
   - Assignment: August
   - Type: seasonal
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

9. **Test and maintain smoke and CO detectors**

   - Description: Press test button on all smoke and carbon monoxide detectors. Replace batteries if needed. Clean dust from sensors with vacuum. Replace smoke detectors over 10 years old and CO detectors over 7 years old. Safety equipment must work reliably year-round.
   - Assignment: August
   - Type: seasonal
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Safety equipment must work reliably year-round.

10. **Check and service air conditioner outdoor unit**

   - Description: Turn off power to AC. Gently spray fins clean from inside out with low-pressure hose. Trim vegetation back to 2 feet clearance. Remove debris from base. Straighten any bent fins carefully with fin comb. Clean unit runs more efficiently through remaining hot weather.
   - Assignment: August
   - Type: seasonal
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Continue monitoring extreme heat effects**

   - Description: Midwest August can still bring 95°F+ heat waves. Verify AC maintains comfortable temperature. Work outdoors in early morning or evening. Stay hydrated. Check on vulnerable neighbors. Monitor weather forecasts for heat advisories. Take heat seriously - dangerous conditions persist through month.
   - Assignment: August
   - Type: weatherSpecific
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check cooling system efficiency**

   - Description: Monitor that AC handles late summer heat without excessive runtime. Compare electric bills to previous years. If costs seem high, check for air leaks, verify adequate insulation, ensure filters are clean. Schedule service for any performance issues before system works through September heat.
   - Assignment: August
   - Type: weatherSpecific
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Monitor for late summer storms**

   - Description: Midwest August brings powerful thunderstorms with high winds, hail, and heavy rain. Secure loose outdoor items. Trim dead tree branches. Have emergency supplies ready. Check sump pump operation before storms. Inspect for damage after severe weather. Late summer storms can be intense.
   - Assignment: August
   - Type: weatherSpecific
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Check outdoor water systems**

   - Description: Inspect hoses for cracks or leaks from summer use. Check sprinkler heads for damage or misalignment. Test outdoor faucets for leaks. Verify water flows freely without backing up. Plan for fall winterization. Midwest late summer is time to assess outdoor plumbing before cold weather.
   - Assignment: August
   - Type: weatherSpecific
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Begin fall preparation planning**

   - Description: Review heating system service needs. Plan leaf management strategy. Order firewood if needed. Schedule chimney inspection. Check weatherstripping condition. List fall maintenance tasks. Midwest summer ends quickly - planning now prevents fall rush and ensures readiness for winter.
   - Assignment: August
   - Type: weatherSpecific
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## September

### seasonal

1. **Begin fall preparation**

   - Description: Schedule heating system service before cold weather. Check weatherstripping on doors and windows. Test heating system operation. Clean and organize garage. Order firewood if needed. Midwest fall is short - start winter preparation early to avoid rush.
   - Assignment: September
   - Type: seasonal
   - Priority: medium (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Schedule heating system service**

   - Description: Contact HVAC company for furnace inspection and service before heating season. Technician will clean burners, check heat exchanger, test safety controls, and ensure efficient operation. Early service avoids busy season wait and ensures reliable heat for Midwest winter.
   - Assignment: September
   - Type: seasonal
   - Priority: medium (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Check weatherproofing and insulation**

   - Description: Inspect door and window weatherstripping for wear - replace if cracked or compressed. Check caulking around windows and doors. Verify attic insulation depth is adequate (12-14 inches for Midwest). Seal air leaks before heating season to reduce energy costs.
   - Assignment: September
   - Type: seasonal
   - Priority: medium (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Clean gutters before autumn**

   - Description: Remove summer debris from gutters before fall leaves arrive. Flush with hose to verify proper drainage. Check that downspouts direct water away from foundation. Repair sagging sections. Clean gutters now prevent overflow during fall rains and prepare for leaf season.
   - Assignment: September
   - Type: seasonal
   - Priority: medium (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Clean gutters now prevent overflow during fall rains and prepare for leaf season.

5. **Inspect exterior maintenance needs**

   - Description: Walk around home noting repairs needed before winter: loose siding, cracked caulking, peeling paint, damaged trim. Make repairs while weather permits. Check foundation for cracks. Address issues now - Midwest winter weather prevents exterior work for months.
   - Assignment: September
   - Type: seasonal
   - Priority: medium (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

6. **Clean washing machine drain filter**

   - Description: Open access panel at bottom front of washer, place towels underneath, remove and clean filter of lint, coins, and debris. Replace filter and test for leaks. Regular cleaning prevents drainage issues and extends washer life through seasonal transitions.
   - Assignment: September
   - Type: seasonal
   - Priority: medium (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

7. **Test heating system operation**

   - Description: Turn thermostat to heat and verify furnace starts and warms home. Listen for unusual noises. Check that heat flows from all vents. Replace filter. If system doesn't work properly, call HVAC technician now before Midwest cold weather arrives.
   - Assignment: September
   - Type: seasonal
   - Priority: medium (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

8. **Aerate and overseed lawn**

   - Description: Aerate lawn to reduce soil compaction - best done in fall for cool-season Midwest grasses. Overseed thin areas immediately after aerating. Apply fall fertilizer high in nitrogen for root development. Water regularly until temperatures drop. Fall lawn care ensures healthy spring lawn.
   - Assignment: September
   - Type: seasonal
   - Priority: medium (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

9. **Prepare garden for winter**

   - Description: Harvest remaining vegetables. Clean up dead plants and debris to prevent disease and pest overwintering. Add compost to beds. Plant spring bulbs before ground freezes. Mulch perennials after first hard frost. Midwest fall garden cleanup prevents spring problems.
   - Assignment: September
   - Type: seasonal
   - Priority: medium (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

10. **Store outdoor equipment and furniture**

   - Description: Clean and store outdoor furniture, cushions, and decorations before frost. Drain and store garden hoses. Clean and sharpen tools before storage. Drain gasoline from lawn equipment or add stabilizer. Midwest frost can arrive unexpectedly - store items early.
   - Assignment: September
   - Type: seasonal
   - Priority: medium (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Prepare for rapid temperature changes**

   - Description: Midwest September sees wide temperature swings from 80°F days to near-freezing nights. Have both heating and cooling ready. Protect tender plants from early frost. Layer clothing for outdoor work. Be ready to quickly adjust home climate control for comfort and efficiency.
   - Assignment: September
   - Type: weatherSpecific
   - Priority: medium (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Transition HVAC systems for fall**

   - Description: Test both heating and cooling as September temperatures fluctuate. Replace filters. Schedule heating system service. Clean outdoor AC unit before covering for winter. Ensure thermostat works in both modes. Midwest fall requires both systems ready for unpredictable weather.
   - Assignment: September
   - Type: weatherSpecific
   - Priority: medium (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Monitor for early frost protection**

   - Description: Watch weather forecasts for first frost warning - typically late September in Midwest. Cover or harvest tender plants. Drain outdoor water features. Bring in potted plants. Disconnect and store hoses. First frost can occur suddenly - be prepared to protect plantings and plumbing.
   - Assignment: September
   - Type: weatherSpecific
   - Priority: medium (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Check heating system before cold weather**

   - Description: Run heating system on cool day to verify operation before first hard freeze. Listen for concerning noises. Check that home heats evenly. Replace filter. If problems arise, call technician immediately - waiting risks being without heat during Midwest cold snap.
   - Assignment: September
   - Type: weatherSpecific
   - Priority: medium (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Inspect for summer damage repairs**

   - Description: Complete storm damage repairs from summer before winter. Fix roof damage, siding issues, or foundation cracks now while weather cooperates. Winter will worsen any damage and make repairs impossible. Midwest fall is last chance for exterior repairs before months of cold weather.
   - Assignment: September
   - Type: weatherSpecific
   - Priority: medium (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## October

### seasonal

1. **Complete fall preparation**

   - Description: Finish all outdoor projects before winter. Complete exterior repairs and painting. Clean gutters after leaves fall. Store outdoor furniture and equipment. Check that heating system is serviced and ready. Stock emergency supplies. Midwest October is last chance before winter locks in.
   - Assignment: October
   - Type: seasonal
   - Priority: high (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Service heating system for winter**

   - Description: If not done in September, schedule furnace service immediately. Technician will inspect heat exchanger, clean burners, test safety controls, and ensure efficient operation. Cannot wait longer - Midwest heating system must be ready for months of heavy use starting soon.
   - Assignment: October
   - Type: seasonal
   - Priority: high (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Winterize outdoor water systems (hoses, sprinklers, faucets)**

   - Description: Complete all outdoor water winterization to prevent costly freeze damage. Locate shut-off valves for outdoor faucets inside home (usually in basement). Turn off water supply to outdoor faucets and open outdoor faucets - leave them open all winter to drain completely. Disconnect and drain all garden hoses and store indoors. Drain irrigation/sprinkler systems completely using compressed air (or hire professional). Install insulated faucet covers on all outdoor spigots for added protection. Midwest winter freezing will burst pipes with any water left inside - this critical winterization prevents thousands in water damage.
   - Assignment: October
   - Type: seasonal
   - Priority: high (task-level)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Clean and maintain gutters**

   - Description: After leaves fall, remove all debris from gutters and downspouts. Flush thoroughly with hose. Ensure water flows freely and drains away from foundation. Make final repairs before winter. Clean gutters critical for Midwest winter snowmelt and ice dam prevention.
   - Assignment: October
   - Type: seasonal
   - Priority: high (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Check storm windows and doors**

   - Description: Install storm windows if you have them. Check that storm doors close tightly and latches work. Replace damaged weatherstripping. Ensure seals are tight. Storm windows significantly reduce heat loss and improve comfort during long Midwest winter.
   - Assignment: October
   - Type: seasonal
   - Priority: high (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

6. **Rake and manage fall leaves**

   - Description: Rake leaves regularly as they fall. Bag for disposal, compost, or mulch with mower. Don't leave thick leaf layers on lawn over winter - causes disease and dead spots. Midwest leaf season is brief but intense - stay ahead of accumulation.
   - Assignment: October
   - Type: seasonal
   - Priority: high (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

7. **Inspect and clean chimney and fireplace**

   - Description: Schedule professional chimney sweep before using fireplace. Sweep removes dangerous creosote buildup and checks for damage or blockages. Test damper operation. Stock firewood in covered area. Midwest homes rely on fireplaces for supplemental winter heat.
   - Assignment: October
   - Type: seasonal
   - Priority: high (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

8. **Test smoke and carbon monoxide detectors**

   - Description: Press test button on all smoke and CO detectors. Replace batteries if needed - good time is when changing clocks for daylight saving. Clean dust from sensors. Heating season increases CO risks - detectors must work reliably through Midwest winter.
   - Assignment: October
   - Type: seasonal
   - Priority: high (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Prepare for first freeze**

   - Description: Midwest October brings first hard freeze. Drain outdoor water systems completely. Cover or bring in plants. Disconnect hoses. Store outdoor furniture. Have snow removal equipment ready - early snow possible. First freeze arrives quickly - complete all winterization immediately.
   - Assignment: October
   - Type: weatherSpecific
   - Priority: high (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check insulation before cold weather**

   - Description: Verify attic insulation is adequate depth (12-14 inches) and evenly distributed. Check for gaps or compressed areas. Insulate basement rim joists. Add insulation where needed before winter. Good insulation critical for comfortable, affordable Midwest winter heating.
   - Assignment: October
   - Type: weatherSpecific
   - Priority: high (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Inspect heating system capacity**

   - Description: Run heating system on cold day to verify it maintains comfortable temperature without constant operation. Check that home heats evenly. If system struggles, call HVAC technician immediately. Midwest winter is long and cold - heating system must perform reliably for months.
   - Assignment: October
   - Type: weatherSpecific
   - Priority: high (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Winterize outdoor equipment**

   - Description: Drain gasoline from lawn mower and outdoor power equipment or add fuel stabilizer. Clean thoroughly. Change oil. Store in dry location. Prepare snow blower - check belts, auger, and add fresh gas. Switch from summer to winter equipment for Midwest season change.
   - Assignment: October
   - Type: weatherSpecific
   - Priority: high (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Check foundation and basement preparation**

   - Description: Inspect foundation for cracks and seal before ground freezes. Ensure basement windows close tightly. Check sump pump operation. Verify basement stays dry during fall rains. Fix water issues now - frozen ground prevents winter repairs and spring melt will worsen problems.
   - Assignment: October
   - Type: weatherSpecific
   - Priority: high (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## November

### seasonal

1. **Complete winter preparation**

   - Description: Verify all winterization complete: outdoor water shut off, gutters clean, storm windows installed, heating serviced. Stock emergency supplies: flashlights, batteries, water, non-perishable food, blankets. Have backup heat plan. Midwest winter is here - final preparations critical.
   - Assignment: November
   - Type: seasonal
   - Priority: high (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Test and monitor heating system performance**

   - Description: Run heating system regularly as temperatures drop and monitor that it maintains comfortable temperature without excessive runtime. Listen for unusual noises and verify even heating throughout home. Replace filters monthly during heating season. Monitor energy bills for unusual increases. Call technician immediately if any problems - Midwest winter demands reliable heat.
   - Assignment: November
   - Type: seasonal
   - Priority: high (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Replace filters monthly during heating season.

3. **Check insulation and weatherproofing**

   - Description: On windy day, check for drafts around doors and windows. Add weatherstripping where needed. Ensure door sweeps seal properly. Check attic access door is insulated. Seal air leaks before bitter cold arrives. Midwest winter drafts waste energy and create uncomfortable cold spots.
   - Assignment: November
   - Type: seasonal
   - Priority: high (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Store outdoor furniture and equipment**

   - Description: Complete final outdoor storage before snow. Store all furniture, planters, and decorations. Drain and store any remaining hoses. Clean and cover grill. Ensure snow removal equipment is ready and accessible. Midwest November can bring first significant snow.
   - Assignment: November
   - Type: seasonal
   - Priority: high (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Check holiday decoration safety**

   - Description: Inspect holiday lights for frayed wires or damaged bulbs before installing. Test GFCI outlets before plugging in outdoor decorations. Don't overload circuits. Use outdoor-rated cords and timers. Keep fresh Christmas trees watered. Safe decorations prevent Midwest winter holiday fires.
   - Assignment: November
   - Type: seasonal
   - Priority: high (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

6. **Clean washing machine drain filter**

   - Description: Open access panel at bottom front of washer, place towels underneath, remove and clean filter of lint, coins, and debris. Replace filter and test for leaks. Keep washer running efficiently through winter months when outdoor drying isn't possible.
   - Assignment: November
   - Type: seasonal
   - Priority: high (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

7. **Prepare snow removal equipment**

   - Description: Service snow blower: change oil, check belts and auger, replace scraper blade if worn, add fresh gas. Stock ice melt and sand. Sharpen snow shovel edge. Mark driveway edges with stakes. Midwest winter snow removal requires ready, reliable equipment.
   - Assignment: November
   - Type: seasonal
   - Priority: high (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

8. **Check roof and gutters before snow**

   - Description: Make final inspection of roof for damaged or missing shingles. Ensure gutters are completely clean and securely attached. Check that downspouts drain away from foundation. Repair any issues before snow and ice arrive - Midwest winter weather makes roof work impossible.
   - Assignment: November
   - Type: seasonal
   - Priority: high (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

9. **Inspect windows and doors for drafts**

   - Description: Hold lit candle or incense near window and door edges on windy day - wavering smoke indicates air leaks. Add plastic window insulation kits to drafty windows. Install door sweeps. Seal leaks before deep cold arrives - Midwest winter demands airtight home.
   - Assignment: November
   - Type: seasonal
   - Priority: high (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

10. **Stock emergency heating supplies**

   - Description: Have backup heat plan for power outages: safe portable heaters, extra blankets, warm clothing. Keep flashlights and batteries accessible. Stock non-perishable food and water. Know how to manually operate garage door. Midwest winter power outages can be dangerous without preparation.
   - Assignment: November
   - Type: seasonal
   - Priority: high (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Prepare for cold winter conditions**

   - Description: Midwest November brings real cold with temperatures regularly below freezing. Ensure heating system works reliably. Have emergency supplies ready. Check that pipes in unheated areas are insulated. Test generator if you have one. Winter is here - be fully prepared for months of cold.
   - Assignment: November
   - Type: weatherSpecific
   - Priority: high (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Monitor for early winter storms**

   - Description: Midwest November can bring significant snow and ice storms. Monitor weather forecasts closely. Have snow removal equipment ready. Stock supplies before storms. Know how to prevent pipes from freezing. Keep cars fueled. Early winter storms can be severe - stay prepared.
   - Assignment: November
   - Type: weatherSpecific
   - Priority: high (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Check ice and snow removal preparation**

   - Description: Test snow blower operation before first major snow. Stock adequate ice melt and sand. Have good snow shovels ready. Clear area around outdoor equipment. Mark driveway edges and obstacles. Midwest winter snow removal starts now - be ready for months of clearing.
   - Assignment: November
   - Type: weatherSpecific
   - Priority: high (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Ensure emergency heating backup**

   - Description: Have plan for heating failure: portable heaters (used safely), extra blankets, warm clothes. Know how to close off rooms to conserve heat. Have HVAC technician's emergency number. Consider generator for furnace if power outages are common. Midwest winter without heat is dangerous.
   - Assignment: November
   - Type: weatherSpecific
   - Priority: high (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## December

### seasonal

1. **Monitor heating system performance**

   - Description: Check heating system daily during cold weather. Listen for unusual noises or changes in performance. Replace filters monthly. Ensure even heating throughout home. If system runs constantly or struggles to heat, call HVAC technician immediately - Midwest December cold is dangerous without reliable heat.
   - Assignment: December
   - Type: seasonal
   - Priority: high (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Check heating system daily during cold weather.
     - Replace filters monthly.

2. **Check holiday decorations and lighting**

   - Description: Inspect outdoor decorations regularly for damage from wind or snow. Ensure electrical connections stay dry. Don't leave lights on when away. Keep fresh trees watered daily to prevent fire hazard. Use timers to control lighting. Check for overloaded circuits - Midwest winter holiday safety is critical.
   - Assignment: December
   - Type: seasonal
   - Priority: high (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Keep fresh trees watered daily to prevent fire hazard.

3. **Maintain winter preparations**

   - Description: Keep emergency supplies current and accessible. Maintain snow removal equipment. Stock ice melt. Monitor weather forecasts. Keep extra food and water on hand. Have backup heating plan ready. Midwest December storms can arrive suddenly - constant preparedness is essential.
   - Assignment: December
   - Type: seasonal
   - Priority: high (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Monitor energy usage**

   - Description: Check heating bills weekly and compare to previous years. Unusually high bills suggest system inefficiency or air leaks. Verify thermostat set reasonably (68-70°F). Check for drafts. Monitor usage to control Midwest winter heating costs and identify problems early.
   - Assignment: December
   - Type: seasonal
   - Priority: high (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Check heating bills weekly and compare to previous years.

5. **Check water heater pressure relief valve (carefully lift lever)**

   - Description: Carefully lift lever on pressure relief valve at top or side of water heater - should release hot water and snap back. If valve doesn't release water or leaks afterward, call plumber immediately. Annual testing prevents dangerous pressure buildup and ensures safety device works.
   - Assignment: December
   - Type: seasonal
   - Priority: high (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Annual testing prevents dangerous pressure buildup and ensures safety device works.

6. **Test indoor circuit breakers (flip each one to ensure not stuck)**

   - Description: One at a time, flip each circuit breaker off then back on to ensure it's not stuck. Label any unlabeled circuits. If breaker won't flip or trips immediately when reset, call electrician. Testing prevents fire hazards and identifies problems before emergency.
   - Assignment: December
   - Type: seasonal
   - Priority: high (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

7. **Inspect attic and crawl space for moisture or leaks**

   - Description: Check attic for water stains, ice buildup, or mold indicating roof leaks or poor ventilation. Inspect crawl space for moisture, standing water, or frozen pipes. Address moisture issues immediately - Midwest winter moisture causes major damage if ignored.
   - Assignment: December
   - Type: seasonal
   - Priority: high (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

8. **Test furnace emergency shut-off switch**

   - Description: Locate furnace emergency shut-off switch (usually red switch at top of basement stairs or near furnace). Test that it immediately stops furnace. Ensure family members know location and purpose. Working shut-off critical for emergency response during Midwest heating season.
   - Assignment: December
   - Type: seasonal
   - Priority: high (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Working shut-off critical for emergency response during Midwest heating season.

9. **Run whole-home safety drill (fire escape plan + extinguisher use)**

   - Description: Practice fire escape plan with entire family - two ways out of every room, meeting place outside. Show everyone how to use fire extinguisher (PASS method). Test smoke alarms. Practice low-crawl technique. Midwest winter closed-house heating increases fire risk - practice saves lives.
   - Assignment: December
   - Type: seasonal
   - Priority: high (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Monitor heating during cold snaps**

   - Description: During extreme Midwest cold (below 0°F), verify heating system maintains comfortable temperature. Feel pipes in unheated areas for cold spots. Open cabinet doors under sinks for warm air. Let faucets drip during extreme cold. Monitor system closely - failure during deep freeze is dangerous.
   - Assignment: December
   - Type: weatherSpecific
   - Priority: high (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check for winter storm preparation**

   - Description: Before each Midwest winter storm, stock food, water, medications. Fill gas tanks. Charge phones and devices. Have flashlights ready. Bring in extra firewood. Clear snow from vents. Know forecast and warnings. Midwest December blizzards can isolate homes for days - prepare before each storm.
   - Assignment: December
   - Type: weatherSpecific
   - Priority: high (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Before each Midwest winter storm, stock food, water, medications.
     - Midwest December blizzards can isolate homes for days - prepare before each storm.

3. **Monitor ice and snow effects on home**

   - Description: After storms, check for ice dams forming at roof edges. Remove excessive snow from roof if safe to do so. Clear snow from vents and meters. Check for gutter damage from ice weight. Monitor basement for water infiltration. Midwest winter weather stresses homes - inspect after each storm.
   - Assignment: December
   - Type: weatherSpecific
   - Priority: high (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Midwest winter weather stresses homes - inspect after each storm.

4. **Check emergency supplies**

   - Description: Keep 3-day supply of water, food, medications current. Have batteries, flashlights, battery radio accessible. Stock extra blankets and warm clothes. Keep first aid kit updated. Have backup heating plan. Midwest winter power outages common during storms - maintain constant readiness.
   - Assignment: December
   - Type: weatherSpecific
   - Priority: high (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Ensure proper ventilation during heating**

   - Description: Run bathroom and kitchen exhaust fans during use. Crack window briefly each day for fresh air exchange. Never use oven for heating. Ensure dryer vents outside. Monitor for condensation on windows. Midwest winter homes sealed tight need ventilation to prevent moisture, stuffiness, and CO buildup.
   - Assignment: December
   - Type: weatherSpecific
   - Priority: high (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Crack window briefly each day for fresh air exchange.

## Year-round

1. **Test smoke and carbon monoxide detectors monthly**

   - Description: Press test button on all smoke and CO detectors every month to verify they beep loudly. Replace batteries twice yearly or when chirping - good times are daylight saving changes. Clean dust from sensors with vacuum attachment. Replace smoke detectors over 10 years old and CO detectors over 7 years old. Working detectors save lives.
   - Assignment: yearRound
   - Type: yearRound
   - Priority: not specified (no task-level priority and no year-round fallback priority)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Test smoke and carbon monoxide detectors monthly
     - Press test button on all smoke and CO detectors every month to verify they beep loudly.
     - Replace batteries twice yearly or when chirping - good times are daylight saving changes.

2. **Check HVAC filters monthly**

   - Description: Remove furnace/AC filter monthly and hold up to light - if you cannot see light through it clearly, replace immediately. Dirty filters reduce efficiency, increase energy costs, and strain system. Use quality pleated filters rated MERV 8-11 for best balance of filtration and airflow. Midwest climate demands frequent changes.
   - Assignment: yearRound
   - Type: yearRound
   - Priority: not specified (no task-level priority and no year-round fallback priority)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Check HVAC filters monthly
     - Remove furnace/AC filter monthly and hold up to light - if you cannot see light through it clearly, replace immediately.

3. **Inspect for seasonal weather damage quarterly**

   - Description: Every 3 months, walk around home checking for storm damage, pest infiltration, water leaks, or structural issues. Look at roof, siding, foundation, and gutters. Check basement for moisture. Note problems and address promptly. Midwest extreme weather seasons require regular damage assessment.
   - Assignment: yearRound
   - Type: yearRound
   - Priority: not specified (no task-level priority and no year-round fallback priority)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Inspect for seasonal weather damage quarterly
     - Every 3 months, walk around home checking for storm damage, pest infiltration, water leaks, or structural issues.

4. **Check sump pump operation seasonally**

   - Description: Test sump pump quarterly by pouring bucket of water into pit - pump should activate immediately and drain water completely. Check discharge pipe drains 5+ feet from foundation. Clean inlet screen. Test backup battery if equipped. Midwest homes depend on sump pumps to prevent basement flooding.
   - Assignment: yearRound
   - Type: yearRound
   - Priority: not specified (no task-level priority and no year-round fallback priority)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Check sump pump operation seasonally
     - Test sump pump quarterly by pouring bucket of water into pit - pump should activate immediately and drain water completely.

5. **Professional HVAC service twice yearly**

   - Description: Schedule professional furnace inspection in fall (September/October) and air conditioner service in spring (April/May). Technicians will clean components, check refrigerant, test safety controls, and ensure efficient operation. Biannual service extends equipment life and prevents breakdowns during extreme Midwest seasons.
   - Assignment: yearRound
   - Type: yearRound
   - Priority: not specified (no task-level priority and no year-round fallback priority)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Professional HVAC service twice yearly
     - Biannual service extends equipment life and prevents breakdowns during extreme Midwest seasons.

# Region: Southwest

- Data key: Southwest
- Region value: Southwest
- Climate zone: Arid/Desert

## January

### seasonal

1. **Monitor heating system for cool season**

   - Description: Southwest January nights can drop to 30-40°F. Test your heating system to ensure it runs efficiently. Check thermostat settings, listen for unusual noises, and verify all vents are open and unobstructed. Replace furnace filter if dirty - desert dust clogs filters quickly.
   - Assignment: January
   - Type: seasonal
   - Priority: medium (inherited from January month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check weatherstripping and insulation**

   - Description: Inspect door and window weatherstripping for gaps or wear from extreme temperature swings and UV damage. Replace damaged seals to keep cool air in summer and warm air in winter. Check attic insulation depth - should be at least 10-14 inches.
   - Assignment: January
   - Type: seasonal
   - Priority: medium (inherited from January month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Inspect exterior for UV and heat damage**

   - Description: Walk around your home looking for paint fading, cracking, or peeling caused by intense desert sun. Check siding, trim, and fascia boards for warping or splitting. UV damage accelerates in the Southwest - address issues before they worsen.
   - Assignment: January
   - Type: seasonal
   - Priority: medium (inherited from January month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Test carbon monoxide detectors**

   - Description: Press the test button on all CO detectors to verify they beep loudly. Replace batteries if needed - good times are New Year. Detectors should be placed near sleeping areas and on every level of your home. Southwest homes use heating and gas appliances in winter - working CO detectors save lives.
   - Assignment: January
   - Type: seasonal
   - Priority: medium (inherited from January month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Check attic insulation**

   - Description: Inspect attic insulation for proper depth (minimum 10-14 inches) and look for compressed or missing areas. Good insulation keeps home cool in extreme summer heat and warm during cool winters. Southwest temperature swings (40°F-80°F daily) demand quality insulation.
   - Assignment: January
   - Type: seasonal
   - Priority: medium (inherited from January month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Southwest temperature swings (40°F-80°F daily) demand quality insulation.

6. **Clean washing machine drain filter**

   - Description: Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, sand, and debris, then replace the filter and test for leaks. Desert dust and sand require frequent cleaning.
   - Assignment: January
   - Type: seasonal
   - Priority: medium (inherited from January month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Monitor for occasional freeze protection**

   - Description: Southwest January nights occasionally drop to freezing (32°F or below). Cover sensitive desert plants with frost cloth. Drip outdoor faucets during freezing nights. Bring potted plants indoors. Check pool equipment for freeze protection if temperatures will drop below 28°F.
   - Assignment: January
   - Type: weatherSpecific
   - Priority: medium (inherited from January month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check heating system for winter use**

   - Description: Ensure furnace operates properly during cool season. Southwest homes often have minimal heating needs but January nights require it. If system hasn't run since last winter, listen for unusual noises or smells. Call HVAC technician if you notice issues.
   - Assignment: January
   - Type: weatherSpecific
   - Priority: medium (inherited from January month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Ensure furnace operates properly during cool season.

3. **Inspect for winter wind damage**

   - Description: Southwest winter winds can reach 40-50 mph. Check roof shingles, siding, and fencing for wind damage. Secure loose outdoor items. Inspect trees for broken branches that could fall on your home. Wind also drives desert sand into gaps - check seals around doors and windows.
   - Assignment: January
   - Type: weatherSpecific
   - Priority: medium (inherited from January month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Check pool heating systems if applicable**

   - Description: If you heat your pool in winter, verify the heater operates efficiently. Check for leaks in heating lines. Ensure timer settings match your usage. Monitor pool temperature - maintaining 80°F in 50°F nights is expensive. Consider pool cover to retain heat and reduce evaporation.
   - Assignment: January
   - Type: weatherSpecific
   - Priority: medium (inherited from January month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Monitor humidity levels (winter air is very dry)**

   - Description: Southwest winter humidity can drop below 10%, causing dry skin, nosebleeds, and static electricity. Use a hygrometer to monitor indoor humidity - ideal is 30-50%. Run a humidifier if needed, but monitor carefully to avoid over-humidifying and causing condensation in cool nights.
   - Assignment: January
   - Type: weatherSpecific
   - Priority: medium (inherited from January month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## February

### seasonal

1. **Begin early spring preparation**

   - Description: Southwest spring comes early - February temperatures reach 70-75°F. Start spring cleaning by washing windows, dusting ceiling fans, and cleaning air vents. Check smoke detectors and replace batteries. Prepare outdoor spaces for increased use as weather warms quickly.
   - Assignment: February
   - Type: seasonal
   - Priority: medium (inherited from February month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check irrigation and water systems**

   - Description: Test your irrigation system by running each zone. Look for broken sprinkler heads, leaks, or dry spots. Adjust spray patterns to avoid watering sidewalks - water conservation is critical in the desert. Check drip irrigation emitters for clogs. Repair issues before peak watering season.
   - Assignment: February
   - Type: seasonal
   - Priority: medium (inherited from February month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Inspect exterior paint for UV damage**

   - Description: Intense Southwest sun causes rapid paint degradation. Inspect all exterior paint for fading, cracking, or peeling. South and west-facing walls suffer most UV damage. Scrape and touch up small areas now. Plan for full repainting if extensive damage - use UV-resistant paint formulas.
   - Assignment: February
   - Type: seasonal
   - Priority: medium (inherited from February month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Check pool and spa equipment**

   - Description: Inspect pool pump, filter, and heater for leaks or unusual noises. Test GFCI protection on pool electrical connections. Check pool chemistry and adjust as needed. Clean or backwash filter. Ensure pool cover or solar cover is functioning properly. Service equipment now before swim season.
   - Assignment: February
   - Type: seasonal
   - Priority: medium (inherited from February month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Clean and maintain outdoor areas**

   - Description: Sweep patios and walkways to remove accumulated desert dust and sand. Power wash pavers if needed. Clean outdoor furniture and inspect for sun damage. Check shade structures for stability. Trim desert landscaping and remove dead vegetation before fire season.
   - Assignment: February
   - Type: seasonal
   - Priority: medium (inherited from February month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Prepare for increasing UV exposure**

   - Description: February UV index rises rapidly in Southwest (reaching 8-9). Inspect window tinting and UV-blocking films. Check outdoor fabric awnings and shade sails for sun damage. Consider adding UV protection to south-facing windows to reduce cooling costs and protect furnishings from fading.
   - Assignment: February
   - Type: weatherSpecific
   - Priority: medium (inherited from February month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check water conservation systems**

   - Description: Verify rain barrels, graywater systems, and water-efficient fixtures work properly. Southwest water is precious - fix any leaking faucets immediately. Check toilet tanks for silent leaks using food coloring. Consider upgrading to low-flow fixtures. Monitor water bill for unusual increases.
   - Assignment: February
   - Type: weatherSpecific
   - Priority: medium (inherited from February month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Inspect for wind and dust damage**

   - Description: February wind storms deposit dust and sand everywhere. Check air filters in HVAC system and replace if dirty - desert homes need monthly changes. Inspect door and window seals for sand infiltration. Clean solar panels if you have them - dust reduces efficiency significantly.
   - Assignment: February
   - Type: weatherSpecific
   - Priority: medium (inherited from February month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Check air filters in HVAC system and replace if dirty - desert homes need monthly changes.

4. **Monitor for pest activity increase**

   - Description: As temperatures warm, scorpions, spiders, and snakes become active. Check weatherstripping under doors for gaps. Seal cracks around pipes and foundations with caulk or foam. Keep landscaping trimmed away from house. Consider professional pest control service before peak activity season.
   - Assignment: February
   - Type: weatherSpecific
   - Priority: medium (inherited from February month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Check outdoor electrical connections**

   - Description: Inspect outdoor outlets, light fixtures, and pool equipment electrical connections. Desert temperature swings cause expansion/contraction that can loosen connections. Ensure GFCI outlets work properly by pressing test button. Look for corrosion or oxidation on connections. Call electrician for any concerns.
   - Assignment: February
   - Type: weatherSpecific
   - Priority: medium (inherited from February month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## March

### seasonal

1. **Begin spring cleaning and maintenance**

   - Description: Thoroughly clean your home as temperatures reach 75-85°F. Wash walls and baseboards, clean behind appliances, shampoo carpets, and dust ceiling fans. Replace HVAC filters - desert dust clogs filters monthly. Deep clean now before extreme heat makes indoor work uncomfortable.
   - Assignment: March
   - Type: seasonal
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Replace HVAC filters - desert dust clogs filters monthly.

2. **Service air conditioning system early**

   - Description: Schedule professional AC service NOW before heat arrives and HVAC companies get swamped. Technician will clean coils, check refrigerant, test capacitors, and ensure optimal performance. Early service in mild weather ensures your system is ready for 100°F+ temperatures coming in 6-8 weeks.
   - Assignment: March
   - Type: seasonal
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Early service in mild weather ensures your system is ready for 100°F+ temperatures coming in 6-8 weeks.

3. **Check and clean outdoor equipment**

   - Description: Service lawn mower if you have grass (change oil, replace spark plug, sharpen blade). Clean and oil garden tools. Inspect outdoor power equipment. Check pool cleaning equipment and repair as needed. Clean patio furniture and test outdoor lighting before peak outdoor season.
   - Assignment: March
   - Type: seasonal
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Inspect deck and outdoor structures**

   - Description: Check deck boards, railings, and pergolas for damage from UV exposure and temperature extremes. Look for warped boards, cracked wood, or loose fasteners. Test stability of shade structures - essential for desert living. Repair or reinforce now before summer heat makes outdoor work dangerous.
   - Assignment: March
   - Type: seasonal
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Maintain landscaping and irrigation**

   - Description: Adjust irrigation for warming temperatures - desert plants need more water as heat increases. Check all drip lines and sprinkler heads for proper function. Trim dead branches and remove fire hazards. Apply desert-appropriate mulch to retain moisture. Fertilize desert-adapted plants if needed.
   - Assignment: March
   - Type: seasonal
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

6. **Clean washing machine drain filter**

   - Description: Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, sand, and desert debris, then replace the filter and test for leaks. Desert dust and sand require monthly filter cleaning.
   - Assignment: March
   - Type: seasonal
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Desert dust and sand require monthly filter cleaning.

### weatherSpecific

1. **Prepare cooling system for heat season**

   - Description: March is last comfortable month before extreme heat. Test your AC now - turn it on and ensure it cools properly. Listen for unusual noises or clicking. Check that air flows from all vents. If system struggles, call for service immediately. Waiting until May heat wave risks expensive emergency repairs.
   - Assignment: March
   - Type: weatherSpecific
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check dust and sand filtration systems**

   - Description: March winds kick up massive dust storms. Replace all HVAC filters - use high-MERV filters (8-11) to trap fine desert dust. Check door sweeps and window seals to prevent sand infiltration. Clean or replace cabin air filters in vehicles. Dust storms reduce air quality - good filtration protects health.
   - Assignment: March
   - Type: weatherSpecific
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Monitor water usage and conservation**

   - Description: As temperatures rise, water usage increases. Check for leaks in irrigation systems, faucets, and toilets. Fix immediately - desert water is precious and expensive. Consider upgrading to low-flow fixtures. Monitor water bill. Install smart irrigation controller to optimize watering schedules and save water.
   - Assignment: March
   - Type: weatherSpecific
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Inspect for increasing pest activity**

   - Description: March warmth activates scorpions, spiders, snakes, and insects. Seal all cracks and gaps in foundation, around pipes, and under doors. Keep vegetation trimmed 2-3 feet from house. Remove standing water. Consider professional pest control treatment now before peak scorpion season in summer.
   - Assignment: March
   - Type: weatherSpecific
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Check outdoor UV protection measures**

   - Description: UV index reaches 9-10 in March. Inspect window tinting and UV films for bubbling or peeling. Check outdoor fabric for sun damage - replace worn shade sails or awnings. Consider adding UV protection to south and west-facing windows. Good UV protection reduces cooling costs and protects furnishings.
   - Assignment: March
   - Type: weatherSpecific
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## April

### seasonal

1. **Complete air conditioning preparation**

   - Description: Temperatures now reach 90-95°F. Ensure AC runs flawlessly - check all vents for airflow, replace filters, clean outdoor unit of debris. Schedule professional service if you haven't yet. Test system on hottest days. Verify programmable thermostat works properly. AC failure in Southwest summer heat is dangerous and expensive.
   - Assignment: April
   - Type: seasonal
   - Priority: high (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Deep clean interior before heat season**

   - Description: Complete final indoor cleaning before it becomes too hot to work inside without AC running constantly. Clean ceiling fans, windows, baseboards, and organize closets. Stock up on cleaning supplies. Once 100°F+ heat arrives in May, you'll want to minimize indoor projects.
   - Assignment: April
   - Type: seasonal
   - Priority: high (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Check attic ventilation and insulation**

   - Description: Southwest attics can reach 160°F+ in summer. Inspect attic ventilation - ensure soffit and ridge vents are clear. Check insulation depth (minimum 14 inches recommended for desert). Good ventilation and insulation reduce cooling costs by 20-30% and protect your roof from heat damage.
   - Assignment: April
   - Type: seasonal
   - Priority: high (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Maintain pool and outdoor systems**

   - Description: Pool becomes essential for surviving desert heat. Check all pool equipment now - pump, filter, heater, automatic cleaner. Balance water chemistry perfectly. Clean or replace cartridge filters. Ensure pool cover works properly. Stock up on pool chemicals before peak season demand raises prices.
   - Assignment: April
   - Type: seasonal
   - Priority: high (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Inspect exterior for heat preparation**

   - Description: Walk around your home checking for UV damage before extreme heat. Touch up paint on south and west exposures. Check that window screens are intact. Verify shade structures are secure. Inspect roof for damaged shingles. Heat will accelerate any existing damage - repair now.
   - Assignment: April
   - Type: seasonal
   - Priority: high (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Prepare for extreme heat season**

   - Description: April is last mild month - temperatures jump to 100°F+ in May. Stock emergency supplies (water, battery fans, ice packs). Ensure all vehicles have working AC. Test backup power sources. Know cooling center locations. Plan outdoor activities for early morning only. Extreme heat kills - prepare now.
   - Assignment: April
   - Type: weatherSpecific
   - Priority: high (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check cooling system capacity**

   - Description: Run AC continuously on hottest April day (90-95°F) to verify it can maintain 72-75°F indoors. If house stays warm or system runs non-stop, it may need service or be undersized. Call HVAC professional now - don't wait until 110°F days when systems fail and technicians are swamped.
   - Assignment: April
   - Type: weatherSpecific
   - Priority: high (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Monitor dust storm preparation**

   - Description: April marks beginning of dust storm season (haboobs). Secure all outdoor furniture and decorations. Stock extra AC filters. Keep windows and doors tightly sealed. Clean gutters of accumulated dust. Know when storms approach - bring pets indoors and don't drive. Dust storms reduce visibility to zero.
   - Assignment: April
   - Type: weatherSpecific
   - Priority: high (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Check water systems for increased demand**

   - Description: April heat increases water usage dramatically. Test irrigation system thoroughly - check all zones for leaks. Adjust watering schedules for 90°F+ heat. Install rain sensor on controller. Check outdoor faucets and hoses for leaks. Water waste is expensive and environmentally irresponsible in desert.
   - Assignment: April
   - Type: weatherSpecific
   - Priority: high (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Inspect outdoor equipment heat protection**

   - Description: Extreme heat damages outdoor equipment. Check that AC condenser has shade or reflective shield. Ensure pool equipment is shaded or has ventilation. Move propane tanks to shaded areas. Cover vehicle seats and steering wheels. Heat above 115°F melts plastic and damages electronics.
   - Assignment: April
   - Type: weatherSpecific
   - Priority: high (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## May

### seasonal

1. **Begin peak cooling season preparation**

   - Description: May temperatures reach 100-105°F. Replace AC filters weekly during peak use - desert dust clogs them fast. Keep blinds closed during day. Run ceiling fans counterclockwise. Stock up on emergency water. Program thermostat to reduce cooling when away. Check AC outdoor unit daily for debris - leaf blower works well.
   - Assignment: May
   - Type: seasonal
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Replace AC filters weekly during peak use - desert dust clogs them fast.
     - Check AC outdoor unit daily for debris - leaf blower works well.

2. **Monitor air conditioning efficiency**

   - Description: Your AC will run almost constantly in May heat. Listen for unusual noises, clicking, or grinding. Check that all vents blow cold air. Monitor electric bills - sudden spikes indicate problems. If system can't maintain 75°F when it's 105°F outside, call HVAC tech immediately. Don't wait for complete failure.
   - Assignment: May
   - Type: seasonal
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Maintain outdoor living spaces**

   - Description: Outdoor activities move to early morning (before 9am) and late evening (after 7pm). Clean pool daily - high temperatures increase algae growth. Water plants in early morning only. Check shade structures for stability. Spray down patios in evening to reduce retained heat. Keep outdoor furniture in shade.
   - Assignment: May
   - Type: seasonal
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Clean pool daily - high temperatures increase algae growth.

4. **Check pool and water systems**

   - Description: Pool is essential for summer survival. Test water chemistry twice weekly - heat throws off balance quickly. Run pump longer hours (12-14 hours daily). Clean skimmer baskets daily. Check water level - 100°F+ heat causes rapid evaporation. Add stabilizer to protect chlorine from UV degradation.
   - Assignment: May
   - Type: seasonal
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Test water chemistry twice weekly - heat throws off balance quickly.
     - Run pump longer hours (12-14 hours daily).
     - Clean skimmer baskets daily.

5. **Inspect exterior heat protection**

   - Description: Walk exterior in early morning checking for heat damage. Look for warped vinyl siding, cracked caulk, or bubbling paint. Check that sprinklers aren't hitting house - water plus 105°F heat causes wood rot. Ensure all windows seal tightly - even small gaps waste expensive cool air.
   - Assignment: May
   - Type: seasonal
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

6. **Clean washing machine drain filter**

   - Description: Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, sand, and desert debris, then replace the filter and test for leaks. May dust storms require weekly filter cleaning.
   - Assignment: May
   - Type: seasonal
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - May dust storms require weekly filter cleaning.

### weatherSpecific

1. **Prepare for extreme heat (100°F+)**

   - Description: May heat exceeds 100°F daily. Never leave pets or children in vehicles - deadly in minutes. Stock 1 gallon water per person per day. Know heat stroke symptoms. Avoid outdoor activity 10am-6pm. Wear light colors and sunscreen. Check on elderly neighbors. Heat kills dozens annually in Southwest - take seriously.
   - Assignment: May
   - Type: weatherSpecific
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - May heat exceeds 100°F daily.
     - Stock 1 gallon water per person per day.
     - Heat kills dozens annually in Southwest - take seriously.

2. **Check cooling system for peak demand**

   - Description: May is the test - if AC can't handle 105°F now, it will fail at 115°F in July. System should maintain 72-75°F indoors. If rooms stay warm, check for blocked vents, dirty filters, or low refrigerant. Schedule immediate service - waiting means days without AC in dangerous heat.
   - Assignment: May
   - Type: weatherSpecific
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Monitor dust and sand infiltration**

   - Description: May dust storms are severe. After each storm, replace AC filters immediately - running with clogged filter damages compressor. Vacuum floor vents and returns. Clean door sweeps and window tracks. Check weatherstripping. Fine desert dust infiltrates everything - stay vigilant with sealing and filtering.
   - Assignment: May
   - Type: weatherSpecific
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - After each storm, replace AC filters immediately - running with clogged filter damages compressor.

4. **Check water conservation measures**

   - Description: May heat spikes water usage and costs. Water desert plants early morning only (5-7am). Adjust irrigation run times for heat - increase by 50% from April. Fix all leaks immediately. Consider drought-tolerant landscaping. Never water 10am-4pm - most water evaporates before reaching roots. May water bills shock newcomers.
   - Assignment: May
   - Type: weatherSpecific
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Inspect heat-resistant exterior materials**

   - Description: Extreme heat damages cheap materials. Check vinyl siding for warping - may need heat shields. Inspect plastic mailboxes, light fixtures, and hose bibs for melting or cracking. Replace with heat-rated materials. Check asphalt driveway for softening. Dark surfaces reach 160°F+ - protect or replace vulnerable items.
   - Assignment: May
   - Type: weatherSpecific
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## June

### seasonal

1. **Peak air conditioning season begins**

   - Description: June temperatures hit 110-115°F. Your AC runs 20-24 hours daily. Replace filters weekly - set phone reminders. Listen continuously for unusual sounds indicating impending failure. Keep AC company number handy. If system fails, hotels fill fast and emergency service costs $500+. Monitor obsessively - AC failure in June heat is life-threatening.
   - Assignment: June
   - Type: seasonal
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Your AC runs 20-24 hours daily.
     - Replace filters weekly - set phone reminders.

2. **Monitor energy efficiency**

   - Description: June electric bills shock newcomers - $400-600 is normal for desert cooling. Close blinds and curtains all day. Set thermostat to 78°F when home, 82°F when away. Run dishwasher and laundry at night when rates drop. Avoid oven use - use microwave or grill outside. Every degree cooler adds $10-15/month.
   - Assignment: June
   - Type: seasonal
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Maintain pool and cooling systems**

   - Description: Pool water temperature reaches 90°F+. Run pump 14-16 hours daily. Add ice to cool down for swimming. Check chemistry every other day - heat degrades chlorine fast. Clean filter twice weekly. Watch for algae - high heat accelerates growth. Pool is only outdoor relief in June heat - maintain obsessively.
   - Assignment: June
   - Type: seasonal
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Run pump 14-16 hours daily.
     - Clean filter twice weekly.

4. **Check attic ventilation**

   - Description: Attics reach 165-175°F in June. Ensure ridge vents and soffit vents are completely clear. Consider adding powered attic fan to reduce load on AC. Check insulation hasn't shifted or compressed. Poor attic ventilation can increase cooling costs 30% and damage roof shingles from underneath.
   - Assignment: June
   - Type: seasonal
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Inspect outdoor equipment protection**

   - Description: June heat melts plastics and damages electronics. Move garbage cans to shade - they will melt in sun. Cover outdoor furniture or move to shaded areas. Check that pool equipment has adequate ventilation. Don't touch metal surfaces outdoors - can cause burns. Everything outside bakes at 140-160°F in direct sun.
   - Assignment: June
   - Type: seasonal
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

6. **Flush water heater**

   - Description: Turn off power/gas and water supply to heater. Attach hose to drain valve and run to floor drain or outside. Open valve and flush until water runs clear, removing sediment. Close valve, restore water and power. In desert heat, water heater doesn't work hard, but annual flushing extends life.
   - Assignment: June
   - Type: seasonal
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - In desert heat, water heater doesn't work hard, but annual flushing extends life.

### weatherSpecific

1. **Peak heat season preparation (110°F+)**

   - Description: June daily highs hit 110-115°F. This is survival mode. Stay indoors 9am-7pm. Keep emergency supplies current - water, battery fans, ice. Know cooling center locations. Never walk dogs on pavement - causes paw burns. Car interiors reach 180°F - crack windows. Monitor weather alerts for excessive heat warnings.
   - Assignment: June
   - Type: weatherSpecific
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - June daily highs hit 110-115°F.

2. **Monitor air conditioning capacity**

   - Description: If AC can't keep house at 78°F when it's 115°F outside, you have a problem. Check that outdoor unit isn't overheating - spray with hose during hottest hours (don't spray directly on unit, just wet ground around it). Provide shade if possible. If system fails, call emergency service immediately - this is life-threatening.
   - Assignment: June
   - Type: weatherSpecific
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Check monsoon season preparation**

   - Description: Monsoon season begins late June. Severe thunderstorms bring flash floods, lightning, dust walls, and high winds. Clean gutters and downspouts. Secure all outdoor items. Stock flashlights and batteries for power outages. Never drive through flooded roads. Have emergency plan ready - monsoons strike with little warning.
   - Assignment: June
   - Type: weatherSpecific
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Inspect dust storm damage prevention**

   - Description: June dust storms (haboobs) are spectacular and dangerous. Keep several extra AC filters - you'll need them after each storm. Seal all gaps around doors and windows. Don't use swamp coolers during dust storms. Keep car windows closed. Stock N95 masks for respiratory protection. Dust storms cause multi-car pileups - stay off roads.
   - Assignment: June
   - Type: weatherSpecific
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Keep several extra AC filters - you'll need them after each storm.

5. **Check outdoor water and cooling systems**

   - Description: June heat breaks water lines and irrigation systems. Check for leaks daily - water pressure fluctuates in extreme heat. Test all irrigation zones weekly - emitters clog with minerals from evaporation. Consider misting systems for patios - only outdoor cooling option. Monitor water usage - desert cities impose restrictions during heat waves.
   - Assignment: June
   - Type: weatherSpecific
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Check for leaks daily - water pressure fluctuates in extreme heat.
     - Test all irrigation zones weekly - emitters clog with minerals from evaporation.

## July

### seasonal

1. **Peak summer heat maintenance**

   - Description: July is hottest month - 115-118°F. AC runs 24/7. Replace filters twice weekly. Keep spare filter inventory. Monitor system constantly for failure signs. Have backup plan (friend with AC, hotel budget, cooling center locations). Minimize outdoor exposure - early morning only (6-8am). Check on neighbors, especially elderly. This is dangerous heat.
   - Assignment: July
   - Type: seasonal
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Replace filters twice weekly.

2. **Monitor cooling system performance**

   - Description: AC works hardest in July. Normal for system to run continuously when it's 115°F+. Check that indoor temp stays below 80°F. If temp rises above 80°F, call technician immediately - don't wait. Listen for unusual sounds. Feel vents for weak airflow. System failure in July heat can be deadly - maintenance is critical.
   - Assignment: July
   - Type: seasonal
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Check monsoon damage prevention**

   - Description: July is peak monsoon - severe thunderstorms with flash floods, microbursts (100+ mph winds), lightning, and blinding dust. After each storm, inspect roof for damage, check for leaks, clear debris from gutters. Look for cracks in walls or foundation. Document damage immediately for insurance. Storms can be violent.
   - Assignment: July
   - Type: seasonal
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - After each storm, inspect roof for damage, check for leaks, clear debris from gutters.

4. **Maintain pool and outdoor systems**

   - Description: Pool water hits 95°F+ in July - too hot for comfort. Add ice or run water features at night to cool. Test chemistry every other day. Run pump 16-18 hours daily. Watch for algae blooms. Clean filter 2-3 times weekly. Pool is essential for heat relief when maintained properly.
   - Assignment: July
   - Type: seasonal
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Run pump 16-18 hours daily.
     - Clean filter 2-3 times weekly.

5. **Inspect heat stress on home materials**

   - Description: July heat damages homes. Check vinyl siding for warping or melting. Look for cracks in stucco from expansion/contraction. Inspect caulk around windows - heat dries it out. Check asphalt driveway for softening. Dark roof shingles can reach 180°F - inspect for curling or damage. Heat stress is cumulative - address damage before it worsens.
   - Assignment: July
   - Type: seasonal
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

6. **Clean washing machine drain filter**

   - Description: Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, sand, and monsoon mud debris, then replace the filter and test for leaks. July dust storms and monsoon mud require weekly filter cleaning.
   - Assignment: July
   - Type: seasonal
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - July dust storms and monsoon mud require weekly filter cleaning.

### weatherSpecific

1. **Monsoon season preparation**

   - Description: July monsoons strike afternoon/evening with little warning. Watch sky for building clouds. When storm approaches, bring in all outdoor items, close windows, unplug electronics. Never drive in dust storm or flooded roads. Keep gutters clear. Have flashlights ready - lightning causes power outages. Turn off AC during lightning to protect compressor.
   - Assignment: July
   - Type: weatherSpecific
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Monitor extreme heat effects (115°F+)**

   - Description: July regularly exceeds 115°F, sometimes hitting 120°F. At these temps, human survival outdoors is limited to minutes. Stay indoors. Never leave anyone in vehicles. Store water in car. Wear oven mitts to touch steering wheel. Metal surfaces cause burns. Heat stroke symptoms: confusion, rapid pulse, hot dry skin - call 911 immediately.
   - Assignment: July
   - Type: weatherSpecific
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Check flash flood preparation**

   - Description: Monsoons drop inches of rain in minutes on hard desert soil that can't absorb water. Flash floods appear instantly, carrying cars away. Never drive through water on roads. Keep drainage channels clear. Move valuables off basement floors. Know if you're in flood zone. Arizona has "Stupid Motorist Law" - you pay rescue costs if you drive into floods.
   - Assignment: July
   - Type: weatherSpecific
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Monitor dust storm and wind damage**

   - Description: Monsoon outflows create massive dust walls (haboobs) 5000+ feet high. Visibility drops to zero in seconds. If caught driving, pull off road completely, turn off lights, feet off brake. Replace AC filters after every dust storm. Check roof for blown-off shingles. Inspect fence for damage. Clean solar panels of dust buildup.
   - Assignment: July
   - Type: weatherSpecific
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Check cooling system during peak demand**

   - Description: July puts maximum stress on AC - many systems fail. Have emergency service number programmed. If system fails, reduce heat gain: close all blinds, avoid using oven/dryer, go to lowest floor, wet towels to drape on neck. Know cooling center locations. In 115°F+ heat, AC failure is life-threatening emergency - don't delay calling for help.
   - Assignment: July
   - Type: weatherSpecific
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## August

### seasonal

1. **Continue peak heat maintenance**

   - Description: August heat remains brutal - 110-115°F. Continue obsessive AC maintenance: replace filters twice weekly, listen for problems, monitor performance. Keep emergency supplies current. Watch for signs of heat exhaustion in family members. Heat fatigue is cumulative - August is when desert residents struggle most. Stay vigilant.
   - Assignment: August
   - Type: seasonal
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Continue obsessive AC maintenance: replace filters twice weekly, listen for problems, monitor performance.

2. **Monitor monsoon damage**

   - Description: After each August monsoon, walk your property checking for damage. Look for roof leaks, cracked windows, damaged siding, foundation cracks. Check for standing water or erosion around foundation. Inspect trees for damage. Document everything with photos. File insurance claims promptly. Cumulative monsoon damage needs attention before season ends.
   - Assignment: August
   - Type: seasonal
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - After each August monsoon, walk your property checking for damage.

3. **Check cooling system efficiency**

   - Description: After running continuously for 3 months, AC systems show wear. Listen for declining performance - takes longer to cool, runs continuously, weak airflow. Monitor electric bills for spikes indicating inefficiency. If performance drops, schedule service immediately. Don't wait for failure - repairs in August heat wave are expensive and urgent.
   - Assignment: August
   - Type: seasonal
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Maintain outdoor equipment protection**

   - Description: August sun has baked everything for months. Check that shade structures haven't failed. Inspect outdoor furniture for sun damage - replace deteriorated fabric. Verify pool equipment still has adequate shade/ventilation. Replace melted garbage cans or plastic fixtures. Three months of 110°F+ takes its toll - assess and replace damaged items.
   - Assignment: August
   - Type: seasonal
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Inspect for heat and UV damage**

   - Description: August marks end of worst heat - assess cumulative damage from summer. Check exterior paint for fading, blistering, or peeling. Look for cracked caulk around windows. Inspect plastic fixtures for brittleness. Check roof shingles for curling. Make list of repairs needed before next summer. UV and heat damage is relentless in desert - regular maintenance essential.
   - Assignment: August
   - Type: seasonal
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Peak monsoon season vigilance**

   - Description: August is most active monsoon month. Severe storms strike weekly, sometimes daily. Keep gutters clear. Secure outdoor items before each storm. Stock batteries and flashlights. Have sandbags ready if you're in flood zone. Check weather radar frequently. Monsoons bring relief from heat but also damage - stay prepared and alert.
   - Assignment: August
   - Type: weatherSpecific
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Severe storms strike weekly, sometimes daily.
     - Secure outdoor items before each storm.

2. **Monitor flash flood risks**

   - Description: August monsoons cause most flash flood deaths. Never drive through flooded roads - water depth is deceptive and current is powerful. Keep emergency kit in car. Avoid camping in washes or arroyos. If water starts rising, move to high ground immediately. Desert floods are fast and violent - respect the danger and take warnings seriously.
   - Assignment: August
   - Type: weatherSpecific
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Check extreme heat protection measures**

   - Description: August heat continues at 110-115°F. Verify all heat protection still works: window tinting intact, blinds functioning, shade structures stable, AC running efficiently. Check on vulnerable neighbors. Keep heat emergency plan current. Don't let guard down - August heat exhaustion common as summer fatigue accumulates. Push through last few weeks carefully.
   - Assignment: August
   - Type: weatherSpecific
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Monitor dust and debris cleanup**

   - Description: August monsoons deposit mud, leaves, and debris everywhere. Clean gutters after each storm. Power wash patios and walkways. Replace AC filters frequently. Clear storm drains and drainage channels. Remove debris from pool. Clean window screens. Monsoon mess accumulates fast - clean regularly to prevent damage and pest problems.
   - Assignment: August
   - Type: weatherSpecific
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Clean gutters after each storm.

5. **Check cooling system during storms**

   - Description: Monsoon lightning can damage AC systems. Turn off AC when lightning is close to protect compressor. If power flickers, wait 5 minutes before restarting system. Check that outdoor unit isn't damaged by hail or wind-blown debris after storms. Ensure system restarts properly after outages. August AC failure during monsoon heat is double emergency.
   - Assignment: August
   - Type: weatherSpecific
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## September

### seasonal

1. **Continue monsoon season vigilance**

   - Description: September monsoons taper off but remain active. Keep gutters clear and outdoor items secured. Continue post-storm inspections for damage. Watch weather radar for developing storms. Stock batteries and flashlights. Monsoon season officially ends September 30th, but late-season storms can be severe. Stay alert through month end.
   - Assignment: September
   - Type: seasonal
   - Priority: high (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Monitor cooling system performance**

   - Description: September temps drop to 100-105°F - still very hot. AC runs most of day but gets some breaks. Listen for unusual sounds indicating wear from brutal summer. Monitor performance - if efficiency dropped, schedule service before next summer. Replace filters weekly still. System worked hard for 5 months - check for needed repairs.
   - Assignment: September
   - Type: seasonal
   - Priority: high (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Replace filters weekly still.

3. **Check for summer damage**

   - Description: Assess cumulative damage from 5 months of extreme heat and monsoons. Walk property checking roof, siding, paint, caulk, and outdoor fixtures. Look for cracks in foundation or driveway from expansion/contraction cycles. Make repair list and prioritize. September weather perfect for exterior work - schedule repairs now.
   - Assignment: September
   - Type: seasonal
   - Priority: high (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Maintain outdoor areas**

   - Description: As heat moderates to 100-105°F, outdoor work becomes feasible again. Clean patios and walkways of monsoon mud and debris. Power wash if needed. Inspect and repair outdoor lighting. Check irrigation system for monsoon damage. Trim desert plants. Enjoy comfortable mornings and evenings outdoors after brutal summer.
   - Assignment: September
   - Type: seasonal
   - Priority: high (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Begin gradual fall preparation**

   - Description: September marks transition season in desert. Clean and organize after summer. Wash windows inside and out. Deep clean floors and carpets. Check smoke detectors and replace batteries. Prepare for comfortable fall months ahead. Desert fall is beautiful - enjoy temperature drop from 115°F to 100°F.
   - Assignment: September
   - Type: seasonal
   - Priority: high (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

6. **Clean washing machine drain filter**

   - Description: Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, sand, and accumulated monsoon debris, then replace the filter and test for leaks. September is good time for deep clean after summer dust and storms.
   - Assignment: September
   - Type: seasonal
   - Priority: high (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Late monsoon season monitoring**

   - Description: September storms can be severe even as season winds down. Late-season monsoons sometimes bring strongest winds and heaviest rainfall. Continue storm vigilance - clear gutters, secure outdoor items, monitor weather. After final storms, do thorough property inspection and complete any monsoon-damage repairs before next summer.
   - Assignment: September
   - Type: weatherSpecific
   - Priority: high (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check heat stress damage from summer**

   - Description: Inspect all exterior materials for summer heat damage. Check vinyl siding for warping, paint for blistering, caulk for cracking, shingles for curling. Look at plastic fixtures for brittleness or cracking. Assess driveway for heat damage. Make repair plan - September-November perfect for exterior work before next summer bakes everything again.
   - Assignment: September
   - Type: weatherSpecific
   - Priority: high (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Monitor for flash flood damage**

   - Description: After monsoon season ends, assess flood damage. Check foundation for cracks or settling. Look for erosion around house perimeter. Inspect drainage systems. If flooding occurred, check for water stains in basement or garage. Document damage for insurance. Make improvements to grading or drainage to prevent recurrence next summer.
   - Assignment: September
   - Type: weatherSpecific
   - Priority: high (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Check dust and debris accumulation**

   - Description: Summer dust storms and monsoons deposit layers of fine dust and mud everywhere. Deep clean entire house - vacuum vents, wipe surfaces, wash windows. Clean or replace all AC filters. Power wash exterior. Clean solar panels for maximum efficiency. Dust and debris reduce efficiency and air quality - thorough cleaning essential after monsoon season.
   - Assignment: September
   - Type: weatherSpecific
   - Priority: high (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Continue extreme heat protection**

   - Description: September still reaches 100-105°F - remain heat-aware. Continue avoiding midday outdoor activity. Keep AC running efficiently. Stay hydrated. Monitor vulnerable family members. Heat season isn't over until mid-October. September heat exhaustion common as people get careless thinking summer is over. Maintain heat safety practices few more weeks.
   - Assignment: September
   - Type: weatherSpecific
   - Priority: high (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## October

### seasonal

1. **Begin transition to cooler season**

   - Description: October temperatures drop to pleasant 85-95°F. This is desert prime time - enjoy outdoor activities again. Reduce AC filter changes to bi-weekly. Open windows for natural ventilation on cool mornings. Start using outdoor spaces in afternoons. October weather is why people live in desert - perfect conditions after brutal summer.
   - Assignment: October
   - Type: seasonal
   - Priority: medium (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Reduce AC filter changes to bi-weekly.

2. **Check heating system preparation**

   - Description: October nights can drop to 50-60°F. Test heating system to ensure it works - many desert homes use heat only 2-3 months yearly. Replace furnace filter, check thermostat, listen for unusual sounds. If system doesn't work properly, call for service now before winter cold arrives. Heating failures are less urgent but still uncomfortable.
   - Assignment: October
   - Type: seasonal
   - Priority: medium (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Test heating system to ensure it works - many desert homes use heat only 2-3 months yearly.

3. **Clean and maintain outdoor areas**

   - Description: Perfect October weather ideal for outdoor maintenance. Clean pool and adjust chemicals for cooler temps. Sweep patios and walkways. Organize outdoor storage areas. Check outdoor furniture for damage. Trim desert plants and remove dead vegetation. Plant cool-season flowers. Enjoy being outside after 6 months indoors.
   - Assignment: October
   - Type: seasonal
   - Priority: medium (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Inspect exterior for summer damage**

   - Description: Complete all summer damage repairs now while weather is perfect. Paint faded or damaged areas. Replace damaged siding. Re-caulk windows and doors. Repair roof damage from heat or monsoons. October-November are ideal for exterior work - not too hot, not too cold, minimal rain. Get repairs done before next summer.
   - Assignment: October
   - Type: seasonal
   - Priority: medium (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Check pool heating systems**

   - Description: October pool temps drop to 70-75°F - too cold for comfortable swimming without heat. Test pool heater if you have one. Check for leaks in heating lines. Verify timer and thermostat work properly. Consider pool cover to retain heat at night. Decide if heating pool is worth cost - desert October-March pool use requires heating.
   - Assignment: October
   - Type: seasonal
   - Priority: medium (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

6. **Shut off outside house spigots**

   - Description: Although hard freezes are rare in desert, October nights occasionally drop to freezing. Disconnect and drain garden hoses. Shut off water to outdoor faucets if you have shut-off valves. Drain sprinkler systems if you have traditional grass. Bring in sensitive desert plants. Protect pool equipment if freeze expected below 28°F.
   - Assignment: October
   - Type: seasonal
   - Priority: medium (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **End of extreme heat season**

   - Description: October marks end of dangerous heat - temps drop to comfortable 85-95°F. This is relief after 6 months of 100-115°F. Resume normal outdoor activities. Reduce AC usage and energy bills drop dramatically. Enjoy perfect desert weather - warm days, cool nights, brilliant sunshine. October-April is desert living at its best.
   - Assignment: October
   - Type: weatherSpecific
   - Priority: medium (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check UV and heat damage repairs**

   - Description: Complete summer damage repairs in perfect October weather. Fix all UV-damaged paint, cracked caulk, warped materials. Replace heat-damaged fixtures and plastics. Repair roof shingles damaged by heat. Make improvements to reduce next summer's damage - add UV protection, heat shields, better ventilation. October is ideal repair month.
   - Assignment: October
   - Type: weatherSpecific
   - Priority: medium (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Monitor for pleasant weather maintenance**

   - Description: October weather perfect for all outdoor projects delayed during summer heat. Paint exterior, seal driveway, repair roof, organize garage, deep clean outdoor areas. Work outside comfortably all day. This is prime maintenance season - tackle your summer project list now. November-March weather equally good for outdoor work.
   - Assignment: October
   - Type: weatherSpecific
   - Priority: medium (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Check dust and sand cleanup**

   - Description: Final summer dust cleanup in October. Deep clean entire house of accumulated fine desert dust. Wash all windows inside and out. Clean ceiling fans and light fixtures. Vacuum or replace air vents. Power wash exterior and walkways. Professional carpet cleaning recommended. Fresh clean home feels great after dusty summer.
   - Assignment: October
   - Type: weatherSpecific
   - Priority: medium (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Prepare for mild winter conditions**

   - Description: Desert winter is mild but real. October-March nights drop to 40-60°F. Ensure heating works properly. Check weatherstripping on doors and windows. Verify fireplace or patio heater works. Stock up on warm bedding. Have light jacket ready. Desert winter is pleasant but preparation prevents discomfort during cool spells.
   - Assignment: October
   - Type: weatherSpecific
   - Priority: medium (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## November

### seasonal

1. **Enjoy pleasant weather for maintenance**

   - Description: November is perfect desert weather - 75-85°F days, 50-60°F nights. This is ideal time for all outdoor projects. Paint exterior, seal driveway, repair roof, organize garage, clean pool, trim landscaping. Work outside all day comfortably. November-March is why retirees move to desert - absolutely perfect weather for enjoying your home and property.
   - Assignment: November
   - Type: seasonal
   - Priority: medium (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check heating system for winter**

   - Description: November nights drop to 50-60°F, occasional 40s. Verify heating works reliably. Replace furnace filter, check thermostat programming, test emergency heat if you have heat pump. Listen for unusual sounds. Desert heating systems see light use but must work when needed - November cold snaps require heat. Schedule service if problems found.
   - Assignment: November
   - Type: seasonal
   - Priority: medium (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Complete exterior maintenance**

   - Description: Finish all outdoor projects before holidays and occasional cold spells. Complete painting, caulking, roof repairs, gutter cleaning, landscaping. Check outdoor lighting for holidays. Clean and organize garage and outdoor storage. November weather perfect for exterior work - comfortable temps, minimal rain, no extreme heat to slow you down.
   - Assignment: November
   - Type: seasonal
   - Priority: medium (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Check weatherproofing**

   - Description: Inspect all weatherstripping on doors and windows before winter. Although desert winters are mild, cold nights (40-50°F) waste energy if home isn't sealed properly. Check caulk around windows and doors. Ensure doors close tightly. Add door sweeps if needed. Good weatherproofing keeps heat in and desert dust out year-round.
   - Assignment: November
   - Type: seasonal
   - Priority: medium (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Good weatherproofing keeps heat in and desert dust out year-round.

5. **Maintain outdoor living areas**

   - Description: November perfect for enjoying outdoor spaces. Clean and organize patio furniture. Check outdoor kitchen equipment. Test patio heaters for cool evenings. Ensure outdoor lighting works for entertaining. Trim trees and plants. November is outdoor entertaining season in desert - prepare spaces for maximum enjoyment through March.
   - Assignment: November
   - Type: seasonal
   - Priority: medium (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

6. **Clean washing machine drain filter**

   - Description: Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, and accumulated debris, then replace the filter and test for leaks. Good time for maintenance as summer dust and monsoon season are over.
   - Assignment: November
   - Type: seasonal
   - Priority: medium (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Optimal weather for outdoor maintenance**

   - Description: November desert weather is ideal - warm days (75-85°F), cool nights (50-60°F), minimal rain, low humidity, brilliant sunshine. This is best maintenance month of year. Complete all outdoor projects on your list. Work outside anytime without heat or cold concerns. Enjoy perfect conditions - this is desert living at its finest.
   - Assignment: November
   - Type: weatherSpecific
   - Priority: medium (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check heating system for cool season**

   - Description: November nights require heat as temps drop to 50s and occasional 40s. Ensure heating system works properly - desert furnaces see limited use but must function when needed. Test system on first cold night. If heat is weak or fails, call for service immediately. Cold snaps are uncomfortable and night temps will drop further in December-January.
   - Assignment: November
   - Type: weatherSpecific
   - Priority: medium (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Monitor for mild winter preparation**

   - Description: Desert winter is mild but real. November-March nights drop to 40-60°F. Stock up on warm bedding and ensure heater works. Check that patio heaters function for outdoor entertaining. Have light jackets available. Although mild compared to northern winters, preparation prevents discomfort during cool desert nights and mornings.
   - Assignment: November
   - Type: weatherSpecific
   - Priority: medium (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Check dust and allergen control**

   - Description: Fall desert winds kick up dust even after monsoons end. Continue regular filter changes in HVAC system. Dust home frequently. Consider air purifier if family has allergies. Keep windows closed on windy days. Desert dust is year-round challenge - good filtration and regular cleaning essential for air quality and system efficiency.
   - Assignment: November
   - Type: weatherSpecific
   - Priority: medium (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Desert dust is year-round challenge - good filtration and regular cleaning essential for air quality and system efficiency.

5. **Inspect for reduced pest activity**

   - Description: November cooler temps reduce scorpion and snake activity dramatically. They're hibernating or much less active. This is safe time to clean outdoor areas, organize storage, and move items without constant pest vigilance. Still check shoes and shake towels, but November-March desert pest activity is minimal compared to summer months.
   - Assignment: November
   - Type: weatherSpecific
   - Priority: medium (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## December

### seasonal

1. **Monitor heating system performance**

   - Description: December nights drop to 40-50°F, occasionally 30s. Heating runs regularly - monitor for consistent performance. Listen for unusual sounds or smells. Check that all rooms heat evenly. Replace furnace filter if dirty. Ensure programmable thermostat works properly. Desert homes have limited heating needs but December-January are coldest months - system must work reliably.
   - Assignment: December
   - Type: seasonal
   - Priority: medium (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check holiday decorations and lighting**

   - Description: December is perfect for outdoor holiday decorating - comfortable weather, no snow or ice. Test all holiday lights before hanging - desert sun and heat damage bulbs by November. Check outdoor outlets with GFCI tester. Use weatherproof extension cords. Enjoy decorating in 70°F sunny weather while northern states freeze. Perfect desert winter activity.
   - Assignment: December
   - Type: seasonal
   - Priority: medium (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Maintain mild winter conditions**

   - Description: December brings mild desert winter - 65-75°F days, 40-50°F nights. Enjoy outdoor activities anytime. Water desert plants monthly - they need less in cool weather but don't go dormant. Run pool heater if using pool. Use patio heaters for evening entertaining. December in desert is vacation weather - enjoy your home and outdoor spaces.
   - Assignment: December
   - Type: seasonal
   - Priority: medium (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Water desert plants monthly - they need less in cool weather but don't go dormant.

4. **Test smoke and carbon monoxide detectors**

   - Description: Press test button on all smoke and CO detectors to verify they beep loudly. Replace batteries - good time is holiday season when you're thinking about safety. Clean dust from sensors with vacuum attachment. December increased use of fireplaces, space heaters, and furnaces requires working detectors. Test monthly, replace batteries now.
   - Assignment: December
   - Type: seasonal
   - Priority: medium (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Test monthly, replace batteries now.

5. **Check pool and spa heating**

   - Description: December pool water drops to 55-65°F without heating - too cold for swimming. If you heat pool, verify heater works efficiently. Check for leaks and proper operation. Consider pool cover to reduce heating costs. Many desert residents stop using pools December-March. If you heat it, expect high gas/electric bills during winter months.
   - Assignment: December
   - Type: seasonal
   - Priority: medium (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - If you heat it, expect high gas/electric bills during winter months.

### weatherSpecific

1. **Monitor for cool weather conditions**

   - Description: December brings coolest desert temps - 65-75°F days, 40-50°F nights, occasional 30s. This is mild compared to most climates but requires adaptation for desert residents. Wear layers, use light blankets at night, run heater on cold mornings. Enjoy beautiful weather - sunny, clear, perfect for outdoor activities, no snow or ice to manage.
   - Assignment: December
   - Type: weatherSpecific
   - Priority: medium (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check heating system during cold snaps**

   - Description: December cold snaps drop temps to 30s overnight. Ensure heating maintains comfort during coldest nights. If heating struggles or fails, call for service - although not life-threatening like summer AC failure, cold nights are very uncomfortable. Check that pipes don't freeze if temps drop below 32°F - rare but possible in desert.
   - Assignment: December
   - Type: weatherSpecific
   - Priority: medium (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Prepare for occasional winter storms**

   - Description: December can bring winter storms with rain, wind, and rarely snow in desert valleys. Keep flashlights and batteries current for power outages. Have emergency supplies ready. Monitor weather forecasts. Storms are infrequent but can be severe when they occur. Ensure gutters clear for rain. Bring in outdoor furniture if high winds forecast.
   - Assignment: December
   - Type: weatherSpecific
   - Priority: medium (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Monitor humidity levels (very dry)**

   - Description: December desert air is extremely dry - often below 15% humidity. This causes dry skin, nosebleeds, static electricity, and cracked wood furniture. Use humidifier to bring indoor humidity to 30-40%. Moisturize skin frequently. Run humidifier especially at night. Don't over-humidify - morning condensation on windows indicates too much moisture.
   - Assignment: December
   - Type: weatherSpecific
   - Priority: medium (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Check for minimal freeze protection**

   - Description: December nights occasionally drop to 32°F or below in desert. Protect sensitive plants with frost cloth on freeze nights. Drip outdoor faucets if hard freeze forecast (below 28°F). Bring in potted plants. Cover pool equipment if temps dropping to 20s. Freezes are infrequent in low desert but can damage unprepared plants and equipment when they occur.
   - Assignment: December
   - Type: weatherSpecific
   - Priority: medium (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## Year-round

1. **Test smoke and carbon monoxide detectors monthly**

   - Description: Press test button on all smoke and CO detectors every month to verify they beep loudly. Replace batteries twice yearly - good times are daylight saving changes or New Year/July 4th. Clean dust from sensors with vacuum attachment. Replace smoke detectors over 10 years old and CO detectors over 7 years old. Desert dust clogs sensors faster than humid climates - monthly testing and cleaning essential. Working detectors save lives.
   - Assignment: yearRound
   - Type: yearRound
   - Priority: not specified (no task-level priority and no year-round fallback priority)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Test smoke and carbon monoxide detectors monthly
     - Press test button on all smoke and CO detectors every month to verify they beep loudly.
     - Replace batteries twice yearly - good times are daylight saving changes or New Year/July 4th.
     - Desert dust clogs sensors faster than humid climates - monthly testing and cleaning essential.

2. **Check HVAC filters frequently (dust/sand)**

   - Description: Desert dust and sand clog AC filters extremely fast. Check filters every 2 weeks year-round. Replace monthly minimum, weekly during dust storm season (April-September). Use quality pleated filters rated MERV 8-11 for best dust filtration. Never run system with dirty filter - damages compressor and reduces efficiency dramatically. Keep large supply of filters on hand. Desert HVAC maintenance is intense but essential.
   - Assignment: yearRound
   - Type: yearRound
   - Priority: not specified (no task-level priority and no year-round fallback priority)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Check filters every 2 weeks year-round.
     - Replace monthly minimum, weekly during dust storm season (April-September).

3. **Monitor water conservation systems monthly**

   - Description: Check for leaks in irrigation system, faucets, toilets, and water lines monthly. Fix immediately - desert water is scarce and expensive. Test toilet tanks monthly using food coloring to detect silent leaks. Monitor water bill for unusual increases. Adjust irrigation seasonally for temperature changes. Consider drought-tolerant landscaping. Water conservation isn't optional in desert - it's essential responsibility.
   - Assignment: yearRound
   - Type: yearRound
   - Priority: not specified (no task-level priority and no year-round fallback priority)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Monitor water conservation systems monthly
     - Check for leaks in irrigation system, faucets, toilets, and water lines monthly.
     - Test toilet tanks monthly using food coloring to detect silent leaks.
     - Adjust irrigation seasonally for temperature changes.

4. **Check pool and cooling systems regularly**

   - Description: If you have pool, test water chemistry 2-3 times weekly in summer, weekly in winter. Clean skimmer baskets daily in summer, weekly in winter. Run pump 12-18 hours daily depending on season. Backwash or clean filter regularly. Monitor for leaks and equipment problems. Pool maintenance is constant in desert - neglect causes expensive algae blooms and equipment failure. Stay vigilant year-round.
   - Assignment: yearRound
   - Type: yearRound
   - Priority: not specified (no task-level priority and no year-round fallback priority)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - If you have pool, test water chemistry 2-3 times weekly in summer, weekly in winter.
     - Clean skimmer baskets daily in summer, weekly in winter.
     - Run pump 12-18 hours daily depending on season.
     - Stay vigilant year-round.

5. **Inspect for UV and heat damage quarterly**

   - Description: Every 3 months, walk property checking for UV and heat damage: fading or blistering paint, cracked caulk, warped siding, damaged shingles, brittle plastics. Southwest sun and heat are relentless - damage accelerates rapidly. Address problems immediately before they worsen. Consider UV-resistant materials for replacements. Quarterly inspections catch issues early, saving money on major repairs later.
   - Assignment: yearRound
   - Type: yearRound
   - Priority: not specified (no task-level priority and no year-round fallback priority)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Inspect for UV and heat damage quarterly
     - Every 3 months, walk property checking for UV and heat damage: fading or blistering paint, cracked caulk, warped siding, damaged shingles, brittle plastics.
     - Quarterly inspections catch issues early, saving money on major repairs later.

# Region: West Coast

- Data key: West Coast
- Region value: West Coast
- Climate zone: Mediterranean/Marine West Coast

## January

### seasonal

1. **Monitor heating system for cool season**

   - Description: West Coast January temps range from 45-65°F. Check heating system runs efficiently - test thermostat, listen for unusual noises, verify all vents are open. Replace furnace filter if dirty. Mild winters but consistent heating needed for comfort during rainy season.
   - Assignment: January
   - Type: seasonal
   - Priority: medium (inherited from January month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Mild winters but consistent heating needed for comfort during rainy season.

2. **Check for winter storm damage**

   - Description: After each January storm (common in California), inspect roof for damaged shingles, check for leaks inside, examine gutters for damage. Walk property checking fence, trees, outdoor structures. Pacific winter storms bring heavy rain and wind - damage assessment after each event essential.
   - Assignment: January
   - Type: seasonal
   - Priority: medium (inherited from January month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - After each January storm (common in California), inspect roof for damaged shingles, check for leaks inside, examine gutters for damage.
     - Pacific winter storms bring heavy rain and wind - damage assessment after each event essential.

3. **Inspect weatherstripping**

   - Description: Check door and window weatherstripping for gaps or wear. January rain reveals air leaks. Replace damaged seals to keep heat in and moisture out. Good weatherstripping prevents water intrusion and reduces heating costs during wet season.
   - Assignment: January
   - Type: seasonal
   - Priority: medium (inherited from January month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Good weatherstripping prevents water intrusion and reduces heating costs during wet season.

4. **Test carbon monoxide detectors**

   - Description: Press test button on all CO detectors to verify they beep loudly. Replace batteries if needed - New Year is good reminder time. Detectors should be near sleeping areas and on every level. January increased use of heating and fireplaces requires working CO detectors - saves lives.
   - Assignment: January
   - Type: seasonal
   - Priority: medium (inherited from January month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Check attic insulation and ventilation**

   - Description: Inspect attic for proper insulation depth (minimum 10-14 inches) and check for moisture from winter rains. Ensure soffit and ridge vents are clear. Good insulation keeps home comfortable year-round. Check for roof leaks - wet insulation indicates problems above.
   - Assignment: January
   - Type: seasonal
   - Priority: medium (inherited from January month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Good insulation keeps home comfortable year-round.

6. **Clean washing machine drain filter**

   - Description: Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, and debris, then replace the filter and test for leaks. Regular cleaning prevents odors and drainage problems.
   - Assignment: January
   - Type: seasonal
   - Priority: medium (inherited from January month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Monitor for winter storm and wind damage**

   - Description: West Coast January storms bring heavy rain (3-6 inches) and wind gusts to 50+ mph. After each storm, inspect roof, check for water intrusion, examine trees for damage. Secure outdoor furniture before storms. Monitor weather forecasts closely - atmospheric rivers can drop months of rain in days.
   - Assignment: January
   - Type: weatherSpecific
   - Priority: medium (inherited from January month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - After each storm, inspect roof, check for water intrusion, examine trees for damage.

2. **Check earthquake preparedness supplies**

   - Description: California sits on major fault lines - earthquakes can strike anytime. Check emergency kit has current water (1 gallon/person/day for 3 days), non-perishable food, medications, flashlights, batteries. Secure water heater and tall furniture. Practice drop-cover-hold. Preparedness saves lives when big one hits.
   - Assignment: January
   - Type: weatherSpecific
   - Priority: medium (inherited from January month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Inspect for rain and moisture damage**

   - Description: January is wettest month - inspect basement and crawl spaces for water intrusion. Check around windows and doors for leaks. Look for water stains on ceilings and walls. Address leaks immediately to prevent mold. Ensure gutters and downspouts direct water away from foundation.
   - Assignment: January
   - Type: weatherSpecific
   - Priority: medium (inherited from January month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Check heating system for cool weather**

   - Description: Although mild compared to other regions, West Coast January nights drop to 40-50°F. Ensure heating maintains comfort. If system struggles or makes unusual noises, call for service. January rain and chill make heating essential for comfort.
   - Assignment: January
   - Type: weatherSpecific
   - Priority: medium (inherited from January month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Monitor for mudslide and flooding risks**

   - Description: Heavy January rains saturate hillsides, causing mudslides and flooding, especially after wildfires. Know if you're in risk zone. Never drive through flooded roads. Watch for soil movement around foundation. If in mudslide zone, have evacuation plan ready. Monitor weather alerts during heavy rain.
   - Assignment: January
   - Type: weatherSpecific
   - Priority: medium (inherited from January month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## February

### seasonal

1. **Continue winter storm monitoring**

   - Description: February remains active storm month on West Coast. Keep gutters clear, check weatherstripping, monitor for leaks after each storm. Have emergency supplies ready for power outages. Inspect property after each major storm for wind and water damage.
   - Assignment: February
   - Type: seasonal
   - Priority: medium (inherited from February month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Keep gutters clear, check weatherstripping, monitor for leaks after each storm.
     - Inspect property after each major storm for wind and water damage.

2. **Check drainage systems**

   - Description: February rain tests drainage. Ensure gutters and downspouts are clear and functioning. Check that yard drainage directs water away from house. Look for pooling water near foundation. Clean storm drains near property. Poor drainage causes foundation damage and basement flooding.
   - Assignment: February
   - Type: seasonal
   - Priority: medium (inherited from February month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Inspect exterior for weather damage**

   - Description: Walk property checking for storm damage - missing roof shingles, damaged siding, cracked stucco, broken fence panels. Look for peeling paint from moisture. Check window caulking. February storms are cumulative - address damage before it worsens.
   - Assignment: February
   - Type: seasonal
   - Priority: medium (inherited from February month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Check and clean gutters**

   - Description: Remove leaves, debris, and moss from gutters. Flush with hose to ensure proper flow. Check for leaks and sagging sections. Ensure downspouts extend 5 feet from foundation. Clean gutters prevent water damage, foundation problems, and basement flooding during wet season.
   - Assignment: February
   - Type: seasonal
   - Priority: medium (inherited from February month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Clean gutters prevent water damage, foundation problems, and basement flooding during wet season.

5. **Maintain fireplace and chimney**

   - Description: If you use fireplace, remove ash buildup and have chimney professionally swept if used regularly. Check damper operation. Look for cracks in firebox. Install carbon monoxide detector near fireplace. February is prime fireplace season - proper maintenance prevents fires and CO poisoning.
   - Assignment: February
   - Type: seasonal
   - Priority: medium (inherited from February month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Peak winter storm season**

   - Description: February brings heaviest West Coast storms. Stock emergency supplies - water, batteries, flashlights, non-perishable food. Charge devices before storms. Know how to shut off gas and water. Trim trees near house. Major storms cause power outages lasting days - preparation essential.
   - Assignment: February
   - Type: weatherSpecific
   - Priority: medium (inherited from February month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Monitor for flooding and water damage**

   - Description: February atmospheric rivers dump extreme rainfall. Check basement and low areas for water intrusion. Ensure sump pump works if you have one. Move valuables off basement floors. Monitor local flood warnings. Never drive through flooded roads - water is deeper and faster than it appears.
   - Assignment: February
   - Type: weatherSpecific
   - Priority: medium (inherited from February month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Check earthquake preparedness**

   - Description: Earthquakes don't follow seasons. Review emergency plan with family. Check that emergency kit is accessible and current. Ensure water heater is strapped. Secure bookshelves and TVs. Practice drop-cover-hold. After major earthquakes elsewhere, local seismic activity often increases - stay prepared.
   - Assignment: February
   - Type: weatherSpecific
   - Priority: medium (inherited from February month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Inspect for wind damage**

   - Description: February storms bring 40-60 mph winds, higher in mountains. After wind events, inspect roof for damage, check fence for loose boards, examine trees for broken branches. Secure outdoor furniture and trash cans before storms. Coastal areas face stronger winds and salt air corrosion.
   - Assignment: February
   - Type: weatherSpecific
   - Priority: medium (inherited from February month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Check moisture and mold prevention**

   - Description: February rain and mild temps create perfect mold conditions. Run bathroom and kitchen exhaust fans during use. Check for condensation on windows. Inspect closets and bathrooms for mold. Use dehumidifier if indoor humidity exceeds 60%. Address mold immediately - health hazard and property damage.
   - Assignment: February
   - Type: weatherSpecific
   - Priority: medium (inherited from February month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## March

### seasonal

1. **Begin spring maintenance**

   - Description: March brings gradual drying and warming on West Coast. Start spring cleaning - wash windows, dust ceiling fans, vacuum vents. Check smoke detectors and replace batteries. Prepare outdoor spaces for increased use as weather improves. Good month for interior projects before summer.
   - Assignment: March
   - Type: seasonal
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check irrigation systems**

   - Description: Test irrigation system before dry season arrives. Run each zone checking for leaks, broken sprinkler heads, or coverage gaps. Adjust spray patterns. Check controller and sensors. With drought conditions common, efficient irrigation is essential - repair issues now before water restrictions.
   - Assignment: March
   - Type: seasonal
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Inspect exterior paint and siding**

   - Description: March weather perfect for exterior inspection. Look for winter storm damage - peeling paint, cracked caulk, damaged siding. UV damage also significant on West Coast. Check south and west exposures. Plan painting projects for spring - address issues before summer sun accelerates damage.
   - Assignment: March
   - Type: seasonal
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Clean and maintain outdoor areas**

   - Description: March is great time for outdoor work. Power wash patios and walkways. Clean outdoor furniture. Inspect deck for damage. Trim trees and shrubs. Mulch garden beds. Prepare outdoor spaces for spring and summer use. Weather mild and pleasant for outdoor projects.
   - Assignment: March
   - Type: seasonal
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Check pool and spa systems**

   - Description: If you have pool, verify all equipment works after winter. Test pump, filter, and heater. Balance water chemistry. Clean or replace filter. Check for leaks. March is good time for pool opening and maintenance before swim season. Schedule professional service if needed.
   - Assignment: March
   - Type: seasonal
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

6. **Clean washing machine drain filter**

   - Description: Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, and debris, then replace the filter and test for leaks. Good deep clean after wet winter season.
   - Assignment: March
   - Type: seasonal
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Monitor for late winter storms**

   - Description: March can still bring significant West Coast storms, though less frequent than January-February. Keep emergency supplies ready. Monitor forecasts. Clear gutters remain important. Some of largest storms occur in March - don't put away emergency gear yet.
   - Assignment: March
   - Type: weatherSpecific
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check wildfire preparedness**

   - Description: March marks transition to fire season, especially in Southern California. Create defensible space - trim vegetation 30+ feet from house, remove dead plants, clean gutters. Check fire extinguishers. Plan evacuation routes. Stock N95 masks for smoke. Fire season starts earlier each year - prepare now.
   - Assignment: March
   - Type: weatherSpecific
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Fire season starts earlier each year - prepare now.

3. **Inspect for moisture damage from winter**

   - Description: After wet season, check for water damage - stains on ceilings/walls, soft spots in flooring, mold growth. Inspect basement and crawl spaces for moisture. Check attic for roof leaks. Address issues immediately before they worsen. March inspection catches winter damage early.
   - Assignment: March
   - Type: weatherSpecific
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Check drought-resistant landscaping**

   - Description: California faces chronic drought. Consider replacing water-hungry lawns with native drought-tolerant plants. Mulch garden beds to retain moisture. Upgrade to drip irrigation. Check for lawn brown spots indicating overwatering or poor coverage. Water conservation is environmental and financial necessity.
   - Assignment: March
   - Type: weatherSpecific
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Monitor for increased pest activity**

   - Description: March warming activates ants, termites, and rodents. Check for ant trails, termite mud tubes, or mouse droppings. Seal gaps around pipes and foundation. Keep vegetation trimmed away from house. Consider professional pest control treatment before peak activity season.
   - Assignment: March
   - Type: weatherSpecific
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## April

### seasonal

1. **Complete spring maintenance tasks**

   - Description: April weather perfect for outdoor projects - dry and 60-75°F. Complete all spring tasks: paint exterior, repair damage from winter storms, clean gutters, service AC. Tackle project list before hot summer and fire season. Excellent month for all maintenance activities.
   - Assignment: April
   - Type: seasonal
   - Priority: medium (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Service air conditioning system**

   - Description: Schedule AC service before summer heat. Technician will clean coils, check refrigerant, test capacitors, ensure efficient operation. West Coast summers can hit 90-100°F+ inland. Early service avoids summer rush and ensures comfort when heat arrives.
   - Assignment: April
   - Type: seasonal
   - Priority: medium (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Deep clean interior and exterior**

   - Description: Deep clean home inside and out. Wash windows, vacuum vents, clean ceiling fans, shampoo carpets. Power wash exterior, clean siding. Organize closets and storage. April weather ideal for all cleaning projects - comfortable temps, low humidity, dry conditions.
   - Assignment: April
   - Type: seasonal
   - Priority: medium (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Check and maintain deck/patio**

   - Description: Inspect deck boards and railings for damage. Look for rot, loose fasteners, or warped wood. Power wash or stain deck if needed. Clean patio furniture. Test outdoor lighting. Prepare outdoor spaces for summer use - entertaining season approaching.
   - Assignment: April
   - Type: seasonal
   - Priority: medium (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Inspect screens and outdoor furniture**

   - Description: Check window and door screens for tears or damage. Repair or replace as needed. Clean outdoor furniture and check for damage from winter weather. Replace worn cushions. Prepare for increased outdoor living as weather warms.
   - Assignment: April
   - Type: seasonal
   - Priority: medium (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Begin wildfire season preparation**

   - Description: April marks fire season start in California. Create defensible space: clear dead vegetation 30-100 feet from house, trim tree branches 6+ feet from roof, remove debris from gutters. Wildfires threaten thousands of homes annually - preparation is life-saving necessity, not option.
   - Assignment: April
   - Type: weatherSpecific
   - Priority: medium (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Wildfires threaten thousands of homes annually - preparation is life-saving necessity, not option.

2. **Check fire suppression systems**

   - Description: Test sprinkler systems and hoses. Ensure outdoor faucets work and hoses reach all areas. Stock fire extinguishers and check pressure gauges. Clear access to gas shut-off. Have ladder accessible for roof access. During wildfire, every minute counts - equipment must be ready.
   - Assignment: April
   - Type: weatherSpecific
   - Priority: medium (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Monitor drought conditions**

   - Description: California faces chronic drought. Monitor local water restrictions and comply fully. Fix all leaks immediately. Consider drought-tolerant landscaping. Reduce lawn watering or eliminate lawns. Every gallon saved helps community and reduces fire risk from dead vegetation.
   - Assignment: April
   - Type: weatherSpecific
   - Priority: medium (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Check outdoor water conservation**

   - Description: Audit irrigation system efficiency. Upgrade to drip irrigation for gardens. Install rain sensors. Water early morning only. Eliminate runoff. Monitor water bill. Drought isn't temporary - permanent water conservation measures essential for West Coast living.
   - Assignment: April
   - Type: weatherSpecific
   - Priority: medium (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Inspect for earthquake safety updates**

   - Description: Review earthquake preparedness annually. Secure water heater with straps. Anchor tall furniture and TVs. Install automatic gas shut-off. Check emergency supplies are accessible. Practice drop-cover-hold with family. California earthquakes inevitable - preparation reduces injury and damage.
   - Assignment: April
   - Type: weatherSpecific
   - Priority: medium (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Review earthquake preparedness annually.

## May

### seasonal

1. **Begin wildfire season preparation**

   - Description: May fire danger increases significantly. Complete defensible space work: clear brush, remove dead plants, trim trees, clean gutters of flammable debris. Create ember-resistant zone within 5 feet of house - use gravel or pavers, not bark mulch. Fire season lasts through October - prepare now.
   - Assignment: May
   - Type: seasonal
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Maintain air conditioning system**

   - Description: Test AC as temperatures reach 75-85°F inland, 65-75°F coastal. Replace filters monthly during use. Listen for unusual sounds. Ensure all vents blow cold air. If system struggles, call for service before summer heat arrives. Inland valleys hit 100°F+ by June.
   - Assignment: May
   - Type: seasonal
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Replace filters monthly during use.

3. **Check outdoor equipment and furniture**

   - Description: Inspect and clean outdoor equipment - grills, lawn mowers, garden tools. Test outdoor kitchen appliances. Clean and arrange patio furniture. Check shade structures for stability. May brings outdoor living season - ensure all equipment functions properly.
   - Assignment: May
   - Type: seasonal
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Maintain landscaping with water conservation**

   - Description: Transition to drought-tolerant native plants. Mulch heavily to retain moisture. Reduce lawn area or eliminate. Water deeply but infrequently - trains deep roots. Adjust irrigation for warming temps. Fire-safe and water-wise landscaping essential for California.
   - Assignment: May
   - Type: seasonal
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Inspect deck and outdoor structures**

   - Description: Check deck, pergola, and fences for fire safety and structural integrity. Look for dry rot, termite damage, or loose boards. Apply fire-resistant stain if needed. Ensure structures won't contribute to fire spread. Address any safety concerns before summer use.
   - Assignment: May
   - Type: seasonal
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

6. **Clean washing machine drain filter**

   - Description: Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, and debris, then replace the filter and test for leaks. Regular maintenance prevents breakdowns.
   - Assignment: May
   - Type: seasonal
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Peak wildfire season preparation**

   - Description: May is critical fire prep month. Sign up for emergency alerts. Plan evacuation routes - have two options. Pack go-bags with documents, medications, photos. Know when to evacuate versus shelter. Stock N95 masks for smoke. Wildfires move fast - hesitation kills.
   - Assignment: May
   - Type: weatherSpecific
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check defensible space around home**

   - Description: Create three zones: 0-5 feet (ember-resistant), 5-30 feet (reduced fuel), 30-100 feet (thinned vegetation). Remove all dead plants. Trim tree branches 6+ feet from roof and 10+ feet from chimney. Store firewood 30+ feet away. Defensible space is law and life-saver.
   - Assignment: May
   - Type: weatherSpecific
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Monitor drought and water restrictions**

   - Description: May marks start of dry season - no rain until October/November. Follow all water restrictions strictly. Water outdoor plants early morning only. Fix leaks immediately. Report water waste. Drought emergencies common - conservation is civic duty and fire prevention.
   - Assignment: May
   - Type: weatherSpecific
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Check fire-resistant landscaping**

   - Description: Replace flammable plants near house with fire-resistant species. Remove junipers, pines, eucalyptus near structures - highly flammable. Choose succulents, hardwoods, natives with high moisture content. Maintain spacing between plants. Proper landscaping stops fires from reaching home.
   - Assignment: May
   - Type: weatherSpecific
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Inspect evacuation route planning**

   - Description: Drive your evacuation routes at different times - roads become gridlocked during fires. Have backup routes. Know where routes lead. Pack car essentials - water, maps, cash, chargers. Practice evacuation with family. When evacuation ordered, leave immediately - don't wait and see.
   - Assignment: May
   - Type: weatherSpecific
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## June

### seasonal

1. **Peak wildfire season vigilance**

   - Description: June begins peak fire season. Monitor fire conditions daily. Keep defensible space maintained - vegetation grows fast. Have go-bags ready. Watch for smoke. Sign up for emergency alerts if you haven't. June-October is most dangerous period - constant vigilance required.
   - Assignment: June
   - Type: seasonal
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Monitor fire conditions daily.

2. **Monitor air conditioning efficiency**

   - Description: June temps reach 85-95°F inland, 70-80°F coastal. AC runs daily - replace filters monthly. Monitor energy bills for efficiency. Ensure system cools properly. If performance drops, call for service. Summer heat stress tests AC - maintain carefully to avoid breakdowns.
   - Assignment: June
   - Type: seasonal
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - AC runs daily - replace filters monthly.

3. **Maintain outdoor living spaces**

   - Description: June perfect for outdoor activities. Keep outdoor areas fire-safe - no dead vegetation, propane stored properly, grills away from structures. Maintain furniture and equipment. Water plants early morning. Enjoy outdoor spaces while maintaining fire safety awareness.
   - Assignment: June
   - Type: seasonal
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Check pool and water systems**

   - Description: Pool season begins - test chemistry weekly, run pump 8-12 hours daily, clean filter regularly. Monitor for leaks. Use pool cover to reduce evaporation - water conservation important. Ensure pool area is fire-safe and meets safety codes.
   - Assignment: June
   - Type: seasonal
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Pool season begins - test chemistry weekly, run pump 8-12 hours daily, clean filter regularly.

5. **Inspect exterior for fire safety**

   - Description: Walk property checking fire safety: gutters clear, no vegetation touching house, no combustibles near structures, vents screened against embers. Remove anything flammable from under deck. June fire inspections common in high-risk areas - be ready anytime.
   - Assignment: June
   - Type: seasonal
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

6. **Flush water heater**

   - Description: Turn off power/gas and water supply. Attach hose to drain valve and flush until water runs clear, removing sediment. Close valve, restore water and power. Annual flushing extends life and efficiency. Simple maintenance prevents failures.
   - Assignment: June
   - Type: seasonal
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Annual flushing extends life and efficiency.

### weatherSpecific

1. **Peak wildfire season (June-October)**

   - Description: June marks start of 5-month peak fire season. Zero rain expected until fall. Vegetation bone-dry. Single spark starts infernos. Monitor fire conditions daily. Have multiple evacuation plans. Keep car gas tank above half. Wildfires can destroy neighborhoods in hours - constant readiness essential.
   - Assignment: June
   - Type: weatherSpecific
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Monitor fire conditions daily.

2. **Monitor fire danger conditions**

   - Description: Check daily fire danger ratings. On high/extreme days, avoid outdoor burning, parking on dry grass, or using power tools on dry vegetation. Have situational awareness - smell smoke, see smoke columns, hear sirens means investigate immediately. Download CAL FIRE app for real-time alerts.
   - Assignment: June
   - Type: weatherSpecific
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Check daily fire danger ratings.

3. **Check air quality systems**

   - Description: Wildfire smoke degrades air quality severely. Stock HEPA air purifiers for each bedroom. Have N95 masks for all family members. Know how to seal home - close windows, turn off whole-house fans. Monitor AQI daily during fire season. Smoke health impacts serious - protect family.
   - Assignment: June
   - Type: weatherSpecific
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Monitor AQI daily during fire season.

4. **Maintain defensible space**

   - Description: Vegetation management ongoing - plants grow, leaves accumulate. Keep zone 0-5 feet completely clear. Mow grass to 4 inches max. Remove leaves from roof and gutters weekly. Trim new growth away from structures. Defensible space requires constant maintenance, not once-yearly cleaning.
   - Assignment: June
   - Type: weatherSpecific
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Remove leaves from roof and gutters weekly.
     - Defensible space requires constant maintenance, not once-yearly cleaning.

5. **Check emergency evacuation supplies**

   - Description: Verify go-bags current - update medications, batteries, water. Have copies of critical documents. Pack family photos on USB drive. List valuables for insurance. Know what you'll grab in 5-minute evacuation. Review family meeting points if separated. Practice makes survival automatic under stress.
   - Assignment: June
   - Type: weatherSpecific
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## July

### seasonal

1. **Continue wildfire vigilance**

   - Description: July is peak wildfire month on West Coast. Monitor fire danger daily - red flag warnings mean extreme risk. Check defensible space weekly as vegetation grows. Keep go-bags accessible. Monitor smoke and air quality. Stay alert 24/7 - fires can start and spread in minutes during July heat and dry conditions.
   - Assignment: July
   - Type: seasonal
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Monitor fire danger daily - red flag warnings mean extreme risk.
     - Check defensible space weekly as vegetation grows.

2. **Monitor cooling system efficiency**

   - Description: July temps hit 90-100°F+ inland. AC works hard - replace filters monthly, monitor performance, listen for problems. If cooling declines, call for immediate service. Keep indoor temps comfortable during hot days and poor air quality from fires.
   - Assignment: July
   - Type: seasonal
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - AC works hard - replace filters monthly, monitor performance, listen for problems.

3. **Maintain fire-safe landscaping**

   - Description: July heat stresses plants - dead vegetation is extreme fire hazard. Remove all dead material weekly. Water fire-resistant plants to keep them healthy and moist. Keep grass short. Trim vegetation away from structures. Ongoing maintenance critical during peak fire season.
   - Assignment: July
   - Type: seasonal
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Remove all dead material weekly.
     - Ongoing maintenance critical during peak fire season.

4. **Check outdoor equipment protection**

   - Description: Protect outdoor equipment from heat and fire risk. Store propane tanks safely away from structures. Keep combustibles away from outdoor kitchen. Ensure grills are clean and away from house. Have fire extinguisher nearby during outdoor cooking. July heat and fire risk demand extra caution.
   - Assignment: July
   - Type: seasonal
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Inspect air quality systems**

   - Description: July wildfires create severe air quality issues. Run HEPA air purifiers continuously during smoke events. Change filters frequently. Seal home when AQI exceeds 150 - close windows, turn off whole-house fans. Monitor AQI hourly during active fires nearby.
   - Assignment: July
   - Type: seasonal
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

6. **Clean washing machine drain filter**

   - Description: Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, and debris, then replace the filter and test for leaks. Regular maintenance prevents breakdowns during busy summer.
   - Assignment: July
   - Type: seasonal
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Peak wildfire danger period**

   - Description: July is historically worst fire month - Camp Fire, Carr Fire, others started in July/August. Zero percent humidity some days. Single ember starts catastrophic fires. Have 24/7 situational awareness. Sleep with phone on for emergency alerts. Be ready to evacuate instantly - hesitation is deadly.
   - Assignment: July
   - Type: weatherSpecific
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Monitor air quality during fires**

   - Description: Wildfire smoke contains dangerous particulates. AQI above 150 is unhealthy - limit outdoor activity. Above 200 very unhealthy - stay indoors. Above 300 hazardous - seal home, run purifiers, wear N95 outdoors if must go out. Smoke exposure causes lasting health damage - protect family aggressively.
   - Assignment: July
   - Type: weatherSpecific
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Check fire suppression readiness**

   - Description: July fires require immediate action. Have hoses connected and functional. Know gas shut-off location. Keep ladder accessible. Stock fire extinguishers. Have evacuation plan practiced. When fire threatens, wet down house if time permits, then evacuate immediately per emergency orders.
   - Assignment: July
   - Type: weatherSpecific
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Maintain defensible space**

   - Description: July growth and heat stress create constant fire fuel. Inspect property weekly - remove dead leaves, trim back new growth, clear gutters, mow grass very short. Zone 0-5 feet must be absolutely clear. July maintenance is weekly task, not monthly - fire can strike anytime.
   - Assignment: July
   - Type: weatherSpecific
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Inspect property weekly - remove dead leaves, trim back new growth, clear gutters, mow grass very short.
     - July maintenance is weekly task, not monthly - fire can strike anytime.

5. **Monitor drought stress on landscaping**

   - Description: July heat kills drought-stressed plants creating fire fuel. Water fire-resistant plants adequately. Remove dead plants immediately. Consider removing non-fire-resistant plants entirely. Brown, dead vegetation is invitation for wildfire. Keep landscaping healthy or remove it.
   - Assignment: July
   - Type: weatherSpecific
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## August

### seasonal

1. **Continue peak wildfire season vigilance**

   - Description: August equals July for fire danger - often hotter and drier. Maintain constant awareness. Check property daily for fire hazards. Monitor weather and fire conditions obsessively. Have evacuation readiness as routine. August fires have destroyed entire communities - vigilance is survival requirement.
   - Assignment: August
   - Type: seasonal
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Check property daily for fire hazards.

2. **Monitor air conditioning performance**

   - Description: August heat continues to stress AC. System runs continuously - listen for declining performance, unusual sounds, or weak airflow. Replace filters monthly. If system struggles, call immediately for service. AC failure during August heat wave and smoke events creates health emergency.
   - Assignment: August
   - Type: seasonal
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Replace filters monthly.

3. **Check fire-resistant exterior materials**

   - Description: August heat perfect time to upgrade fire resistance. Check that roof, siding, deck, fence are fire-resistant materials. Replace wood shingles with Class A fire-rated roof. Install ember-resistant vents. Seal gaps where embers enter. Homes with fire-resistant exteriors survive when others burn.
   - Assignment: August
   - Type: seasonal
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Maintain outdoor areas safely**

   - Description: August outdoor activities must balance enjoyment with fire safety. Never use outdoor fire pits or fireworks. Keep grills away from house and vegetation. No metal objects on dry grass - catalytic converters start fires. Park vehicles on pavement only. One careless moment destroys neighborhoods.
   - Assignment: August
   - Type: seasonal
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Inspect emergency preparedness**

   - Description: Review evacuation plan with family. Update go-bags with current medications. Test emergency communication plan. Practice evacuation routes. Photograph belongings for insurance. Document valuables. Confirm car has emergency kit. August fires come with zero warning - preparation is survival.
   - Assignment: August
   - Type: seasonal
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Peak wildfire season continues**

   - Description: August fire risk equals or exceeds July. Diablo winds in North, Santa Anas in South push fires at terrifying speed. Fires cross highways, jump firebreaks, destroy everything in path. When evacuation ordered, leave immediately - fire moves faster than traffic. Minutes decide life or death.
   - Assignment: August
   - Type: weatherSpecific
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Monitor extreme fire danger conditions**

   - Description: August red flag warnings are life-threatening events. Extreme fire danger means no outdoor activity creating sparks - no mowing, no power tools, no chains dragging, no driving on dry grass. One spark causes inferno. Take red flag warnings as serious as tornado warnings - they are.
   - Assignment: August
   - Type: weatherSpecific
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Check air filtration during fire season**

   - Description: August fires create weeks of hazardous air. HEPA filters in every bedroom essential. Change filters when dirty - may be weekly during bad fires. Portable purifiers on high continuously during smoke events. Monitor indoor air quality. Good filtration makes difference between breathing safely and permanent lung damage.
   - Assignment: August
   - Type: weatherSpecific
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Check air filtration during fire season
     - Change filters when dirty - may be weekly during bad fires.

4. **Maintain clear evacuation routes**

   - Description: Know two evacuation routes from neighborhood - primary gets gridlocked during fires. Drive routes during different times to know escape time. Keep car above half tank always - gas stations close during evacuations. Have cash for tolls/emergencies. Clear routes save lives when every second counts.
   - Assignment: August
   - Type: weatherSpecific
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Monitor water usage restrictions**

   - Description: August is driest month - water restrictions often most severe. Follow all restrictions strictly. Water landscaping only during allowed times. Fix all leaks immediately. Report water waste. Drought makes fire season worse - water conservation is fire prevention and community responsibility.
   - Assignment: August
   - Type: weatherSpecific
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## September

### seasonal

1. **Continue wildfire season vigilance**

   - Description: September fire season far from over - some worst fires occur September/October. Santa Ana winds bring extreme fire danger. Maintain all fire safety practices - defensible space, emergency readiness, constant monitoring. September fires are often most destructive - don't lower guard as summer ends.
   - Assignment: September
   - Type: seasonal
   - Priority: high (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check heating system preparation**

   - Description: Although still warm (75-90°F days), September nights cool to 50-60°F. Test heating system to ensure it works for coming cool season. Replace furnace filter, check thermostat, listen for issues. Schedule professional service if needed. October brings cooler nights requiring heat.
   - Assignment: September
   - Type: seasonal
   - Priority: high (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Monitor air quality systems**

   - Description: September often brings worst wildfire smoke as fires spread during Santa Ana winds. HEPA filtration remains essential. Monitor AQI continuously. Keep masks and emergency supplies current. Some September fire events create air quality disasters lasting weeks - protection systems must remain fully functional.
   - Assignment: September
   - Type: seasonal
   - Priority: high (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Maintain fire-safe practices**

   - Description: September-October is second peak fire season due to offshore winds. Keep defensible space perfect. Have go-bags ready. Monitor wind forecasts - offshore winds mean extreme fire danger. Never let guard down - September/October fires have destroyed more homes than summer fires in many years.
   - Assignment: September
   - Type: seasonal
   - Priority: high (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Inspect exterior maintenance needs**

   - Description: September weather good for exterior work before winter rains. Complete painting, roof repairs, gutter cleaning, siding repairs. Address summer UV damage. This is ideal maintenance month - dry conditions, moderate temps. Get exterior work done now before November-March rain season.
   - Assignment: September
   - Type: seasonal
   - Priority: high (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

6. **Clean washing machine drain filter**

   - Description: Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, and debris, then replace the filter and test for leaks. Maintenance after busy summer season prevents problems.
   - Assignment: September
   - Type: seasonal
   - Priority: high (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Peak wildfire season continues**

   - Description: September is historically deadly fire month - Oakland Hills, Valley Fire, Atlas Fire all September/October. Offshore winds create perfect fire conditions. Fires spread miles in hours. Red flag warnings frequent. Continue maximum fire vigilance through October. Season far from over - deadliest fires often come in fall.
   - Assignment: September
   - Type: weatherSpecific
   - Priority: high (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Monitor for Santa Ana wind conditions**

   - Description: September brings first Santa Ana winds (Southern California) and Diablo winds (Northern California). These hot, dry, powerful winds create extreme fire danger. When forecast, cancel outdoor plans, have go-bags ready, monitor alerts constantly. Winds turn small fires into firestorms in minutes.
   - Assignment: September
   - Type: weatherSpecific
   - Priority: high (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Check fire safety equipment**

   - Description: Verify all fire safety equipment functional for fall fire season: fire extinguishers charged, hoses working, ladder accessible, N95 masks current, go-bags packed. September-October fire season often worse than summer. Equipment must be ready for instant use - fires move too fast for preparation during event.
   - Assignment: September
   - Type: weatherSpecific
   - Priority: high (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Monitor air quality and filtration**

   - Description: September fires create severe prolonged air quality events. Stock extra HEPA filters - you'll need them. Monitor AQI multiple times daily. Plan indoor activities for kids during smoke. Have purifiers for every bedroom. Smoke season extends through October - filtration critical for health protection.
   - Assignment: September
   - Type: weatherSpecific
   - Priority: high (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Monitor AQI multiple times daily.

5. **Check earthquake preparedness updates**

   - Description: September is California Earthquake Preparedness Month. Review emergency plans with family. Check emergency kit supplies are current. Practice drop-cover-hold-on. Ensure water heater strapped. Check that heavy items secured. Earthquakes strike without warning - annual review keeps family prepared.
   - Assignment: September
   - Type: weatherSpecific
   - Priority: high (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Earthquakes strike without warning - annual review keeps family prepared.

## October

### seasonal

1. **Continue wildfire vigilance**

   - Description: October remains peak fire season - Tubbs Fire, Wine Country Fires, Kincade Fire all October. Santa Ana/Diablo winds at peak strength. Fire danger equal to September. Maintain perfect defensible space, monitor conditions, have evacuation readiness. Fire season doesn't end until November rains - stay alert.
   - Assignment: October
   - Type: seasonal
   - Priority: high (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Begin heating system preparation**

   - Description: October nights drop to 45-55°F. Ensure heating works reliably for coming cool season. Replace filter, check thermostat programming, test system. Listen for unusual sounds. If problems found, schedule service now before winter demand. Heating needs minimal but must function when required.
   - Assignment: October
   - Type: seasonal
   - Priority: high (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Clean gutters before winter rains**

   - Description: October is critical gutter cleaning month - must be done before November rains. Remove all leaves, needles, debris. Check for leaks and proper drainage. Ensure downspouts extend 5 feet from foundation. Clean gutters prevent water damage during wet season and are fire safety requirement during dry season.
   - Assignment: October
   - Type: seasonal
   - Priority: high (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Clean gutters prevent water damage during wet season and are fire safety requirement during dry season.

4. **Check weatherproofing**

   - Description: October is last month before rain season. Inspect all weatherstripping on doors and windows. Check caulking around windows, doors, exterior penetrations. Replace damaged seals. Good weatherproofing prevents water intrusion during November-March rains. Do this now before wet season starts.
   - Assignment: October
   - Type: seasonal
   - Priority: high (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Maintain outdoor areas**

   - Description: October weather perfect for outdoor work. Complete all exterior maintenance before rains. Clean patios, organize outdoor storage, trim trees, maintain landscaping. Enjoy pleasant weather while preparing for winter. Once rains start in November, outdoor work becomes difficult for months.
   - Assignment: October
   - Type: seasonal
   - Priority: high (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

6. **Shut off outside house spigots**

   - Description: Although freezes rare on most of West Coast, October nights can drop to freezing in inland valleys. Disconnect and drain hoses. Shut off water to exterior faucets if you have valves. Drain irrigation systems in freeze-prone areas. Better safe than dealing with burst pipes.
   - Assignment: October
   - Type: seasonal
   - Priority: high (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Peak wildfire season continues**

   - Description: October is climatologically most dangerous fire month - hottest, driest, strongest winds combine. Major October fires are annual event in California. Maintain maximum fire vigilance. When red flag warning issued, be ready to evacuate. Most destructive fires in state history occurred in October. This is the peak.
   - Assignment: October
   - Type: weatherSpecific
   - Priority: high (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Major October fires are annual event in California.

2. **Monitor for dry wind conditions**

   - Description: October offshore winds (Santa Anas/Diablos) reach peak strength - 60-80+ mph gusts common. These hot, dry winds desiccate vegetation and push fires at terrifying speed. When wind event forecast, cancel plans, stay alert, monitor conditions continuously. These winds make fires unstoppable.
   - Assignment: October
   - Type: weatherSpecific
   - Priority: high (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Prepare for winter storm season**

   - Description: October marks transition from fire to flood season. First rains often come late October. Clean gutters and drains before rains. Check emergency supplies for winter storms. Know flood and mudslide risk zones. After fire season, heavy rains cause floods and mudslides - different emergency but equally dangerous.
   - Assignment: October
   - Type: weatherSpecific
   - Priority: high (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Check fire and flood preparedness**

   - Description: October requires dual preparedness - still fire season but rain season approaching. Maintain fire readiness while preparing for floods. Areas burned by wildfire face extreme mudslide risk when rains come. Have evacuation plans for both fire and flood. October transition month demands vigilance for multiple hazards.
   - Assignment: October
   - Type: weatherSpecific
   - Priority: high (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Monitor for earthquake safety**

   - Description: October is California Great ShakeOut earthquake drill month. Review earthquake preparedness annually. Check water heater straps tight. Ensure emergency kit accessible. Practice drop-cover-hold-on with family. Secure heavy furniture and water heater. Major earthquake is certain eventually - preparation reduces casualties.
   - Assignment: October
   - Type: weatherSpecific
   - Priority: high (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Review earthquake preparedness annually.

## November

### seasonal

1. **End of wildfire season vigilance**

   - Description: November rains usually end fire season, but late-season fires still possible. Maintain defensible space until consistent rains establish. Monitor forecast - dry November extends fire season. Once rains start, transition to flood/mudslide awareness. Fire season officially ends with significant rain accumulation.
   - Assignment: November
   - Type: seasonal
   - Priority: medium (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Prepare for winter storm season**

   - Description: November brings first major winter storms. Stock emergency supplies - water, batteries, flashlights, non-perishable food. Charge devices before storms. Know how to shut off utilities. Trim trees near house. Clear gutters and drains. Winter storms cause power outages and flooding - preparation essential.
   - Assignment: November
   - Type: seasonal
   - Priority: medium (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Check heating system operation**

   - Description: November nights drop to 40-50°F. Ensure heating works reliably for winter. Test system, replace filters, check that all rooms heat evenly. If problems found, call for service now. Although mild compared to other regions, consistent heating needed for comfort during wet, cool winter months.
   - Assignment: November
   - Type: seasonal
   - Priority: medium (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Although mild compared to other regions, consistent heating needed for comfort during wet, cool winter months.

4. **Clean and maintain outdoor areas**

   - Description: November weather still allows outdoor work between storms. Complete final exterior maintenance before winter rain season. Clean gutters thoroughly, secure outdoor items, organize storage. Once heavy rains start, outdoor work becomes unpleasant for months. Do it now while possible.
   - Assignment: November
   - Type: seasonal
   - Priority: medium (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Check holiday decoration safety**

   - Description: November brings holiday season. Test all lights before hanging - check for damaged cords or bulbs. Use outdoor-rated lights and weatherproof cords. Test GFCI outlets. Secure decorations against winter winds. Keep live trees watered to prevent fire hazard. Safety first during celebrations.
   - Assignment: November
   - Type: seasonal
   - Priority: medium (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

6. **Clean washing machine drain filter**

   - Description: Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, and debris, then replace the filter and test for leaks. Good maintenance before wet season when laundry increases.
   - Assignment: November
   - Type: seasonal
   - Priority: medium (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Transition from fire to flood season**

   - Description: November marks dramatic transition - fire danger ends, flood/mudslide season begins. First heavy rains after dry summer cause flooding and mudslides, especially in recent burn areas. Monitor weather forecasts. Know flood/mudslide risk zones. Never drive through flooded roads. Different hazard, equal danger.
   - Assignment: November
   - Type: weatherSpecific
   - Priority: medium (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check winter storm preparedness**

   - Description: November storms can be severe - atmospheric rivers bring heavy rain, wind, power outages. Have emergency supplies ready. Know how to report downed power lines. Charge devices before each storm. Stock food for potential multi-day outages. Coastal areas face storm surge - know your risk zones.
   - Assignment: November
   - Type: weatherSpecific
   - Priority: medium (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Charge devices before each storm.

3. **Monitor for mudslide risks**

   - Description: Areas burned by wildfires face severe mudslide risk during heavy November rains. Fire removes vegetation that holds soil - mudslides occur rapidly during intense rainfall. If you live below recently burned areas, have evacuation plan ready. Monitor rainfall rates - inches per hour matters more than total accumulation.
   - Assignment: November
   - Type: weatherSpecific
   - Priority: medium (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Check heating system for winter**

   - Description: November cool, wet weather requires reliable heating. Ensure system maintains comfort during 45-55°F rainy days and nights. Monitor for unusual sounds or smells. If heating seems inadequate, call for service. Mild winters but consistent heating needed - system must work reliably November-March.
   - Assignment: November
   - Type: weatherSpecific
   - Priority: medium (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Inspect for fire season damage**

   - Description: After fire season ends, assess any damage from smoke, ash, or nearby fires. Check air filters throughout house - replace all. Clean exterior of ash/soot if affected by nearby fires. Inspect roof and gutters for ember damage. Address any issues before winter rains potentially make damage worse.
   - Assignment: November
   - Type: weatherSpecific
   - Priority: medium (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## December

### seasonal

1. **Monitor heating system performance**

   - Description: December nights drop to 40-50°F, occasionally 30s inland. Heating runs regularly - monitor for consistent performance. Check that all rooms heat properly. Replace filter if dirty. Ensure thermostat works correctly. December-February are coolest months - system must function reliably throughout winter.
   - Assignment: December
   - Type: seasonal
   - Priority: medium (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check winter storm preparation**

   - Description: December brings more winter storms. Keep emergency supplies current - batteries, flashlights, water, food. Charge devices before each storm. Have backup plans for power outages. Monitor weather forecasts closely. Major December storms are common - preparation prevents emergency becoming crisis.
   - Assignment: December
   - Type: seasonal
   - Priority: medium (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Charge devices before each storm.

3. **Test smoke and carbon monoxide detectors**

   - Description: Press test button on all smoke and CO detectors to verify they beep loudly. Replace batteries - holiday season good reminder time. Clean dust from sensors. December increased use of fireplaces, space heaters, and heating systems requires working detectors. Test monthly, replace batteries now.
   - Assignment: December
   - Type: seasonal
   - Priority: medium (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Test monthly, replace batteries now.

4. **Check holiday decorations safety**

   - Description: December holiday season requires safety awareness. Don't overload electrical circuits. Use outdoor-rated lights and cords. Test GFCIs. Water live trees daily - dry trees are extreme fire hazard. Turn off decorative lights when leaving or sleeping. Secure outdoor decorations against storms.
   - Assignment: December
   - Type: seasonal
   - Priority: medium (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Water live trees daily - dry trees are extreme fire hazard.

5. **Maintain mild winter conditions**

   - Description: December brings mild but wet winter - 55-65°F days, 40-50°F nights, regular rain. Monitor for leaks during storms. Run dehumidifiers if needed. Ensure drainage systems work properly. Check for mold in damp areas. Mild temperatures but high moisture - different maintenance needs than cold climates.
   - Assignment: December
   - Type: seasonal
   - Priority: medium (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Winter storm season begins**

   - Description: December through March is peak winter storm season. Atmospheric rivers bring extreme rainfall - multiple inches in hours or days. Flooding, mudslides, wind damage, power outages all common. Have emergency plan for each hazard. Stock supplies for multi-day outages. Storms can be severe and prolonged.
   - Assignment: December
   - Type: weatherSpecific
   - Priority: medium (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Monitor for flooding and wind damage**

   - Description: December storms bring flooding and wind damage. Check property after each storm - inspect for water intrusion, roof damage, fallen branches. Clear storm drains near property. Never drive through flooded roads. Secure outdoor items before wind events. Cumulative storm damage adds up - inspect after each event.
   - Assignment: December
   - Type: weatherSpecific
   - Priority: medium (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Check property after each storm - inspect for water intrusion, roof damage, fallen branches.
     - Cumulative storm damage adds up - inspect after each event.

3. **Check earthquake preparedness supplies**

   - Description: Review earthquake emergency kit as year ends - ensure water hasn't expired, rotate food supplies, check batteries, update medications. Earthquakes strike without warning or seasonal pattern. Annual review keeps supplies current. Living on major fault lines requires constant preparedness - make it year-end tradition.
   - Assignment: December
   - Type: weatherSpecific
   - Priority: medium (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Annual review keeps supplies current.

4. **Monitor heating during cool weather**

   - Description: December cool, wet weather requires consistent heating. Monitor energy usage - sudden spikes indicate inefficiency. Ensure heating maintains comfort during wet, cool days and nights. Although mild compared to other regions, damp cold feels uncomfortable - reliable heating essential for winter comfort.
   - Assignment: December
   - Type: weatherSpecific
   - Priority: medium (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Check moisture control during rains**

   - Description: December rain creates moisture problems. Run bathroom and kitchen exhaust fans during use. Check for condensation on windows - indicates excess humidity. Use dehumidifiers in damp basements. Inspect for mold in closets and bathrooms. Address moisture immediately - mold grows fast in wet season.
   - Assignment: December
   - Type: weatherSpecific
   - Priority: medium (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## Year-round

1. **Test smoke and carbon monoxide detectors monthly**

   - Description: Press test button on all smoke and CO detectors every month to verify they beep loudly. Replace batteries twice yearly - good times are daylight saving changes. Clean dust from sensors with vacuum attachment. Replace smoke detectors over 10 years old and CO detectors over 7 years old. California wildfires and earthquake risks make working detectors life-critical.
   - Assignment: yearRound
   - Type: yearRound
   - Priority: not specified (no task-level priority and no year-round fallback priority)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Test smoke and carbon monoxide detectors monthly
     - Press test button on all smoke and CO detectors every month to verify they beep loudly.
     - Replace batteries twice yearly - good times are daylight saving changes.

2. **Check earthquake emergency supplies quarterly**

   - Description: Every 3 months, verify earthquake kit has current water (1 gallon/person/day for 3 days minimum), non-perishable food, medications, batteries, flashlights, first aid supplies. Rotate food and water annually. Check that water heater is strapped and heavy furniture secured. Earthquakes strike without warning - quarterly checks ensure readiness.
   - Assignment: yearRound
   - Type: yearRound
   - Priority: not specified (no task-level priority and no year-round fallback priority)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Check earthquake emergency supplies quarterly
     - Every 3 months, verify earthquake kit has current water (1 gallon/person/day for 3 days minimum), non-perishable food, medications, batteries, flashlights, first aid supplies.
     - Rotate food and water annually.
     - Earthquakes strike without warning - quarterly checks ensure readiness.

3. **Monitor air quality systems regularly**

   - Description: During wildfire season (May-October), check HEPA air purifier filters weekly - replace when dirty. Monitor AQI daily during fire season. Stock N95 masks year-round. Keep extra purifier filters on hand. Wildfire smoke is annual health threat on West Coast - good filtration is health necessity, not luxury.
   - Assignment: yearRound
   - Type: yearRound
   - Priority: not specified (no task-level priority and no year-round fallback priority)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - During wildfire season (May-October), check HEPA air purifier filters weekly - replace when dirty.
     - Monitor AQI daily during fire season.
     - Stock N95 masks year-round.
     - Wildfire smoke is annual health threat on West Coast - good filtration is health necessity, not luxury.

4. **Check water conservation systems monthly**

   - Description: Monthly check for leaks in irrigation, faucets, toilets. Fix immediately - California water scarcity makes conservation essential and legally required. Test toilet tanks with food coloring for silent leaks. Monitor water bill for unusual increases. Audit irrigation efficiency. Water conservation is environmental necessity and wildfire prevention.
   - Assignment: yearRound
   - Type: yearRound
   - Priority: not specified (no task-level priority and no year-round fallback priority)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Check water conservation systems monthly
     - Monthly check for leaks in irrigation, faucets, toilets.

5. **Professional HVAC service twice yearly**

   - Description: Schedule AC service in spring (March/April) before heat and fire season, furnace check in fall (October/November) before winter. Professional service extends equipment life, ensures efficiency, prevents failures during extreme weather. West Coast climate demands reliable cooling during wildfire season and heating during wet winter.
   - Assignment: yearRound
   - Type: yearRound
   - Priority: not specified (no task-level priority and no year-round fallback priority)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Professional HVAC service twice yearly
     - West Coast climate demands reliable cooling during wildfire season and heating during wet winter.

# Region: Mountain West

- Data key: Mountain West
- Region value: Mountain West
- Climate zone: High Desert/Alpine

## January

### seasonal

1. **Peak winter heating season**

   - Description: January brings Mountain West coldest temps (-20°F to 20°F). Heating runs 24/7 - monitor performance constantly. Replace furnace filter monthly minimum. Check for unusual sounds or smells. If system struggles, call for emergency service immediately. January heating failure at altitude can be life-threatening. System must work reliably through March.
   - Assignment: January
   - Type: seasonal
   - Priority: high (inherited from January month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Replace furnace filter monthly minimum.

2. **Check heating system efficiency**

   - Description: Monitor energy bills for sudden spikes indicating inefficiency. Ensure all vents are open and unobstructed. Check that thermostat works correctly. Verify all rooms heat evenly. Listen for cycling sounds - frequent short cycles indicate problems. At altitude, heating systems work harder - efficiency critical for comfort and cost.
   - Assignment: January
   - Type: seasonal
   - Priority: high (inherited from January month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Monitor for extreme cold effects**

   - Description: January cold snaps drop temps to -30°F in valleys, colder on mountains. Let faucets drip during extreme cold. Open cabinet doors under sinks for air circulation. Keep garage doors closed. Dress in layers indoors. Stock emergency supplies in case of power outage. Extreme cold is life-threatening - take seriously.
   - Assignment: January
   - Type: seasonal
   - Priority: high (inherited from January month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Inspect fireplace and chimney**

   - Description: If using wood heat, remove ash buildup regularly and have chimney professionally swept annually. Check damper seals properly when not in use - massive heat loss through open damper. Stock firewood in covered dry area. Install CO detector near fireplace. Wood heat common at altitude - maintain safely.
   - Assignment: January
   - Type: seasonal
   - Priority: high (inherited from January month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - If using wood heat, remove ash buildup regularly and have chimney professionally swept annually.

5. **Check insulation and weatherproofing**

   - Description: Inspect attic for adequate insulation depth (minimum 14-20 inches at altitude). Check for ice dams indicating heat loss. Ensure basement and crawl space insulation adequate. Check weatherstripping on doors and windows - replace if worn. Good insulation essential at altitude where heating season runs October-May.
   - Assignment: January
   - Type: seasonal
   - Priority: high (inherited from January month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

6. **Clean washing machine drain filter**

   - Description: Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, and debris, then replace the filter and test for leaks. Winter months generate heavy laundry loads - keep machine maintained.
   - Assignment: January
   - Type: seasonal
   - Priority: high (inherited from January month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Extreme cold weather preparation (-20°F+)**

   - Description: January brings life-threatening cold at altitude. Stock emergency supplies - food, water, batteries, flashlights, blankets for multi-day power outages common during winter storms. Have backup heat source (fireplace, wood stove). Never use generators indoors - CO poisoning kills. Extreme cold preparation is survival necessity.
   - Assignment: January
   - Type: weatherSpecific
   - Priority: high (inherited from January month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check for ice dam formation**

   - Description: Look for icicles and ice buildup at roof edges - indicates heat escaping through roof melting snow unevenly. Ice dams cause major water damage when melting. Clear snow from roof edges using roof rake from ground. Improve attic insulation and ventilation to prevent heat loss. Ice dams common at altitude with heavy snowfall.
   - Assignment: January
   - Type: weatherSpecific
   - Priority: high (inherited from January month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Monitor heating system during cold snaps**

   - Description: When temps drop below -20°F, check heating system every few hours. Listen for struggling sounds. Monitor thermostat - if temp drops despite system running, call for emergency service. Have backup heat ready. Keep emergency numbers accessible. At altitude during cold snaps, heating failure is emergency requiring immediate action.
   - Assignment: January
   - Type: weatherSpecific
   - Priority: high (inherited from January month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Check altitude-specific considerations**

   - Description: Altitude affects everything in winter. Water boils at lower temp making humidifiers less effective. Dry air more severe - use multiple humidifiers to maintain 30-40% humidity. UV radiation more intense even in winter - sun damage continues. Altitude sickness can worsen in dry, cold air. Monitor family health carefully.
   - Assignment: January
   - Type: weatherSpecific
   - Priority: high (inherited from January month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Monitor for winter storm damage**

   - Description: Mountain winter storms bring extreme wind, heavy snow, dangerous cold. After each storm, inspect roof for damage, check for downed tree branches, clear snow from vents and furnace exhausts. Never let snow block furnace intake/exhaust - CO hazard. Check that satellite dishes and antennas clear. Storm damage compounds - inspect after each event.
   - Assignment: January
   - Type: weatherSpecific
   - Priority: high (inherited from January month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - After each storm, inspect roof for damage, check for downed tree branches, clear snow from vents and furnace exhausts.
     - Storm damage compounds - inspect after each event.

## February

### seasonal

1. **Continue peak winter maintenance**

   - Description: February remains brutal at altitude - temps -10°F to 25°F. Continue all January practices. Replace furnace filters monthly. Monitor heating performance constantly. Check for ice dams after each snow. Keep emergency supplies current. February is often coldest month - vigilance essential for safety and comfort.
   - Assignment: February
   - Type: seasonal
   - Priority: high (inherited from February month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Replace furnace filters monthly.
     - Check for ice dams after each snow.

2. **Check heating system performance**

   - Description: After two months of continuous use, heating systems show wear. Listen for declining performance, unusual sounds, or weak airflow. Monitor energy bills - sudden increases indicate problems. If system struggles or fails, call immediately for service. February heating failure dangerous at altitude - address problems immediately.
   - Assignment: February
   - Type: seasonal
   - Priority: high (inherited from February month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Monitor energy usage efficiency**

   - Description: Review monthly energy bills and compare to previous years. Sudden spikes indicate inefficiency - poor insulation, air leaks, or system problems. Conduct home energy audit - check for drafts, inspect insulation, verify windows seal properly. At altitude with long heating season, efficiency matters for budget and comfort.
   - Assignment: February
   - Type: seasonal
   - Priority: high (inherited from February month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Review monthly energy bills and compare to previous years.

4. **Check attic insulation and ventilation**

   - Description: Mid-winter inspection of attic critical. Check insulation depth adequate (14-20 inches minimum). Look for compressed or wet insulation. Ensure soffit and ridge vents clear of snow and ice. Check for ice dams indicating poor insulation. Proper attic insulation prevents heat loss and ice dam formation.
   - Assignment: February
   - Type: seasonal
   - Priority: high (inherited from February month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Inspect for winter damage**

   - Description: February accumulates winter damage. Check for cracks in foundation from freeze-thaw cycles. Look for ice damage to gutters and downspouts. Inspect exterior for wind damage. Check indoor ceilings/walls for water stains from ice dams. Address problems before they worsen - February damage worsens with each freeze-thaw cycle.
   - Assignment: February
   - Type: seasonal
   - Priority: high (inherited from February month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Monitor for extreme weather conditions**

   - Description: February brings severe Mountain West storms. Stock up before storms hit - power outages last days at altitude. Have 7-day supply of food, water, medications. Keep vehicles fueled - gas stations close during storms. Monitor weather forecasts obsessively. Have communication plan if cell towers fail. February storms can isolate mountain communities for days.
   - Assignment: February
   - Type: weatherSpecific
   - Priority: high (inherited from February month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check snow load on roof structures**

   - Description: Heavy wet February snow creates dangerous roof loads. If accumulation exceeds 3 feet or you hear creaking, remove snow using roof rake from ground. Watch for sagging roof sections. Never climb on snow-loaded roof. Flat or low-pitch roofs particularly at risk. Roof collapse kills - take snow load seriously at altitude.
   - Assignment: February
   - Type: weatherSpecific
   - Priority: high (inherited from February month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Monitor heating efficiency at altitude**

   - Description: Altitude reduces oxygen available for combustion - furnaces and water heaters work less efficiently. Ensure adequate ventilation for combustion appliances. Have CO detectors on every level. Monitor for soot buildup indicating incomplete combustion. Schedule professional service if efficiency declining. Altitude affects all combustion systems.
   - Assignment: February
   - Type: weatherSpecific
   - Priority: high (inherited from February month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Check for winter storm preparation**

   - Description: Verify emergency supplies remain current mid-winter. Rotate food stocks, check battery freshness, ensure flashlights work. Have backup heating ready. Stock sand/salt for icy walkways. Keep extra medications on hand. Test generator if you have one. February storms most severe - preparation prevents emergency becoming crisis.
   - Assignment: February
   - Type: weatherSpecific
   - Priority: high (inherited from February month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Monitor for avalanche safety if applicable**

   - Description: Mountain areas face avalanche risk after heavy snow. Know your risk zones - areas below steep slopes dangerous. Never enter closed avalanche zones. Have avalanche beacon if backcountry activities. Monitor avalanche forecasts. If you hear rumbling, move away from valley bottoms immediately. Avalanches kill - respect mountain hazards.
   - Assignment: February
   - Type: weatherSpecific
   - Priority: high (inherited from February month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## March

### seasonal

1. **Begin spring preparation**

   - Description: March transitions from winter to spring at altitude - temps -5°F to 40°F. Continue heating system vigilance - season far from over. Start planning spring projects. Order supplies before busy season. Clean and organize garage. March is shoulder season - still cold but thinking ahead to spring essential.
   - Assignment: March
   - Type: seasonal
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check HVAC system transition**

   - Description: March brings wild temperature swings - 10°F at night, 50°F during day. HVAC may switch between heating and cooling daily. Test AC before needed - schedule service if problems found. Continue replacing furnace filters monthly. Spring maintenance season approaching - get HVAC service scheduled now before rush.
   - Assignment: March
   - Type: seasonal
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - HVAC may switch between heating and cooling daily.
     - Continue replacing furnace filters monthly.

3. **Inspect exterior for winter damage**

   - Description: Walk property checking winter damage - cracked siding from freeze-thaw, damaged roof shingles from snow/ice, broken fences from wind, foundation cracks from frost heave. Make repair list and prioritize. March-May weather permits exterior work - address damage before summer storms arrive.
   - Assignment: March
   - Type: seasonal
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Begin outdoor equipment preparation**

   - Description: Prepare lawn equipment for spring. Change oil in mowers and trimmers, sharpen blades, clean air filters. Test irrigation system once frost danger passes (late May typically). Check deck for winter damage. Service outdoor power equipment now before spring rush. May comes fast at altitude - prepare early.
   - Assignment: March
   - Type: seasonal
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Check water systems for spring thaw**

   - Description: March brings freeze-thaw cycles stressing water systems. Check for leaking pipes from winter freezing. Test outdoor faucets once weather permits - turn on slowly watching for leaks. Inspect water heater for leaks or corrosion. Spring thaw reveals winter pipe damage - catch early before major failures.
   - Assignment: March
   - Type: seasonal
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

6. **Clean washing machine drain filter**

   - Description: Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, and debris, then replace the filter and test for leaks. Deep clean after heavy winter use prepares for spring.
   - Assignment: March
   - Type: seasonal
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Monitor for spring flooding from snowmelt**

   - Description: March snowmelt combined with spring rain causes flooding at altitude. Ensure gutters and downspouts clear and draining away from foundation. Check basement and crawl space for water intrusion. Direct downspouts at least 5 feet from house. Monitor low-lying areas for pooling water. Spring flooding damages foundations - prevention essential.
   - Assignment: March
   - Type: weatherSpecific
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check foundation drainage systems**

   - Description: Inspect foundation for cracks from winter frost heave. Check that grading slopes away from house. Ensure window wells drain properly. Look for water stains in basement. Install or check sump pump operation. March snowmelt tests drainage - inadequate drainage causes foundation failure and basement flooding.
   - Assignment: March
   - Type: weatherSpecific
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Prepare for rapid weather changes**

   - Description: March at altitude brings crazy weather - snow, rain, sun, wind, freezing temps all in one day. Layer clothing for rapid changes. Keep winter and spring gear accessible. Monitor weather forecasts daily. Have emergency supplies ready - March storms can be severe. Rapid changes stress homes - inspect for damage after weather events.
   - Assignment: March
   - Type: weatherSpecific
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Monitor weather forecasts daily.

4. **Monitor altitude weather effects**

   - Description: March marks start of severe weather season at altitude. Monitor for spring blizzards - more snow falls in March than January at some elevations. Watch for wind damage - March winds strongest of year. UV radiation increases rapidly with spring sun - snow blindness risk. March weather at altitude unpredictable and potentially dangerous.
   - Assignment: March
   - Type: weatherSpecific
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Check for spring storm preparation**

   - Description: March through May brings severe spring storms at altitude. Stock emergency supplies for heavy wet snow bringing power outages. Have generator fuel current. Clear dead tree branches before spring winds. Trim trees away from power lines. Spring storms different from winter - heavy wet snow, lightning, severe winds. Different hazards require different preparation.
   - Assignment: March
   - Type: weatherSpecific
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## April

### seasonal

1. **Complete spring maintenance**

   - Description: April weather moderates at altitude (20-60°F). Complete spring projects - clean gutters, wash windows, organize garage, service lawn equipment. Check exterior paint for winter damage. Repair fence damaged by snow. April-June are prime maintenance months - tackle project list before summer wildfire season.
   - Assignment: April
   - Type: seasonal
   - Priority: medium (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Service air conditioning system**

   - Description: Schedule AC service before summer heat. Altitude affects AC efficiency - thin air means less cooling capacity. Technician should check refrigerant, clean coils, test capacitors. Summer temps can hit 90-100°F+ at lower elevations. Early service avoids rush and ensures comfort when heat arrives.
   - Assignment: April
   - Type: seasonal
   - Priority: medium (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Clean and inspect outdoor areas**

   - Description: April perfect for outdoor work at altitude. Power wash deck and patios. Clean outdoor furniture. Organize storage areas. Inspect outdoor structures for winter damage. Enjoy comfortable spring weather while preparing outdoor spaces for summer use. Window between snow and fire season short - work efficiently.
   - Assignment: April
   - Type: seasonal
   - Priority: medium (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Check irrigation and water systems**

   - Description: Test irrigation system once frost danger passes (usually late April-early May at altitude). Check for broken sprinkler heads, leaks, or freeze damage. Adjust coverage and timing for altitude conditions. Water is scarce at altitude and fire season approaching - efficient irrigation essential.
   - Assignment: April
   - Type: seasonal
   - Priority: medium (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Inspect exterior paint and maintenance**

   - Description: UV radiation intense at altitude - paint fades and degrades faster than sea level. Inspect all exterior surfaces for damage. Look for peeling paint, cracked caulk, damaged siding. Plan painting projects for May-June before summer storms. Altitude UV damage accelerates - regular maintenance prevents major problems.
   - Assignment: April
   - Type: seasonal
   - Priority: medium (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Monitor for spring storms and flooding**

   - Description: April brings severe spring storms at altitude - heavy wet snow, lightning, high winds, rapid snowmelt flooding. Monitor weather forecasts closely. Have emergency supplies ready. Check drainage systems handle snowmelt. Spring storms at altitude can be more severe than winter storms - different hazards require vigilance.
   - Assignment: April
   - Type: weatherSpecific
   - Priority: medium (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check wildfire preparedness**

   - Description: April marks start of fire season at altitude. Create defensible space - trim vegetation 30-100 feet from house, remove dead plants, clean gutters. Check fire extinguishers. Plan evacuation routes. Fire season runs May-September but preparation starts now. Altitude fires spread fast due to low humidity and wind.
   - Assignment: April
   - Type: weatherSpecific
   - Priority: medium (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Monitor for rapid temperature changes**

   - Description: April at altitude brings wild swings - freezing nights, warm days, sudden snow squalls, then sunshine. Layer clothing. Keep winter and summer clothes accessible. Protect plants from late frost. Temperature changes stress homes - expansion/contraction causes cracks. Monitor for damage after temperature extremes.
   - Assignment: April
   - Type: weatherSpecific
   - Priority: medium (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Check outdoor equipment for altitude**

   - Description: Altitude affects all combustion equipment. Carburetors need altitude adjustment for proper fuel/air mix. Generators, lawn mowers, chain saws all need altitude-specific tuning. Performance declines at altitude without adjustment. Have equipment serviced by altitude-experienced technician for proper operation.
   - Assignment: April
   - Type: weatherSpecific
   - Priority: medium (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Prepare for severe weather season**

   - Description: April through September brings severe weather at altitude - lightning storms, hail, high winds, flash flooding, wildfires. Stock emergency supplies. Have multiple communication methods - cell service unreliable. Install lightning rods if on exposed ridge. Severe weather at altitude intense and sudden - preparation essential.
   - Assignment: April
   - Type: weatherSpecific
   - Priority: medium (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## May

### seasonal

1. **Begin wildfire season preparation**

   - Description: May starts fire season at altitude. Complete defensible space work now - trim all vegetation, remove dead material, clean gutters, create ember-resistant zone within 5 feet of house. Stock N95 masks, fire extinguishers, hoses. Plan evacuation. Fire season May-September - prepare while weather permits outdoor work.
   - Assignment: May
   - Type: seasonal
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Complete outdoor maintenance**

   - Description: May is prime outdoor maintenance month at altitude (30-70°F, occasional snow). Complete all outdoor projects - painting, deck repairs, roof maintenance, fence work. Once fire season peaks in June-July, outdoor work restricted on high fire danger days. Get projects done now.
   - Assignment: May
   - Type: seasonal
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Service lawn and garden equipment**

   - Description: Service all outdoor power equipment before summer. Change oil, sharpen blades, clean air filters, check spark plugs. At altitude, equipment needs altitude-specific carburetor tuning for proper operation. Stock fuel and oil. Growing season short at altitude - equipment must work when needed.
   - Assignment: May
   - Type: seasonal
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Check deck and outdoor structures**

   - Description: Inspect decks, pergolas, fences for winter damage and fire safety. Look for rot, loose fasteners, or structural issues. Apply fire-resistant stain if needed. Ensure structures won't contribute to fire spread. Altitude UV damage and freeze-thaw cycles stress wood - regular inspection prevents failures.
   - Assignment: May
   - Type: seasonal
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Maintain outdoor living areas**

   - Description: Prepare outdoor spaces for short but intense summer season at altitude. Clean and arrange furniture. Test outdoor lighting and cooking equipment. Prepare fire pit areas (follow fire restrictions). Summer at altitude is precious - make outdoor spaces ready for maximum enjoyment during brief warm season.
   - Assignment: May
   - Type: seasonal
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Summer at altitude is precious - make outdoor spaces ready for maximum enjoyment during brief warm season.

6. **Clean washing machine drain filter**

   - Description: Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, and debris, then replace the filter and test for leaks. Good maintenance before busy summer season.
   - Assignment: May
   - Type: seasonal
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Begin wildfire season vigilance**

   - Description: May wildfire season begins at altitude. Low humidity (often below 15%), abundant dry vegetation, increasing temps create fire danger. Monitor fire restrictions - often ban open flames even on private property. Sign up for emergency alerts. Practice evacuation. Wildfires at altitude spread rapidly due to wind and terrain - preparation critical.
   - Assignment: May
   - Type: weatherSpecific
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check fire suppression systems**

   - Description: Test all fire safety equipment before fire season. Ensure hoses reach all areas. Check fire extinguisher pressure gauges. Verify outdoor faucets work. Stock ladder for roof access. Have chainsaw fueled for clearing firebreaks. During wildfire, every tool must work - test everything now before fires start.
   - Assignment: May
   - Type: weatherSpecific
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Monitor drought conditions**

   - Description: Mountain West faces chronic drought. Monitor local water restrictions and comply fully. Fix all leaks. Transition to drought-tolerant landscaping. Reduce lawn watering. Drought creates fire fuel from dead vegetation and reduces water available for firefighting. Water conservation is fire prevention and community responsibility.
   - Assignment: May
   - Type: weatherSpecific
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Check defensible space maintenance**

   - Description: Create three defensible space zones: 0-5 feet (ember-resistant), 5-30 feet (reduced fuel), 30-100 feet (thinned vegetation). Remove all dead plants. Trim tree branches 10+ feet from structures. Stack firewood 30+ feet away. Altitude winds spread embers over 1 mile - defensible space is survival necessity.
   - Assignment: May
   - Type: weatherSpecific
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Prepare for altitude weather changes**

   - Description: May at altitude brings extreme variability - sunny and 70°F one day, snow squall the next. Keep winter clothes accessible through May. Protect sensitive plants from late frost. Monitor weather constantly. Altitude weather changes in minutes - afternoon thunderstorms common. Preparation for all conditions essential through May.
   - Assignment: May
   - Type: weatherSpecific
   - Priority: high (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## June

### seasonal

1. **Peak wildfire season preparation**

   - Description: June begins peak fire season at altitude. Monitor fire danger daily - red flag warnings mean extreme risk. Keep defensible space maintained. Have go-bags ready. Stock N95 masks for smoke. Sign up for emergency alerts. June-September is critical fire period - constant vigilance required at altitude.
   - Assignment: June
   - Type: seasonal
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Monitor fire danger daily - red flag warnings mean extreme risk.

2. **Monitor air conditioning efficiency**

   - Description: June temps reach 80-95°F at lower mountain elevations, cooler higher up. At altitude, AC works harder due to thin air. Monitor performance, replace filters monthly, listen for problems. If cooling declines, call for service. Summer heat and wildfire smoke make indoor comfort essential.
   - Assignment: June
   - Type: seasonal
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Monitor performance, replace filters monthly, listen for problems.

3. **Maintain outdoor equipment**

   - Description: June outdoor equipment gets heavy use. Keep lawn mowers, trimmers, chain saws well-maintained. At altitude, carburetor adjustments critical for proper operation. Stock fuel, oil, spare parts. Growing season and fire mitigation work both demand reliable equipment - maintain carefully.
   - Assignment: June
   - Type: seasonal
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Check pool and water systems**

   - Description: At lower elevations with pools, June begins swim season. Test chemistry weekly, run pump daily, check filters. At altitude, UV radiation more intense - chlorine depletes faster. Use pool cover to reduce evaporation - water conservation essential. Monitor for leaks constantly.
   - Assignment: June
   - Type: seasonal
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Test chemistry weekly, run pump daily, check filters.

5. **Inspect fire-safe landscaping**

   - Description: Remove all dead vegetation weekly - critical during fire season. Water fire-resistant plants to keep them healthy and moist. Mow grass short (4 inches max). Trim vegetation away from structures. June heat at altitude dries vegetation rapidly - constant maintenance prevents fire fuel accumulation.
   - Assignment: June
   - Type: seasonal
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Remove all dead vegetation weekly - critical during fire season.

6. **Flush water heater**

   - Description: Turn off power/gas and water supply. Attach hose to drain valve and flush until water runs clear, removing sediment. At altitude, mineral content often higher - sediment accumulates faster. Close valve, restore water and power. Annual flushing extends life and efficiency.
   - Assignment: June
   - Type: seasonal
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Annual flushing extends life and efficiency.

### weatherSpecific

1. **Peak wildfire season (June-September)**

   - Description: June marks start of most dangerous fire months at altitude. Low humidity (10-20%), dry lightning, high winds, abundant fuel create perfect fire conditions. Monitor conditions obsessively. When red flag warning issued, be ready to evacuate instantly. Altitude wildfires move incredibly fast - hesitation kills.
   - Assignment: June
   - Type: weatherSpecific
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Monitor fire danger at altitude**

   - Description: Altitude amplifies fire danger. Low humidity, high winds, intense UV drying vegetation, steep terrain spreading fires rapidly. Check daily fire danger ratings. On extreme days, no outdoor activities creating sparks - no mowing, no power tools, no driving on dry vegetation. Altitude fire behavior extreme and unpredictable.
   - Assignment: June
   - Type: weatherSpecific
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Check daily fire danger ratings.

3. **Check air quality systems**

   - Description: Wildfire smoke degrades air quality at altitude. Stock HEPA air purifiers for every bedroom. Have N95 masks for all family members. Know how to seal home during smoke events. Monitor AQI daily during fire season. Smoke at altitude can be severe and prolonged - good filtration essential for health.
   - Assignment: June
   - Type: weatherSpecific
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Monitor AQI daily during fire season.

4. **Monitor water usage and conservation**

   - Description: June begins dry season at altitude - minimal rain until September. Follow all water restrictions. Water outdoor plants efficiently - early morning only. Fix leaks immediately. Consider removing non-essential landscaping. Water scarcity worsens each year - conservation essential for community and fire prevention.
   - Assignment: June
   - Type: weatherSpecific
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Water scarcity worsens each year - conservation essential for community and fire prevention.

5. **Check emergency evacuation planning**

   - Description: Review evacuation routes - altitude terrain limits escape options. Have two routes planned. Know where routes lead. Pack car essentials - water, maps, cash, emergency supplies. Practice evacuation with family. Keep car fueled above half tank. At altitude during wildfire, roads gridlock immediately - planning saves lives.
   - Assignment: June
   - Type: weatherSpecific
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## July

### seasonal

1. **Continue wildfire vigilance**

   - Description: July is peak fire danger at altitude - driest month with lowest humidity (5-15%). Maintain defensible space obsessively - remove dead vegetation daily. Monitor fire restrictions constantly - often no outdoor activities allowed. Keep go-bags ready and car fueled. Check fire danger ratings multiple times daily. Peak fire season demands constant vigilance.
   - Assignment: July
   - Type: seasonal
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Maintain defensible space obsessively - remove dead vegetation daily.
     - Check fire danger ratings multiple times daily.

2. **Monitor cooling system efficiency**

   - Description: July temps reach 85-100°F+ at lower elevations, cooler higher up but still warm. At altitude, AC works harder due to thin air. Replace filters monthly minimum. Listen for struggling sounds. Monitor energy bills for efficiency. Indoor refuge from heat and smoke essential - keep system maintained.
   - Assignment: July
   - Type: seasonal
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Replace filters monthly minimum.

3. **Maintain fire-safe practices**

   - Description: No open flames outdoors during July. Use electric equipment only on low fire danger days. Never mow during hottest hours - sparks ignite fires. Keep vehicles off dry grass - hot exhaust starts fires. No fireworks even where legal. One spark during July can destroy entire communities. Fire safety is not optional.
   - Assignment: July
   - Type: seasonal
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Check outdoor equipment protection**

   - Description: July heat and UV intense at altitude. Store equipment in shade or cover to prevent sun damage. Check plastic components for cracking. Fuel evaporates quickly - use fuel stabilizer. At altitude, UV degrades materials rapidly - protection extends equipment life significantly.
   - Assignment: July
   - Type: seasonal
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Inspect air quality management**

   - Description: July smoke from wildfires common at altitude. Run HEPA air purifiers continuously when AQI exceeds 100. Check filters weekly - replace when dirty. Keep N95 masks accessible. Seal home during severe smoke events. Monitor AQI hourly during nearby fires. Good air filtration protects health during prolonged smoke exposure.
   - Assignment: July
   - Type: seasonal
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Check filters weekly - replace when dirty.

6. **Clean washing machine drain filter**

   - Description: Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, and debris, then replace the filter and test for leaks. Summer outdoor activities generate heavy laundry - maintain machine for peak performance.
   - Assignment: July
   - Type: seasonal
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Peak wildfire season continues**

   - Description: July statistically worst fire month at altitude. Combination of driest conditions, lightning storms, accumulated fuel load, and human activity creates maximum danger. Fires at altitude spread miles in hours. Have multiple evacuation routes planned. When told to evacuate, leave immediately - returning for belongings kills people.
   - Assignment: July
   - Type: weatherSpecific
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Monitor for lightning-caused fires**

   - Description: July brings dry lightning at altitude - lightning without rain igniting fires across wide areas. After thunderstorms, watch for smoke. Report fires immediately - minutes matter. Lightning fires often start in remote areas and grow undetected. Altitude terrain makes firefighting difficult - early detection critical.
   - Assignment: July
   - Type: weatherSpecific
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Check monsoon preparation in some areas**

   - Description: Southern Mountain West gets July monsoons - afternoon thunderstorms bringing flash flooding, lightning, hail, sudden temperature drops. Clear storm drains. Secure outdoor items. Never drive through flooded areas. Monsoons cool temps but bring different hazards - flooding, lightning strikes, hail damage all common.
   - Assignment: July
   - Type: weatherSpecific
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Monitor air quality during fires**

   - Description: July wildfire smoke degrades air quality severely at altitude. AQI can exceed 300 (hazardous) during nearby fires. Limit outdoor activities when AQI over 150. Stay indoors with filtered air when over 200. Altitude residents may experience weeks of poor air quality during bad fire seasons.
   - Assignment: July
   - Type: weatherSpecific
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Check altitude-specific fire risks**

   - Description: Altitude amplifies fire danger in July. Low humidity, high winds, steep terrain, limited escape routes, sparse firefighting resources all increase risk. Homes at altitude face higher insurance costs and evacuation challenges. Some insurance companies now refuse altitude coverage. Fire risk at altitude is existential threat requiring constant management.
   - Assignment: July
   - Type: weatherSpecific
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## August

### seasonal

1. **Continue peak wildfire season**

   - Description: August remains critical fire danger at altitude. Continue all July fire practices - maintain defensible space, monitor fire danger daily, keep evacuation plans current. Fire season extends through September at altitude. Fatigue sets in during prolonged high-alert periods - maintain discipline. One lapse in August can be catastrophic.
   - Assignment: August
   - Type: seasonal
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Continue all July fire practices - maintain defensible space, monitor fire danger daily, keep evacuation plans current.

2. **Monitor cooling system performance**

   - Description: August continues hot at altitude (80-95°F+ at lower elevations). AC system under stress from prolonged summer use. Listen for declining performance or unusual sounds. Check refrigerant levels if cooling seems weak. Replace filters. Consider professional mid-season service check if issues arise.
   - Assignment: August
   - Type: seasonal
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Check for summer damage**

   - Description: Mid-summer inspection reveals accumulated damage. Check exterior paint for UV fading - altitude sun intense. Look for deck and fence damage from use. Inspect irrigation for leaks - water conservation critical. Address problems before fall weather changes arrive. Summer at altitude stresses all materials.
   - Assignment: August
   - Type: seasonal
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Maintain outdoor areas safely**

   - Description: August outdoor maintenance limited by fire restrictions. Water plants early morning only. Keep landscaping maintained but avoid power tools on high fire danger days. Enjoy outdoor spaces during safe periods. August is last full month of warm weather at altitude - balance enjoyment with safety.
   - Assignment: August
   - Type: seasonal
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Prepare for fall transition**

   - Description: Late August begins fall transition at altitude. Nights cool significantly - 30-40°F temperature swings common. Begin thinking about winter preparation. Order firewood, schedule furnace service, plan fall projects. September weather changes rapidly - planning ahead essential at altitude.
   - Assignment: August
   - Type: seasonal
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Peak wildfire danger continues**

   - Description: August equals July for fire danger at altitude. Vegetation completely dried, humidity still low (10-20%), winds can be strong. Fires in August have entire summer fuel accumulation to burn. Continue maximum vigilance - season not over. Many major altitude fires start in August-September.
   - Assignment: August
   - Type: weatherSpecific
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Monitor for dry lightning storms**

   - Description: August dry lightning continues at altitude - severe thunderstorms with lightning but minimal rain. Lightning ignites fires across wide areas simultaneously overwhelming firefighting resources. After storms, watch for smoke. Multiple fire starts from one storm system common. Report any smoke immediately.
   - Assignment: August
   - Type: weatherSpecific
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Check fire suppression readiness**

   - Description: Verify fire suppression equipment remains ready - hoses functional, fire extinguishers charged, water sources accessible. August fires happen fast. Every minute matters. Tools that fail during crisis cost lives. Test everything monthly during fire season - garden hoses, sprinklers, pumps, generators all must work instantly.
   - Assignment: August
   - Type: weatherSpecific
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Test everything monthly during fire season - garden hoses, sprinklers, pumps, generators all must work instantly.

4. **Monitor monsoon effects if applicable**

   - Description: Southern Mountain West August monsoons can be severe. Flash flooding, hail, lightning, sudden windstorms all occur. Monsoon moisture provides minimal fire relief but creates new hazards. Clear drainage systems. Secure outdoor items before storms. Never drive through flooded roads - deadly mistake at altitude.
   - Assignment: August
   - Type: weatherSpecific
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Check altitude weather monitoring**

   - Description: August weather at altitude unpredictable. Morning calm becomes afternoon thunderstorm. Sunny day turns to smoke-filled hazard from distant fire. Monitor weather and fire conditions constantly. Have multiple information sources - weather radio, phone alerts, local news. Altitude weather changes rapidly - constant monitoring necessary.
   - Assignment: August
   - Type: weatherSpecific
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## September

### seasonal

1. **Continue wildfire vigilance**

   - Description: September wildfire season continues at altitude - often worst fires occur in September. Fall winds increase fire spread rates dramatically. Maintain defensible space and evacuation readiness through September. First significant snow ends fire season but timing varies - stay vigilant until snow arrives.
   - Assignment: September
   - Type: seasonal
   - Priority: high (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Begin fall preparation**

   - Description: September brings rapid transition at altitude - warm days, freezing nights common. Test heating system before needed. Schedule furnace service. Stock firewood. Prepare for sudden weather changes. September at altitude transitions from summer to winter rapidly - sometimes weeks, sometimes days. Be ready for both seasons simultaneously.
   - Assignment: September
   - Type: seasonal
   - Priority: high (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Check heating system preparation**

   - Description: Test furnace before cold weather hits - turn on heat and verify it works. Listen for unusual sounds. Check that all vents heat properly. Schedule professional service if not done recently. At altitude, heating season can start in September. System must work when first cold snap arrives.
   - Assignment: September
   - Type: seasonal
   - Priority: high (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Monitor outdoor equipment**

   - Description: Prepare to winterize outdoor equipment. Drain fuel from seasonal equipment before storage. Change oil while warm. Clean equipment thoroughly. Service items needing repair. At altitude, outdoor season ends abruptly - equipment properly stored prevents spring frustrations and extends life.
   - Assignment: September
   - Type: seasonal
   - Priority: high (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Inspect exterior maintenance needs**

   - Description: September last month for outdoor projects at altitude. Complete any remaining exterior work - painting, caulking, deck repairs, roof maintenance. October weather unreliable, November frozen. Get projects done while weather still permits. September work prevents winter damage.
   - Assignment: September
   - Type: seasonal
   - Priority: high (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

6. **Clean washing machine drain filter**

   - Description: Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, and debris, then replace the filter and test for leaks. Clean machine before heavy winter use season begins.
   - Assignment: September
   - Type: seasonal
   - Priority: high (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Wildfire season continues**

   - Description: September dangerous fire month at altitude. Vegetation dried from entire summer. Fall winds strongest of year. Low humidity continues. Combination creates extreme fire behavior - fires spread miles in hours. September fires historically most destructive at altitude. Continue maximum fire vigilance until significant snow.
   - Assignment: September
   - Type: weatherSpecific
   - Priority: high (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Prepare for rapid fall weather changes**

   - Description: September at altitude brings extreme weather variability. 70°F and sunny one day, blizzard the next. Keep both summer and winter clothes accessible. Have snow removal equipment ready. Monitor weather forecasts constantly. Rapid changes stress homes and catch people unprepared - September kills at altitude through weather complacency.
   - Assignment: September
   - Type: weatherSpecific
   - Priority: high (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Monitor for early winter preparation**

   - Description: Some years bring September snow at altitude - other years November. Prepare for early winter possibility. Have emergency supplies ready. Stock food and medications. Test backup heating. Ensure vehicles have winter tires ready. September snow can be heavy and prolonged - early preparation prevents emergency becoming crisis.
   - Assignment: September
   - Type: weatherSpecific
   - Priority: high (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Check altitude-specific fall risks**

   - Description: September at altitude presents unique hazards - wildfire season overlapping with winter preparation needs. Must maintain fire vigilance while preparing for snow. Roads can be snow-covered on shaded slopes, dry elsewhere. Temperature swings extreme. Altitude fall is transition season requiring dual awareness.
   - Assignment: September
   - Type: weatherSpecific
   - Priority: high (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Begin winter storm preparation**

   - Description: Stock winter emergency supplies in September. Have 7-day supply of food, water, medications. Test generator. Stock batteries and flashlights. Check snow removal equipment works. Ensure adequate fuel. Winter at altitude can arrive suddenly in September - early preparation prevents panic buying during first storm.
   - Assignment: September
   - Type: weatherSpecific
   - Priority: high (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## October

### seasonal

1. **End wildfire season vigilance**

   - Description: October typically ends fire season at altitude with first significant snow. Continue fire awareness until snow covers ground. Some years remain dry through October keeping fire danger high. Monitor conditions - do not assume season over until snow sticks. Once snow arrives, shift focus to winter hazards.
   - Assignment: October
   - Type: seasonal
   - Priority: high (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Complete fall preparation**

   - Description: October last chance for outdoor work at altitude. Complete all winterization tasks now. Weather in October varies from pleasant to blizzards. Work on nice days - they become rare. November freezes projects in place. October completion prevents winter regrets at altitude.
   - Assignment: October
   - Type: seasonal
   - Priority: high (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Service heating system for winter**

   - Description: Have professional HVAC service in October if not done - system about to work for 6-7 months straight. Technician checks burners, heat exchangers, electrical components, carbon monoxide levels. Service in October avoids November rush. Heating failure in November at altitude is emergency.
   - Assignment: October
   - Type: seasonal
   - Priority: high (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Have professional HVAC service in October if not done - system about to work for 6-7 months straight.

4. **Check insulation and weatherproofing**

   - Description: Inspect attic insulation before winter (14-20 inches minimum at altitude). Check weatherstripping on doors and windows. Caulk gaps in exterior. Insulate pipes in unheated areas. Good insulation essential at altitude where heating season October through May. Prevention now saves money and prevents freezing disasters.
   - Assignment: October
   - Type: seasonal
   - Priority: high (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Winterize outdoor water systems (hoses, sprinklers, faucets)**

   - Description: Complete all outdoor water winterization to prevent costly freeze damage. At altitude, freezing is guaranteed - preparation mandatory, not optional. Shut off water to outdoor faucets from inside shut-off valves. Open outdoor faucets and leave them open through winter to drain completely. Remove, drain, and store all hoses indoors. Drain irrigation systems completely - blow out sprinkler lines with compressed air or hire professional. Drain outdoor fountains and water features. Install insulated faucet covers for added protection. Water remaining in pipes freezes and bursts pipes, causing thousands in water damage.
   - Assignment: October
   - Type: seasonal
   - Priority: high (task-level)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Prepare for rapid temperature drops**

   - Description: October at altitude brings dramatic temperature changes - 65°F one day, blizzard the next. Have winter clothes readily accessible. Keep vehicles equipped for winter. Monitor forecasts closely. Altitude weather changes in hours, not days. Rapid temperature drops stress homes and catch people unprepared.
   - Assignment: October
   - Type: weatherSpecific
   - Priority: high (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check heating system for altitude**

   - Description: Verify heating system works properly before cold arrives. At altitude, systems work harder and longer than lower elevations. Ensure adequate capacity for structure and altitude. Test system under load - run for several hours. Address problems now before November cold makes failures life-threatening.
   - Assignment: October
   - Type: weatherSpecific
   - Priority: high (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Monitor for early winter storms**

   - Description: October blizzards at altitude can be severe - heavy snow, high winds, rapid temperature crashes. First storms catch people unprepared. Have winter emergency supplies ready. Test snow removal equipment. Stock up before storms hit. October storms can bring 1-3 feet of snow and multi-day power outages.
   - Assignment: October
   - Type: weatherSpecific
   - Priority: high (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Prepare for potential extreme cold**

   - Description: October can bring temperatures below 0°F at altitude. Test heating system capacity. Have backup heat source ready. Stock emergency supplies. Prevent pipes from freezing - let faucets drip, open cabinet doors. Extreme cold in October while people still in fall mindset causes emergencies.
   - Assignment: October
   - Type: weatherSpecific
   - Priority: high (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Check winter storm supplies**

   - Description: Verify winter emergency kit complete before November. Seven-day supply minimum of food, water, medications. Have batteries, flashlights, radio, first aid, blankets. Stock up before first big storm - stores empty during storm warnings. Altitude isolation during winter storms can last days - preparation essential.
   - Assignment: October
   - Type: weatherSpecific
   - Priority: high (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## November

### seasonal

1. **Complete winter preparation**

   - Description: November fully winter at altitude. Complete any remaining winterization immediately. Windows frozen shut by month end. Outdoor work dangerous in November cold and snow. Verify all systems ready for 5+ months of winter. November completion essential - December fixes nearly impossible at altitude.
   - Assignment: November
   - Type: seasonal
   - Priority: high (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Test heating system thoroughly**

   - Description: November begins months of continuous heating at altitude. Monitor system performance carefully first weeks. Listen for unusual sounds. Check all rooms heat evenly. Monitor energy usage. Address problems immediately - winter has just started. System must work reliably through April at altitude.
   - Assignment: November
   - Type: seasonal
   - Priority: high (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Check winter emergency supplies**

   - Description: Verify emergency supplies complete and accessible. November storms at altitude can be severe and prolonged. Seven-day supply minimum of food, water, medications. Have backup heating ready. Test generator if equipped. Stock batteries, flashlights, radio. November storms test preparation - be ready.
   - Assignment: November
   - Type: seasonal
   - Priority: high (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Store outdoor equipment**

   - Description: Store all seasonal outdoor equipment properly in November. Drain fuel, change oil, clean thoroughly, cover or store indoors. Protect from moisture and rodents. At altitude, equipment sits unused 6+ months - proper storage prevents spring headaches and extends equipment life significantly.
   - Assignment: November
   - Type: seasonal
   - Priority: high (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Check holiday decoration safety**

   - Description: Use LED lights for holiday decorating - less heat, lower fire risk, work better in cold. Test lights before installing. Secure outdoor decorations against altitude winds. Use outdoor-rated extension cords. November wind at altitude can be extreme - decorations become projectiles if not properly secured.
   - Assignment: November
   - Type: seasonal
   - Priority: high (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

6. **Clean washing machine drain filter**

   - Description: Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, and debris, then replace the filter and test for leaks. Winter months generate heavy laundry - maintain machine before peak winter use.
   - Assignment: November
   - Type: seasonal
   - Priority: high (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Prepare for extreme winter conditions**

   - Description: November at altitude can bring temperatures -20°F to 20°F. Heavy snow, extreme winds, dangerous cold all arrive in November. Verify home ready for worst conditions. Have backup plans for heating, water, food. November starts months of potential extreme weather - preparation now prevents winter crises.
   - Assignment: November
   - Type: weatherSpecific
   - Priority: high (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check heating efficiency at altitude**

   - Description: Monitor heating costs and performance as November cold intensifies. At altitude, heating systems work harder than lower elevations. Ensure proper efficiency - poor efficiency unaffordable over long winter. Check insulation, seal air leaks, verify thermostats work correctly. Efficiency matters during 6-month heating season.
   - Assignment: November
   - Type: weatherSpecific
   - Priority: high (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Efficiency matters during 6-month heating season.

3. **Monitor for winter storm preparation**

   - Description: November brings serious winter storms at altitude. Before each storm, stock up on essentials. Fill prescriptions. Get groceries. Fuel vehicles. Check generator. November storms can dump 2+ feet of snow and cause multi-day power outages. Preparation before each storm prevents hardship during storms.
   - Assignment: November
   - Type: weatherSpecific
   - Priority: high (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Before each storm, stock up on essentials.
     - Preparation before each storm prevents hardship during storms.

4. **Check emergency backup systems**

   - Description: Test backup heating systems in November before depending on them. Verify fireplace or wood stove works properly. Test generator under load. Have adequate fuel stored. At altitude, backup systems are not luxury - they are survival necessity during extended power outages in extreme cold.
   - Assignment: November
   - Type: weatherSpecific
   - Priority: high (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Prepare for potential isolation conditions**

   - Description: November storms at altitude can isolate communities for days. Roads impassable, power out, no emergency services possible. Have plan for medical emergencies. Stock adequate medications. Know neighbors and check on each other. Altitude winter isolation is reality - community preparation and cooperation essential.
   - Assignment: November
   - Type: weatherSpecific
   - Priority: high (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## December

### seasonal

1. **Monitor heating system performance**

   - Description: December mid-winter at altitude with months of heating ahead. Monitor system constantly for declining performance. Replace filters monthly minimum. Listen for struggling sounds. Watch energy bills for efficiency spikes. Address problems immediately - December through February are coldest months requiring maximum system reliability.
   - Assignment: December
   - Type: seasonal
   - Priority: high (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Replace filters monthly minimum.

2. **Check winter storm preparation**

   - Description: December brings severe winter storms at altitude. Before each storm, verify emergency supplies current. Stock food and water. Fill prescriptions. Have backup heating ready. December storms can bring extreme cold, heavy snow, multi-day power outages. Storm preparation routine prevents emergency panic.
   - Assignment: December
   - Type: seasonal
   - Priority: high (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Before each storm, verify emergency supplies current.

3. **Test emergency systems**

   - Description: Mid-winter check of all emergency systems. Test generator under load. Verify backup heating works. Check that flashlights and radios have fresh batteries. Ensure communication plans current. December storms test emergency preparations - systems must work when power fails in extreme cold.
   - Assignment: December
   - Type: seasonal
   - Priority: high (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Monitor energy usage**

   - Description: Review December energy usage and compare to previous years. Altitude heating costs significant in winter. Sudden spikes indicate problems - air leaks, insulation issues, system inefficiency. Address inefficiencies quickly - three more months of winter ahead. Energy efficiency at altitude winter essential for budget and comfort.
   - Assignment: December
   - Type: seasonal
   - Priority: high (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Check holiday safety measures**

   - Description: December holiday safety critical at altitude. Keep fresh Christmas trees watered - dry trees with altitude low humidity are extreme fire hazards. Use LED lights only. Turn off decorations when away or sleeping. Have fire extinguisher accessible. Altitude dryness makes fire risk higher - careful holiday practices essential.
   - Assignment: December
   - Type: seasonal
   - Priority: high (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Peak winter weather monitoring**

   - Description: December through February are peak winter at altitude. Temperatures -20°F to 20°F common. Blizzards, extreme wind, dangerous cold all routine. Monitor weather forecasts constantly. Have multiple information sources. December weather at altitude can be life-threatening - constant awareness essential for safety.
   - Assignment: December
   - Type: weatherSpecific
   - Priority: high (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check extreme cold preparations**

   - Description: December brings extreme cold to altitude - sometimes below -30°F. During cold snaps, let faucets drip, open cabinet doors, check heating every few hours. Have emergency heat ready. Keep emergency numbers accessible. Extreme cold kills - take seriously and monitor family health carefully.
   - Assignment: December
   - Type: weatherSpecific
   - Priority: high (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Monitor heating during severe weather**

   - Description: During December storms and cold snaps, monitor heating obsessively. Check system several times daily during extreme cold. Listen for struggling. Verify all rooms staying warm. Have backup heat ready to deploy. At altitude in extreme cold, heating failure is immediate emergency requiring action.
   - Assignment: December
   - Type: weatherSpecific
   - Priority: high (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Check system several times daily during extreme cold.

4. **Check emergency supplies access**

   - Description: Verify emergency supplies remain accessible through December. Snow can block access to stored items. Keep essentials inside main living area. Rotate food stocks. Check battery freshness. December storms can strike quickly - supplies must be immediately accessible, not buried in garage or shed.
   - Assignment: December
   - Type: weatherSpecific
   - Priority: high (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Monitor for winter storm effects**

   - Description: After each December storm, inspect for damage. Check roof for snow load - remove if excessive. Look for ice dam formation. Ensure vents and exhausts clear of snow. Check for downed branches. December accumulates storm damage - inspect after each event and address problems before they worsen.
   - Assignment: December
   - Type: weatherSpecific
   - Priority: high (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - After each December storm, inspect for damage.
     - December accumulates storm damage - inspect after each event and address problems before they worsen.

## Year-round

1. **Test smoke and carbon monoxide detectors monthly**

   - Description: Press test button on all smoke and CO detectors every month to verify they beep loudly. Replace batteries twice yearly at daylight saving changes. Clean dust from sensors with vacuum attachment. Replace smoke detectors over 10 years old and CO detectors over 7 years old. At altitude where wildfire smoke, winter heating, and thin air all increase risks, working detectors are life-critical.
   - Assignment: yearRound
   - Type: yearRound
   - Priority: not specified (no task-level priority and no year-round fallback priority)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Test smoke and carbon monoxide detectors monthly
     - Press test button on all smoke and CO detectors every month to verify they beep loudly.
     - Replace batteries twice yearly at daylight saving changes.

2. **Check HVAC filters monthly (altitude effects)**

   - Description: Check furnace filters monthly - replace when dirty or every 1-3 months. Altitude air is drier and dustier, clogging filters faster. During wildfire season (May-Sept), check weekly - smoke particles clog filters rapidly. During heating season (Oct-May), monthly replacement essential. Clean filters critical for altitude HVAC efficiency.
   - Assignment: yearRound
   - Type: yearRound
   - Priority: not specified (no task-level priority and no year-round fallback priority)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Check HVAC filters monthly (altitude effects)
     - Check furnace filters monthly - replace when dirty or every 1-3 months.
     - During wildfire season (May-Sept), check weekly - smoke particles clog filters rapidly.
     - During heating season (Oct-May), monthly replacement essential.

3. **Monitor emergency supplies quarterly**

   - Description: Every 3 months verify emergency kit has current water (1 gallon/person/day for 7 days minimum), non-perishable food, medications, batteries, flashlights, first aid supplies. Rotate food and water every 6 months. At altitude where winter isolation and wildfire evacuation are both real threats, current emergency supplies essential for survival.
   - Assignment: yearRound
   - Type: yearRound
   - Priority: not specified (no task-level priority and no year-round fallback priority)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Monitor emergency supplies quarterly
     - Every 3 months verify emergency kit has current water (1 gallon/person/day for 7 days minimum), non-perishable food, medications, batteries, flashlights, first aid supplies.
     - Rotate food and water every 6 months.

4. **Check altitude-specific equipment annually**

   - Description: Annually inspect equipment affected by altitude - carburetors on lawn equipment need altitude adjustment, generators need proper tuning, vehicles need higher octane fuel. Review insurance coverage - wildfire risk may affect availability. Check structural issues from freeze-thaw cycles. Altitude creates unique maintenance needs requiring annual review.
   - Assignment: yearRound
   - Type: yearRound
   - Priority: not specified (no task-level priority and no year-round fallback priority)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Check altitude-specific equipment annually
     - Annually inspect equipment affected by altitude - carburetors on lawn equipment need altitude adjustment, generators need proper tuning, vehicles need higher octane fuel.
     - Altitude creates unique maintenance needs requiring annual review.

5. **Professional HVAC service twice yearly**

   - Description: Schedule furnace service in fall (September/October) before heating season, AC service in spring (April/May) before cooling season. At altitude, HVAC systems work harder and longer than lower elevations. Professional service extends equipment life, ensures efficiency, prevents failures during extreme weather. Altitude HVAC demands professional maintenance.
   - Assignment: yearRound
   - Type: yearRound
   - Priority: not specified (no task-level priority and no year-round fallback priority)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Professional HVAC service twice yearly

# Region: Pacific Northwest

- Data key: Pacific Northwest
- Region value: Pacific Northwest
- Climate zone: Marine West Coast

## January

### seasonal

1. **Monitor heating system for cool, wet season**

   - Description: January cool and wet in Pacific Northwest (35-50°F). While not extreme cold, dampness makes heating essential for comfort. Monitor system performance and replace filters monthly. Check all rooms stay comfortable. Damp cold feels uncomfortable - reliable heating maintains quality of life during wet winter months.
   - Assignment: January
   - Type: seasonal
   - Priority: medium (task-level)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Monitor system performance and replace filters monthly.
     - Damp cold feels uncomfortable - reliable heating maintains quality of life during wet winter months.

2. **Check for winter storm damage**

   - Description: January storms bring heavy rain, wind, and occasional snow to Pacific Northwest. After storms, inspect for roof leaks, siding damage, fallen branches, and flooding. Check gutters remain attached and downspouts drain properly. Cumulative storm damage adds up - inspect after each significant weather event.
   - Assignment: January
   - Type: seasonal
   - Priority: high (task-level)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Cumulative storm damage adds up - inspect after each significant weather event.

3. **Inspect weatherstripping and insulation**

   - Description: Check door and window weatherstripping for gaps or damage. Feel for drafts. Good seals reduce moisture intrusion and improve heating efficiency. Inspect attic and basement insulation for dampness. Pacific Northwest dampness degrades insulation over time - regular inspection prevents mold and heat loss.
   - Assignment: January
   - Type: seasonal
   - Priority: low (task-level)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Test carbon monoxide detectors**

   - Description: Press test button on all CO detectors to verify they beep loudly. Replace batteries if needed. Detectors should be placed near sleeping areas and on every level. Winter heating season increases CO risk. Test monthly to ensure protection for your family during heating season.
   - Assignment: January
   - Type: seasonal
   - Priority: high (task-level)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Test monthly to ensure protection for your family during heating season.

5. **Check moisture control systems**

   - Description: Run bathroom and kitchen exhaust fans during and after use. Check for condensation on windows indicating excess humidity. Use dehumidifiers in basements keeping humidity 30-50%. Inspect for new water stains on ceilings or walls. January rain makes moisture control critical for preventing mold and structural damage.
   - Assignment: January
   - Type: seasonal
   - Priority: medium (task-level)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

6. **Clean washing machine drain filter**

   - Description: Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, and debris, then replace the filter and test for leaks. Winter generates heavy laundry loads - keep machine maintained.
   - Assignment: January
   - Type: seasonal
   - Priority: low (task-level)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Peak winter storm season**

   - Description: January through March brings most severe Pacific Northwest storms. Atmospheric rivers deliver extreme rainfall - multiple inches in 24 hours. High winds cause power outages. Occasional heavy snow disrupts region unaccustomed to it. Stock emergency supplies before each storm - power outages last days in rural areas.
   - Assignment: January
   - Type: weatherSpecific
   - Priority: high (task-level)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Stock emergency supplies before each storm - power outages last days in rural areas.

2. **Monitor for flooding and wind damage**

   - Description: January rain and wind cause flooding and damage. Check property after storms for water intrusion, roof damage, and fallen branches. Never drive through flooded roads - Pacific Northwest flooding kills annually. Clear storm drains near property. Secure outdoor items before windstorms. Storm damage compounds - inspect after each event.
   - Assignment: January
   - Type: weatherSpecific
   - Priority: high (task-level)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Never drive through flooded roads - Pacific Northwest flooding kills annually.
     - Storm damage compounds - inspect after each event.

3. **Check moisture and mold prevention**

   - Description: January constant rain creates perfect mold conditions. Inspect closets, bathrooms, and basements for mold growth. Address immediately - mold spreads rapidly in damp conditions. Improve ventilation in problem areas. Use dehumidifiers. Clean gutters to prevent water intrusion. Moisture is constant January challenge in Pacific Northwest.
   - Assignment: January
   - Type: weatherSpecific
   - Priority: medium (task-level)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Monitor heating during wet conditions**

   - Description: Damp Pacific Northwest cold penetrates deeply. While temps seem mild (40°F), dampness makes it feel much colder. Ensure heating maintains comfortable indoor environment. Monitor for unusual condensation indicating ventilation problems. Good heating and ventilation essential during wet season for comfort and mold prevention.
   - Assignment: January
   - Type: weatherSpecific
   - Priority: medium (task-level)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Good heating and ventilation essential during wet season for comfort and mold prevention.

5. **Check earthquake preparedness**

   - Description: Pacific Northwest sits on major earthquake zones - Cascadia Subduction Zone capable of 9.0+ quake. January good time to review preparedness. Check emergency kit has water, food, medications for 2 weeks. Strap water heater and secure heavy furniture. Practice drop-cover-hold. Earthquakes strike without warning - annual review essential.
   - Assignment: January
   - Type: weatherSpecific
   - Priority: high (task-level)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Earthquakes strike without warning - annual review essential.

## February

### seasonal

1. **Continue winter storm monitoring**

   - Description: February extends wet season in Pacific Northwest with continued atmospheric river storms. Heavy rain, wind, and occasional snow continue. Monitor weather forecasts before storms. Stock supplies. Check for cumulative damage - February storms add to January wear. Inspect after each significant weather event.
   - Assignment: February
   - Type: seasonal
   - Priority: high (task-level)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Inspect after each significant weather event.

2. **Check drainage and water management**

   - Description: February rain saturates ground. Check that gutters and downspouts flow freely and drain away from foundation. Ensure window wells drain properly. Look for basement or crawl space water intrusion. Grade should slope away from house. February cumulative rainfall tests drainage - inadequate systems cause foundation damage and flooding.
   - Assignment: February
   - Type: seasonal
   - Priority: high (task-level)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Inspect exterior for moisture damage**

   - Description: Walk around home checking for moisture damage. Look for peeling paint, soft or discolored wood, moss growth on siding or roof. Check caulking around windows and doors. Pacific Northwest constant moisture accelerates wood rot - catch early before structural issues develop. Paint and seal vulnerable areas in spring.
   - Assignment: February
   - Type: seasonal
   - Priority: medium (task-level)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Maintain heating system efficiency**

   - Description: February continues heating season. Replace furnace filter monthly. Monitor performance and energy bills. Ensure all vents open and unobstructed. While Pacific Northwest winters mild, constant damp chill requires reliable heating for comfort. Address declining performance immediately to prevent mid-winter failures.
   - Assignment: February
   - Type: seasonal
   - Priority: medium (task-level)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Replace furnace filter monthly.

5. **Check attic ventilation**

   - Description: Proper attic ventilation prevents moisture buildup that causes mold and wood rot. Check that soffit and ridge vents clear and functioning. Look for condensation or frost on underside of roof sheathing. Musty odor indicates moisture problems. Pacific Northwest dampness requires excellent attic ventilation year-round.
   - Assignment: February
   - Type: seasonal
   - Priority: low (task-level)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Pacific Northwest dampness requires excellent attic ventilation year-round.

### weatherSpecific

1. **Continue winter storm vigilance**

   - Description: February storms can be most severe of Pacific Northwest winter. Atmospheric rivers bring extreme rainfall and flooding. High winds cause extensive power outages and tree damage. Heavy snow occasionally disrupts region. Have emergency supplies current. Monitor forecasts. Prepare before each storm - February weather patterns can be relentless.
   - Assignment: February
   - Type: weatherSpecific
   - Priority: high (task-level)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Prepare before each storm - February weather patterns can be relentless.

2. **Monitor for water and moisture damage**

   - Description: February cumulative rainfall reveals drainage and waterproofing weaknesses. Check for new water stains in ceilings, walls, basements. Feel for dampness in carpets near exterior walls. Inspect under sinks and around windows. Address leaks immediately - February moisture penetrates everywhere. Small problems become major issues quickly in persistent damp.
   - Assignment: February
   - Type: weatherSpecific
   - Priority: high (task-level)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Check mold and mildew prevention**

   - Description: February damp creates ideal mold conditions. Inspect bathrooms, kitchens, basements, closets for mold growth. Clean immediately with appropriate cleaners. Improve ventilation in problem areas. Use dehumidifiers to maintain 30-50% humidity. Constant February moisture makes mold vigilance essential for health and property protection.
   - Assignment: February
   - Type: weatherSpecific
   - Priority: medium (task-level)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Monitor heating system performance**

   - Description: Verify heating maintains comfort during February damp chill. Listen for unusual sounds indicating problems. Check that thermostat responds correctly. Monitor energy usage for sudden changes. February damp cold penetrates deeply despite mild temps - reliable heating essential for comfort and preventing moisture condensation issues.
   - Assignment: February
   - Type: weatherSpecific
   - Priority: medium (task-level)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Check for wind damage**

   - Description: February windstorms can be severe in Pacific Northwest. After wind events, inspect roof for missing shingles, check fences and structures for damage, clear fallen branches. Trim dead or weak branches before next storm. Secure outdoor items that could become projectiles. February wind combined with saturated soil topples trees easily.
   - Assignment: February
   - Type: weatherSpecific
   - Priority: medium (task-level)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## March

### seasonal

1. **Begin spring maintenance**

   - Description: March transitions to spring in Pacific Northwest but rain continues. Start spring cleaning on dry days. Wash windows, clean gutters, organize garage. Check smoke detectors and replace batteries. March good time to address winter damage before summer arrives. Work between rainstorms - dry days still limited.
   - Assignment: March
   - Type: seasonal
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check drainage systems thoroughly**

   - Description: After winter rain, thoroughly inspect entire drainage system. Clean gutters and downspouts of accumulated debris. Flush with hose checking for proper flow. Ensure downspouts extend 5 feet from foundation. Check for settled or eroded areas around foundation. March assessment prevents issues during remaining spring rains.
   - Assignment: March
   - Type: seasonal
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Inspect exterior paint for weather damage**

   - Description: March inspection reveals winter weather damage. Look for peeling or cracking paint, damaged siding, or wood rot. Check caulking around windows and doors. Pacific Northwest moisture accelerates paint deterioration. Plan spring painting projects for April-May when weather improves. Early detection prevents extensive damage.
   - Assignment: March
   - Type: seasonal
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Clean gutters and downspouts**

   - Description: Remove leaves, moss, needles, and debris from gutters accumulated over winter. Flush with hose verifying proper flow and checking for leaks. Ensure gutter hangers secure and downspouts drain away from foundation. Pacific Northwest debris buildup can be heavy - clean gutters prevent overflow and water damage.
   - Assignment: March
   - Type: seasonal
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Check outdoor equipment**

   - Description: March time to service lawn mowers and garden tools. Change oil, sharpen blades, clean air filters, replace spark plugs. Service irrigation systems once frost danger passes. Check hoses for damage. April brings active outdoor season - prepare equipment now before busy season arrives.
   - Assignment: March
   - Type: seasonal
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

6. **Clean washing machine drain filter**

   - Description: Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, and debris, then replace the filter and test for leaks. Spring cleaning generates heavy laundry - maintain machine for peak performance.
   - Assignment: March
   - Type: seasonal
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Monitor for flooding from spring rains**

   - Description: March rain combined with snowmelt from mountains creates flooding potential. Monitor weather forecasts for flood watches. Check basement and crawl spaces for water intrusion. Ensure sump pumps work. Never drive through flooded roads. Clear storm drains near property. March flooding can be extensive - vigilance essential.
   - Assignment: March
   - Type: weatherSpecific
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check moisture control throughout home**

   - Description: March continues damp conditions requiring ongoing moisture management. Run exhaust fans during use. Check for condensation on windows. Use dehumidifiers in basements. Inspect for new mold growth and address immediately. March still wet enough for mold growth - continue winter moisture control practices through March.
   - Assignment: March
   - Type: weatherSpecific
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Prepare for increasing daylight**

   - Description: March brings noticeable daylight increase lifting winter gloom. Time to plan outdoor projects and garden preparation. Check outdoor lighting still works. Clean windows to maximize natural light. Increasing daylight shifts focus from indoor to outdoor - use March to plan spring and summer projects.
   - Assignment: March
   - Type: weatherSpecific
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Monitor for mold and mildew issues**

   - Description: March dampness continues creating mold conditions. Inspect entire home for mold - bathrooms, basements, closets, under sinks. Clean with appropriate solutions. Improve ventilation in problem areas. Address sources of moisture intrusion. March mold prevention avoids summer mold problems requiring expensive remediation.
   - Assignment: March
   - Type: weatherSpecific
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Check earthquake preparedness updates**

   - Description: Quarterly earthquake preparedness review. Rotate emergency water and food supplies. Check that heavy furniture and water heater remain secured. Update family communication plan. Practice drop-cover-hold-on. Pacific Northwest major earthquake is not "if" but "when" - quarterly reviews keep preparation current.
   - Assignment: March
   - Type: weatherSpecific
   - Priority: medium (inherited from March month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Quarterly earthquake preparedness review.
     - Pacific Northwest major earthquake is not "if" but "when" - quarterly reviews keep preparation current.

## April

### seasonal

1. **Complete spring cleaning**

   - Description: April brings improving weather for deep cleaning. Wash windows inside and out, clean gutters, power wash siding and decks. Shampoo carpets to remove winter moisture and mold spores. Clean behind appliances. Organize storage areas. April cleaning removes winter dampness and prepares home for drier summer months.
   - Assignment: April
   - Type: seasonal
   - Priority: medium (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Service air conditioning if applicable**

   - Description: While Pacific Northwest summers cool, many homes have AC. April good time for service before summer. Technician cleans coils, checks refrigerant, tests components. Wildfire smoke makes AC valuable for filtered air during fire season. Early service avoids summer rush and ensures comfort when needed.
   - Assignment: April
   - Type: seasonal
   - Priority: medium (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Wildfire smoke makes AC valuable for filtered air during fire season.

3. **Deep clean to remove winter moisture**

   - Description: April deep cleaning removes accumulated winter moisture. Wash walls and baseboards. Clean and dry basement thoroughly. Inspect closets for mold or mildew. Run dehumidifiers in damp areas. April drying out prevents summer mold growth. Pacific Northwest homes accumulate significant moisture requiring thorough spring cleaning.
   - Assignment: April
   - Type: seasonal
   - Priority: medium (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Check outdoor living areas**

   - Description: Prepare outdoor spaces for increasing use. Clean and repair deck or patio. Arrange outdoor furniture. Check outdoor lighting and outlets. Power wash surfaces. Inspect railings for stability. April weather permits outdoor work - prepare spaces for summer enjoyment while conditions favorable.
   - Assignment: April
   - Type: seasonal
   - Priority: medium (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Maintain landscaping drainage**

   - Description: April continue monitoring drainage as spring rains persist. Ensure gutters and downspouts clear. Check grading slopes away from foundation. Clear storm drains. Address erosion or settling areas. Good drainage prevents foundation damage and basement flooding during remaining spring rains.
   - Assignment: April
   - Type: seasonal
   - Priority: medium (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Monitor for continued rain and moisture**

   - Description: April still wet in Pacific Northwest though intensity declining. Continue moisture control practices - run exhaust fans, use dehumidifiers, inspect for mold. Monitor weather before outdoor projects. While spring advancing, April rain still significant requiring ongoing moisture management.
   - Assignment: April
   - Type: weatherSpecific
   - Priority: medium (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check air quality and ventilation**

   - Description: April good time to improve ventilation after closed-up winter. Open windows on dry days for air exchange. Check that exhaust fans work properly. Consider air purifiers for mold spore removal. Good ventilation and filtration remove accumulated winter moisture and prepare for summer air quality needs.
   - Assignment: April
   - Type: weatherSpecific
   - Priority: medium (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Prepare for mild warming trend**

   - Description: April temps increase to 50-60°F in Pacific Northwest. Adjust clothing and bedding. Reduce heating use. Check AC if applicable. Plant gardens once frost danger passes. April warming brings outdoor activity season - prepare while weather remains mild and comfortable.
   - Assignment: April
   - Type: weatherSpecific
   - Priority: medium (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Check for pest activity increase**

   - Description: April warming brings increased pest activity. Check for carpenter ants attracted to moist wood. Look for signs of rodents. Seal gaps in foundation and where utilities enter. Address moisture issues that attract pests. Pacific Northwest moisture creates ideal pest habitat - April prevention prevents summer infestations.
   - Assignment: April
   - Type: weatherSpecific
   - Priority: medium (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Monitor wildfire preparedness**

   - Description: While Pacific Northwest wildfire season later than other regions, April time to begin preparation. Create defensible space, clear gutters, check fire extinguishers. Stock N95 masks and air purifiers. Summer smoke from distant fires common - April preparation ensures readiness before fire season begins.
   - Assignment: April
   - Type: weatherSpecific
   - Priority: medium (inherited from April month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## May

### seasonal

1. **Begin wildfire season preparation**

   - Description: May marks transition to drier weather and wildfire preparation. Clear vegetation from around structures. Clean gutters of needles and leaves. Create ember-resistant zone within 5 feet of home. Stock N95 masks and air purifiers. While Pacific Northwest fires typically later, distant fire smoke arrives early - prepare now.
   - Assignment: May
   - Type: seasonal
   - Priority: medium (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Maintain outdoor equipment and areas**

   - Description: May brings active outdoor season. Service lawn equipment - change oil, sharpen blades, replace filters. Check irrigation systems for leaks. Clean and arrange outdoor living spaces. Inspect outdoor structures. May weather ideal for outdoor work - complete projects now before summer heat or smoke.
   - Assignment: May
   - Type: seasonal
   - Priority: medium (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Check air conditioning preparation**

   - Description: Test AC before summer if equipped. Change filters, clear debris from outdoor units, verify proper cooling. While Pacific Northwest summers mild, occasional heat waves and wildfire smoke make AC valuable. Ensure system ready for when needed during summer months.
   - Assignment: May
   - Type: seasonal
   - Priority: medium (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Ensure system ready for when needed during summer months.

4. **Inspect deck and outdoor structures**

   - Description: Check decks, fences, pergolas for winter damage. Look for loose boards, rot, or structural issues. Power wash and apply sealant or stain if needed. Check railings for stability. May ideal for outdoor projects - complete maintenance before summer outdoor living season fully arrives.
   - Assignment: May
   - Type: seasonal
   - Priority: medium (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Check water conservation systems**

   - Description: While Pacific Northwest wetter than other regions, summer drought still occurs. Check irrigation for leaks and efficiency. Adjust watering schedules. Consider drought-tolerant landscaping. Water conservation reduces wildfire fuel from dead vegetation and ensures adequate water for firefighting if needed.
   - Assignment: May
   - Type: seasonal
   - Priority: medium (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

6. **Clean washing machine drain filter**

   - Description: Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, and debris, then replace the filter and test for leaks. Spring outdoor activities generate heavy laundry - maintain machine.
   - Assignment: May
   - Type: seasonal
   - Priority: medium (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Begin dry season and wildfire preparation**

   - Description: May begins Pacific Northwest dry season. Rain decreases significantly. Vegetation dries creating fire fuel. While local fires rare in May, smoke from distant fires can arrive. Complete defensible space work. Stock emergency supplies. Sign up for fire alerts. May preparation ensures readiness for summer fire season.
   - Assignment: May
   - Type: weatherSpecific
   - Priority: medium (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check air quality monitoring systems**

   - Description: Set up air quality monitoring for summer. Download AQI apps, check EPA air quality website, sign up for alerts. Stock HEPA air purifier filters. Have N95 masks for all family members. Pacific Northwest summer smoke from distant wildfires increasingly common - monitoring essential for health protection.
   - Assignment: May
   - Type: weatherSpecific
   - Priority: medium (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Monitor drought preparation**

   - Description: May begins summer drought period. Check water conservation measures. Fix leaks immediately. Adjust irrigation for efficiency. Transition to drought-tolerant plants. Pacific Northwest summers increasingly dry - water conservation prevents fire fuel buildup from dead vegetation and ensures water availability.
   - Assignment: May
   - Type: weatherSpecific
   - Priority: medium (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Check fire suppression systems**

   - Description: Verify outdoor hoses reach all areas of property. Check fire extinguisher pressure gauges. Test outdoor water faucets work properly. Stock ladder for roof access. While Pacific Northwest wildfire risk lower than other regions, preparation ensures readiness. Smoke management capabilities critical for summer air quality.
   - Assignment: May
   - Type: weatherSpecific
   - Priority: medium (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Prepare for warm, dry weather**

   - Description: May transitions to warmer, drier conditions (60-70°F). Adjust wardrobe and home for summer. Reduce heating, increase ventilation. Prepare gardens for growing season. May pleasant month in Pacific Northwest - enjoy comfortable weather while preparing for occasional summer heat and smoke events.
   - Assignment: May
   - Type: weatherSpecific
   - Priority: medium (inherited from May month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## June

### seasonal

1. **Wildfire season vigilance begins**

   - Description: June officially begins Pacific Northwest wildfire season. While fires more common July-September, distant fire smoke arrives June. Monitor air quality daily. Keep defensible space maintained. Have go-bags ready. Stock N95 masks. June preparation prevents August panic when smoke arrives.
   - Assignment: June
   - Type: seasonal
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Monitor air quality daily.

2. **Monitor air conditioning efficiency**

   - Description: June temps reach 70-80°F with occasional heat waves higher. For homes with AC, monitor performance. Replace filters monthly during use. Listen for problems. AC provides refuge during heat waves and filtered air during smoke events. Maintain system for summer reliability.
   - Assignment: June
   - Type: seasonal
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Replace filters monthly during use.

3. **Maintain fire-safe landscaping**

   - Description: June continue vegetation management. Water plants to keep them healthy and fire-resistant. Remove dead material regularly. Keep grass mowed. Trim branches away from structures. While Pacific Northwest vegetation stays greener than other regions, fire-safe practices still essential during dry season.
   - Assignment: June
   - Type: seasonal
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - While Pacific Northwest vegetation stays greener than other regions, fire-safe practices still essential during dry season.

4. **Check outdoor water systems**

   - Description: Verify irrigation systems work properly for summer watering. Check hoses for leaks or damage. Test outdoor faucets. Monitor for water waste. Efficient water use keeps landscaping healthy and fire-resistant while conserving resources during summer dry period.
   - Assignment: June
   - Type: seasonal
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Inspect exterior for summer preparation**

   - Description: June inspection reveals any remaining winter damage needing attention. Check paint, siding, caulking, roof for issues. Address before summer heat or smoke events. June still good weather for exterior work - complete projects before fire season limits outdoor activities.
   - Assignment: June
   - Type: seasonal
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

6. **Flush water heater**

   - Description: Turn off power/gas and water supply. Attach hose to drain valve and flush until water runs clear, removing sediment. Close valve, restore water and power. Annual flushing extends heater life and improves efficiency. June ideal time before summer use season.
   - Assignment: June
   - Type: seasonal
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Annual flushing extends heater life and improves efficiency.

### weatherSpecific

1. **Begin dry season and wildfire vigilance**

   - Description: June marks full transition to dry season in Pacific Northwest. Rain becomes rare. Vegetation dries. Monitor fire danger and air quality daily. While local fires less common than other regions, smoke from regional fires affects Pacific Northwest regularly. Vigilance begins June and continues through September.
   - Assignment: June
   - Type: weatherSpecific
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Monitor fire danger and air quality daily.

2. **Monitor air quality during fire season**

   - Description: June smoke from distant fires increasingly common in Pacific Northwest. Download air quality apps. Check AQI daily. Limit outdoor activities when AQI exceeds 100. Run air purifiers when needed. Smoke can persist for weeks during active fire seasons elsewhere - monitoring essential for health protection.
   - Assignment: June
   - Type: weatherSpecific
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Monitor air quality during fire season
     - Check AQI daily.

3. **Check drought-resistant landscaping**

   - Description: June begin summer drought period. Ensure landscaping can handle dry conditions. Water efficiently and deeply. Add mulch to retain moisture. Consider replacing high-water plants with drought-tolerant alternatives. Healthy, drought-resistant landscaping reduces fire risk and water usage.
   - Assignment: June
   - Type: weatherSpecific
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Prepare for warm, dry conditions**

   - Description: June brings warmest, driest weather of Pacific Northwest year (65-75°F typically). Adjust home for summer - increase ventilation, reduce heating, prepare for occasional heat waves. While milder than other regions, Pacific Northwest lacks AC in many homes making heat wave preparation important.
   - Assignment: June
   - Type: weatherSpecific
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Check defensible space maintenance**

   - Description: June verify defensible space complete. Clear zone 0-5 feet of all vegetation and combustibles. Reduce fuel load 5-30 feet. Trim trees away from structures. Keep gutters clean. Defensible space protects against ember attack which can occur from fires miles away.
   - Assignment: June
   - Type: weatherSpecific
   - Priority: high (inherited from June month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## July

### seasonal

1. **Peak dry season and wildfire vigilance**

   - Description: July is driest month in Pacific Northwest. While local fires possible, smoke from regional fires more common. Monitor air quality daily. Keep windows closed on smoky days. Run air purifiers continuously when AQI exceeds 100. Have N95 masks ready. July smoke can persist for weeks affecting outdoor activities and health.
   - Assignment: July
   - Type: seasonal
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Monitor air quality daily.

2. **Monitor cooling system if needed**

   - Description: July brings warmest temps (70-85°F typical, heat waves to 95-100°F). For homes with AC, monitor performance during use. Replace filters monthly. Many Pacific Northwest homes lack AC - prepare alternative cooling strategies like fans, closed blinds, cool basements. Heat waves challenging without AC.
   - Assignment: July
   - Type: seasonal
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Replace filters monthly.

3. **Maintain water conservation**

   - Description: July peak water demand month. Water lawn deeply but infrequently. Water early morning to reduce evaporation. Fix leaks immediately. Consider reducing lawn size or transitioning to drought-tolerant plants. July water conservation reduces fire risk and ensures adequate water for firefighting and drinking.
   - Assignment: July
   - Type: seasonal
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Check fire-safe practices**

   - Description: July maintain defensible space diligently. Remove dead vegetation. Water plants to keep them healthy and fire-resistant. Keep grass mowed. Avoid outdoor burning. Use caution with power tools creating sparks. While Pacific Northwest wetter than other regions, July fire danger real - maintain fire-safe practices.
   - Assignment: July
   - Type: seasonal
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Inspect outdoor equipment protection**

   - Description: July sun and occasional heat stress outdoor equipment. Store in shade or cover to prevent UV damage. Check hoses and plastic components for cracking. Maintain lawn equipment carefully - breakdowns during July peak use frustrating. July optimal outdoor time in Pacific Northwest - keep equipment functional.
   - Assignment: July
   - Type: seasonal
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

6. **Clean washing machine drain filter**

   - Description: Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, and debris, then replace the filter and test for leaks. Summer outdoor activities and smoke-affected clothing generate heavy laundry loads.
   - Assignment: July
   - Type: seasonal
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Peak dry season and wildfire risk**

   - Description: July Pacific Northwest vegetation dried from weeks without rain. While local fire risk moderate compared to other regions, smoke from fires in California, Oregon, Eastern Washington creates hazardous air quality. Monitor AQI obsessively. Plan indoor activities on smoky days. July smoke events last days to weeks.
   - Assignment: July
   - Type: weatherSpecific
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Monitor extreme fire danger**

   - Description: July occasional extreme fire danger days when winds combine with dry conditions. Follow all fire restrictions on these days. No outdoor burning. Avoid activities creating sparks. Report any smoke immediately. While major Pacific Northwest fires rarer than other regions, extreme conditions do occur requiring vigilance.
   - Assignment: July
   - Type: weatherSpecific
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Check air filtration systems**

   - Description: July air filtration critical for health during smoke events. Run HEPA air purifiers continuously when AQI exceeds 100. Replace filters as needed - smoke clogs them rapidly. Keep windows and doors closed during smoke. Create clean room with best air purifier for sleeping. July smoke is annual health threat.
   - Assignment: July
   - Type: weatherSpecific
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - July smoke is annual health threat.

4. **Monitor water usage restrictions**

   - Description: July often brings water use restrictions. Follow all local regulations. Water only during permitted times. Reduce non-essential water use. Monitor for leaks and fix immediately. Pacific Northwest summer drought increasingly severe - community compliance essential for adequate water supply.
   - Assignment: July
   - Type: weatherSpecific
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Check emergency evacuation planning**

   - Description: While Pacific Northwest wildfire evacuations less common than other regions, they do occur. Have evacuation plan and go-bags ready. Know evacuation routes. Sign up for emergency alerts. Keep vehicle fueled. Practice evacuation with family. July preparation ensures readiness if evacuation needed.
   - Assignment: July
   - Type: weatherSpecific
   - Priority: high (inherited from July month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## August

### seasonal

1. **Continue wildfire season vigilance**

   - Description: August maintains July fire danger in Pacific Northwest. Continue monitoring air quality daily. Keep defensible space maintained. Water plants to maintain fire resistance. Have go-bags and evacuation plans current. August smoke events can be prolonged and severe - vigilance essential through month.
   - Assignment: August
   - Type: seasonal
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Continue monitoring air quality daily.

2. **Monitor cooling systems**

   - Description: August can bring late summer heat waves to Pacific Northwest. For homes with AC, maintain system carefully. Replace filters, clean outdoor units, monitor performance. Homes without AC need alternative cooling - fans, basement refuge, cool showers. August heat waves challenge region unaccustomed to sustained heat.
   - Assignment: August
   - Type: seasonal
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Maintain fire-safe outdoor areas**

   - Description: August continue vegetation management. Remove dead material weekly. Water plants early morning to keep healthy. Keep gutters clean. Mow grass regularly. August dryness peaked - vegetation management prevents fire fuel accumulation and maintains fire-resistant landscaping.
   - Assignment: August
   - Type: seasonal
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Remove dead material weekly.

4. **Check water conservation measures**

   - Description: August peak drought stress month. Maintain all water conservation practices. Water efficiently, fix leaks, reduce non-essential use. Let lawn go dormant rather than over-watering. August water conservation protects resources and reduces fire risk from dead vegetation.
   - Assignment: August
   - Type: seasonal
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Prepare for fall transition**

   - Description: Late August begin thinking about fall. Order firewood if needed. Schedule heating system service. Plan fall projects. August is last full summer month in Pacific Northwest - enjoy outdoor time while preparing for autumn transition approaching in September.
   - Assignment: August
   - Type: seasonal
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Peak wildfire season continues**

   - Description: August equals July for Pacific Northwest fire danger. Vegetation completely dried. Smoke from regional fires common. Monitor AQI hourly during smoke events. Limit outdoor activities on unhealthy air days. Stock up on air purifier filters - August smoke events can be most severe of season.
   - Assignment: August
   - Type: weatherSpecific
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Monitor air quality during fires**

   - Description: August smoke can be hazardous for extended periods. AQI frequently exceeds 150 (unhealthy) during active fire seasons. Stay indoors with filtered air on bad days. Wear N95 masks if must go outside. Cancel outdoor events on smoky days. August air quality significantly impacts quality of life.
   - Assignment: August
   - Type: weatherSpecific
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Check fire suppression readiness**

   - Description: Verify all fire suppression equipment remains functional. Test hoses and sprinklers. Check fire extinguisher pressure. Ensure water sources accessible. While Pacific Northwest evacuations rare, preparation ensures capability to protect property if needed. August peak fire season demands readiness.
   - Assignment: August
   - Type: weatherSpecific
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Monitor drought stress effects**

   - Description: August drought stress affects landscaping. Look for stressed plants and water appropriately. Let lawn go dormant rather than over-watering. Remove dead vegetation promptly. August drought combines with smoke creating challenging outdoor environment requiring careful plant management.
   - Assignment: August
   - Type: weatherSpecific
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Prepare for smoke management**

   - Description: August smoke events common and prolonged. Seal home when smoky - close windows, doors, fireplace dampers. Run air purifiers on high. Create clean room with best filtration. Stock N95 masks. Limit outdoor exposure. August smoke management practices protect health during worst air quality of year.
   - Assignment: August
   - Type: weatherSpecific
   - Priority: high (inherited from August month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## September

### seasonal

1. **Continue wildfire vigilance**

   - Description: September fire season continues in Pacific Northwest. Smoke from regional fires persists through September. Monitor air quality daily. Maintain defensible space until significant rain arrives. First autumn rains usually end fire season but timing varies - maintain vigilance until rain established.
   - Assignment: September
   - Type: seasonal
   - Priority: high (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Monitor air quality daily.

2. **Begin fall preparation**

   - Description: September transitions from summer to fall in Pacific Northwest. Test heating system before cool weather. Schedule HVAC service. Begin fall cleaning. Prepare gardens for winter. Order firewood. September transition month - prepare for rainy season while enjoying last dry weather.
   - Assignment: September
   - Type: seasonal
   - Priority: high (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Check heating system preparation**

   - Description: Test furnace before cool, wet fall weather arrives. Turn on heat and verify proper operation. Listen for unusual sounds. Schedule professional service if not done recently. Fall heating season begins in September or October - system must work when first cool, damp weather arrives.
   - Assignment: September
   - Type: seasonal
   - Priority: high (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Monitor air quality systems**

   - Description: September continue air quality monitoring as fire season persists. Stock up on replacement air purifier filters while sales occur. Clean existing filters. September smoke can linger until autumn rains arrive - maintain air filtration capabilities through month.
   - Assignment: September
   - Type: seasonal
   - Priority: high (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Inspect for summer damage**

   - Description: September inspection reveals summer wear. Check exterior paint for sun damage. Look for dry, cracked caulking. Inspect irrigation for leaks. Address issues before fall rains. September still dry enough for exterior work - complete repairs while weather permits.
   - Assignment: September
   - Type: seasonal
   - Priority: high (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

6. **Clean washing machine drain filter**

   - Description: Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, and debris, then replace the filter and test for leaks. Clean machine before heavy fall and winter laundry season.
   - Assignment: September
   - Type: seasonal
   - Priority: high (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Wildfire season continues**

   - Description: September fire season continues until autumn rains arrive. Smoke from regional fires can persist through September. Some years see September wildfires in Pacific Northwest. Maintain fire vigilance and air quality monitoring until sustained rain begins typically late September or October.
   - Assignment: September
   - Type: weatherSpecific
   - Priority: high (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Begin transition to wet season**

   - Description: September marks transition from dry to wet season. First fall rains usually arrive late September. Monitor weather forecasts. Prepare for increasing rain - clean gutters, check drainage, inspect weatherproofing. September transitions Pacific Northwest from fire season to rain season.
   - Assignment: September
   - Type: weatherSpecific
   - Priority: high (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Monitor for early fall rains**

   - Description: September brings first significant rain after summer drought. Rain starts gradually - light showers increasing through month. Verify drainage systems handle returning rains. Check gutters work properly. Ensure outdoor items can handle wet weather. September rains welcome after summer drought.
   - Assignment: September
   - Type: weatherSpecific
   - Priority: high (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Check air quality and filtration**

   - Description: September smoke can persist until autumn rains arrive. Continue monitoring AQI daily. Run air purifiers as needed. Once consistent rain starts, air quality improves dramatically. September marks end of summer smoke season - rain brings relief for respiratory health.
   - Assignment: September
   - Type: weatherSpecific
   - Priority: high (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Continue monitoring AQI daily.

5. **Prepare for weather transition**

   - Description: September weather highly variable in Pacific Northwest - sunny and 75°F one day, rainy and 55°F the next. Keep both summer and fall clothing accessible. Have rain gear ready. Monitor forecasts daily. September transition requires flexibility for rapidly changing conditions.
   - Assignment: September
   - Type: weatherSpecific
   - Priority: high (inherited from September month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Monitor forecasts daily.

## October

### seasonal

1. **End wildfire season vigilance**

   - Description: October rain typically ends Pacific Northwest fire season. Air quality improves dramatically with autumn rains. Store air purifiers and N95 masks for next year. Shift focus from fire to rain hazards. October marks welcome end to summer smoke season in Pacific Northwest.
   - Assignment: October
   - Type: seasonal
   - Priority: medium (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Begin winter storm preparation**

   - Description: October rain increases preparing for winter storm season. Stock emergency supplies before winter storms begin. Check flashlights and batteries. Have emergency food and water. Verify backup heating ready. October preparation prevents November storm panic in Pacific Northwest.
   - Assignment: October
   - Type: seasonal
   - Priority: medium (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Check heating system operation**

   - Description: October weather cools requiring heat. Verify system works properly. Monitor performance as use increases. Replace filters monthly. Address problems before November when system runs constantly. October heating system check prevents mid-winter failures during damp, cool weather.
   - Assignment: October
   - Type: seasonal
   - Priority: medium (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Replace filters monthly.

4. **Clean gutters before winter rains**

   - Description: October critical gutter cleaning before winter. Remove summer debris - leaves, needles, moss, seeds. Flush with hose checking for proper flow and leaks. Ensure downspouts drain away from foundation. October gutter maintenance prevents winter overflow and water damage.
   - Assignment: October
   - Type: seasonal
   - Priority: medium (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Check weatherproofing**

   - Description: October inspect weatherproofing before winter rains intensify. Check door and window weatherstripping. Inspect caulking around exterior penetrations. Look for gaps in siding. Seal before heavy rains arrive. October weatherproofing prevents winter moisture intrusion and heat loss.
   - Assignment: October
   - Type: seasonal
   - Priority: medium (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

6. **Shut off outside house spigots**

   - Description: Drain and shut off outdoor faucets in October if freezing possible. Remove hoses and drain. Open outdoor faucets to drain lines. Protect pipes from winter freezing. While Pacific Northwest winters mild, occasional freezes damage unprotected outdoor plumbing.
   - Assignment: October
   - Type: seasonal
   - Priority: medium (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Transition from dry to wet season**

   - Description: October completes transition from dry summer to wet winter. Rain becomes regular and heavy. Ground saturates after summer drought. Check drainage handles returning water. Monitor basement and crawl spaces for moisture. October rain welcome relief after smoke but creates new moisture challenges.
   - Assignment: October
   - Type: weatherSpecific
   - Priority: medium (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Begin winter storm preparation**

   - Description: October begins Pacific Northwest winter storm season. Atmospheric rivers bring heavy rain, wind, and occasional snow. Stock emergency supplies before first big storms. Have plan for power outages. Secure outdoor items before windstorms. October through March brings most severe weather.
   - Assignment: October
   - Type: weatherSpecific
   - Priority: medium (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Check moisture control systems**

   - Description: October restart winter moisture control practices. Run exhaust fans during use. Check dehumidifier readiness for basements. Inspect for condensation on windows. Look for early mold growth. October moisture management prevents winter mold problems in damp Pacific Northwest climate.
   - Assignment: October
   - Type: weatherSpecific
   - Priority: medium (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Prepare for increasing rainfall**

   - Description: October rainfall increases significantly. Check gutters and downspouts handle water volume. Ensure grading slopes away from foundation. Verify drainage systems work. Monitor basement and crawl spaces for water intrusion. October rain tests drainage systems after summer dormancy.
   - Assignment: October
   - Type: weatherSpecific
   - Priority: medium (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Monitor for earthquake preparedness**

   - Description: Quarterly earthquake preparedness check. Rotate emergency supplies. Verify water heater strapping and furniture securing. Practice drop-cover-hold-on. Pacific Northwest sits on major earthquake zone - quarterly checks maintain readiness for inevitable major quake.
   - Assignment: October
   - Type: weatherSpecific
   - Priority: medium (inherited from October month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Quarterly earthquake preparedness check.
     - Pacific Northwest sits on major earthquake zone - quarterly checks maintain readiness for inevitable major quake.

## November

### seasonal

1. **Complete winter storm preparation**

   - Description: November begins peak Pacific Northwest storm season. Complete all winter preparations now. Stock emergency supplies. Prepare for power outages. Check heating system thoroughly. Secure outdoor items. November through February brings most severe storms - preparation essential before storms intensify.
   - Assignment: November
   - Type: seasonal
   - Priority: medium (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check heating system efficiency**

   - Description: November heating system works continuously during cool, damp weather. Monitor performance and efficiency. Replace filters monthly. Address declining performance immediately. November through March requires reliable heating for comfort in damp Pacific Northwest cold penetrating deeply despite mild temperatures.
   - Assignment: November
   - Type: seasonal
   - Priority: medium (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Replace filters monthly.

3. **Prepare moisture control systems**

   - Description: November ramping up moisture control for winter. Run dehumidifiers in basements. Use exhaust fans religiously. Inspect for new mold growth. Check weatherstripping prevents moisture intrusion. November starts months of constant moisture management in Pacific Northwest climate.
   - Assignment: November
   - Type: seasonal
   - Priority: medium (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Check outdoor equipment storage**

   - Description: Store summer equipment properly in November. Drain fuel from mowers and trimmers. Clean equipment thoroughly. Cover and store indoors if possible. Protect from moisture and rodents. Pacific Northwest moisture ruins equipment left exposed - proper November storage prevents spring headaches.
   - Assignment: November
   - Type: seasonal
   - Priority: medium (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Inspect holiday decoration safety**

   - Description: November holiday decorating begins. Use outdoor-rated lights and extension cords. Secure decorations against Pacific Northwest winds. Test lights before installing. Use LED lights for lower heat. November wind and rain stress decorations - secure properly to prevent damage and hazards.
   - Assignment: November
   - Type: seasonal
   - Priority: medium (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

6. **Clean washing machine drain filter**

   - Description: Locate the small access panel at the bottom front of your washer. Place towels underneath, open the panel, and remove the filter. Clean out lint, coins, and debris, then replace the filter and test for leaks. Winter wet season generates heavy laundry loads - maintain machine.
   - Assignment: November
   - Type: seasonal
   - Priority: medium (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Begin peak wet season**

   - Description: November begins peak Pacific Northwest wet season. Heavy rain, strong winds, occasional snow all arrive. November through February brings most precipitation. Stock emergency supplies. Have backup heating ready. Prepare for storm damage. November marks beginning of challenging winter weather season.
   - Assignment: November
   - Type: weatherSpecific
   - Priority: medium (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

2. **Check drainage and water management**

   - Description: November heavy rains test drainage systems. Monitor gutters handle water volume. Check downspouts drain away from foundation. Inspect basement and crawl spaces after heavy rains. Address drainage problems immediately - November is first month of sustained heavy rain requiring functional drainage.
   - Assignment: November
   - Type: weatherSpecific
   - Priority: medium (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

3. **Monitor heating system for wet conditions**

   - Description: November damp cold requires constant heating. Damp penetrates deeply making 45°F feel much colder. Ensure heating maintains comfortable indoor environment. Monitor for condensation indicating ventilation problems. November through March heating essential for comfort in Pacific Northwest damp climate.
   - Assignment: November
   - Type: weatherSpecific
   - Priority: medium (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Prepare for wind and storm damage**

   - Description: November windstorms can be severe. Trim dead branches before storms. Secure outdoor items. Have plan for power outages. Check generator if equipped. November storms bring tree damage and extended outages - preparation prevents storm hardships in Pacific Northwest.
   - Assignment: November
   - Type: weatherSpecific
   - Priority: medium (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Check mold and mildew prevention**

   - Description: November constant moisture creates perfect mold conditions. Inspect entire home for mold growth. Clean immediately. Improve ventilation in problem areas. Use dehumidifiers to maintain 30-50% humidity. November starts mold season - aggressive prevention prevents expensive remediation later.
   - Assignment: November
   - Type: weatherSpecific
   - Priority: medium (inherited from November month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## December

### seasonal

1. **Monitor heating system performance**

   - Description: December mid-winter requiring constant heating. Monitor system carefully for declining performance. Replace filters monthly. Listen for unusual sounds. Address problems immediately - December through February coldest, wettest months requiring maximum heating reliability for comfort in damp Pacific Northwest climate.
   - Assignment: December
   - Type: seasonal
   - Priority: medium (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Replace filters monthly.

2. **Check winter storm damage prevention**

   - Description: December storms continue. Before each storm, secure outdoor items and check property for vulnerabilities. After storms, inspect for damage - roof leaks, siding damage, flooding, fallen branches. December cumulative storm damage adds up requiring regular inspection and immediate repairs.
   - Assignment: December
   - Type: seasonal
   - Priority: medium (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Before each storm, secure outdoor items and check property for vulnerabilities.

3. **Test emergency systems**

   - Description: December mid-winter check of emergency preparedness. Test flashlights and radios. Verify backup heating works. Check emergency food and water supplies. Test generator if equipped. December storms can cause extended power outages - emergency systems must work when power fails.
   - Assignment: December
   - Type: seasonal
   - Priority: medium (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

4. **Monitor moisture control**

   - Description: December peak moisture management month. Run dehumidifiers continuously in basements. Use exhaust fans diligently. Check for new mold growth. Address condensation immediately. December constant rain makes moisture control critical for preventing mold and maintaining comfortable indoor environment.
   - Assignment: December
   - Type: seasonal
   - Priority: medium (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Check holiday safety measures**

   - Description: December holiday safety important. Keep fresh Christmas trees watered. Use LED lights only. Turn off decorations when away or sleeping. Have fire extinguisher accessible. Secure outdoor decorations against wind. December holiday season requires safety awareness to prevent fires and storm damage.
   - Assignment: December
   - Type: seasonal
   - Priority: medium (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

### weatherSpecific

1. **Winter storm season begins**

   - Description: December through March is peak Pacific Northwest winter storm season. Atmospheric rivers bring extreme rainfall - multiple inches in 24 hours. High winds cause power outages. Occasional heavy snow disrupts region unaccustomed to it. Stock emergency supplies before each storm - power outages last days in rural areas.
   - Assignment: December
   - Type: weatherSpecific
   - Priority: medium (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Stock emergency supplies before each storm - power outages last days in rural areas.

2. **Monitor for flooding and wind damage**

   - Description: December storms bring heavy rain, flooding, and wind damage. Check property after each storm for water intrusion, roof damage, fallen branches. Never drive through flooded roads. Clear storm drains near property. Secure outdoor items before windstorms. December storm damage compounds - inspect after each event.
   - Assignment: December
   - Type: weatherSpecific
   - Priority: medium (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Check property after each storm for water intrusion, roof damage, fallen branches.
     - December storm damage compounds - inspect after each event.

3. **Check heating during wet conditions**

   - Description: December damp cold penetrates deeply. While temps seem mild (38-48°F), dampness makes it feel much colder. Ensure heating maintains comfortable indoor environment. Monitor for unusual condensation indicating ventilation problems. Good heating and ventilation essential during wet season for comfort and mold prevention.
   - Assignment: December
   - Type: weatherSpecific
   - Priority: medium (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Good heating and ventilation essential during wet season for comfort and mold prevention.

4. **Monitor moisture and mold control**

   - Description: December constant rain creates perfect mold conditions. Inspect closets, bathrooms, and basements for mold growth. Address immediately - mold spreads rapidly in damp conditions. Improve ventilation in problem areas. Use dehumidifiers. Clean gutters to prevent water intrusion. Moisture is constant December challenge.
   - Assignment: December
   - Type: weatherSpecific
   - Priority: medium (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

5. **Check earthquake preparedness**

   - Description: Year-end earthquake preparedness review. Check emergency kit has water, food, medications for 2 weeks. Strap water heater and secure heavy furniture. Practice drop-cover-hold. Earthquakes strike without warning or seasonal pattern. Living on major fault lines requires constant preparedness - year-end review keeps supplies current.
   - Assignment: December
   - Type: weatherSpecific
   - Priority: medium (inherited from December month priority; task-level priority not set)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description: none

## Year-round

1. **Test smoke and carbon monoxide detectors monthly**

   - Description: Press test button on all smoke and CO detectors every month to verify they beep loudly. Replace batteries twice yearly - good times are daylight saving changes. Clean dust from sensors with vacuum attachment. Replace smoke detectors over 10 years old and CO detectors over 7 years old. Pacific Northwest wildfire smoke and earthquake risks make working detectors life-critical.
   - Assignment: yearRound
   - Type: yearRound
   - Priority: not specified (no task-level priority and no year-round fallback priority)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Test smoke and carbon monoxide detectors monthly
     - Press test button on all smoke and CO detectors every month to verify they beep loudly.
     - Replace batteries twice yearly - good times are daylight saving changes.

2. **Check moisture control systems monthly**

   - Description: Monthly inspect entire home for moisture and mold. Run bathroom and kitchen exhaust fans during and after use. Operate dehumidifiers in basements maintaining 30-50% humidity. Check for condensation on windows. Look for water stains, musty odors, or visible mold. Pacific Northwest constant moisture makes monthly mold vigilance essential for health and property protection.
   - Assignment: yearRound
   - Type: yearRound
   - Priority: not specified (no task-level priority and no year-round fallback priority)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Check moisture control systems monthly
     - Monthly inspect entire home for moisture and mold.
     - Pacific Northwest constant moisture makes monthly mold vigilance essential for health and property protection.

3. **Monitor air quality during fire season**

   - Description: During fire season (June-September), check AQI daily using EPA AirNow or smartphone apps. Run HEPA air purifiers when AQI exceeds 100. Limit outdoor activities when AQI over 150. Stock N95 masks year-round. Keep extra purifier filters on hand. Pacific Northwest summer smoke from regional fires is annual health threat requiring constant monitoring and filtration.
   - Assignment: yearRound
   - Type: yearRound
   - Priority: not specified (no task-level priority and no year-round fallback priority)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Monitor air quality during fire season
     - During fire season (June-September), check AQI daily using EPA AirNow or smartphone apps.
     - Stock N95 masks year-round.
     - Pacific Northwest summer smoke from regional fires is annual health threat requiring constant monitoring and filtration.

4. **Check earthquake emergency supplies quarterly**

   - Description: Every 3 months verify earthquake kit has current water (1 gallon/person/day for 2 weeks minimum), non-perishable food, medications, batteries, flashlights, first aid supplies. Rotate food and water every 6 months. Check that water heater is strapped and heavy furniture secured. Earthquakes strike without warning - quarterly checks ensure readiness for inevitable Cascadia megaquake.
   - Assignment: yearRound
   - Type: yearRound
   - Priority: not specified (no task-level priority and no year-round fallback priority)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Check earthquake emergency supplies quarterly
     - Every 3 months verify earthquake kit has current water (1 gallon/person/day for 2 weeks minimum), non-perishable food, medications, batteries, flashlights, first aid supplies.
     - Rotate food and water every 6 months.
     - Earthquakes strike without warning - quarterly checks ensure readiness for inevitable Cascadia megaquake.

5. **Professional HVAC service twice yearly**

   - Description: Schedule heating system service in fall (September/October) before wet season, AC service in spring (April/May) if applicable before summer. Professional service extends equipment life, ensures efficiency, prevents failures during extreme weather. Pacific Northwest climate demands reliable heating during damp cool seasons and occasional AC during heat waves and smoke events - professional maintenance essential.
   - Assignment: yearRound
   - Type: yearRound
   - Priority: not specified (no task-level priority and no year-round fallback priority)
   - Structured recurrence/frequency field: not present
   - Literal recurrence/frequency wording in title or description:
     - Professional HVAC service twice yearly
