import axios from "axios";
import { User } from "@shared/schema";
import { getRecommendedModel } from "./modelSelection";

// Venice API base URL
const VENICE_API_BASE_URL = "https://api.venice.ai/api/v1";

interface SearchResult {
  id: number; // Add an ID field
  title: string;
  url: string;
  snippet: string;
  organization?: string;
  amount?: string;
  deadline?: string;
  fundingType?: "government" | "private"; // Add funding type to support filtering
}

export async function searchForGrants(
  query: string,
  user?: User,
): Promise<SearchResult[]> {
  if (!process.env.VENICE_API_KEY) {
    throw new Error("VENICE_API_KEY is not set");
  }

  try {
    const apiKey = process.env.VENICE_API_KEY;
    console.log(`Searching grants with Venice AI: "${query}"`);

    // Get user's preferred model if set
    const userPreference =
      user?.preferredLlmModel && user.preferredLlmModel !== "venice"
        ? user.preferredLlmModel
        : undefined;
    const modelToUse = getRecommendedModel("grantFinder", userPreference);

    console.log(`Using model: ${modelToUse}`);

    // Use chat completions API with web search capability as requested
    const response = await axios.post(
      `${VENICE_API_BASE_URL}/chat/completions`,
      {
        model: modelToUse,
        messages: [
          {
            role: "system",
            content: `You are an expert grant researcher designed to help users find open and available grants. Your task is to search the web and identify grants that match the user's specified topic. Provide detailed information about each grant, including:
- Grant name
- Application deadline
- Eligibility criteria
- Funding amount
- Application link or contact details

Ensure your response is organized, concise, and relevant to the user's topic. If no results are found, say no results found and do not show any news articles regarding the grant.

<|eot_id|><|start_header_id|>user<|end_header_id|>
Search for currently open grants available for applications as of ${new Date().toLocaleDateString()}, related to [insert grant topic]. Include details as specified above`,
          },
          {
            role: "user",
            content: `Tell me about research grants available for ${query} which I can apply to now.`,
          },
        ],
        venice_parameters: {
          enable_web_search: "on",
          include_venice_system_prompt: true,
        },
        frequency_penalty: 0,
        presence_penalty: 0,
        max_tokens: 1000,
        temperature: 0.2,
        top_p: 0.1,
        stream: false,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      },
    );

    console.log("Venice chat completions API response received");

    // Extract structured data from AI response
    if (
      response.data &&
      response.data.choices &&
      response.data.choices.length > 0
    ) {
      const aiContent = response.data.choices[0].message.content;
      console.log("AI response:", aiContent);

      // Process the AI response to extract grant information
      const grants = extractGrantsFromAIResponse(aiContent);

      return grants;
    }

    return [];
  } catch (error) {
    console.error("Error searching for grants with Venice:", error);
    throw new Error(
      "Failed to search for grants: " +
        (error instanceof Error ? error.message : "Unknown error"),
    );
  }
}

// Extract grant information from the AI's text response
function extractGrantsFromAIResponse(aiResponse: string): SearchResult[] {
  // Split the text into sections that might represent different grants
  const paragraphs = aiResponse.split(/\n\n+/);
  const grants: SearchResult[] = [];

  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i].trim();

    // Skip empty paragraphs
    if (!paragraph) continue;

    // Check if this paragraph looks like it contains a grant
    if (/grant|funding|award|scholarship|fellowship/i.test(paragraph)) {
      // Try to extract a title from the paragraph
      let title = "Untitled Grant";
      let url = "";
      let snippet = paragraph;

      // Extract URL if present
      const urlMatch = paragraph.match(
        /https?:\/\/[^\s()<>]+(?:\([^\s()<>]+\)|([^[:punct:]\s]|\/?))/,
      );
      if (urlMatch) {
        url = urlMatch[0];
        // Remove the URL from the snippet
        snippet = paragraph.replace(url, "").trim();
      }

      // Try to extract a title - usually at the beginning of the paragraph
      const titleMatch = paragraph.match(
        /^(.*?(?:Grant|Fund|Award|Program|Fellowship|Scholarship).*?)(?:\.|:|\n)/i,
      );
      if (titleMatch) {
        title = titleMatch[1].trim();
        // If we found a title, remove it from the snippet to avoid duplication
        if (title && title.length > 5) {
          snippet = snippet.replace(title, "").trim();
        }
      } else {
        // If no title with specific keywords, try to use the first sentence
        const firstSentenceMatch = paragraph.match(/^(.*?\.)\s/);
        if (firstSentenceMatch && firstSentenceMatch[1].length < 100) {
          title = firstSentenceMatch[1].trim();
          snippet = snippet.replace(title, "").trim();
        }
      }

      // Determine funding type based on organization and text content
      const fundingType = determineGrantType(paragraph, url, title);

      // Create the grant object with id and fundingType
      grants.push({
        id: i + 1, // Generate simple numeric ID based on index
        title: title || "Grant Opportunity",
        url: url || "",
        snippet: snippet || paragraph,
        organization: extractOrganization(url, title),
        amount: extractAmount(paragraph),
        deadline: extractDeadline(paragraph),
        fundingType: fundingType,
      });
    }
  }

  // If we couldn't extract structured grants, create a single entry with the whole response
  if (grants.length === 0 && aiResponse.length > 0) {
    grants.push({
      id: 1,
      title: "Available Grant Opportunities",
      url: "",
      snippet:
        aiResponse.substring(0, 500) + (aiResponse.length > 500 ? "..." : ""),
      organization: "Various Organizations",
      amount: extractAmount(aiResponse),
      deadline: extractDeadline(aiResponse),
      fundingType: "private", // Default to private if we can't determine
    });
  }

  return grants;
}

