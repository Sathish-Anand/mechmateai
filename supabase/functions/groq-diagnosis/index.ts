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
        max_tokens: 1024,
        temperature: 0.3
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
      content: `You are an expert automotive diagnostic AI assistant. Provide detailed, accurate vehicle diagnosis based on the information provided.

Format your response with these exact sections (use the exact numbers and labels):

1. TITLE: [Brief diagnostic title based on the issue]
2. URGENCY: CRITICAL/HIGH/MEDIUM/LOW
3. ESTIMATED COST: [Cost range in USD format like $50-$200]
4. DIFFICULTY: EASY/MODERATE/HARD/EXPERT
5. DIAGNOSIS: [Detailed technical explanation of what is causing the issue, include multiple paragraphs if needed]

6. WHAT TO DO: [Provide detailed step-by-step instructions with numbered steps. Each step should include:
- Step X: [Action to take]
- Tools needed: [List tools]
- Expected outcome: [What should happen]
- Continue with more detailed steps...]

7. PREVENTION: [Detailed prevention advice with specific maintenance recommendations, intervals, and best practices]

Be specific, practical, prioritize safety, and provide comprehensive information for each section.`
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
    // Split content into sections
    const sections: any = {}
    const lines = content.split('\n')
    let currentSection = ''
    let currentContent: string[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      // Check if this is a section header
      if (line.match(/^\d+\.\s*(TITLE|URGENCY|ESTIMATED COST|DIFFICULTY|DIAGNOSIS|WHAT TO DO|PREVENTION):/)) {
        // Save previous section if exists
        if (currentSection && currentContent.length > 0) {
          sections[currentSection] = currentContent.join('\n').trim()
        }

        // Extract section name and initial content
        const match = line.match(/^\d+\.\s*(TITLE|URGENCY|ESTIMATED COST|DIFFICULTY|DIAGNOSIS|WHAT TO DO|PREVENTION):\s*(.*)/)
        if (match) {
          currentSection = match[1].toLowerCase().replace(/\s+/g, '_')
          currentContent = match[2] ? [match[2]] : []
        }
      } else if (currentSection && line) {
        // Add content to current section
        currentContent.push(line)
      }
    }

    // Save the last section
    if (currentSection && currentContent.length > 0) {
      sections[currentSection] = currentContent.join('\n').trim()
    }

    // Extract structured data
    const title = sections.title || issueDescription
    const urgencyLevel = sections.urgency || 'MEDIUM'
    const estimatedCost = sections.estimated_cost || 'Contact mechanic for estimate'
    const difficulty = sections.difficulty || 'MODERATE'
    const diagnosis = sections.diagnosis || 'Detailed diagnosis not available'
    const whatToDo = sections.what_to_do || 'Consult with a qualified mechanic for diagnosis'
    const prevention = sections.prevention || 'Follow regular maintenance schedule'

    // Parse possible causes from diagnosis section
    const possibleCauses = extractPossibleCauses(diagnosis)

    // Parse recommendations from what to do section
    const recommendations = extractRecommendations(whatToDo)

    // Generate full diagnosis text
    const fullDiagnosis = `**DIAGNOSIS TITLE:** ${title}

**ISSUE SUMMARY:**
${diagnosis}

**URGENCY:** ${urgencyLevel}

**ESTIMATED COST:** ${estimatedCost}

**DIFFICULTY:** ${difficulty}

**TECHNICAL ANALYSIS:**
${diagnosis}

**WHAT TO DO:**
${whatToDo}

**PREVENTION:**
${prevention}`

    return {
      title,
      urgencyLevel,
      estimatedCost,
      difficulty,
      diagnosis,
      whatToDo,
      prevention,
      possibleCauses,
      recommendations,
      fullDiagnosis,
      issueSummary: diagnosis,
      technicalAnalysis: diagnosis,
      drivingSafety: getDrivingSafety(urgencyLevel),
      rawResponse: content,
      rawWhatToDo: whatToDo,
      rawPrevention: prevention,
      possibleCausesSummary: diagnosis,
      recommendationsSummary: whatToDo
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
