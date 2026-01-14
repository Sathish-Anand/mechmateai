class GroqService {
  private apiKey: string;
  private baseUrl = 'https://api.groq.com/openai/v1/chat/completions';

  // Model options for easy switching
  private models = {
    FAST_FREE: 'llama-3.1-8b-instant',      // Best for production - fast and free
    BALANCED: 'mixtral-8x7b-32768',         // Good balance of speed/quality
    QUALITY: 'llama-3.1-70b-versatile',     // Best quality but may have limits
    GOOGLE: 'gemma2-9b-it',                 // Google's efficient model
  };

  // Current model selection - change this to test different models
  private currentModel = this.models.FAST_FREE;

  constructor() {
    this.apiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('EXPO_PUBLIC_GROQ_API_KEY environment variable is required');
    }
  }

  async getDiagnosis(vehicle: any, issueDescription: string, logbookEntries: any[], obdiiCodes?: string, images?: string[], video?: string) {
    const messages = this.buildDiagnosisMessages(vehicle, issueDescription, logbookEntries, obdiiCodes, images, video);

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.currentModel, // Fast and free for production
          messages: messages,
          max_tokens: 1500,
          temperature: 0.1, // Low temperature for consistent results
          top_p: 0.9, // Reduced for more focused responses
          stream: false,
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Groq API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const result = await response.json();
      const aiContent = result.choices[0].message.content;
      console.log('=== AI RAW RESPONSE ===');
      console.log('Full length:', aiContent.length);
      console.log('Content preview:', aiContent.substring(0, 800));

      // Check for section markers
      const hasSection1 = aiContent.includes('SECTION 1: TECHNICIAN DIAGNOSIS');
      const hasSection2 = aiContent.includes('SECTION 2: USER-FACING DIAGNOSTIC FLOW');
      console.log('Has Section 1:', hasSection1);
      console.log('Has Section 2:', hasSection2);

      if (!hasSection1 || !hasSection2) {
        console.log('!!! WARNING: AI response missing required sections !!!');
        console.log('Full response:');
        console.log(aiContent);
      }

      console.log('=== END AI RESPONSE ===');

      // Always use the new simplified parsing approach
      console.log('=== USING SIMPLIFIED PARSING ===');
      return this.parseDiagnosisResponse(aiContent, vehicle, issueDescription, images, video);
    } catch (error) {
      console.error('Groq diagnosis error:', error);
      throw new Error(`Failed to get AI diagnosis from Groq: ${error.message}`);
    }
  }

  async generateDetailedPartRecommendations(vehicle: any, diagnosis: any, obdiiCodes?: string) {
    const messages = [
      {
        role: 'system',
        content: `You are an automotive parts specialist. Generate detailed part recommendations based on the diagnosis provided. Return a JSON array of 3-5 specific parts with detailed information.`
      },
      {
        role: 'user',
        content: `Vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.variant || ''}
Engine: ${vehicle.engine || 'Unknown'}
Vehicle Type: ${vehicle.vehicle_type || 'Car'}
Transmission: ${vehicle.transmission || 'Unknown'}
Diagnosis: ${diagnosis.diagnosis}
Possible Causes: ${diagnosis.possibleCauses?.join(', ') || 'Various causes'}
${obdiiCodes ? `OBDII Error Codes: ${obdiiCodes}` : ''}

Generate 3-5 specific automotive parts that would be needed for this repair. ${obdiiCodes ? 'Consider the OBDII error codes provided for precise part recommendations.' : ''} For each part, provide:
- name: Specific part name with brand if possible
- category: Part category (engine, brake, electrical, suspension, etc.)
- priority: high/medium/low based on urgency
- estimatedPrice: {min: realistic minimum price, max: realistic maximum price}
- description: Brief explanation of why this part is needed
- partNumber: Generic or OEM part number if known
- brand: Preferred brand (OEM, Bosch, ACDelco, etc.)

Return as JSON array only, no additional text.`
      }
    ];

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.currentModel, // Fast and free for production
          messages: messages,
          max_tokens: 800,
          temperature: 0.1, // Low temperature for consistent results
        })
      });

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status}`);
      }

      const result = await response.json();
      const content = result.choices[0].message.content;

      // Try to extract JSON from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parts = JSON.parse(jsonMatch[0]);
        return this.validateAndEnhanceParts(parts, vehicle);
      }

      // Fallback to generating basic parts
      return this.generateFallbackParts(vehicle, diagnosis);
    } catch (error) {
      console.error('Groq parts generation error:', error);
      return this.generateFallbackParts(vehicle, diagnosis);
    }
  }

  private buildDiagnosisMessages(vehicle: any, issue: string, logbook: any[], obdiiCodes?: string, images?: string[], video?: string) {
    const vehicleInfo = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
    const serviceHistory = logbook?.slice(0, 5).map(entry =>
      `${entry.date}: ${entry.service_type} - ${entry.description}${entry.cost ? ` ($${entry.cost})` : ''}`
    ).join('\n') || 'No recent service records available';

    return [
      {
        role: 'system',
        content: `You are an expert automotive mechanic with 25+ years of experience. Provide a clear, professional diagnosis.

Return your response in this EXACT format:

**DIAGNOSIS TITLE:** [Short diagnostic title - max 3 words, avoid engine type like "Hybrid"]

