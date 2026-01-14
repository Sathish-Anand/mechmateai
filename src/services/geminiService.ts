import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini AI client
const getGeminiAPI = () => {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('EXPO_PUBLIC_GOOGLE_AI_API_KEY is not set in environment variables');
  }
  return new GoogleGenerativeAI(apiKey);
};

export interface VehicleInfo {
  make: string;
  model: string;
  year: number;
  variant?: string;
  odometer?: number;
}

export interface LogbookEntry {
  date: string;
  service_type: 'MAINTENANCE' | 'REPAIR' | 'INSPECTION' | 'OTHER';
  work_done: string;
  cost?: number;
  vendor?: string;
  odometer?: number;
}

export interface DiagnosisResponse {
  title: string; // 2-word descriptive title for the diagnosis
  diagnosis: string;
  possibleCauses: string[];
  recommendations: string[];
  urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimatedCost: string;
  difficulty: 'EASY' | 'MODERATE' | 'DIFFICULT' | 'PROFESSIONAL_REQUIRED';
}

export const geminiService = {
  /**
   * Get AI-powered vehicle diagnosis from Gemini
   */
  async getDiagnosis(vehicleInfo: VehicleInfo, issueDescription: string, logbookEntries: LogbookEntry[] = []): Promise<DiagnosisResponse> {
    try {
      const genAI = getGeminiAPI();
      const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

      const prompt = this.buildDiagnosisPrompt(vehicleInfo, issueDescription, logbookEntries);

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return this.parseDiagnosisResponse(text);
    } catch (error) {
      console.error('Error getting Gemini AI diagnosis:', error);
      throw new Error('Failed to get AI diagnosis. Please try again.');
    }
  },

  /**
   * Build a comprehensive prompt for vehicle diagnosis
   */
  buildDiagnosisPrompt(vehicleInfo: VehicleInfo, issueDescription: string, logbookEntries: LogbookEntry[] = []): string {
    const { make, model, year, variant, odometer } = vehicleInfo;

    // Format service history for the prompt
    const formatServiceHistory = (entries: LogbookEntry[]): string => {
      if (entries.length === 0) {
        return 'No service history available';
      }

      return entries.slice(0, 10) // Last 10 entries
        .map(entry => {
          const date = new Date(entry.date).toLocaleDateString();
          const odometer = entry.odometer ? `${entry.odometer.toLocaleString()} km` : 'N/A';
          return `- ${date} (${odometer}): ${entry.service_type} - ${entry.work_done}${entry.cost ? ` ($${entry.cost})` : ''}`;
        }).join('\n');
    };

    return `You are an expert automotive mechanic with 20+ years of experience. Provide a comprehensive diagnosis for this vehicle issue:

VEHICLE INFORMATION:
- Make: ${make}
- Model: ${model}
- Year: ${year}
${variant ? `- Variant: ${variant}` : ''}
${odometer ? `- Current Odometer: ${odometer.toLocaleString()} km` : ''}

ISSUE DESCRIPTION:
${issueDescription}

SERVICE HISTORY (Recent Maintenance/Repairs):
${formatServiceHistory(logbookEntries)}

Please provide a detailed analysis in this EXACT JSON format (ensure valid JSON):
{
  "title": "Two-word descriptive title (like 'Engine Misfire', 'Brake Pads', 'Oil Leak', 'Battery Dead', 'Fuel Pump', etc.)",
  "diagnosis": "Detailed explanation of what's likely wrong with the vehicle, considering the service history",
  "possibleCauses": [
    "Most likely cause based on symptoms and service history",
    "Second most likely cause considering recent repairs",
    "Third most likely cause or related maintenance issue"
  ],
  "recommendations": [
    "Immediate action needed",
    "Repair steps or professional help needed",
    "Preventive measures considering service history"
  ],
  "urgencyLevel": "LOW|MEDIUM|HIGH|CRITICAL",
  "estimatedCost": "Cost range like '$50-$200' or 'Varies'",
  "difficulty": "EASY|MODERATE|DIFFICULT|PROFESSIONAL_REQUIRED"
}

IMPORTANT GUIDELINES:
1. Base your diagnosis on the specific make, model, and year
2. CAREFULLY ANALYZE the service history - look for patterns, recent work that might be related, or maintenance that might be overdue
3. Consider if the issue could be related to recent repairs or lack of maintenance
4. If similar work was done recently, consider warranty issues or incomplete repairs
5. Factor in the vehicle's maintenance patterns when estimating urgency and cost
6. Provide actionable recommendations that build on the existing service history
7. Prioritize safety - if it's dangerous to drive, mark as CRITICAL urgency
8. Only respond with valid JSON format
9. Keep diagnosis professional but easy to understand`;
  },

  /**
   * Parse the AI response into structured data
   */
  parseDiagnosisResponse(responseText: string): DiagnosisResponse {
    try {
      // Try to find JSON in the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const jsonStr = jsonMatch[0];
      const parsed = JSON.parse(jsonStr);

      // Validate required fields
      const requiredFields = ['title', 'diagnosis', 'possibleCauses', 'recommendations', 'urgencyLevel', 'estimatedCost', 'difficulty'];
      for (const field of requiredFields) {
        if (!parsed[field]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      return {
        title: parsed.title || 'Vehicle Issue',
        diagnosis: parsed.diagnosis,
        possibleCauses: Array.isArray(parsed.possibleCauses) ? parsed.possibleCauses : [parsed.possibleCauses],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [parsed.recommendations],
        urgencyLevel: parsed.urgencyLevel,
        estimatedCost: parsed.estimatedCost,
        difficulty: parsed.difficulty
      };
    } catch (error) {
      console.error('Error parsing AI response:', error);

      // Fallback: create a basic response from the raw text
      return this.createFallbackResponse(responseText);
    }
  },

  /**
   * Create a fallback response when JSON parsing fails
   */
  createFallbackResponse(responseText: string): DiagnosisResponse {
    // Try to extract a simple title from the response text
    const title = this.extractTitleFromText(responseText);

    return {
      title: title,
      diagnosis: responseText.substring(0, 500) + (responseText.length > 500 ? '...' : ''),
      possibleCauses: [
        'Multiple potential causes identified',
        'Requires further investigation',
        'Professional diagnosis recommended'
      ],
      recommendations: [
        'Consult with a qualified mechanic',
        'Do not drive if the issue affects safety',
        'Keep records of when the issue occurs'
      ],
      urgencyLevel: 'MEDIUM',
      estimatedCost: 'Varies depending on root cause',
      difficulty: 'PROFESSIONAL_REQUIRED'
    };
  },

  /**
   * Extract a simple 2-word title from diagnosis text
   */
  extractTitleFromText(text: string): string {
    const lowerText = text.toLowerCase();

    // Common automotive issue patterns
    const patterns = [
      /engine.*?(?:misfire|problem|issue|trouble)/i,
      /brake.*?(?:pad|problem|issue|squeal)/i,
      /oil.*?(?:leak|problem|change|pressure)/i,
      /battery.*?(?:dead|problem|weak|fail)/i,
      /transmission.*?(?:problem|slip|issue)/i,
      /suspension.*?(?:problem|noise|issue)/i,
      /electrical.*?(?:problem|issue|fault)/i,
      /cooling.*?(?:problem|overheat|issue)/i,
      /fuel.*?(?:problem|pump|filter|issue)/i,
      /exhaust.*?(?:problem|smoke|issue)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const matched = match[0];
        if (matched.includes('engine')) return 'Engine Issue';
        if (matched.includes('brake')) return 'Brake Problem';
        if (matched.includes('oil')) return 'Oil Issue';
        if (matched.includes('battery')) return 'Battery Problem';
        if (matched.includes('transmission')) return 'Transmission Issue';
        if (matched.includes('suspension')) return 'Suspension Problem';
        if (matched.includes('electrical')) return 'Electrical Issue';
        if (matched.includes('cooling')) return 'Cooling Problem';
        if (matched.includes('fuel')) return 'Fuel Issue';
        if (matched.includes('exhaust')) return 'Exhaust Problem';
      }
    }

    // Fallback titles
    if (lowerText.includes('noise')) return 'Noise Issue';
    if (lowerText.includes('vibration')) return 'Vibration Problem';
    if (lowerText.includes('leak')) return 'Fluid Leak';
    if (lowerText.includes('overheating')) return 'Overheating Problem';
    if (lowerText.includes('starting')) return 'Starting Issue';

    return 'Vehicle Issue';
  },

  /**
   * Get enhanced search terms for YouTube based on AI diagnosis
   */
  generateSearchTerms(vehicleInfo: VehicleInfo, diagnosis: DiagnosisResponse): string[] {
    const vehicleStr = `${vehicleInfo.year} ${vehicleInfo.make} ${vehicleInfo.model}`;

    return [
      `${vehicleStr} ${diagnosis.possibleCauses[0]?.toLowerCase()}`,
      `${vehicleStr} common problems repair`,
      `${vehicleStr} maintenance tutorial`,
      `how to fix ${diagnosis.possibleCauses[0]?.toLowerCase()}`,
      `${vehicleInfo.make} ${vehicleInfo.model} DIY repair`
    ];
  },

  /**
   * Generate detailed parts recommendations with specifications
   */
  async generateDetailedPartRecommendations(
    vehicleInfo: VehicleInfo,
    diagnosis: DiagnosisResponse
  ): Promise<Array<{name: string, category: string, priority: 'high' | 'medium' | 'low', description: string}>> {
    try {
      const genAI = getGeminiAPI();
      const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

      const prompt = `Based on the vehicle diagnosis, provide specific automotive parts recommendations:

VEHICLE: ${vehicleInfo.year} ${vehicleInfo.make} ${vehicleInfo.model}${vehicleInfo.variant ? ` ${vehicleInfo.variant}` : ''}
DIAGNOSIS: ${diagnosis.diagnosis}
POSSIBLE CAUSES: ${diagnosis.possibleCauses.join(', ')}
RECOMMENDATIONS: ${diagnosis.recommendations.join(', ')}

Generate a JSON list of specific automotive parts needed for this repair. Include only parts that are directly related to the diagnosed issue.

Format (return valid JSON only):
[
  {
    "name": "Specific part name with vehicle compatibility",
    "category": "engine|brake|transmission|electrical|suspension|cooling|fuel|exhaust",
    "priority": "high|medium|low",
    "description": "Brief description of why this part is needed"
  }
]

Guidelines:
1. Be specific to the vehicle make/model/year
2. Only recommend parts directly related to the diagnosis
3. Prioritize parts based on diagnosis urgency and safety
4. Include 2-5 most relevant parts maximum
5. Use proper automotive part terminology`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      try {
        // Extract JSON from response
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parts = JSON.parse(jsonMatch[0]);
          return Array.isArray(parts) ? parts : [];
        }
      } catch (parseError) {
        console.error('Error parsing AI parts response:', parseError);
      }

      // Fallback to basic recommendations
      return this.generateBasicPartRecommendations(diagnosis);
    } catch (error) {
      console.error('Error getting detailed part recommendations:', error);
      return this.generateBasicPartRecommendations(diagnosis);
    }
  },

  /**
   * Generate basic parts recommendations as fallback
   */
  generateBasicPartRecommendations(diagnosis: DiagnosisResponse): Array<{name: string, category: string, priority: 'high' | 'medium' | 'low', description: string}> {
    const causes = diagnosis.possibleCauses.join(' ').toLowerCase();
    const recommendations = diagnosis.recommendations.join(' ').toLowerCase();
    const allText = `${causes} ${recommendations}`;

    const partMappings = {
      'spark plug': { parts: ['spark plugs', 'ignition coils'], category: 'engine', priority: 'high' as const },
      'air filter': { parts: ['air filter'], category: 'engine', priority: 'medium' as const },
      'oil': { parts: ['oil filter', 'motor oil'], category: 'engine', priority: 'high' as const },
      'brake': { parts: ['brake pads', 'brake rotors', 'brake fluid'], category: 'brake', priority: 'high' as const },
      'battery': { parts: ['car battery'], category: 'electrical', priority: 'high' as const },
      'alternator': { parts: ['alternator'], category: 'electrical', priority: 'high' as const },
      'starter': { parts: ['starter motor'], category: 'electrical', priority: 'high' as const },
      'transmission': { parts: ['transmission fluid'], category: 'transmission', priority: 'medium' as const },
      'coolant': { parts: ['coolant', 'thermostat'], category: 'cooling', priority: 'high' as const },
      'fuel': { parts: ['fuel filter'], category: 'fuel', priority: 'medium' as const },
      'suspension': { parts: ['shock absorbers'], category: 'suspension', priority: 'medium' as const },
    };

    const recommendedParts: Array<{name: string, category: string, priority: 'high' | 'medium' | 'low', description: string}> = [];

    for (const [keyword, config] of Object.entries(partMappings)) {
      if (allText.includes(keyword)) {
        config.parts.forEach(part => {
          recommendedParts.push({
            name: part,
            category: config.category,
            priority: config.priority,
            description: `Replacement ${part} may be needed based on diagnosis`
          });
        });
      }
    }

    // If no specific parts found, return common maintenance items
    if (recommendedParts.length === 0) {
      return [
        { name: 'air filter', category: 'engine', priority: 'medium', description: 'Regular maintenance item' },
        { name: 'oil filter', category: 'engine', priority: 'medium', description: 'Regular maintenance item' }
      ];
    }

    // Return up to 4 unique parts
    const uniqueParts = recommendedParts.filter((part, index, self) =>
      index === self.findIndex(p => p.name === part.name)
    );
    return uniqueParts.slice(0, 4);
  },

  /**
   * Legacy function for backward compatibility - now returns simple part names
   */
  generatePartRecommendations(diagnosis: DiagnosisResponse): string[] {
    const basicParts = this.generateBasicPartRecommendations(diagnosis);
    return basicParts.map(part => part.name);
  }
};