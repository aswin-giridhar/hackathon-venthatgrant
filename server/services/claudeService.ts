import Anthropic from '@anthropic-ai/sdk';
import { Grant, Proposal } from "@shared/schema";
import { AiServiceProvider } from "./aiService";
import { CoachingRequest, CoachingResponse } from "./coachingService";

// Check for the API key
if (!process.env.ANTHROPIC_API_KEY) {
  console.warn("Warning: ANTHROPIC_API_KEY is not set. Claude AI functionality will be limited.");
}

// Initialize Anthropic with API key
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || 'dummy-key-for-initialization',
});

// Implementation of AiServiceProvider using Claude
class ClaudeService implements AiServiceProvider {
  private readonly isConfigured: boolean;
  
  constructor() {
    this.isConfigured = !!process.env.ANTHROPIC_API_KEY;
  }
  
  // Function to generate a research proposal based on a grant
  async generateProposal(
    grant: Grant, 
    researchArea: string, 
    objectives: string
  ): Promise<string> {
    this.checkConfiguration();
    
    try {
      const prompt = `
        Create a research proposal for the following grant:
        
        Grant Name: ${grant.title}
        Organization: ${grant.organization}
        Description: ${grant.description}
        Amount: ${grant.amount}
        Duration: ${grant.duration}
        
        Research Area: ${researchArea}
        Objectives: ${objectives}
        
        The proposal should include the following sections:
        1. Executive Summary
        2. Introduction and Background
        3. Research Objectives
        4. Methodology
        5. Expected Outcomes
        6. Timeline
        7. Budget
        8. Impact Statement
        
        Make the proposal compelling, well-structured, and tailored to the specific grant requirements.
      `;
      
      const response = await anthropic.messages.create({
        model: "claude-3-7-sonnet-20250219", // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
        max_tokens: 3000,
        system: "You are an expert grant proposal writer with deep knowledge of academic and research writing.",
        messages: [
          { role: 'user', content: prompt }
        ],
      });
      
      const content = response.content[0];
      if (content.type === 'text') {
        return content.text;
      }
      return "Unable to generate proposal";
    } catch (error) {
      console.error("Error generating proposal with Claude:", error);
      throw new Error("Failed to generate proposal");
    }
  }

  // Function to critique a proposal
  async critiqueProp(proposalContent: string): Promise<string> {
    this.checkConfiguration();
    
    try {
      const prompt = `
        Review the following grant proposal and provide a comprehensive critique:
        
        ${proposalContent}
        
        Your critique should cover:
        1. Overall impression and assessment
        2. Strengths of the proposal
        3. Areas for improvement
        4. Clarity and organization
        5. Alignment with funder priorities
        6. Budget justification
        7. Impact and significance
        8. Specific recommendations for improvement
        
        Provide specific, actionable feedback that can help improve the proposal.
      `;
      
      const response = await anthropic.messages.create({
        model: "claude-3-7-sonnet-20250219", 
        max_tokens: 2000,
        system: "You are an expert grant reviewer with experience in evaluating research proposals.",
        messages: [
          { role: 'user', content: prompt }
        ],
      });
      
      const content = response.content[0];
      if (content.type === 'text') {
        return content.text;
      }
      return "Unable to critique proposal";
    } catch (error) {
      console.error("Error critiquing proposal with Claude:", error);
      throw new Error("Failed to critique proposal");
    }
  }

  // Function to generate a report based on a proposal
  async generateReport(
    proposal: Proposal,
    reportType: string,
    additionalInfo?: string
  ): Promise<string> {
    this.checkConfiguration();
    
    try {
      const prompt = `
        Generate a ${reportType} report for the following research proposal:
        
        Title: ${proposal.title}
        Content: ${proposal.content}
        
        Additional Information: ${additionalInfo || "None provided"}
        
        The ${reportType} report should include:
        1. Executive Summary
        2. Project Overview
        3. Key Findings or Progress
        4. Challenges and Solutions
        5. Budget Utilization
        6. Impact Assessment
        7. Future Plans
        8. Appendices (if necessary)
        
        Make the report professional, data-driven, and appropriate for the ${reportType} context.
      `;
      
      const response = await anthropic.messages.create({
        model: "claude-3-7-sonnet-20250219", 
        max_tokens: 3000,
        system: "You are an expert report writer who specializes in research and grant project documentation.",
        messages: [
          { role: 'user', content: prompt }
        ],
      });
      
      const content = response.content[0];
      if (content.type === 'text') {
        return content.text;
      }
      return "Unable to generate report";
    } catch (error) {
      console.error("Error generating report with Claude:", error);
      throw new Error("Failed to generate report");
    }
  }