// Extract organization name from URL or title
function extractOrganization(url: string, title: string): string {
  // Try to extract from URL first
  const urlMatch = url.match(/https?:\/\/(?:www\.)?([^\/]+)/);
  if (urlMatch) {
    const domain = urlMatch[1];

    // Map common domains to organization names
    const domainMappings: Record<string, string> = {
      "researchprofessional.com": "Research Professional",
      "grants.gov": "US Government Grants",
      "ukri.org": "UK Research and Innovation",
      "ec.europa.eu": "European Commission",
      "gatesfoundation.org": "Bill & Melinda Gates Foundation",
      "nih.gov": "National Institutes of Health",
      "nsf.gov": "National Science Foundation",
      "wellcome.org": "Wellcome Trust",
      "leverhulme.ac.uk": "Leverhulme Trust",
      "fundingcentral.org.uk": "Funding Central UK",
    };

    for (const [domainPart, orgName] of Object.entries(domainMappings)) {
      if (domain.includes(domainPart)) {
        return orgName;
      }
    }

    // If no mapping, try to clean up the domain
    return domain
      .replace(/\.gov|\.org|\.edu|\.com|\.co\.uk|\.ac\.uk/g, "")
      .split(".")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  // If URL extraction fails, try from title
  const orgPrefixes = ["from", "by", "funded by", "provided by", "offered by"];

  for (const prefix of orgPrefixes) {
    const pattern = new RegExp(`${prefix}\\s+([\\w\\s&,]+)`, "i");
    const match = title.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return "Unknown Organization";
}

// Extract funding amount from text
function extractAmount(text: string): string {
  // Look for currency symbols followed by numbers with optional commas and decimal points
  const currencyRegex =
    /[$£€]\s*(\d{1,3}(,\d{3})*(\.\d+)?)\s*(million|m|k|thousand)?/gi;
  const numericRegex =
    /(\d{1,3}(,\d{3})*(\.\d+)?)\s*(million|m|k|thousand)?\s*(dollars|pounds|euros)?/gi;

  let match = currencyRegex.exec(text);
  if (match) {
    return match[0].trim();
  }

  match = numericRegex.exec(text);
  if (match) {
    return match[0].trim();
  }

  return "Funding amount not specified";
}

// Function to determine if a grant is from a government or private source
function determineGrantType(
  text: string,
  url: string,
  title: string,
): "government" | "private" {
  // Government indicators in domain or text
  const govDomains = [
    "gov",
    "government",
    "fed",
    "federal",
    "state",
    "council",
    "ministry",
    "department",
  ];
  const govKeywords = [
    "federal",
    "government",
    "national",
    "state",
    "public funding",
    "public grant",
  ];

  // Check URL for government domains
  if (url) {
    for (const domain of govDomains) {
      if (url.includes(`.${domain}.`) || url.includes(`/${domain}/`)) {
        return "government";
      }
    }
  }

  // Check text for government keywords
  const textToCheck = (text + " " + title).toLowerCase();
  for (const keyword of govKeywords) {
    if (textToCheck.includes(keyword.toLowerCase())) {
      return "government";
    }
  }

  // Check organization types that are typically government
  const govOrgs = [
    "national",
    "federal",
    "ministry",
    "department",
    "agency",
    "council",
    "NSF",
    "NIH",
    "CDC",
    "NASA",
    "DOE",
    "EPA",
    "USDA",
    "European Commission",
    "Research Council",
  ];

  const organization = extractOrganization(url, title);
  for (const org of govOrgs) {
    if (organization.toLowerCase().includes(org.toLowerCase())) {
      return "government";
    }
  }

  // Default to private if no government indicators found
  return "private";
}

// Extract deadlines from text
function extractDeadline(text: string): string {
  // Common date formats in text
  const datePatterns = [
    /deadline[:\s]*([\w\s,]+\d{1,2}(st|nd|rd|th)?[\s,]+\w+[\s,]+\d{4})/i,
    /due[:\s]*([\w\s,]+\d{1,2}(st|nd|rd|th)?[\s,]+\w+[\s,]+\d{4})/i,
    /closes[:\s]*([\w\s,]+\d{1,2}(st|nd|rd|th)?[\s,]+\w+[\s,]+\d{4})/i,
    /(\d{1,2}\/\d{1,2}\/\d{2,4})/,
    /(\d{1,2}-\d{1,2}-\d{2,4})/,
    /(\d{1,2}\s+\w+\s+\d{4})/,
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return "Deadline not specified";
}