**ISSUE SUMMARY:**
[2-3 sentences explaining what's wrong in simple terms]

**URGENCY:** [CRITICAL/HIGH/MEDIUM/LOW]

**ESTIMATED COST:** [Dollar range like $100-$300]

**CAN I DRIVE?:** [YES - Safe to drive / LIMITED - Drive carefully to repair shop / NO - Do not drive]

**TECHNICAL ANALYSIS:**
[Professional analysis explaining the problem, causes, and why it's happening - 200-300 words]

**WHAT TO DO:**
1. Inspect the brake pads: Use a brake pad gauge to measure the thickness of the brake pads. Compare the measurements to the manufacturer's specifications to determine if the brake pads are worn out. Tools needed: Brake pad gauge, calipers. Expected outcome: Determine if the brake pads are worn out.
2. Inspect the brake rotors: Use a brake rotor gauge to measure the thickness of the brake rotors. Compare the measurements to the manufacturer's specifications to determine if the brake rotors are warped or excessively worn. Tools needed: Brake rotor gauge, calipers. Expected outcome: Determine if the brake rotors are warped or excessively worn.
3. Inspect the brake hardware: Inspect the brake calipers, brake hoses, and brake lines for signs of wear or damage. Tools needed: Visual inspection, calipers. Expected outcome: Determine if the brake hardware is loose or worn out.
4. Perform a brake test: Perform a brake test to determine if the brake system is functioning properly. Tools needed: Brake test equipment, calipers. Expected outcome: Determine if the brake system is functioning properly.
5. Replace the brake pads: If the brake pads are worn out, replace them with new ones. Tools needed: Brake pad removal tool, calipers, new brake pads. Expected outcome: Replace the brake pads with new ones.
6. Resurface the brake rotors: If the brake rotors are warped or excessively worn, resurface them to restore their original shape. Tools needed: Brake rotor resurfacing tool, calipers. Expected outcome: Resurface the brake rotors to restore their original shape.
7. Replace the brake hardware: If the brake hardware is loose or worn out, replace it with new ones. Tools needed: Brake hardware removal tool, calipers, new brake hardware. Expected outcome: Replace the brake hardware with new ones.
8. Test the brake system: After replacing the brake pads, resurfacing the brake rotors, or replacing the brake hardware, test the brake system to ensure it is functioning properly. Tools needed: Brake test equipment, calipers. Expected outcome: Test the brake system to ensure it is functioning properly.
9. Document the repair: Document the repair, including the parts replaced, the labor performed, and any additional recommendations. Tools needed: Repair documentation software, calipers. Expected outcome: Document the repair for future reference.
10. Schedule a follow-up inspection: Schedule a follow-up inspection to ensure the brake system is functioning properly and to identify any potential issues before they become major problems. Tools needed: None. Expected outcome: Schedule a follow-up inspection to ensure the brake system is functioning properly.

PROVIDE EXACTLY 10 DETAILED ACTION STEPS like the examples above. Each step must include: action description, tools needed, and expected outcome. Adapt the steps to the specific issue described.

**PREVENTION:**
To prevent this issue in the future:
- [Prevention tip with maintenance schedule]
- [Prevention tip about driving habits]
- [Prevention tip about regular inspections]
- [Prevention tip about warning signs]
- [Prevention tip about service intervals]

IMPORTANT: Do NOT use asterisks (*) for formatting. Write clean text without markup. Each recommendation should be clear and professional. Format tools and outcomes on separate lines as shown.`
      },
      {
        role: 'user',
        content: `**VEHICLE INFORMATION:**
- Year: ${vehicle.year}
- Make: ${vehicle.make}
- Model: ${vehicle.model}
- Variant: ${vehicle.variant || 'Standard'}
- Mileage: ${vehicle.odometer ? `${Math.round(vehicle.odometer * 0.621371)} miles (${vehicle.odometer} km)` : 'Unknown'}
- Engine: ${vehicle.engine || 'Unknown'}
- Transmission: ${vehicle.transmission || 'Unknown'}
- Drivetrain: ${vehicle.drivetrain || 'Unknown'}
- Vehicle Type: ${vehicle.vehicle_type || 'Car'}

**CUSTOMER SYMPTOMS:**
${issue}

${obdiiCodes ? `**OBD-II ERROR CODES:**
${obdiiCodes}

` : ''}**SERVICE HISTORY:**
${serviceHistory}

**VISUAL EVIDENCE:**
${images && images.length > 0 ? `Photos provided: ${images.length} images showing vehicle condition and specific problem areas. Analyze all visual details for component condition, wear patterns, damage, leaks, corrosion, and any abnormalities.` : 'No photos provided'}
${video ? `Video provided: Shows dynamic behavior, sounds, vibrations, and operational issues. Analyze audio-visual clues for diagnostic insights.` : 'No video provided'}

**ANALYSIS REQUEST:**
Perform a complete diagnostic analysis using your ASE Master Technician expertise. ${obdiiCodes ? 'Pay particular attention to the OBD-II codes provided as they are critical diagnostic indicators.' : ''} ${images && images.length > 0 ? 'Correlate visual evidence from photos with reported symptoms and diagnostic codes.' : ''} ${video ? 'Use video evidence to assess dynamic issues, sounds, and operational behavior.' : ''} Consider the vehicle age (${2024 - vehicle.year} years), mileage, service history, and all technical details in your probability assessments.

Provide your diagnosis in the specified JSON format with comprehensive technical analysis, visual evidence assessment, actionable repair steps, and accurate cost/time estimates.`
      }
    ];
  }

  private parseDiagnosisResponse(content: string, vehicle: any, issue: string, images?: string[], video?: string) {
    console.log('=== PARSING SIMPLE AI RESPONSE ===');
    console.log('Raw content length:', content.length);
    console.log('Content preview:', content.substring(0, 500));

    try {
      // Parse the simple structured format
      const title = this.extractValue(content, 'DIAGNOSIS TITLE');
      const issueSummary = this.extractValue(content, 'ISSUE SUMMARY');
      const urgency = this.extractValue(content, 'URGENCY');
      const estimatedCost = this.extractValue(content, 'ESTIMATED COST');
      const canDrive = this.extractValue(content, 'CAN I DRIVE');
      const technicalAnalysis = this.extractValue(content, 'TECHNICAL ANALYSIS');
      const whatToDo = this.extractValue(content, 'WHAT TO DO');
      const prevention = this.extractValue(content, 'PREVENTION');

      // Extract detailed recommendations from both sections
      const detailedRecommendations = this.extractDetailedRecommendations(whatToDo, prevention);

      console.log('=== PARSING DEBUG ===');
      console.log('Title:', title);
      console.log('Urgency:', urgency);
      console.log('Cost:', estimatedCost);
      console.log('What To Do length:', whatToDo?.length || 0);
      console.log('What To Do content preview:', whatToDo?.substring(0, 200) || 'NONE');
      console.log('Prevention length:', prevention?.length || 0);
      console.log('Prevention content preview:', prevention?.substring(0, 100) || 'NONE');
      console.log('Detailed recommendations count:', detailedRecommendations.length);
      console.log('First recommendation:', detailedRecommendations[0] || 'NONE');

      return {
        title: title || this.generateTitle(issue),
        diagnosis: technicalAnalysis || issueSummary || 'Professional diagnosis completed.',
        possibleCauses: this.parseWhatToDo(whatToDo),
        recommendations: detailedRecommendations.length > 0 ? detailedRecommendations : ['Follow up with professional mechanic if needed.'],
        possibleCausesSummary: issueSummary || 'Multiple factors may contribute to this issue.',
        recommendationsSummary: detailedRecommendations.length > 0
          ? detailedRecommendations.join(' ')
          : this.generateRecommendationsSummary(detailedRecommendations),
        estimatedCost: estimatedCost || '$100 - $500',
        difficulty: 'MODERATE',
        urgencyLevel: this.mapUrgency(urgency),
        drivingSafety: canDrive || 'Assessment needed',

        // Store full sections for display
        fullDiagnosis: content,
        issueSummary,
        technicalAnalysis,
        whatToDo,
        prevention,

        // Additional debugging info
        rawWhatToDo: whatToDo,
        rawPrevention: prevention
      };
    } catch (error) {
      console.error('Error parsing simple response:', error);
      return this.createFallbackResponse(content, vehicle, issue);
    }
  }

  private extractValue(content: string, section: string): string {
    // For multi-line sections, capture everything until next section or end
    if (section === 'WHAT TO DO' || section === 'TECHNICAL ANALYSIS' || section === 'PREVENTION') {
      const regex = new RegExp(`\\*\\*${section}:\\*\\*\\s*([\\s\\S]*?)(?=\\*\\*[A-Z][^:]*:\\*\\*|$)`, 'i');
      const match = content.match(regex);
      return match ? match[1].trim() : '';
    }

    // For single-line sections
    const regex = new RegExp(`\\*\\*${section}:\\*\\*\\s*([^\\n*]+)`, 'i');
    const match = content.match(regex);
    return match ? match[1].trim() : '';
  }

  private extractDetailedRecommendations(whatToDo: string, prevention: string): string[] {
    const recommendations: string[] = [];

    console.log('=== EXTRACTING RECOMMENDATIONS ===');
    console.log('WhatToDo section:', whatToDo ? 'exists' : 'missing');
    console.log('Prevention section:', prevention ? 'exists' : 'missing');

    // ONLY use WHAT TO DO section for recommendations - don't use prevention as fallback
    if (whatToDo && whatToDo.trim().length > 50) {
      const steps = this.parseStepsFromText(whatToDo);
      console.log('Steps parsed from WHAT TO DO:', steps.length);
      if (steps.length > 0) {
        recommendations.push(...steps);
        console.log('Using WHAT TO DO recommendations');
        return recommendations.slice(0, 10);
      }
    }

    // If WHAT TO DO is missing or insufficient, use comprehensive fallback
    console.log('WHAT TO DO insufficient, using comprehensive fallback');
    return this.generateComprehensiveRecommendations();
  }

  private parseStepsFromText(text: string): string[] {
    const steps: string[] = [];

    console.log('=== PARSING STEPS ===');
    console.log('Input text preview:', text.substring(0, 300));

    // First try: Split by numbered items and collect full content
    const numberedSections = text.split(/(?=\d+\.\s)/);
    console.log('Found numbered sections:', numberedSections.length);

    for (const section of numberedSections) {
      if (section.trim().length === 0) continue;

      // Clean the section but keep all detailed content including tools and expected outcomes
      let cleaned = section
        .replace(/^\d+\.\s*/, '') // Remove "1. "
        .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove **bold** formatting
        .replace(/\*([^*]+)\*/g, '$1') // Remove *italic* formatting
        .trim();

      if (cleaned && cleaned.length > 20) {
        steps.push(cleaned);
        console.log(`Added step ${steps.length}: ${cleaned.substring(0, 100)}...`);
      }
    }

    // Second try: If numbered sections didn't work well, try line-by-line
    if (steps.length < 3) {
      console.log('Trying line-by-line parsing...');
      steps.length = 0; // Clear previous attempts
      const lines = text.split('\n');
      let currentStep = '';

      for (const line of lines) {
        const trimmed = line.trim();

        // Check if this is a new numbered item
        if (trimmed.match(/^\d+\./)) {
          // Save previous step if exists
          if (currentStep && currentStep.trim().length > 20) {
            const cleaned = currentStep
              .replace(/^\d+\.\s*/, '')
              .replace(/\*\*([^*]+)\*\*/g, '$1')
              .replace(/\*([^*]+)\*/g, '$1')
              .trim();
            steps.push(cleaned);
            console.log(`Added line-parsed step ${steps.length}: ${cleaned.substring(0, 100)}...`);
          }
          currentStep = trimmed;
        } else if (trimmed.length > 0 && currentStep) {
          // Continue building current step
          currentStep += ' ' + trimmed;
        }
      }

      // Don't forget the last step
      if (currentStep && currentStep.trim().length > 20) {
        const cleaned = currentStep
          .replace(/^\d+\.\s*/, '')
          .replace(/\*\*([^*]+)\*\*/g, '$1')
          .replace(/\*([^*]+)\*/g, '$1')
          .trim();
        steps.push(cleaned);
        console.log(`Added final step ${steps.length}: ${cleaned.substring(0, 100)}...`);
      }
    }

    console.log('Total steps parsed:', steps.length);
    return steps.slice(0, 10);
  }

  private generateComprehensiveRecommendations(): string[] {
    return [
      'Inspect the brake pads: Use a brake pad gauge to measure the thickness of the brake pads. Compare measurements to manufacturer specifications to determine if brake pads are worn out. Tools needed: Brake pad gauge, calipers. Expected outcome: Determine if brake pads need replacement.',
      'Inspect the brake rotors: Use a brake rotor gauge to measure rotor thickness and check for warping or excessive wear. Tools needed: Brake rotor gauge, calipers, dial indicator. Expected outcome: Determine if rotors need resurfacing or replacement.',
      'Inspect the brake hardware: Check brake calipers, brake hoses, and brake lines for signs of wear, damage, or leakage. Tools needed: Visual inspection, flashlight, brake fluid tester. Expected outcome: Identify any loose or damaged brake hardware.',
      'Perform a brake system test: Test brake pedal feel, stopping distance, and overall brake system performance. Tools needed: Brake test equipment, test drive route. Expected outcome: Verify proper brake system operation.',
      'Replace worn brake components: Replace brake pads, rotors, or hardware as identified during inspection. Tools needed: Basic hand tools, brake tools, torque wrench. Expected outcome: Restore brake system to proper operating condition.',
      'Bleed the brake system: Remove air from brake lines and replace old brake fluid with fresh fluid. Tools needed: Brake bleeder kit, DOT 3/4 brake fluid, wrenches. Expected outcome: Ensure proper brake pedal feel and system operation.',
      'Test brake system after repairs: Perform comprehensive brake test including pedal feel and stopping performance. Tools needed: Test drive area, brake test equipment. Expected outcome: Verify all repairs completed successfully.',
      'Document all work performed: Record all parts replaced, procedures performed, and test results for future reference. Tools needed: Service documentation system, camera for before/after photos. Expected outcome: Complete service record for customer and future reference.',
      'Provide customer education: Explain proper brake maintenance, warning signs to watch for, and recommended service intervals. Tools needed: Educational materials, maintenance schedule. Expected outcome: Informed customer who understands brake system care.',
      'Schedule follow-up inspection: Set up next brake system inspection based on driving conditions and manufacturer recommendations. Tools needed: Appointment scheduling system. Expected outcome: Preventive maintenance scheduled to avoid future brake issues.'
    ];
  }

  private parseWhatToDo(whatToDo: string): string[] {
    if (!whatToDo) return [];

    const lines = whatToDo.split('\n').filter(line => line.trim());
    const steps = [];

    for (const line of lines) {
      const cleaned = line.replace(/^\d+\.\s*/, '').replace(/^[-•]\s*/, '').trim();
      if (cleaned && cleaned.length > 10) {
        steps.push(cleaned);
      }
    }

    return steps.slice(0, 5);
  }

  private mapUrgency(urgency: string): string {
    const upper = urgency?.toUpperCase() || '';
    if (upper.includes('CRITICAL')) return 'CRITICAL';
    if (upper.includes('HIGH')) return 'HIGH';
    if (upper.includes('MEDIUM')) return 'MEDIUM';
    if (upper.includes('LOW')) return 'LOW';
    return 'MEDIUM';
  }

  private createFallbackResponse(content: string, vehicle: any, issue: string): any {
    return {
      title: this.generateTitle(issue),
      diagnosis: content.length > 50 ? content.substring(0, 400) : 'Professional diagnosis completed. Please consult with a qualified mechanic for detailed analysis.',
      possibleCauses: [
        'Component wear due to vehicle age and mileage',
        'Maintenance intervals may be overdue',
        'Normal operational wear patterns',
        'Environmental factors affecting performance',
        'Electrical or sensor degradation over time'
      ],
      recommendations: [
        'Have vehicle inspected by qualified technician',
        'Perform complete diagnostic scan',
        'Address issue promptly to prevent damage',
        'Follow manufacturer service intervals',
        'Monitor symptoms and document changes'
      ],
      possibleCausesSummary: 'Multiple factors may contribute to this issue, requiring systematic diagnosis to identify the root cause.',
      recommendationsSummary: 'Professional diagnostic evaluation is recommended to determine the best course of action.',
      estimatedCost: '$100 - $500',
      difficulty: 'MODERATE',
      urgencyLevel: 'MEDIUM',
      drivingSafety: 'Assessment needed',

      // Store full sections for display
      fullDiagnosis: content,
      issueSummary: 'Issue requires professional evaluation',
      technicalAnalysis: content.length > 50 ? content.substring(0, 400) : 'Professional analysis indicates vehicle issue requires attention.',
      whatToDo: 'Consult with qualified automotive technician',
      prevention: 'Follow regular maintenance schedule'
    };
  }

  private parseStructuredTextResponse(content: string, vehicle: any, issue: string, images?: string[], video?: string): any {
    let technicianDiagnosis = '';
    let userFacingFlow = '';

    console.log('=== PARSING AI RESPONSE ===');
    console.log('Raw content preview:', content.substring(0, 300));

    // Clean the entire content first but preserve section structure for extraction
    let workingContent = content.trim();

    // The new format has SECTION 1: USER-FACING first, SECTION 2: TECHNICIAN second
    // Extract SECTION 1: USER-FACING DIAGNOSTIC FLOW
    const section1Match = workingContent.match(/SECTION 1:\s*USER[- ]FACING[^═]*?([\s\S]*?)(?=SECTION 2:|$)/i);
    if (section1Match) {
      userFacingFlow = section1Match[1]
        .replace(/[═─]{20,}/g, '') // Remove dividers
        .trim();
      console.log('Found USER-FACING section, length:', userFacingFlow.length);
    }

    // Extract SECTION 2: TECHNICIAN DIAGNOSIS (INTERNAL LOGIC)
    const section2Match = workingContent.match(/SECTION 2:\s*TECHNICIAN[^═]*?([\s\S]*?)$/i);
    if (section2Match) {
      technicianDiagnosis = section2Match[1]
        .replace(/[═─]{20,}/g, '') // Remove dividers
        .replace(/\(INTERNAL\s+LOGIC\)/gi, '') // Remove (INTERNAL LOGIC)
        .trim();
      console.log('Found TECHNICIAN section, length:', technicianDiagnosis.length);
    }

    // Fallback if parsing fails
    if (!userFacingFlow || userFacingFlow.length < 100) {
      console.log('!!! User-facing section parsing failed, using fallback !!!');
      const firstHalf = workingContent.substring(0, Math.floor(workingContent.length / 2));
      userFacingFlow = firstHalf;
    }

    if (!technicianDiagnosis || technicianDiagnosis.length < 100) {
      console.log('!!! Technician section parsing failed, using fallback !!!');
      const secondHalf = workingContent.substring(Math.floor(workingContent.length / 2));
      technicianDiagnosis = secondHalf;
    }

    console.log('Final technician diagnosis length:', technicianDiagnosis.length);
    console.log('Final user-facing flow length:', userFacingFlow.length);

    // Extract structured data from the user-facing flow
    const possibleCauses = this.extractListItems(userFacingFlow, "WHAT'S LIKELY WRONG", 5);
    const diagnosticSteps = this.extractDiagnosticSteps(userFacingFlow);
    const repairProcedures = this.extractRepairInstructions(userFacingFlow);
    const drivingSafety = this.extractDrivingSafety(userFacingFlow);
    const costSummary = this.extractCostSummary(userFacingFlow);
    const preventionTips = this.extractListItems(userFacingFlow, "PREVENTION TIPS", 5);

    // Extract additional structured data
    const symptomCorrelation = this.extractSymptomCorrelation(technicianDiagnosis);
    const systemInteraction = this.extractSystemInteraction(technicianDiagnosis);
    const failureProgression = this.extractFailureProgression(technicianDiagnosis);
    const rootCauseProbability = this.extractRootCauseProbability(technicianDiagnosis);
    const safetyRisks = this.extractSafetyRisks(technicianDiagnosis);
    const secondaryDamage = this.extractSecondaryDamage(technicianDiagnosis);

    // Create formatted diagnosis text for UI display
    const formattedDiagnosis = this.formatDiagnosisForUI({
      technicianDiagnosis,
      symptomCorrelation,
      systemInteraction,
      failureProgression,
      rootCauseProbability,
      safetyRisks,
      secondaryDamage,
      userFacingFlow
    });

    // Extract and format possible causes and recommendations
    const finalPossibleCauses = possibleCauses.length > 0 ? possibleCauses : [
      'Component wear due to vehicle age and mileage',
      'Maintenance intervals may be overdue',
      'Normal operational wear patterns',
      'Environmental factors affecting performance',
      'Electrical or sensor degradation over time'
    ];

    const finalRecommendations = this.extractListItems(userFacingFlow, "PREVENTION TIPS", 5).length > 0
      ? this.extractListItems(userFacingFlow, "PREVENTION TIPS", 5)
      : [
        'Have vehicle inspected by qualified technician',
        'Perform complete diagnostic scan',
        'Address issue promptly to prevent damage',
        'Follow manufacturer service intervals',
        'Monitor symptoms and document changes'
      ];

    // Create response in expected format
    return {
      title: this.extractTitleFromResponse(content) || this.generateTitle(issue),
      diagnosis: formattedDiagnosis,
      possibleCauses: finalPossibleCauses,
      recommendations: finalRecommendations,
      // Add summaries for UI display
      possibleCausesSummary: this.generatePossibleCausesSummary(finalPossibleCauses),
      recommendationsSummary: this.generateRecommendationsSummary(finalRecommendations),
      diagnosticSteps: diagnosticSteps.length > 0 ? diagnosticSteps : [
        'Perform visual inspection of affected components',
        'Connect diagnostic scanner to retrieve codes',
        'Test component functionality and electrical connections',
        'Check service history and maintenance records',
        'Verify repair with test drive and monitoring'
      ],
      repairProcedure: repairProcedures.length > 0 ? repairProcedures : [
        'Complete diagnostic testing to identify root cause',
        'Source OEM or quality aftermarket replacement parts',
        'Follow manufacturer service procedures',
        'Replace faulty components with proper tools',
        'Clear codes and verify repair effectiveness'
      ],
      estimatedCost: costSummary || '$100 - $500 (varies by complexity)',
      difficulty: this.extractDifficulty(userFacingFlow),
      urgencyLevel: this.extractUrgency(drivingSafety),

      // Store full text sections for potential UI display
      fullDiagnosis: content,
      technicianAnalysis: technicianDiagnosis,
      userGuide: userFacingFlow
    };
  }

  private extractListItems(text: string, sectionHeader: string, maxItems: number): string[] {
    const regex = new RegExp(`${sectionHeader}[\\s\\S]*?(?=\\n\\d+\\.|\\n[A-Z][A-Z][A-Z]|$)`, 'i');
    const match = text.match(regex);

    if (!match) return [];

    const sectionText = match[0];
    const bulletPoints = sectionText.match(/[-•*]\s*([^\n]+)/g);

    if (bulletPoints) {
      return bulletPoints
        .map(item => item.replace(/^[-•*]\s*/, '').trim())
        .filter(item => item.length > 10)
        .slice(0, maxItems);
    }

    return [];
  }

  private extractDiagnosticSteps(text: string): string[] {
    const stepsMatch = text.match(/STEP-BY-STEP DIAGNOSIS[\s\S]*?(?=DECISION POINT|REPAIR INSTRUCTIONS|$)/i);
    if (!stepsMatch) return [];

    const stepsText = stepsMatch[0];
    const steps = [];

    // Look for step titles or numbered instructions
    const stepMatches = stepsText.match(/(?:Step \d+:|^\d+\.)\s*([^\n]+)/gm);
    if (stepMatches) {
      return stepMatches
        .map(step => step.replace(/^(?:Step \d+:|\d+\.)\s*/, '').trim())
        .filter(step => step.length > 10)
        .slice(0, 5);
    }

    return [];
  }

  private extractRepairInstructions(text: string): string[] {
    const repairMatch = text.match(/REPAIR INSTRUCTIONS[\s\S]*?(?=TIME & COST|WHAT HAPPENS|$)/i);
    if (!repairMatch) return [];

    const repairText = repairMatch[0];
    const instructions = [];

    // Look for numbered instructions
    const instructionMatches = repairText.match(/^\d+\.\s*([^\n]+)/gm);
    if (instructionMatches) {
      return instructionMatches
        .map(instruction => instruction.replace(/^\d+\.\s*/, '').trim())
        .filter(instruction => instruction.length > 10)
        .slice(0, 5);
    }

    return [];
  }

  private extractDrivingSafety(text: string): string {
    const safetyMatch = text.match(/CAN I KEEP DRIVING\?[\s\S]*?(?=\n\d+\.|$)/i);
    if (safetyMatch) {
      return safetyMatch[0].replace(/CAN I KEEP DRIVING\?/i, '').trim();
    }
    return 'Assessment needed';
  }

  private extractCostSummary(text: string): string {
    const costMatch = text.match(/TIME & COST SUMMARY[\s\S]*?(?=\n\d+\.|$)/i);
    if (costMatch) {
      const costText = costMatch[0];
      // Look for cost ranges like $100-$500, $100 - $500, $100 to $500
      const priceMatch = costText.match(/\$(\d+)[\s\-to]*\$?(\d+)/);
      if (priceMatch) {
        const min = parseInt(priceMatch[1]);
        const max = parseInt(priceMatch[2]);

        // Ensure proper min-max order
        if (min > max) {
          return `$${max} - $${min}`;
        }
        return `$${min} - $${max}`;
      }

      // Single price found
      const singlePrice = costText.match(/\$(\d+)/);
      if (singlePrice) {
        const price = parseInt(singlePrice[1]);
        const minPrice = Math.max(50, Math.floor(price * 0.8));
        const maxPrice = Math.ceil(price * 1.2);
        return `$${minPrice} - $${maxPrice}`;
      }
    }
    return '$100 - $500';
  }

  private extractDifficulty(text: string): string {
    if (text.includes('professional') || text.includes('dealership') || text.includes('expert')) return 'HARD';
    if (text.includes('basic tools') || text.includes('beginner') || text.includes('simple')) return 'EASY';
    return 'MODERATE';
  }

  private extractUrgency(drivingSafetyText: string): string {
    const lower = drivingSafetyText.toLowerCase();
    if (lower.includes('do not drive') || lower.includes('tow only') || lower.includes('immediate')) return 'CRITICAL';
    if (lower.includes('limited use') || lower.includes('soon') || lower.includes('caution')) return 'HIGH';
    if (lower.includes('ok to drive') || lower.includes('safe')) return 'LOW';
    return 'MEDIUM';
  }

  private extractTitleFromResponse(content: string): string | null {
    console.log('=== EXTRACTING TITLE ===');

    // According to the new format, the title should be at the start of SECTION 2: TECHNICIAN DIAGNOSIS
    // Look for SECTION 2 first
    const section2Match = content.match(/SECTION 2:\s*TECHNICIAN[^═]*?([\s\S]*?)$/i);

    if (section2Match) {
      let technicianSection = section2Match[1]
        .replace(/[═─]{20,}/g, '') // Remove dividers
        .replace(/\(INTERNAL\s+LOGIC\)/gi, '') // Remove (INTERNAL LOGIC)
        .trim();

      console.log('Technician section for title extraction:', technicianSection.substring(0, 200));

      // The prompt says "START with a clear diagnostic title max 60 chars maximum of 3 words"
      // So the title should be the very first line/sentence
      const lines = technicianSection.split('\n').map(line => line.trim()).filter(line => line.length > 0);

      if (lines.length > 0) {
        let firstLine = lines[0];

        // Clean up any remaining formatting
        firstLine = firstLine
          .replace(/^[•\-\*\d\.]+\s*/, '') // Remove bullet points, numbers
          .replace(/^\s*[^\w]*\s*/, '') // Remove leading punctuation
          .trim();

        // Check if it looks like a title (short, automotive-related)
        if (firstLine.length > 5 && firstLine.length <= 60) {
          const words = firstLine.split(/\s+/);

          // If it's 3 words or less and contains automotive terms, use it
          if (words.length <= 3) {
            console.log('Found title (3 words or less):', firstLine);
            return firstLine;
          }

          // If it's longer but still reasonable and looks like a diagnostic title
          const diagnosticWords = ['malfunction', 'failure', 'problem', 'issue', 'fault', 'defect', 'wear', 'leak', 'code', 'system', 'engine', 'brake', 'transmission'];
          const hasAutomotiveContent = diagnosticWords.some(word => firstLine.toLowerCase().includes(word));

          if (hasAutomotiveContent && firstLine.length <= 60) {
            console.log('Found automotive title:', firstLine);
            return firstLine;
          }
        }
      }

      // Fallback: look for first sentence with automotive content
      const sentences = technicianSection.split(/[.!?]/).map(s => s.trim()).filter(s => s.length > 0);

      for (const sentence of sentences) {
        if (sentence.length > 10 && sentence.length <= 60) {
          const diagnosticWords = ['malfunction', 'failure', 'problem', 'issue', 'fault', 'defect', 'wear', 'leak', 'code', 'system', 'engine', 'brake', 'transmission'];
          const hasAutomotiveContent = diagnosticWords.some(word => sentence.toLowerCase().includes(word));

          if (hasAutomotiveContent) {
            const cleanTitle = sentence
              .replace(/^[•\-\*\d\.]+\s*/, '') // Remove bullet points
              .replace(/^(the|this|a|an)\s+/i, '') // Remove articles
              .trim();

            if (cleanTitle.length > 5) {
              console.log('Found fallback title:', cleanTitle);
              return cleanTitle;
            }
          }
        }
      }
    }

    console.log('No title found, returning null');
    return null;
  }

  private extractSymptomCorrelation(text: string): string {
    const correlationMatch = text.match(/correlat[^.]*symptoms?[^.]*\./i);
    if (correlationMatch) {
      return correlationMatch[0].trim();
    }
    return "Symptoms correlate with common failure patterns for this vehicle age and component usage.";
  }

  private extractSystemInteraction(text: string): string {
    const interactionMatch = text.match(/system[^.]*interact[^.]*\.|interact[^.]*system[^.]*\./i);
    if (interactionMatch) {
      return interactionMatch[0].trim();
    }
    return "Multiple vehicle systems may be affected by this issue.";
  }

  private extractFailureProgression(text: string): string {
    const progressionMatch = text.match(/progress[^.]*fail[^.]*\.|fail[^.]*progress[^.]*\.|over time[^.]*\./i);
    if (progressionMatch) {
      return progressionMatch[0].trim();
    }
    return "Issue typically develops gradually over time with increasing severity.";
  }

  private extractRootCauseProbability(text: string): string {
    const probabilityMatch = text.match(/\d+%[^.]*probability|probability[^.]*\d+%|confidence[^.]*\d+%/i);
    if (probabilityMatch) {
      return probabilityMatch[0].trim();
    }
    return "High confidence diagnosis based on symptoms and vehicle characteristics.";
  }

  private extractSafetyRisks(text: string): string {
    const safetyMatch = text.match(/safety[^.]*risk[^.]*\.|risk[^.]*safety[^.]*\.|hazard[^.]*\./i);
    if (safetyMatch) {
      return safetyMatch[0].trim();
    }
    return "Consider safety implications before continuing to drive.";
  }

  private extractSecondaryDamage(text: string): string {
    const damageMatch = text.match(/secondary[^.]*damage[^.]*\.|additional[^.]*damage[^.]*\.|further[^.]*damage[^.]*\./i);
    if (damageMatch) {
      return damageMatch[0].trim();
    }
    return "Delayed repair may cause additional component damage and increased costs.";
  }

  private formatDiagnosisForUI(data: any): string {
    // Clean the technician diagnosis of any remaining section headers
    const cleanedDiagnosis = (data.technicianDiagnosis || 'Professional analysis indicates vehicle issue requires attention.')
      .replace(/\*\*SECTION\s+\d+:\s*[^*]*\*\*/gi, '')
      .replace(/SECTION\s+\d+:\s*[^\n]*/gi, '')
      .replace(/\(INTERNAL\s+LOGIC\)/gi, '')
      .replace(/[═─]{20,}/g, '')
      .replace(/^\s*[\n\r]+/, '')
      .trim();

    const sections = [
      `**Description:**`,
      cleanedDiagnosis,
      '',
      `**Symptom Correlation:**`,
      data.symptomCorrelation,
      '',
      `**System Interaction:**`,
      data.systemInteraction,
      '',
      `**Failure Progression:**`,
      data.failureProgression,
      '',
      `**Root Cause Probability:**`,
      data.rootCauseProbability,
      '',
      `**Safety Risk:**`,
      data.safetyRisks,
      '',
      `**Secondary Damage:**`,
      data.secondaryDamage
    ];

    return sections.join('\n');
  }

  private generatePossibleCausesSummary(causes: string[]): string {
    if (causes.length === 0) {
      return "Multiple factors may contribute to this vehicle issue, requiring systematic diagnosis to identify the root cause.";
    }

    // Analyze the causes to create an intelligent summary
    const causeText = causes.join(' ').toLowerCase();

    if (causeText.includes('wear') && causeText.includes('age')) {
      return "This issue is commonly related to normal vehicle aging and component wear patterns. Higher mileage vehicles are particularly susceptible to these types of problems.";
    }

    if (causeText.includes('maintenance') && causeText.includes('service')) {
      return "The primary causes appear to be maintenance-related, often preventable with proper service intervals and quality parts replacement.";
    }

    if (causeText.includes('electrical') || causeText.includes('sensor')) {
      return "Electrical system components and sensors are the likely culprits, which can be affected by age, corrosion, or wiring issues.";
    }

    if (causeText.includes('engine') || causeText.includes('performance')) {
      return "Engine performance issues typically stem from fuel, air, or ignition system problems that develop over time.";
    }

    if (causeText.includes('brake') || causeText.includes('safety')) {
      return "Safety-critical brake system components require immediate attention to prevent potential accidents or further damage.";
    }

    // Generic summary based on number of causes
    if (causes.length <= 2) {
      return "The diagnostic analysis points to a focused set of likely causes that can be systematically tested and resolved.";
    } else {
      return "Multiple interconnected factors may contribute to this issue, requiring comprehensive diagnostic testing to pinpoint the exact root cause.";
    }
  }

  private generateRecommendationsSummary(recommendations: string[]): string {
    if (recommendations.length === 0) {
      return "Professional diagnostic evaluation is recommended to determine the best course of action for resolving this vehicle issue.";
    }

    // Analyze recommendations to create intelligent summary
    const recText = recommendations.join(' ').toLowerCase();

    if (recText.includes('immediate') || recText.includes('urgent') || recText.includes('critical')) {
      return "Immediate action is required for safety. Professional diagnosis and repair should be prioritized to prevent potential hazards or costly damage.";
    }

    if (recText.includes('inspect') && recText.includes('diagnostic')) {
      return "A systematic approach combining visual inspection and diagnostic scanning will provide the most efficient path to identifying and resolving the issue.";
    }

    if (recText.includes('maintenance') && recText.includes('service')) {
      return "Preventive maintenance and adherence to service schedules are key to avoiding similar issues in the future and maintaining vehicle reliability.";
    }

    if (recText.includes('professional') || recText.includes('technician')) {
      return "Professional expertise is recommended due to the complexity of this issue. Qualified technicians have the tools and knowledge for accurate diagnosis.";
    }

    if (recText.includes('monitor') && recText.includes('document')) {
      return "Ongoing monitoring and documentation of symptoms will help track the issue's progression and validate the effectiveness of repairs.";
    }

    // Generic summary based on urgency and complexity
    if (recommendations.length >= 4) {
      return "A comprehensive approach involving professional diagnosis, quality repairs, and preventive maintenance will ensure long-term resolution of this issue.";
    } else {
      return "Following these focused recommendations will help resolve the issue efficiently while preventing similar problems in the future.";
    }
  }

  private cleanRawResponse(content: string): string {
    // Remove JSON-like labels and structure from raw text
    return content
      .replace(/^.*?"title":\s*"[^"]*",?/gi, '') // Remove title field
      .replace(/^.*?"description":\s*"[^"]*",?/gi, '') // Remove description field
      .replace(/^.*?"diagnosis":\s*"/gi, '') // Remove diagnosis field label
      .replace(/",?\s*"possibleCauses":/gi, '') // Remove possible causes label
      .replace(/\{[\s\S]*?"diagnosis":\s*"/gi, '') // Remove JSON opening with diagnosis
      .replace(/^[\s\S]*?diagnosis[":]*\s*/gi, '') // Remove everything before diagnosis content
      .replace(/["{}]/g, '') // Remove quotes and braces
      .replace(/^\s*[,:]?\s*/g, '') // Remove leading punctuation
      .replace(/,?\s*["']?\s*(possibleCauses|recommendations|estimatedCost).*$/gi, '') // Remove trailing JSON fields
      .trim();
  }

  private validateTitle(title: string): string | null {
    if (typeof title === 'string' && title.length > 5 && title.length <= 60) {
      return title;
    }
    return null;
  }

  private validateText(text: string, minLength: number, maxLength: number): string | null {
    if (typeof text === 'string' && text.length >= minLength && text.length <= maxLength) {
      return text;
    }
    // If text is longer than maxLength but still reasonable, return it anyway (don't truncate good content)
    if (typeof text === 'string' && text.length >= minLength && text.length <= maxLength * 2) {
      return text;
    }
    return null;
  }

  private validateArray(arr: any, minLength: number, maxLength: number): string[] | null {
    if (Array.isArray(arr) && arr.length >= minLength) {
      // Filter valid strings with very minimal length requirement - keep all meaningful strings
      const validItems = arr.filter(item =>
        typeof item === 'string' &&
        item.trim().length > 0 &&
        item.trim().length < 500 // Reasonable max length
      ).slice(0, maxLength);

      console.log(`validateArray DEBUG - Input array length: ${arr.length}, Valid items after filter: ${validItems.length}`);
      console.log('Sample items:', validItems.slice(0, 2));

      return validItems.length > 0 ? validItems : null;
    }
    console.log(`validateArray DEBUG - Array validation failed. IsArray: ${Array.isArray(arr)}, Length: ${arr?.length}, MinLength: ${minLength}`);
    return null;
  }

  private validateCost(cost: string): string | null {
    if (typeof cost === 'string' && cost.includes('$')) {
      return cost;
    }
    return null;
  }

  private generateTitle(issue: string): string {
    const issue_lower = issue.toLowerCase();

    // More specific and descriptive patterns
    const patterns = {
      'Engine Misfire Diagnosis': ['misfire', 'cylinder misfire', 'rough running'],
      'Engine Performance Issue': ['engine', 'motor', 'rough idle', 'stalling', 'power loss', 'acceleration'],
      'Brake System Malfunction': ['brake', 'braking', 'squeal', 'grinding', 'stopping', 'brake pedal'],
      'Transmission Problem': ['transmission', 'gear', 'shifting', 'clutch', 'automatic', 'manual'],
      'Electrical System Fault': ['battery', 'electrical', 'alternator', 'starter', 'lights', 'charging', 'dead battery'],
      'Engine Overheating Issue': ['overheat', 'overheating', 'hot', 'temperature', 'coolant leak'],
      'Cooling System Problem': ['coolant', 'radiator', 'cooling', 'thermostat'],
      'Suspension Component Wear': ['suspension', 'shock', 'strut', 'bounce', 'handling', 'steering play'],
      'Fuel System Diagnosis': ['fuel', 'gas', 'mpg', 'consumption', 'fuel pump', 'injector'],
      'Exhaust System Issue': ['exhaust', 'muffler', 'emission', 'smoke', 'catalyst', 'catalytic'],
      'Starting System Problem': ['starting', 'start', 'crank', 'turn over'],
      'Oil System Leak': ['oil leak', 'oil', 'leak', 'dripping'],
      'Air Conditioning Malfunction': ['ac', 'air conditioning', 'cooling', 'hot air', 'compressor'],
      'Steering System Issue': ['steering', 'wheel', 'turn', 'alignment'],
      'Tire and Wheel Problem': ['tire', 'wheel', 'vibration', 'wobble', 'balance']
    };

    // Find the most specific match
    for (const [title, keywords] of Object.entries(patterns)) {
      if (keywords.some(keyword => issue_lower.includes(keyword))) {
        return title;
      }
    }

    // Generic fallback with more professional language
    if (issue_lower.includes('noise')) return 'Unusual Vehicle Noise Diagnosis';
    if (issue_lower.includes('vibration')) return 'Vehicle Vibration Analysis';
    if (issue_lower.includes('warning')) return 'Dashboard Warning Light Diagnosis';
    if (issue_lower.includes('light')) return 'Warning Light Investigation';

    return 'Vehicle Diagnostic Assessment';
  }

  private validateDifficulty(difficulty: string): string {
    const valid = ['EASY', 'MODERATE', 'HARD'];
    const upper = difficulty?.toString().toUpperCase();
    return valid.includes(upper) ? upper : 'MODERATE';
  }

  private validateUrgency(urgency: string): string {
    const valid = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const upper = urgency?.toString().toUpperCase();
    return valid.includes(upper) ? upper : 'MEDIUM';
  }

  private extractCauses(text: string): string[] {
    const causes = [];
    const lines = text.split('\n');

    for (const line of lines) {
      const cleaned = line.replace(/[•\-\d\.\*\[\]]/g, '').trim();
      if ((line.includes('cause') || line.includes('reason') || line.includes('•') || line.includes('-') || line.includes('1.')) &&
          cleaned.length > 15 && cleaned.length < 100 && !cleaned.includes('JSON')) {
        causes.push(cleaned);
      }
    }

    // Always ensure we have at least 5 causes
    const fallbackCauses: string[] = [
      'Component wear or failure due to age and mileage',
      'Maintenance overdue or incomplete service history',
      'Environmental factors affecting vehicle performance',
      'Normal operational wear and aging of parts',
      'Electrical connections or wiring deterioration'
    ];

    if (causes.length === 0) {
      return fallbackCauses;
    }

    // Fill up to 5 causes
    while (causes.length < 5 && causes.length < fallbackCauses.length) {
      const fallback = fallbackCauses[causes.length];
      if (!causes.includes(fallback)) {
        causes.push(fallback);
      }
    }

    return causes.slice(0, 5);
  }

  private extractRecommendations(text: string): string[] {
    const recommendations = [];
    const lines = text.split('\n');

    for (const line of lines) {
      const cleaned = line.replace(/[•\-\d\.\*\[\]]/g, '').trim();
      if ((line.includes('recommend') || line.includes('should') || line.includes('suggest') ||
           line.includes('•') || line.includes('-') || line.includes('1.')) &&
          cleaned.length > 15 && cleaned.length < 120 && !cleaned.includes('JSON')) {
        recommendations.push(cleaned);
      }
    }

    // Always ensure we have at least 5 recommendations
    const fallbackRecommendations: string[] = [
      'Have the vehicle inspected by a qualified automotive technician',
      'Perform a comprehensive diagnostic scan to identify error codes',
      'Check service history and ensure maintenance is up to date',
      'Address the issue promptly to prevent additional damage or costs',
      'Follow manufacturer recommended service intervals going forward'
    ];

    if (recommendations.length === 0) {
      return fallbackRecommendations;
    }

    // Fill up to 5 recommendations
    while (recommendations.length < 5 && recommendations.length < fallbackRecommendations.length) {
      const fallback = fallbackRecommendations[recommendations.length];
      if (!recommendations.includes(fallback)) {
        recommendations.push(fallback);
      }
    }

    return recommendations.slice(0, 5);
  }

  private extractCost(text: string): string {
    const costMatches = text.match(/\$(\d+)[\s\-to]*\$?(\d*)/gi);
    if (costMatches && costMatches.length > 0) {
      const costStr = costMatches[0];

      // Extract numbers from the cost string
      const numbers = costStr.match(/\d+/g);
      if (numbers && numbers.length >= 2) {
        const num1 = parseInt(numbers[0]);
        const num2 = parseInt(numbers[1]);

        // Ensure min-to-max order
        const minCost = Math.min(num1, num2);
        const maxCost = Math.max(num1, num2);

        return `$${minCost} - $${maxCost}`;
      } else if (numbers && numbers.length === 1) {
        const cost = parseInt(numbers[0]);
        // Generate a reasonable range
        const minCost = Math.max(50, Math.floor(cost * 0.7));
        const maxCost = Math.ceil(cost * 1.3);
        return `$${minCost} - $${maxCost}`;
      }
    }
    return '$50 - $500 (varies by complexity)';
  }


  private validateASEResponse(parsed: any, vehicle: any, issue: string, content: string, images?: string[], video?: string): any {
    // Validate the comprehensive ASE response structure
    return {
      vehicleContext: {
        year: vehicle.year?.toString() || 'Unknown',
        make: vehicle.make || 'Unknown',
        model: vehicle.model || 'Unknown',
        mileage: vehicle.odometer ? `${Math.round(vehicle.odometer * 0.621371)} miles` : 'Unknown',
        engine: vehicle.engine || 'Unknown',
        codes: this.parseOBDCodes(parsed.vehicleContext?.codes || []),
        symptoms: this.parseSymptoms(parsed.vehicleContext?.symptoms || [issue]),
        serviceHistory: this.formatServiceHistory(parsed.vehicleContext?.serviceHistory),
        visualEvidence: this.parseVisualEvidence(parsed.vehicleContext?.visualEvidence, images, video)
      },
      diagnosis: {
        title: this.validateTitle(parsed.diagnosis?.title) || this.generateTitle(issue),
        detailedAnalysis: this.validateText(parsed.diagnosis?.detailedAnalysis, 200, 500) || content.substring(0, 400),
        affectedSystems: this.validateArray(parsed.diagnosis?.affectedSystems, 1, 5) || ['Engine Management'],
        possibleCauses: this.validateArray(parsed.diagnosis?.possibleCauses, 1, 5) || this.extractCauses(content) || [
          'Component wear or failure due to age/mileage',
          'Maintenance overdue or incomplete service',
          'Environmental factors affecting performance',
          'Normal operational wear patterns',
          'Electrical or connection issues'
        ],
        recommendations: this.validateArray(parsed.diagnosis?.recommendations, 1, 5) || this.extractRecommendations(content) || [
          'Have vehicle inspected by qualified technician',
          'Perform complete diagnostic scan',
          'Check maintenance history and service records',
          'Address issue promptly to prevent further damage',
          'Follow manufacturer service recommendations'
        ]
      },
      actionPlan: {
        diagnosticSteps: this.validateArray(parsed.actionPlan?.diagnosticSteps, 1, 5) || ['Perform visual inspection', 'Check diagnostic codes'],
        repairProcedure: this.validateArray(parsed.actionPlan?.repairProcedure, 1, 5) || ['Diagnose issue', 'Replace components as needed'],
        partsRequired: this.validateParts(parsed.actionPlan?.partsRequired) || [],
        timeEstimates: {
          diagnosticTime: parsed.actionPlan?.timeEstimates?.diagnosticTime || '1-2 hours',
          repairTime: parsed.actionPlan?.timeEstimates?.repairTime || '2-4 hours',
          totalShopTime: parsed.actionPlan?.timeEstimates?.totalShopTime || '3-6 hours'
        }
      },
      costAnalysis: {
        breakdown: {
          parts: parsed.costAnalysis?.breakdown?.parts || '$50 - $200',
          labor: parsed.costAnalysis?.breakdown?.labor || '$100 - $400',
          diagnosticFee: parsed.costAnalysis?.breakdown?.diagnosticFee || '$100 - $150',
          shopSupplies: parsed.costAnalysis?.breakdown?.shopSupplies || '$10 - $50'
        },
        totalRange: parsed.costAnalysis?.totalRange || '$260 - $800',
        pricingNote: parsed.costAnalysis?.pricingNote || 'Prices vary by location and shop type'
      },
      riskAssessment: {
        difficulty: this.validateDifficulty(parsed.riskAssessment?.difficulty) || 'MODERATE',
        urgencyLevel: this.validateUrgency(parsed.riskAssessment?.urgencyLevel) || 'MEDIUM',
        safetyRisks: this.validateArray(parsed.riskAssessment?.safetyRisks, 0, 3) || [],
        drivability: this.validateDrivability(parsed.riskAssessment?.drivability) || 'OK_TO_DRIVE',
        damagePotential: this.validateArray(parsed.riskAssessment?.damagePotential, 0, 3) || []
      },
      additionalNotes: {
        tsbReferences: this.validateArray(parsed.additionalNotes?.tsbReferences, 0, 3) || [],
        recallCheck: parsed.additionalNotes?.recallCheck || 'No known recalls',
        commonFailures: parsed.additionalNotes?.commonFailures || 'Check manufacturer resources',
        preventiveAdvice: parsed.additionalNotes?.preventiveAdvice || 'Follow regular maintenance schedule'
      }
    };
  }

  private createASEFallbackResponse(vehicle: any, issue: string, cleanContent: string, images?: string[], video?: string): any {
    // Create a fallback ASE response when JSON parsing fails
    return {
      vehicleContext: {
        year: vehicle.year?.toString() || 'Unknown',
        make: vehicle.make || 'Unknown',
        model: vehicle.model || 'Unknown',
        mileage: vehicle.odometer ? `${Math.round(vehicle.odometer * 0.621371)} miles` : 'Unknown',
        engine: vehicle.engine || 'Unknown',
        codes: [],
        symptoms: [issue],
        serviceHistory: 'Limited information available',
        visualEvidence: this.parseVisualEvidence(null, images, video)
      },
      diagnosis: {
        title: this.generateTitle(issue),
        detailedAnalysis: cleanContent.length > 50 ? cleanContent.substring(0, 400) : 'Analysis requires additional diagnostic information.',
        affectedSystems: ['Unknown System'],
        possibleCauses: [
          'Component malfunction or failure',
          'Maintenance overdue or improper service',
          'Normal wear and tear',
          'Environmental factors or usage patterns',
          'Electrical or wiring issues'
        ],
        recommendations: [
          'Have vehicle inspected by qualified technician',
          'Perform diagnostic scan for error codes',
          'Check service history and maintenance records',
          'Address issue promptly to prevent further damage',
          'Follow manufacturer maintenance guidelines'
        ]
      },
      actionPlan: {
        diagnosticSteps: [
          'Perform visual inspection of engine bay and components',
          'Connect OBD scanner and retrieve diagnostic codes',
          'Check fluid levels and conditions',
          'Test electrical connections and wiring',
          'Consult service manual for specific procedures'
        ],
        repairProcedure: [
          'Complete diagnostic testing to identify root cause',
          'Obtain necessary parts and tools for repair',
          'Follow manufacturer repair procedures',
          'Replace or repair faulty components',
          'Test repair and clear diagnostic codes'
        ],
        partsRequired: [],
        timeEstimates: {
          diagnosticTime: '1-2 hours',
          repairTime: 'TBD after diagnosis',
          totalShopTime: '2-4 hours'
        }
      },
      costAnalysis: {
        breakdown: {
          parts: 'TBD',
          labor: '$100 - $300',
          diagnosticFee: '$100 - $150',
          shopSupplies: '$10 - $25'
        },
        totalRange: '$210 - $475',
        pricingNote: 'Final cost depends on diagnosis results'
      },
      riskAssessment: {
        difficulty: 'MODERATE',
        urgencyLevel: 'MEDIUM',
        safetyRisks: ['Unknown until diagnosed'],
        drivability: 'ASSESS_BEFORE_DRIVING',
        damagePotential: ['Potential component damage if ignored']
      },
      additionalNotes: {
        tsbReferences: [],
        recallCheck: 'Check NHTSA database',
        commonFailures: 'Research vehicle-specific issues',
        preventiveAdvice: 'Address issues promptly to prevent escalation'
      }
    };
  }

  // Helper validation methods for ASE format
  private parseOBDCodes(codes: any): string[] {
    if (Array.isArray(codes)) {
      return codes.filter(code => typeof code === 'string' && code.match(/^[BPUC]\d{4}$/)).slice(0, 5);
    }
    return [];
  }

  private parseSymptoms(symptoms: any): string[] {
    if (Array.isArray(symptoms)) {
      return symptoms.filter(symptom => typeof symptom === 'string' && symptom.length > 5).slice(0, 5);
    }
    return [];
  }

  private formatServiceHistory(history: any): string {
    if (typeof history === 'string') return history;
    return 'Service history available - see records';
  }


  private validateParts(parts: any): any[] {
    if (!Array.isArray(parts)) return [];
    return parts.filter(part =>
      part && typeof part.part === 'string'
    ).slice(0, 5);
  }

  private validateDrivability(drivability: any): string {
    const validOptions = ['OK_TO_DRIVE', 'LIMITED_USE', 'DO_NOT_DRIVE', 'TOW_ONLY', 'ASSESS_BEFORE_DRIVING'];
    return validOptions.includes(drivability) ? drivability : 'OK_TO_DRIVE';
  }

  private parseVisualEvidence(parsedEvidence: any, images?: string[], video?: string): any {
    return {
      photosProvided: images && images.length > 0,
      videoProvided: !!video,
      imageCount: images ? images.length : 0,
      videoAvailable: !!video,
      visualFindings: this.validateArray(parsedEvidence?.visualFindings, 0, 5) ||
        (images && images.length > 0 || video ? ['Visual evidence provided for analysis'] : ['No visual evidence provided'])
    };
  }

  private addUICompatibility(aseResponse: any): any {
    // Add backwards compatibility properties for the current UI
    // This allows us to use the new ASE format while keeping the UI working
    return {
      // New comprehensive ASE format
      ...aseResponse,

      // Backwards compatibility for existing UI
      title: aseResponse.diagnosis.title,
      diagnosis: aseResponse.diagnosis.detailedAnalysis,
      possibleCauses: aseResponse.diagnosis.possibleCauses || [],
      recommendations: aseResponse.diagnosis.recommendations || [],
      estimatedCost: aseResponse.costAnalysis.totalRange,
      difficulty: aseResponse.riskAssessment.difficulty,
      urgencyLevel: aseResponse.riskAssessment.urgencyLevel,

      // Add diagnostic steps and repair procedures for UI access
      diagnosticSteps: aseResponse.actionPlan.diagnosticSteps || [],
      repairProcedure: aseResponse.actionPlan.repairProcedure || [],

      // Enhanced data available for future UI updates
      ase: aseResponse
    };
  }

  private validateAndEnhanceParts(parts: any[], vehicle: any): any[] {
    return parts.slice(0, 5).map((part, index) => ({
      id: (index + 1).toString(),
      name: part.name || 'Replacement Part',
      category: part.category || 'general',
      priority: ['high', 'medium', 'low'].includes(part.priority) ? part.priority : 'medium',
      estimatedPrice: {
        min: typeof part.estimatedPrice?.min === 'number' ? part.estimatedPrice.min : 25,
        max: typeof part.estimatedPrice?.max === 'number' ? part.estimatedPrice.max : 200,
      },
      description: part.description || 'Replacement part for diagnosed issue',
      partNumber: part.partNumber || `P${Math.random().toString().substr(2, 8)}`,
      brand: part.brand || 'OEM',
      availability: 'in-stock', // Default availability
      specifications: part.specifications || [],
    }));
  }

  private generateFallbackParts(vehicle: any, diagnosis: any): any[] {
    // Generate intelligent fallback parts based on diagnosis title and content
    const diagnosisLower = (diagnosis.diagnosis || '').toLowerCase();
    const title = (diagnosis.title || '').toLowerCase();

    const parts = [];

    if (title.includes('engine') || diagnosisLower.includes('engine')) {
      parts.push({
        id: '1',
        name: 'Engine Air Filter',
        category: 'engine',
        priority: 'medium',
        estimatedPrice: { min: 15, max: 45 },
        description: 'Replacement air filter for optimal engine performance',
        partNumber: `AF${vehicle.year}`,
        brand: 'OEM',
        availability: 'in-stock',
        specifications: [],
      });
      parts.push({
        id: '2',
        name: 'Spark Plugs Set',
        category: 'engine',
        priority: 'high',
        estimatedPrice: { min: 25, max: 80 },
        description: 'Complete set of spark plugs for engine cylinders',
        partNumber: `SP${vehicle.year}`,
        brand: 'NGK',
        availability: 'in-stock',
        specifications: [],
      });
    }

    if (title.includes('brake') || diagnosisLower.includes('brake')) {
      parts.push({
        id: '3',
        name: 'Brake Pads Set',
        category: 'brake',
        priority: 'high',
        estimatedPrice: { min: 35, max: 120 },
        description: 'Front or rear brake pad replacement set',
        partNumber: `BP${vehicle.year}`,
        brand: 'Brembo',
        availability: 'in-stock',
        specifications: [],
      });
    }

    // Add generic parts if none specific found
    if (parts.length === 0) {
      parts.push({
        id: '1',
        name: 'OEM Replacement Part',
        category: 'general',
        priority: 'medium',
        estimatedPrice: { min: 50, max: 250 },
        description: 'Original equipment manufacturer replacement part',
        partNumber: `RP${vehicle.year}`,
        brand: 'OEM',
        availability: 'special-order',
        specifications: [],
      });
    }

    return parts.slice(0, 3);
  }
}

export const groqService = new GroqService();