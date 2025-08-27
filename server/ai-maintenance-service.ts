import OpenAI from "openai";
import type { House } from "@shared/schema";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

export interface AIMaintenanceSuggestion {
  id: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  estimatedCost: string;
  timeRequired: string;
  seasonalRelevance: string;
  diyFriendly: boolean;
  contractorRecommended: boolean;
  urgency: 'immediate' | 'this_week' | 'this_month' | 'next_month';
}

export interface UserMaintenanceSuggestions {
  userId: string;
  month: number;
  year: number;
  region: string;
  climateZone: string;
  suggestions: AIMaintenanceSuggestion[];
  weatherConsiderations: string[];
  regionalRisks: string[];
  generatedAt: Date;
}

export class AIMaintenanceService {
  private getRegionFromClimateZone(climateZone: string): string {
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

  private getRegionalContext(region: string, month: number): string {
    const contexts: { [key: string]: { [key: number]: string } } = {
      'Northeast': {
        1: 'Peak winter with potential for ice storms, heavy snow, and extreme cold',
        2: 'Late winter preparation for spring thaw and potential flooding',
        3: 'Spring transition with frost concerns and winter damage assessment',
        4: 'Spring cleaning season with HVAC transition needs',
        5: 'Mild spring weather optimal for exterior maintenance',
        6: 'Early summer with increasing humidity and storm preparation',
        7: 'Peak summer heat with high cooling demands',
        8: 'Late summer maintenance before fall transition',
        9: 'Fall preparation for winter heating season',
        10: 'Peak fall maintenance and winter preparation',
        11: 'Final winter preparations and heating system readiness',
        12: 'Winter weather monitoring and holiday safety'
      },
      'Southeast': {
        1: 'Mild winter with occasional freeze concerns',
        2: 'Early spring preparation with pest activity increasing',
        3: 'Spring weather with tornado season approach',
        4: 'Peak severe weather season preparation',
        5: 'Pre-hurricane season maintenance and cooling prep',
        6: 'Hurricane season begins with peak heat preparation',
        7: 'Peak hurricane season with extreme heat management',
        8: 'Continued hurricane vigilance and heat stress',
        9: 'Late hurricane season with cooling system stress',
        10: 'Hurricane season end with fall transition',
        11: 'Mild fall weather optimal for maintenance',
        12: 'Mild winter with continued pest management'
      },
      'Midwest': {
        1: 'Extreme winter cold with heavy heating demands',
        2: 'Peak winter weather with potential severe storms',
        3: 'Spring flooding potential and severe weather prep',
        4: 'Tornado season begins with spring maintenance',
        5: 'Peak tornado season with severe weather vigilance',
        6: 'Summer heat with continued storm risks',
        7: 'Peak summer heat and humidity management',
        8: 'Late summer heat with fall preparation',
        9: 'Fall transition and heating system preparation',
        10: 'Winter preparation with first freeze potential',
        11: 'Final winter preparations and storm readiness',
        12: 'Peak winter conditions with extreme cold'
      },
      'Southwest': {
        1: 'Mild winter with occasional freeze protection needs',
        2: 'Spring preparation with UV damage assessment',
        3: 'Increasing heat with dust storm preparation',
        4: 'Pre-summer cooling system preparation',
        5: 'Extreme heat season begins with cooling demands',
        6: 'Peak heat season with monsoon preparation',
        7: 'Extreme heat with monsoon season peak',
        8: 'Continued extreme heat and monsoon effects',
        9: 'Late monsoon season with heat stress assessment',
        10: 'Heat season end with pleasant weather for maintenance',
        11: 'Optimal maintenance weather conditions',
        12: 'Mild winter with heating system checks'
      },
      'West Coast': {
        1: 'Winter storm season with earthquake preparedness',
        2: 'Peak winter storms and flood risk management',
        3: 'Late winter maintenance with wildfire prep beginning',
        4: 'Spring maintenance with fire season approach',
        5: 'Wildfire season begins with defensible space prep',
        6: 'Peak wildfire season with air quality concerns',
        7: 'Continued wildfire vigilance with evacuation readiness',
        8: 'Peak wildfire danger with smoke management',
        9: 'Late wildfire season with Santa Ana wind risks',
        10: 'Continued fire season with winter storm prep',
        11: 'Wildfire season end with winter preparation',
        12: 'Winter storm season with flood preparation'
      },
      'Mountain West': {
        1: 'Extreme winter cold with altitude effects',
        2: 'Peak winter conditions with avalanche awareness',
        3: 'Spring snowmelt with flooding potential',
        4: 'Spring maintenance with wildfire prep',
        5: 'Wildfire season begins with altitude considerations',
        6: 'Peak wildfire season at elevation',
        7: 'Extreme fire danger with lightning risks',
        8: 'Continued wildfire vigilance and drought effects',
        9: 'Late fire season with early winter prep',
        10: 'Rapid weather changes with winter preparation',
        11: 'Final winter preparations for extreme conditions',
        12: 'Peak winter weather with altitude challenges'
      },
      'Pacific Northwest': {
        1: 'Winter storm season with earthquake preparedness',
        2: 'Peak winter storms and moisture management',
        3: 'Spring maintenance with wildfire preparation',
        4: 'Mild weather optimal for exterior maintenance',
        5: 'Dry season begins with fire preparation',
        6: 'Wildfire season with air quality monitoring',
        7: 'Peak fire season with smoke management',
        8: 'Continued fire vigilance with drought stress',
        9: 'Late fire season with fall transition',
        10: 'Fire season end with winter storm prep',
        11: 'Fall maintenance before wet season',
        12: 'Winter storms with moisture control needs'
      }
    };

    return contexts[region]?.[month] || 'Regional maintenance considerations for the current month';
  }

  async generateMonthlyMaintenanceSuggestions(
    userId: string,
    house: House,
    homeSystems: string[],
    previousMaintenanceLogs: any[] = []
  ): Promise<UserMaintenanceSuggestions> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const currentDate = new Date();
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();
    const region = this.getRegionFromClimateZone(house.climateZone);
    const regionalContext = this.getRegionalContext(region, month);

    // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-5", 
      messages: [
        {
          role: "system",
          content: `You are an expert home maintenance advisor specializing in location-specific and seasonal maintenance recommendations. Generate personalized monthly maintenance suggestions based on the provided property details, location, and season.

Focus on:
1. Critical seasonal tasks specific to the region and month
2. Preventive maintenance based on home systems and age
3. Weather-related preparations and risks
4. Cost-effective DIY vs professional service recommendations
5. Urgency levels based on seasonal timing

Provide practical, actionable advice that considers the user's specific situation.`
        },
        {
          role: "user",
          content: `Generate personalized maintenance suggestions for:

Property Details:
- Location: ${house.address}
- Climate Zone: ${house.climateZone} (${region} region)
- Home Systems: ${homeSystems.length > 0 ? homeSystems.join(', ') : 'Standard residential systems'}
- Property Name: ${house.name}

Current Context:
- Month: ${new Date(year, month - 1).toLocaleString('default', { month: 'long' })} ${year}
- Regional Context: ${regionalContext}

Recent Maintenance History:
${previousMaintenanceLogs.length > 0 ? 
  previousMaintenanceLogs.slice(0, 5).map(log => 
    `- ${log.serviceType}: ${log.serviceDescription} (${new Date(log.serviceDate).toLocaleDateString()})`
  ).join('\n') : 
  'No recent maintenance records available'
}

Please provide maintenance suggestions in JSON format with the following structure:
{
  "suggestions": [
    {
      "title": "Task title",
      "description": "Detailed description of what needs to be done and why",
      "priority": "critical|high|medium|low",
      "category": "HVAC|Plumbing|Electrical|Exterior|Interior|Landscaping|Safety|Seasonal",
      "estimatedCost": "$X-Y range or specific amount",
      "timeRequired": "X hours/minutes",
      "seasonalRelevance": "Why this task is important for this specific month/season",
      "diyFriendly": true/false,
      "contractorRecommended": true/false,
      "urgency": "immediate|this_week|this_month|next_month"
    }
  ],
  "weatherConsiderations": [
    "Specific weather-related considerations for this month and region"
  ],
  "regionalRisks": [
    "Regional risks to be aware of (hurricanes, wildfires, extreme cold, etc.)"
  ]
}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 2000
    });

    const aiResponse = JSON.parse(response.choices[0].message.content || '{}');
    
    const suggestions: AIMaintenanceSuggestion[] = (aiResponse.suggestions || []).map((suggestion: any, index: number) => ({
      id: `ai-suggestion-${userId}-${month}-${year}-${index}`,
      title: suggestion.title || 'Maintenance Task',
      description: suggestion.description || 'No description available',
      priority: suggestion.priority || 'medium',
      category: suggestion.category || 'General',
      estimatedCost: suggestion.estimatedCost || 'Cost varies',
      timeRequired: suggestion.timeRequired || 'Time varies',
      seasonalRelevance: suggestion.seasonalRelevance || 'Seasonal maintenance',
      diyFriendly: suggestion.diyFriendly !== false,
      contractorRecommended: suggestion.contractorRecommended === true,
      urgency: suggestion.urgency || 'this_month'
    }));

    return {
      userId,
      month,
      year,
      region,
      climateZone: house.climateZone,
      suggestions,
      weatherConsiderations: aiResponse.weatherConsiderations || [],
      regionalRisks: aiResponse.regionalRisks || [],
      generatedAt: new Date()
    };
  }

  async getMonthlyMaintenanceSuggestions(userId: string, houses: House[], homeSystems: string[], previousMaintenanceLogs: any[] = []): Promise<UserMaintenanceSuggestions[]> {
    if (!houses || houses.length === 0) {
      return [];
    }

    const suggestions: UserMaintenanceSuggestions[] = [];
    
    // Generate suggestions for each house
    for (const house of houses) {
      try {
        const houseSuggestions = await this.generateMonthlyMaintenanceSuggestions(
          userId,
          house,
          homeSystems,
          previousMaintenanceLogs.filter(log => log.houseId === house.id)
        );
        suggestions.push(houseSuggestions);
      } catch (error) {
        console.error(`Error generating suggestions for house ${house.id}:`, error);
        // Continue with other houses even if one fails
      }
    }

    return suggestions;
  }
}

export const aiMaintenanceService = new AIMaintenanceService();