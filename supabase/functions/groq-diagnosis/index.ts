// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

interface DiagnosisRequest {
  vehicle: {
    make: string;
    model: string;
    year: number;
    variant?: string;
    odometer?: number;
    engine?: string;
    transmission?: string;
  };
  issueDescription: string;
  logbookEntries?: any[];
  obdiiCodes?: string;
  images?: string[];
  video?: string;
}

// Supabase client will be created per request for proper auth handling

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    })
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid Authorization header')
      return new Response(
        JSON.stringify({ error: 'Unauthorized', message: 'Valid JWT token required' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Create Supabase client with the authorization header
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: {
            Authorization: authHeader,
          }
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify the user is authenticated
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      console.error('Authentication failed:', userError?.message)
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          message: userError?.message || 'Invalid JWT token'
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('User authenticated successfully:', user.id)

    // Parse request body
    const requestData: DiagnosisRequest = await req.json()
    const { vehicle, issueDescription, logbookEntries, obdiiCodes, images, video } = requestData

    console.log('Request data received:', {
      hasVehicle: !!vehicle,
      hasIssueDescription: !!issueDescription,
      vehicleMake: vehicle?.make,
      issueLength: issueDescription?.length
    })

    // Get GROQ API key and model from environment
    const groqApiKey = Deno.env.get('GROQ_API_KEY')
    if (!groqApiKey) {
      throw new Error('GROQ_API_KEY environment variable is not set')
    }

    const groqModel = Deno.env.get('GROQ_MODEL') || 'llama-3.3-70b-versatile'

    // Build diagnosis messages
    const messages = buildDiagnosisMessages(
      vehicle,
      issueDescription,
      logbookEntries || [],
      obdiiCodes,
      images,
      video
    )

    // Call GROQ API
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: groqModel,
        messages: messages,
        max_tokens: 2048,
        temperature: 0.2
      })
    })

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text()
      console.error('GROQ API error:', errorText)
      throw new Error(`GROQ API failed: ${groqResponse.status}`)
    }

    const groqData = await groqResponse.json()
    const aiResponse = groqData.choices?.[0]?.message?.content

    if (!aiResponse) {
      throw new Error('No response from AI service')
    }

    // Parse the AI response
    const parsedDiagnosis = parseAIResponse(aiResponse, issueDescription)

    console.log('Diagnosis generated successfully')

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: user.id,
          email: user.email,
        },
        diagnosis: parsedDiagnosis,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})

