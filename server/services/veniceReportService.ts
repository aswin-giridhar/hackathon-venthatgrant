import axios from 'axios';
import { Proposal } from '../../shared/schema';

const VENICE_API_BASE_URL = 'https://api.venice.ai/api/v1';

export async function generateReport(
  proposal: Proposal,
  reportType: string,
  projectProgress: string,
  challengesMitigations: string,
  modelName: string = 'llama-3.3-70b'
): Promise<string> {
  try {
    console.log(`Starting Venice AI report service with parameters:
- Model: ${modelName}
- Proposal: ${proposal.title}
- Report Type: ${reportType}
- Project Progress length: ${projectProgress?.length || 0} characters
- Challenges & Mitigations length: ${challengesMitigations?.length || 0} characters`);

    const requestBody = {
      model: modelName,
      messages: [
        {
          role: "system",
          content: `You are a helpful grant report generator who effectively reports the progress of a grant, by preparing a comprehensive grant report, that include sections like an executive summary, background, project description, results and impact, financial summary, challenges/lessons learned, future plans acknowledgements, and appendices. 

          IMPORTANT: Do NOT include any prompt tags, prefixes, or labels in your response. Present your report as a clean, professional document with appropriate headings for each section.

          The key sections of the grant report must be as follows:
          Executive Summary: Briefly outline the project's purpose, key findings, and impact. 
          Background: Provide context for the project, including the need it addresses and relevant information. 
          Project Description: Detail the project's activities, goals, and objectives. 
          Results and Impact: Showcase the project's achievements, using data and stories to illustrate the impact on the people served. 
          Financial Summary: Provide an overview of the project's finances, including how the grant funds were spent. 
          Challenges and Lessons Learned: Discuss any difficulties encountered during the project and lessons learned for future projects. 
          Future Plans: Outline any planned follow-up activities or future projects. 
          Acknowledgments: Thank individuals or organizations who contributed to the project. 
          Appendices: Include supporting documents, data, or other relevant information.
          
          You can search the web for additional support information if required and if you state any factual information make sure to cite the source within brackets`
        },
        {
          role: "user",
          content: `Create a grant report for my grant proposal <grant-proposal-name>${proposal.title}</grant-proposal-name> using the following information of report type <report-type-name>${reportType}</report-type-name>, project progress <report-project-progress>${projectProgress}</report-project-progress> and challenges & mitigations:<report-challenges-mitigations>${challengesMitigations}</report-challenges-mitigations>`
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
      temperature: 0.65,
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

    // Extract the report content from the response
    if (response.data && 
        response.data.choices && 
        response.data.choices.length > 0 && 
        response.data.choices[0].message && 
        response.data.choices[0].message.content) {
      console.log('Successfully received report from Venice AI');
      return response.data.choices[0].message.content;
    } else {
      console.error('Invalid response format from Venice AI:', response.data);
      throw new Error('Invalid response format from Venice AI');
    }
  } catch (error: any) {
    console.error('Error generating report with Venice AI:', error.message);
    throw new Error(`Failed to generate report with Venice AI: ${error.message}`);
  }
}