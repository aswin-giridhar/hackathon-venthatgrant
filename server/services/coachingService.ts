import axios from 'axios';

// Check for the API key
if (!process.env.VENICE_API_KEY) {
  console.warn("Warning: VENICE_API_KEY is not set. Venice AI coaching functionality will be limited.");
}

// Venice API base URL
const VENICE_API_BASE_URL = 'https://api.venice.ai/api/v1';
const VENICE_DEFAULT_MODEL = 'llama-3.3-70b';

export interface CoachingRequest {
  grantType: string;
  orgDescription: string;
  projectIdea: string;
  pastExperience?: string;
  targetAudience?: string;
  budget?: string;
  challenges?: string;
}

export interface CoachingResponse {
  strategy: string;
  strengths: string[];
  improvements: string[];
  nextSteps: string[];
  resources: string[];
}

/**
 * AI coaching function to provide personalized grant writing strategy
 * 
 * @param coachingRequest User's request data for coaching
 * @returns Structured coaching response
 */
export async function getGrantWritingCoaching(coachingRequest: CoachingRequest): Promise<CoachingResponse> {
  try {
    // Ensure Venice API key is available
    if (!process.env.VENICE_API_KEY) {
      throw new Error("Venice AI service is not configured. Please set VENICE_API_KEY environment variable.");
    }

    const systemPrompt = `You are an expert grant writing coach with decades of experience. Your role is to provide strategic advice to help organizations secure grant funding. 
          
    Analyze the information provided by the user about their grant application needs and provide actionable advice.
    
    IMPORTANT: Do NOT include any prompt tags, prefixes, or labels in your response. Present your advice as clean JSON data only.
    
    Format your response as a JSON object with the following structure:
    {
      "strategy": "An overall grant writing strategy paragraph specific to their situation",
      "strengths": ["List of 3-5 strengths in their approach that they should emphasize"],
      "improvements": ["List of 3-5 specific areas for improvement with concrete suggestions"],
      "nextSteps": ["List of 3-5 immediate action items they should take"],
      "resources": ["List of 3-5 useful resources, tools, or practices they should consider"]
    }`;

    const userPrompt = `I need coaching on my grant writing strategy with these details:
    
    Grant Type: ${coachingRequest.grantType}
    Organization Description: ${coachingRequest.orgDescription}
    Project Idea: ${coachingRequest.projectIdea}
    Past Experience: ${coachingRequest.pastExperience || "Not specified"}
    Target Audience: ${coachingRequest.targetAudience || "Not specified"}
    Budget: ${coachingRequest.budget || "Not specified"}
    Challenges: ${coachingRequest.challenges || "Not specified"}`;

    console.log('Making coaching request to Venice AI...');
    
    const response = await axios.post(
      `${VENICE_API_BASE_URL}/chat/completions`,
      {
        model: VENICE_DEFAULT_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1500,
        response_format: { type: "json_object" },
        venice_parameters: {
          enable_web_search: "on",
          include_venice_system_prompt: true
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.VENICE_API_KEY}`
        }
      }
    );

    console.log('Venice coaching response structure:', 
               JSON.stringify({
                 status: response.status,
                 hasChoices: !!response.data.choices,
                 choicesLength: response.data.choices ? response.data.choices.length : 0
               }, null, 2));

    const content = response.data.choices[0].message.content || "";
    try {
      const parsed = JSON.parse(content);
      
      // Verify the shape of the response
      if (parsed && typeof parsed === 'object' && 
          'strategy' in parsed && 
          'strengths' in parsed && 
          'improvements' in parsed &&
          'nextSteps' in parsed && 
          'resources' in parsed) {
        return parsed as CoachingResponse;
      } else {
        console.warn('Venice response missing expected fields, constructing fallback response');
        // Construct a valid CoachingResponse from the available data
        return {
          strategy: parsed.strategy || parsed.advice || "Focus on aligning your proposal with the grant's priorities.",
          strengths: Array.isArray(parsed.strengths) ? parsed.strengths : ["Your organization's experience"],
          improvements: Array.isArray(parsed.improvements) ? parsed.improvements : ["Strengthen your impact metrics"],
          nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps : ["Review the grant requirements carefully"],
          resources: Array.isArray(parsed.resources) ? parsed.resources : ["Grant writing guides"]
        };
      }
    } catch (e) {
      console.error("Error parsing JSON from Venice response:", e);
      console.log("Raw content:", content);
      
      // Return a fallback response with generic coaching advice
      return {
        strategy: "Focus on aligning your proposal closely with the grant's stated priorities and objectives. Emphasize your organization's unique capabilities and the specific impact your project will deliver.",
        strengths: [
          "Your organization's background and experience",
          "The clarity of your project idea",
          "Your understanding of the target audience"
        ],
        improvements: [
          "Strengthen your impact metrics and evaluation plan",
          "Develop a more detailed budget breakdown",
          "Include more specific timeline and milestones"
        ],
        nextSteps: [
          "Review the grant requirements in detail",
          "Gather supporting data and evidence",
          "Develop a compelling narrative"
        ],
        resources: [
          "Grant writing guides from the funding organization",
          "Similar successful proposals if available",
          "Expert consultation in your field"
        ]
      };
    }
  } catch (error: any) {
    console.error("Error getting grant writing coaching:", error);
    throw new Error(`Failed to get coaching advice: ${error.message}`);
  }
}