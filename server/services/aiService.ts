import { Grant, Proposal, User } from "@shared/schema";
// Import Venice service functions
import * as veniceService from './veniceService';

// Interface for AI service providers
export interface AiServiceProvider {
  generateProposal(
    grant: Grant, 
    researchArea: string, 
    objectives: string
  ): Promise<string>;
  
  critiqueProp(proposalContent: string): Promise<string>;
  
  generateReport(
    proposal: Proposal,
    reportType: string,
    additionalInfo?: string
  ): Promise<string>;
  
  getGrantWritingCoaching(coachingRequest: any): Promise<any>;
  
  extractKeywords(text: string): Promise<{ keyword: string, explanation: string }[]>;
}

// Return Venice service with user's model preference
export function getAiProvider(user?: User): AiServiceProvider {
  // Set user's model preference
  if (user) {
    veniceService.setUserModelPreference(user);
  } else {
    veniceService.setUserModelPreference(undefined);
  }
  
  return veniceService;
}