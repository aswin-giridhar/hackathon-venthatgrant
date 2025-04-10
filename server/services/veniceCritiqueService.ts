import axios from 'axios';

const VENICE_API_BASE_URL = 'https://api.venice.ai/api/v1';

/**
 * Function to critique a grant proposal using Venice AI
 * 
 * @param proposalContent The content of the proposal to critique
 * @param grantUrl The URL of the grant for which the proposal is written
 * @param modelName The Venice AI model to use (defaults to deepseek-r1-671b)
 * @returns Promise with critique content
 */
export async function critiqueProposalWithVenice(
  proposalContent: string,
  grantUrl: string = '',
  modelName: string = 'llama-3.3-70b'
): Promise<string> {
  try {
    // Ensure Venice API key is available
    if (!process.env.VENICE_API_KEY) {
      throw new Error("Venice AI service is not configured. Please set VENICE_API_KEY environment variable.");
    }

    console.log('Calling Venice AI critique service with parameters:');
    console.log(`- Model: ${modelName}`);
    console.log(`- Grant URL: ${grantUrl || 'Not provided'}`);
    console.log(`- Proposal length: ${proposalContent.length} characters`);

    // Prepare request body based on the curl command structure
    const requestBody = {
      model: modelName,
      messages: [
        {
          role: "system",
          content: `You are a helpful proposal critic who effectively critiques a proposal, focus on evaluating the proposal's clarity, completeness, feasibility, and alignment with the problem it addresses, while also considering the writer's credentials and the presentation style. 
          
          IMPORTANT: Do NOT include any prompt tags, prefixes, or labels in your response. Present your critique as a clean, professional document with appropriate headings for each section.
          
          Make sure to critique a proposal based on the following key areas when asked to critique a proposal shared by the user in a detailed manner for each area.
          
          1. Problem Statement & Context:
          Clarity: Is the problem clearly defined and explained?
          Relevance: Is the problem significant and worth addressing?
          Context: Is the proposal's context well-established and relevant to the problem? 
          2. Goals & Objectives:
          Specificity: Are the goals and objectives specific, measurable, achievable, relevant, and time-bound (SMART)?
          Feasibility: Are the goals and objectives realistic and achievable within the proposed timeframe and resources?
          Alignment: Do the goals and objectives directly address the problem statement? 
          3. Methodology & Approach:
          Viability: Is the proposed methodology sound and appropriate for achieving the goals?
          Feasibility: Can the proposed methodology be implemented within the available resources and timeframe?
          Justification: Is the chosen methodology justified and explained clearly? 
          4. Budget & Resources:
          Justification: Are the budget requests justified and reasonable?
          Completeness: Does the budget cover all necessary costs?
          Feasibility: Can the project be completed within the proposed budget? 
          5. Timeline & Deliverables:
          Realism: Is the proposed timeline realistic and achievable?
          Completeness: Does the timeline include all necessary milestones and deliverables?
          Clarity: Are the deliverables clearly defined and measurable? 
          6. Writer's Credentials & Experience:
          Relevance: Does the writer have the necessary expertise and experience to successfully complete the project?
          Competence: Does the writer demonstrate competence in the relevant field?
          Experience: Does the writer have a track record of successful projects? 
          7. Presentation & Writing Style:
          Clarity: Is the writing clear, concise, and easy to understand?
          Organization: Is the proposal well-organized and logically structured?
          Engagement: Does the proposal engage the reader and persuade them of the project's value?
          Professionalism: Is the proposal presented in a professional and polished manner? 
          8. Constructive Feedback:
          Focus on Improvement: Provide constructive feedback that focuses on areas for improvement rather than simply pointing out flaws.
          Be Specific: Offer specific suggestions for how the proposal can be strengthened.
          Be Respectful: Maintain a respectful and collaborative tone.
          Be Timely: Provide feedback in a timely manner so that the proposal author has enough time to make revisions.
          
          You can search the web for additional support information if required and if you state any factual information make sure to cite the source within brackets`
        },
        {
          role: "user",
          content: grantUrl 
            ? `Critique my grant proposal <grant-proposal>${proposalContent}</grant-proposal> for the following grant available in the website url:<grant-website-url>${grantUrl}</grant-website-url>`
            : `Critique my grant proposal <grant-proposal>${proposalContent}</grant-proposal>`
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

    console.log('Sending request to Venice AI...');
    
    // Make the API call
    const response = await axios.post(
      `${VENICE_API_BASE_URL}/chat/completions`,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.VENICE_API_KEY}`
        }
      }
    );

    // Extract the critique content from the response
    if (response.data && 
        response.data.choices && 
        response.data.choices.length > 0 && 
        response.data.choices[0].message && 
        response.data.choices[0].message.content) {
      console.log('Successfully received critique from Venice AI');
      return response.data.choices[0].message.content;
    } else {
      console.error('Invalid response format from Venice AI:', response.data);
      throw new Error('Invalid response format from Venice AI');
    }
  } catch (error: any) {
    console.error('Error generating critique with Venice AI:', error.message);
    throw new Error(`Failed to critique proposal with Venice AI: ${error.message}`);
  }
}