  // Function to provide AI coaching on grant writing strategy
  async getGrantWritingCoaching(coachingRequest: CoachingRequest): Promise<CoachingResponse> {
    this.checkConfiguration();
    
    try {
      const systemPrompt = `
        You are an expert grant writing coach with decades of experience helping organizations secure funding. 
        Your task is to analyze the provided information and generate a structured grant writing strategy 
        tailored to the specific circumstances of the organization and project. 
        
        Your response should strictly follow this JSON format:
        {
          "strategy": "A tailored 300-400 word grant writing strategy overview",
          "strengths": ["3-5 specific strengths of the project/organization as relates to grant seeking"],
          "improvements": ["3-5 concrete suggestions for improving grant readiness"],
          "nextSteps": ["4-6 specific, actionable next steps with timeline recommendations"],
          "resources": ["3-5 recommended resources or tools that could help"]
        }
      `;
      
      const userPrompt = `
        Organization Type: ${coachingRequest.orgDescription}
        Grant Type Seeking: ${coachingRequest.grantType}
        Project Idea: ${coachingRequest.projectIdea}
        Past Grant Experience: ${coachingRequest.pastExperience || "Not specified"}
        Target Audience: ${coachingRequest.targetAudience || "Not specified"}
        Estimated Budget: ${coachingRequest.budget || "Not specified"}
        Key Challenges: ${coachingRequest.challenges || "Not specified"}
      `;
      
      const response = await anthropic.messages.create({
        model: "claude-3-7-sonnet-20250219", 
        max_tokens: 1500,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt }
        ],
      });
      
      const content = response.content[0];
      if (content.type === 'text') {
        try {
          return JSON.parse(content.text) as CoachingResponse;
        } catch (e) {
          console.error("Error parsing JSON from Claude response:", e);
          throw new Error("Failed to parse coaching response");
        }
      }
      throw new Error("Failed to get coaching response");
    } catch (error) {
      console.error("Error generating coaching with Claude:", error);
      throw new Error("Failed to generate coaching advice");
    }
  }

  // Function to extract keywords with explanations from grant description
  async extractKeywords(text: string): Promise<{ keyword: string, explanation: string }[]> {
    this.checkConfiguration();
    
    try {
      const prompt = `
        Analyze the following grant description and extract 5-7 key keywords or phrases that are most important.
        For each keyword, provide a brief explanation of why it's significant in the context of the grant.
        
        Grant Description:
        ${text}
        
        Format your response as a JSON array of objects, each with 'keyword' and 'explanation' properties.
        For example:
        [
          {
            "keyword": "renewable energy",
            "explanation": "Core focus area of the grant, specifically targeting innovations in this sector"
          },
          {
            "keyword": "community impact",
            "explanation": "The grant emphasizes projects that demonstrate measurable benefits to local communities"
          }
        ]
      `;
      
      const response = await anthropic.messages.create({
        model: "claude-3-7-sonnet-20250219", 
        max_tokens: 1000,
        system: "You are an expert in grant analysis and keyword extraction. Format your response as a valid JSON array.",
        messages: [
          { role: 'user', content: prompt }
        ],
      });
      
      const content = response.content[0];
      if (content.type === 'text') {
        try {
          return JSON.parse(content.text);
        } catch (e) {
          console.error("Error parsing JSON from Claude keyword response:", e);
          return [];
        }
      }
      return [];
    } catch (error) {
      console.error("Error extracting keywords with Claude:", error);
      throw new Error("Failed to extract keywords");
    }
  }
  
  // Helper method to check if API key is configured
  private checkConfiguration(): void {
    if (!this.isConfigured) {
      throw new Error("Claude AI service is not configured. Please set ANTHROPIC_API_KEY environment variable.");
    }
  }
}

// Export the Claude service provider as default
const claudeService = new ClaudeService();
export default claudeService;