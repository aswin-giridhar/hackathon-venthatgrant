import axios from 'axios';
import { Grant, Proposal } from '@shared/schema';

export const VENICE_API_BASE_URL = 'https://api.venice.ai/api/v1';

// Define our own User interface for AI model preference
interface User {
  id: number;
  username: string;
  aiModelPreference?: 'intelligent' | 'fast' | 'reasoning' | 'default';
}

// Default model
let currentModel = "llama-3.3-70b";

/**
 * Sets the user's preferred model for Venice AI
 * @param user User object containing model preferences or undefined to reset to default
 */
export function setUserModelPreference(user?: User): void {
  if (!user || !user.aiModelPreference) {
    currentModel = "llama-3.3-70b"; // Default model
    return;
  }
  
  // Apply user's model preference
  switch (user.aiModelPreference) {
    case "intelligent":
      currentModel = "llama-3.1-405b";
      break;
    case "fast":
      currentModel = "llama-3.2-3b";
      break;
    case "reasoning":
      currentModel = "deepseek-r1-671b";
      break;
    default:
      currentModel = "llama-3.3-70b"; // Default model
  }
  
  console.log(`Set Venice AI model to ${currentModel} based on user preference: ${user.aiModelPreference}`);
}

/**
 * Generate a proposal using Venice AI with proper API calls
 * Based on the curl command format:
 * 
 * curl --request POST \
 * --url https://api.venice.ai/api/v1/chat/completions \
 * --header 'Authorization: Bearer <your-api-key>' \
 * --header 'Content-Type: application/json' \
 * --data '{"model":"llama-3.3-70b","messages":[{"role":"system","content":"You are a grant expert..."},{"role":"user","content":"Write a proposal for..."}],"venice_parameters":{"enable_web_search":"on"}}'
 * 
 * @param grantTitle The title of the grant
 * @param grantUrl The website URL for the grant
 * @param researchArea Optional research area for the proposal
 * @param objectives Optional research objectives for the proposal
 * @returns A generated proposal from Venice AI
 */