// Helper function to build diagnosis messages (simplified version of your logic)
function buildDiagnosisMessages(
  vehicle: any,
  issueDescription: string,
  logbookEntries: any[],
  obdiiCodes?: string,
  images?: string[],
  video?: string
) {
  const vehicleInfo = `${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.variant ? ` ${vehicle.variant}` : ''}`

  let context = `Vehicle: ${vehicleInfo}\n`
  if (vehicle.odometer) context += `Odometer: ${vehicle.odometer} km\n`
  if (vehicle.engine) context += `Engine: ${vehicle.engine}\n`
  if (vehicle.transmission) context += `Transmission: ${vehicle.transmission}\n`

  context += `\nIssue Description: ${issueDescription}\n`

  if (obdiiCodes) {
    context += `\nOBD-II Codes: ${obdiiCodes}\n`
  }

  if (logbookEntries && logbookEntries.length > 0) {
    context += `\nRecent Service History:\n`
    logbookEntries.slice(0, 5).forEach((entry, index) => {
      context += `${index + 1}. ${entry.date}: ${entry.work_done}\n`
    })
  }

  return [
    {
      role: "system",
      content: `You are an expert automotive diagnostic AI assistant. Provide detailed, comprehensive vehicle diagnosis in a structured format.

Format your response with these exact sections:

TITLE: [Brief diagnostic title based on the issue]
URGENCY: CRITICAL/HIGH/MEDIUM/LOW
ESTIMATED COST: [Cost range in USD format like $50-$200]
DIFFICULTY: EASY/MODERATE/HARD/EXPERT

DIAGNOSIS: [Start with a brief overview of the issue]

COMMON CAUSES:
List 4-6 common causes in this exact format:

**[Cause Title]**
Description: [Brief description of what this cause involves]
What's happening: [Technical explanation of the failure mode]
Quick fix: [Immediate action to resolve or test this specific cause]

**[Next Cause Title]**
Description: [Brief description]
What's happening: [Technical explanation]
Quick fix: [Immediate action]

[Continue for at least 4 causes]

STEP-BY-STEP ROUTINE:
List repair steps in this format:

**[Action Name]**
Description: [Brief action description]
Tools Needed: [List of tools and materials required]
Expected Results: [What should happen after completing this step]

**[Next Action Name]**
Description: [Brief action description]
Tools Needed: [List of tools and materials required]
Expected Results: [What should happen after completing this step]

[Continue for all repair steps]

When to replace/seek professional help:
[Specific conditions when DIY isn't sufficient]

PREVENTION:

**Regular maintenance intervals:**
- [Specific interval and action]
- [Another maintenance point]

**Warning signs to watch for:**
- [Early warning sign 1]
- [Early warning sign 2]

**Products that help prevent the issue:**
- [Product name and purpose]
- [Another helpful product]

**Best practices:**
- [Practice 1]
- [Practice 2]

PARTS NEEDED:

List the specific parts required for this repair in this format:

**[Part Name]**
Description: [Brief description of the part]
Part Number: [OEM or aftermarket part number if known]
Price Range: $[min]-$[max]
Priority: HIGH/MEDIUM/LOW
Availability: [in-stock/special-order/varies]

**[Next Part Name]**
Description: [Brief description]
Part Number: [Part number]
Price Range: $[min]-$[max]
Priority: HIGH/MEDIUM/LOW
Availability: [availability status]

[Continue for 3-5 relevant parts]

Be extremely detailed, practical, and comprehensive. Think like a master mechanic writing a complete repair manual entry.`
    },
    {
      role: "user",
      content: context
    }
  ]
}

