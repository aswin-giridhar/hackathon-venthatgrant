/**
 * Model Selection Service
 * This service manages the selection of AI models for different tasks,
 * considering user preferences and task-specific requirements.
 */

// Default model mapping for different features
const defaultModels: Record<string, string> = {
  // Grant finder uses web search capability
  grantFinder: 'llama-3.3-70b',
  // Proposal generation requires function calling for structured output
  proposalPreparation: 'llama-3.3-70b',
  // Proposal critique benefits from reasoning capabilities
  proposalCritique: 'deepseek-r1-671b',
  // Grant reporting requires structured output
  grantReporting: 'llama-3.3-70b',
  // AI coaching requires conversational and knowledge capabilities
  aiCoaching: 'llama-3.3-70b',
  // Keyword extraction works well with function calling
  keywordExtraction: 'llama-3.3-70b',
  // Generic fallback
  default: 'llama-3.3-70b'
};

// Models with specific strengths
const specializedModels: Record<string, Record<string, string>> = {
  'balanced': {
    grantFinder: 'llama-3.3-70b',
    proposalPreparation: 'llama-3.3-70b',
    proposalCritique: 'llama-3.3-70b',
    grantReporting: 'llama-3.3-70b',
    aiCoaching: 'llama-3.3-70b',
    keywordExtraction: 'llama-3.3-70b'
  },
  'mostIntelligent': {
    grantFinder: 'llama-3.1-405b',
    proposalPreparation: 'llama-3.1-405b',
    proposalCritique: 'llama-3.1-405b',
    grantReporting: 'llama-3.1-405b',
    aiCoaching: 'llama-3.1-405b',
    keywordExtraction: 'llama-3.1-405b'
  },
  'fastResponse': {
    grantFinder: 'llama-3.2-3b',
    proposalPreparation: 'llama-3.2-3b',
    proposalCritique: 'llama-3.2-3b',
    grantReporting: 'llama-3.2-3b',
    aiCoaching: 'llama-3.2-3b',
    keywordExtraction: 'llama-3.2-3b'
  },
  'reasoning': {
    grantFinder: 'deepseek-r1-671b',
    proposalPreparation: 'deepseek-r1-671b',
    proposalCritique: 'deepseek-r1-671b',
    grantReporting: 'deepseek-r1-671b',
    aiCoaching: 'deepseek-r1-671b',
    keywordExtraction: 'deepseek-r1-671b'
  }
};

/**
 * Get the recommended model for a specific task based on user preference
 * 
 * @param task The task being performed (grantFinder, proposalPreparation, etc.)
 * @param userPreference Optional user preference for model type
 * @returns The model ID to use
 */
export function getRecommendedModel(
  task: string, 
  userPreference?: string
): string {
  // If user has a specific setting and it maps to specialized models, use it
  if (userPreference && specializedModels[userPreference]) {
    const specialModels = specializedModels[userPreference];
    if (specialModels[task]) {
      return specialModels[task];
    }
  }
  
  // Otherwise use the default for this task
  return defaultModels[task] || defaultModels.default;
}