export async function generateProposalWithVenice(
  grantTitle: string,
  grantUrl: string,
  researchArea?: string,
  objectives?: string
): Promise<string> {
  if (!process.env.VENICE_API_KEY) {
    throw new Error('Venice AI API key is not configured. Please set the VENICE_API_KEY environment variable.');
  }

  console.log('Preparing to send request to Venice AI');
  
  // Create data structure for Venice API matching the curl command format
  const veniceApiData = {
    model: currentModel, // Use the current model based on user preference
    messages: [
      {
        role: "system",
        content: `You are a helpful proposal grant writer who writes the award winning grant proposal that clearly articulate the problem, gives the potential solutions, the project's impact, and the organization's credibility, while also demonstrating a thorough understanding of the funder's priorities and requirements. 
        
        IMPORTANT: Do NOT include any prompt tags, prefixes, or labels in your response. Present your proposal as a clean, professional document with appropriate headings for each section.
        
        Make sure to follow all these key elements when you create a proposal based on the user inputs when the user asks for a proposal and return the output in a markdown format.
        
        Problem Statement: Clearly define the issue the project addresses and why it's important. 
        Project Description: Explain the proposed solution, including objectives, activities, and timeline. 
        Expected Impact: Demonstrate how the project will make a difference and what long-term outcomes are anticipated. 
        Organizational Capacity: Showcase the organization's experience, expertise, and resources to successfully implement the project. 
        Budget: Provide a detailed and realistic budget that aligns with the project activities and demonstrates responsible use of funds. 
        Evaluation Plan: Outline how the project's progress and impact will be measured and reported. 
        Tailored to the Funder: Research the funder's priorities, mission, and funding guidelines, and tailor the proposal accordingly. 
        Clear and Concise Writing: Use clear, concise, and professional language, avoiding jargon and technical terms that the funder may not understand. 
        Strong Narrative: Tell a compelling story that captures the funder's attention and demonstrates the project's potential for success. 
        Evidence-Based: Support claims with data, research, and other evidence to demonstrate the project's need and feasibility.`
      },
      {
        role: "user",
        content: `Write me a grant proposal based on the following information:
        
        Grant Name: ${grantTitle}
        Grant Website URL: ${grantUrl}
        ${researchArea ? `Research Area: ${researchArea}` : ''}
        ${objectives ? `Research Objectives: ${objectives}` : ''}
        
        Format your response in proper markdown with headings, bullet points, and emphasis where appropriate.`
      }
    ],
    venice_parameters: {
      enable_web_search: "on",
      include_venice_system_prompt: true
    },
    frequency_penalty: 0,
    presence_penalty: 0,
    max_tokens: 1000,
    max_completion_tokens: 998,
    temperature: 0.75,
    top_p: 0.1
  };

  try {
    // Call Venice API
    console.log('Sending request to Venice AI API...');
    const response = await axios.post(
      `${VENICE_API_BASE_URL}/chat/completions`,
      veniceApiData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.VENICE_API_KEY}`
        }
      }
    );

    // Extract proposal content from the response
    if (response.data && response.data.choices && response.data.choices.length > 0) {
      console.log('Successfully received response from Venice AI');
      return response.data.choices[0].message.content;
    } else {
      console.error('Invalid response format from Venice AI:', response.data);
      throw new Error('Failed to generate proposal with Venice AI: Invalid response format');
    }
  } catch (error: any) {
    console.error('Error calling Venice AI API:', error.response?.data || error.message);
    
    // Add detailed error information
    let errorMessage = 'Failed to generate proposal with Venice AI';
    
    if (error.response) {
      // The request was made and the server responded with a non-2xx status code
      errorMessage += `: Server responded with status ${error.response.status}`;
      if (error.response.data) {
        errorMessage += ` - ${JSON.stringify(error.response.data)}`;
      }
    } else if (error.request) {
      // The request was made but no response was received
      errorMessage += ': No response received from server';
    } else {
      // Something happened in setting up the request that triggered an Error
      errorMessage += `: ${error.message}`;
    }
    
    throw new Error(errorMessage);
  }
}

/**
 * Test function for making Venice API calls, helps debug API issues
 * 
 * @param req Express Request object with test parameters
 * @returns Test response as a string
 */
export async function testVeniceAPICall(req: any): Promise<string> {
  if (!process.env.VENICE_API_KEY) {
    throw new Error('Venice AI API key is not configured');
  }
  
  const testData = {
    model: currentModel,
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant."
      },
      {
        role: "user",
        content: "Say hello!"
      }
    ],
    venice_parameters: {
      enable_web_search: "off"
    },
    max_tokens: 100
  };
  
  try {
    const response = await axios.post(
      `${VENICE_API_BASE_URL}/chat/completions`,
      testData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.VENICE_API_KEY}`
        }
      }
    );
    
    return JSON.stringify(response.data, null, 2);
  } catch (error: any) {
    console.error('Error in test Venice API call:', error);
    
    if (error.response) {
      return `Error ${error.response.status}: ${JSON.stringify(error.response.data)}`;
    } else {
      return `Error: ${error.message}`;
    }
  }
}

/**
 * Generate a proposal using Venice AI 
 * Implementation for the AiServiceProvider interface
 * 
 * @param grant Grant object with details
 * @param researchArea Optional research area specified by the user 
 * @param objectives Optional research objectives specified by the user
 * @returns Generated proposal as a string
 */
export async function generateProposal(
  grant: Grant,
  researchArea?: string,
  objectives?: string
): Promise<string> {
  // Call the dedicated function with extracted parameters
  return generateProposalWithVenice(
    grant.title,
    grant.url || "",
    researchArea,
    objectives
  );
}

/**
 * Critique a proposal using Venice AI
 * 
 * @param proposalContent Proposal content to critique
 * @returns Critique as a string
 */