// Helper function to parse AI response with proper section extraction
function parseAIResponse(content: string, issueDescription: string) {
  try {
    console.log('=== PARSING AI RESPONSE ===')
    console.log('Content length:', content.length)
    console.log('First 500 chars:', content.substring(0, 500))

    // Split content into sections
    const sections: any = {}
    const lines = content.split('\n')
    let currentSection = ''
    let currentContent: string[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      // Check if this is a section header
      if (line.match(/^(TITLE|URGENCY|ESTIMATED COST|DIFFICULTY|DIAGNOSIS|COMMON CAUSES|STEP-BY-STEP ROUTINE|PREVENTION|PARTS NEEDED):/)) {
        console.log('Found section header:', line)

        // Save previous section if exists
        if (currentSection && currentContent.length > 0) {
          sections[currentSection] = currentContent.join('\n').trim()
          console.log(`Saved section ${currentSection}:`, sections[currentSection].substring(0, 50) + '...')
        }

        // Extract section name and initial content
        const match = line.match(/^(TITLE|URGENCY|ESTIMATED COST|DIFFICULTY|DIAGNOSIS|COMMON CAUSES|STEP-BY-STEP ROUTINE|PREVENTION|PARTS NEEDED):\s*(.*)/)
        if (match) {
          currentSection = match[1].toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_')
          currentContent = match[2] ? [match[2]] : []
          console.log('Set current section to:', currentSection)
        }
      } else if (currentSection && line) {
        // Add content to current section
        currentContent.push(line)
      }
    }

    // Save the last section
    if (currentSection && currentContent.length > 0) {
      sections[currentSection] = currentContent.join('\n').trim()
      console.log(`Saved final section ${currentSection}:`, sections[currentSection].substring(0, 50) + '...')
    }

    console.log('Final sections found:', Object.keys(sections))
    console.log('============================')

    // Extract structured data
    const title = sections.title || issueDescription
    const urgencyLevel = sections.urgency || 'MEDIUM'
    const estimatedCost = sections.estimated_cost || 'Contact mechanic for estimate'
    const difficulty = sections.difficulty || 'MODERATE'
    const diagnosis = sections.diagnosis || 'Detailed diagnosis not available'
    const commonCauses = sections.common_causes || 'Analysis needed'
    const stepByStepRoutine = sections.step_by_step_routine || 'Consult with a qualified mechanic for diagnosis'
    const prevention = sections.prevention || 'Follow regular maintenance schedule'
    const partsNeeded = sections.parts_needed || 'Consult mechanic for parts recommendations'

    // Parse possible causes from common causes section
    const possibleCauses = extractPossibleCauses(commonCauses)

    // Parse recommendations from step by step routine section
    const recommendations = extractRecommendations(stepByStepRoutine)

    // Parse parts from parts needed section
    const aiGeneratedParts = extractPartsFromText(partsNeeded)

    // Generate full diagnosis text
    const fullDiagnosis = `**DIAGNOSIS TITLE:** ${title}

**ISSUE SUMMARY:**
${diagnosis}

**URGENCY:** ${urgencyLevel}

**ESTIMATED COST:** ${estimatedCost}

**DIFFICULTY:** ${difficulty}

**TECHNICAL ANALYSIS:**
${diagnosis}

**COMMON CAUSES:**
${commonCauses}

**STEP-BY-STEP ROUTINE:**
${stepByStepRoutine}

**PREVENTION:**
${prevention}`

    return {
      title,
      urgencyLevel,
      estimatedCost,
      difficulty,
      diagnosis,
      commonCauses,
      stepByStepRoutine,
      whatToDo: stepByStepRoutine, // For backward compatibility
      prevention,
      possibleCauses,
      recommendations,
      fullDiagnosis,
      issueSummary: diagnosis,
      technicalAnalysis: diagnosis,
      drivingSafety: getDrivingSafety(urgencyLevel),
      rawResponse: content,
      rawWhatToDo: stepByStepRoutine,
      rawPrevention: prevention,
      possibleCausesSummary: commonCauses,
      recommendationsSummary: stepByStepRoutine,
      aiGeneratedParts: aiGeneratedParts // Add AI-generated parts
    }
  } catch (error) {
    console.error('Error parsing AI response:', error)

    // Fallback parsing
    return {
      title: issueDescription,
      urgencyLevel: 'MEDIUM',
      estimatedCost: 'Contact mechanic for estimate',
      difficulty: 'MODERATE',
      diagnosis: content.length > 500 ? content.substring(0, 500) + '...' : content,
      whatToDo: 'Consult with a qualified mechanic for proper diagnosis',
      prevention: 'Follow regular maintenance schedule',
      possibleCauses: ['Detailed analysis needed'],
      recommendations: ['Professional diagnosis recommended'],
      fullDiagnosis: content,
      issueSummary: issueDescription,
      technicalAnalysis: content,
      drivingSafety: 'Assessment needed',
      rawResponse: content,
      rawWhatToDo: 'Consult with a qualified mechanic for proper diagnosis',
      rawPrevention: 'Follow regular maintenance schedule',
      possibleCausesSummary: 'Analysis incomplete',
      recommendationsSummary: 'Professional diagnosis recommended'
    }
  }
}

// Helper function to extract possible causes from diagnosis text
function extractPossibleCauses(diagnosis: string): string[] {
  const causes: string[] = []
  const lines = diagnosis.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.match(/^\d+\./)) {
      causes.push(trimmed)
    } else if (trimmed.includes(':') && trimmed.length > 20) {
      causes.push(trimmed)
    }
  }

  return causes.length > 0 ? causes : ['Multiple factors may be involved']
}