export async function critiqueProp(proposalContent: string): Promise<string> {
  if (!process.env.VENICE_API_KEY) {
    throw new Error('Venice AI API key is not configured');
  }
  
  console.log('Preparing to critique proposal with Venice AI');
  
  const critiqueData = {
    model: currentModel,
    messages: [
      {
        role: "system",
        content: `You are an expert grant proposal reviewer who provides constructive feedback to improve grant proposals. Assess the following aspects:
        
        IMPORTANT: Do NOT include any prompt tags, prefixes, or labels in your response. Present your critique as a clean, professional document with appropriate headings for each section.
        
        1. Clarity of Problem Statement: Is the problem clearly defined and supported with evidence?
        2. Project Plan: Is the proposed approach logical, detailed, and feasible?
        3. Expected Impact: Are outcomes clear, measurable, and aligned with the funder's priorities?
        4. Budget Justification: Is the budget realistic and aligned with project activities?
        5. Writing Quality: Is the proposal well-organized, clear, and free of jargon?
        
        Provide specific, actionable feedback for each aspect. Highlight strengths and areas for improvement.`
      },
      {
        role: "user",
        content: `Please critique the following grant proposal:
        
        ${proposalContent}`
      }
    ],
    venice_parameters: {
      enable_web_search: "off",
      include_venice_system_prompt: true
    },
    max_tokens: 800,
    temperature: 0.7
  };
  
  try {
    const response = await axios.post(
      `${VENICE_API_BASE_URL}/chat/completions`,
      critiqueData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.VENICE_API_KEY}`
        }
      }
    );
    
    if (response.data && response.data.choices && response.data.choices.length > 0) {
      return response.data.choices[0].message.content;
    } else {
      throw new Error('Invalid response format from Venice AI');
    }
  } catch (error: any) {
    console.error('Error generating critique with Venice AI:', error.message);
    throw new Error(`Failed to critique proposal: ${error.message}`);
  }
}

/**
 * Generate a report using Venice AI
 * 
 * @param proposal Proposal to generate report for
 * @param reportType Type of report (progress, final, etc.)
 * @param additionalInfo Additional information for the report
 * @returns Generated report as a string
 */
export async function generateReport(
  proposal: Proposal,
  reportType: string,
  additionalInfo?: string
): Promise<string> {
  if (!process.env.VENICE_API_KEY) {
    throw new Error('Venice AI API key is not configured');
  }
  
  console.log(`Generating ${reportType} report with Venice AI`);
  
  const progress = additionalInfo?.split('|')[0] || "Project is progressing as planned";
  const challenges = additionalInfo?.split('|')[1] || "No significant challenges to report";
  
  const reportData = {
    model: currentModel,
    messages: [
      {
        role: "system",
        content: `You are an expert at creating detailed grant reports. You'll create a ${reportType} report based on the original proposal and updates provided.
        
        IMPORTANT: Do NOT include any prompt tags, prefixes, or labels in your response. Present your report as a clean, professional document with appropriate headings for each section.
        
        Focus on these key elements:
        1. Executive Summary: Brief overview of project status
        2. Progress Against Objectives: Detailed status on each objective
        3. Challenges and Solutions: Issues encountered and how they were addressed
        4. Financial Summary: Budget utilization overview
        5. Next Steps: Planned activities for the next reporting period
        6. Supporting Materials: Any additional documentation or evidence
        
        The report should be professional, fact-based, and aligned with the original proposal.`
      },
      {
        role: "user",
        content: `Create a ${reportType} report for the following grant proposal:
        
        ORIGINAL PROPOSAL:
        ${proposal.content}
        
        CURRENT PROGRESS:
        ${progress}
        
        CHALLENGES FACED:
        ${challenges}`
      }
    ],
    venice_parameters: {
      enable_web_search: "off",
      include_venice_system_prompt: true
    },
    max_tokens: 1200,
    temperature: 0.7
  };
  
  try {
    const response = await axios.post(
      `${VENICE_API_BASE_URL}/chat/completions`,
      reportData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.VENICE_API_KEY}`
        }
      }
    );
    
    if (response.data && response.data.choices && response.data.choices.length > 0) {
      return response.data.choices[0].message.content;
    } else {
      throw new Error('Invalid response format from Venice AI');
    }
  } catch (error: any) {
    console.error('Error generating report with Venice AI:', error.message);
    throw new Error(`Failed to generate report: ${error.message}`);
  }
}

/**
 * Get grant writing coaching from Venice AI
 * 
 * @param coachingRequest Details of the coaching request
 * @returns Coaching response
 */
export async function getGrantWritingCoaching(coachingRequest: any): Promise<any> {
  if (!process.env.VENICE_API_KEY) {
    throw new Error('Venice AI API key is not configured');
  }
  
  console.log('Processing grant writing coaching request with Venice AI');
  
  const { topic, background, specificQuestions } = coachingRequest;
  
  const coachingData = {
    model: currentModel,
    messages: [
      {
        role: "system",
        content: `You are an expert grant writing coach with extensive experience in securing funding from various sources. 
        Your role is to provide personalized guidance, strategic advice, and practical tips to help grant seekers improve their proposals and increase their chances of success.
        
        IMPORTANT: Do NOT include any prompt tags, prefixes, or labels in your response. Present your coaching advice as a clean, professional document with appropriate headings for each section.
        
        Be specific, actionable, and tailored to the user's situation. Provide examples and templates when helpful. Focus on both strategic approaches and tactical writing techniques.`
      },
      {
        role: "user",
        content: `I need grant writing coaching on the following:
        
        TOPIC: ${topic || "General grant writing strategies"}
        
        BACKGROUND: ${background || "I'm new to grant writing"}
        
        SPECIFIC QUESTIONS:
        ${specificQuestions || "What are the most common mistakes in grant proposals and how can I avoid them?"}`
      }
    ],
    venice_parameters: {
      enable_web_search: "on",
      include_venice_system_prompt: true
    },
    max_tokens: 1500,
    temperature: 0.7
  };
  
  try {
    const response = await axios.post(
      `${VENICE_API_BASE_URL}/chat/completions`,
      coachingData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.VENICE_API_KEY}`
        }
      }
    );
    
    if (response.data && response.data.choices && response.data.choices.length > 0) {
      return {
        coaching: response.data.choices[0].message.content,
        model: currentModel
      };
    } else {
      throw new Error('Invalid response format from Venice AI');
    }
  } catch (error: any) {
    console.error('Error getting coaching with Venice AI:', error.message);
    throw new Error(`Failed to get coaching: ${error.message}`);
  }
}

/**
 * Extract keywords from text using Venice AI
 * 
 * @param text Text to extract keywords from
 * @returns Array of keywords with explanations
 */
export async function extractKeywords(text: string): Promise<{ keyword: string, explanation: string }[]> {
  if (!process.env.VENICE_API_KEY) {
    throw new Error('Venice AI API key is not configured');
  }
  
  console.log('Extracting keywords with Venice AI');
  
  const keywordData = {
    model: currentModel,
    messages: [
      {
        role: "system",
        content: `You are a keyword extraction specialist. 
        Extract the most important keywords from the text and provide a brief explanation of why each keyword is significant.
        Only extract truly important keywords that represent key concepts, not common words.
        
        IMPORTANT: Do NOT include any prompt tags, prefixes, or labels in your response. 
        Format the response ONLY as a clean JSON array of objects with 'keyword' and 'explanation' properties.`
      },
      {
        role: "user",
        content: `Extract the important keywords from this text and explain why each is significant:
        
        ${text}`
      }
    ],
    venice_parameters: {
      enable_web_search: "off",
      include_venice_system_prompt: true
    },
    response_format: { type: "json_object" },
    max_tokens: 800,
    temperature: 0.2
  };
  
  try {
    const response = await axios.post(
      `${VENICE_API_BASE_URL}/chat/completions`,
      keywordData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.VENICE_API_KEY}`
        }
      }
    );
    
    if (response.data && response.data.choices && response.data.choices.length > 0) {
      const content = response.data.choices[0].message.content;
      
      try {
        // Parse the JSON response
        const parsedKeywords = JSON.parse(content);
        
        // Extract the keywords array (it might be nested under a property)
        let keywords;
        if (Array.isArray(parsedKeywords)) {
          keywords = parsedKeywords;
        } else if (parsedKeywords.keywords && Array.isArray(parsedKeywords.keywords)) {
          keywords = parsedKeywords.keywords;
        } else {
          // Create a keywords array from the parsed object properties
          keywords = Object.entries(parsedKeywords).map(([keyword, explanation]) => ({
            keyword,
            explanation: typeof explanation === 'string' ? explanation : JSON.stringify(explanation)
          }));
        }
        
        // Validate and ensure correct format
        return keywords.map((item: any) => ({
          keyword: item.keyword || "Unknown keyword",
          explanation: item.explanation || "No explanation provided"
        }));
      } catch (parseError) {
        console.error('Error parsing keywords response:', parseError);
        // Return a minimal valid response
        return [{ keyword: "parsing_error", explanation: "Could not parse AI response" }];
      }
    } else {
      throw new Error('Invalid response format from Venice AI');
    }
  } catch (error: any) {
    console.error('Error extracting keywords with Venice AI:', error.message);
    throw new Error(`Failed to extract keywords: ${error.message}`);
  }
}