// Helper function to extract recommendations from what to do text
function extractRecommendations(whatToDo: string): string[] {
  const recommendations: string[] = []
  const steps = whatToDo.split(/(?=Step \d+:|^\d+\.|\n-\s)/i)

  for (const step of steps) {
    const trimmed = step.trim()
    if (trimmed && trimmed.length > 10) {
      recommendations.push(trimmed)
    }
  }

  return recommendations.length > 0 ? recommendations : ['Professional diagnosis recommended']
}

// Helper function to determine driving safety
function getDrivingSafety(urgency: string): string {
  switch (urgency.toUpperCase()) {
    case 'CRITICAL':
      return 'STOP - Do not drive'
    case 'HIGH':
      return 'LIMITED - Drive carefully to repair shop'
    case 'MEDIUM':
      return 'CAUTION - Schedule repair soon'
    case 'LOW':
      return 'OK - Safe to drive with monitoring'
    default:
      return 'Assessment needed'
  }
}

// Helper function to extract parts information from parts needed text
function extractPartsFromText(partsText: string): any[] {
  const parts: any[] = []
  const lines = partsText.split('\n')
  let currentPart: any = null

  for (const line of lines) {
    const trimmedLine = line.trim()

    // Check for part name (bold header)
    const partNameMatch = trimmedLine.match(/^\*\*([^*]+)\*\*$/)
    if (partNameMatch) {
      // Save previous part if exists
      if (currentPart && currentPart.name) {
        parts.push(currentPart)
      }

      // Start new part
      currentPart = {
        id: `ai_part_${parts.length + 1}`,
        name: partNameMatch[1],
        category: 'repair',
        description: '',
        partNumber: '',
        estimatedPrice: { min: 25, max: 100 },
        priority: 'medium',
        availability: 'in-stock',
        specifications: []
      }
      continue
    }

    // Parse part details
    if (currentPart && trimmedLine) {
      if (trimmedLine.startsWith('Description:')) {
        currentPart.description = trimmedLine.replace('Description:', '').trim()
      } else if (trimmedLine.startsWith('Part Number:')) {
        currentPart.partNumber = trimmedLine.replace('Part Number:', '').trim()
      } else if (trimmedLine.startsWith('Price Range:')) {
        const priceMatch = trimmedLine.match(/\$(\d+)-\$(\d+)/)
        if (priceMatch) {
          currentPart.estimatedPrice = {
            min: parseInt(priceMatch[1]),
            max: parseInt(priceMatch[2])
          }
        }
      } else if (trimmedLine.startsWith('Priority:')) {
        const priority = trimmedLine.replace('Priority:', '').trim().toLowerCase()
        currentPart.priority = priority === 'high' ? 'high' : priority === 'low' ? 'low' : 'medium'
      } else if (trimmedLine.startsWith('Availability:')) {
        const availability = trimmedLine.replace('Availability:', '').trim().toLowerCase()
        currentPart.availability = availability.includes('special') ? 'special-order' :
                                  availability.includes('limited') ? 'limited' : 'in-stock'
      }
    }
  }

  // Add the last part
  if (currentPart && currentPart.name) {
    parts.push(currentPart)
  }

  // Return at least 3 parts, add generic ones if needed
  if (parts.length === 0) {
    parts.push({
      id: 'generic_part_1',
      name: 'Diagnostic Scanner',
      category: 'diagnostic',
      description: 'OBD-II scanner for vehicle diagnostics',
      partNumber: 'OBD001',
      estimatedPrice: { min: 35, max: 85 },
      priority: 'medium',
      availability: 'in-stock',
      specifications: []
    })
  }

  return parts
}

/* To invoke this function:
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/groq-diagnosis' \
  --header 'Authorization: Bearer YOUR_SUPABASE_USER_JWT' \
  --header 'Content-Type: application/json' \
  --data '{
    "vehicle": {
      "make": "Toyota",
      "model": "Camry",
      "year": 2020,
      "odometer": 50000
    },
    "issueDescription": "Car makes weird noise when starting"
  }'
*/
