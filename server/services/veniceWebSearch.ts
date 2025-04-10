/**
 * Venice AI Web Search Service
 * This service is dedicated to handling web search requests to the Venice AI API
 */

import axios from "axios";
import { User } from "@shared/schema";
import { getRecommendedModel } from "./modelSelection";

// Interface for search results
export interface GrantSearchResult {
  id: number;
  title: string;
  url: string;
  snippet: string;
  organization?: string;
  amount?: string;
  deadline?: string;
  fundingType?: "government" | "private";
}

/**
 * Searches for grants using Venice AI's web search capabilities
 * Uses the exact curl format provided for consistency
 *
 * @param searchTerm The term to search for
 * @param user The user making the request (for model preferences)
 * @returns Array of grant search results
 */
// Export function for use in routes.ts
export async function searchGrantsOnWeb(
  searchTerm: string,
  user?: User,
): Promise<GrantSearchResult[]> {
  if (!process.env.VENICE_API_KEY) {
    throw new Error("VENICE_API_KEY is not set");
  }

  try {
    const apiKey = process.env.VENICE_API_KEY;
    console.log(`Searching for grants with term: "${searchTerm}"`);

    // Get user's preferred model if set
    const userPreference =
      user?.preferredLlmModel && user.preferredLlmModel !== "venice"
        ? user.preferredLlmModel
        : undefined;
    const modelToUse = getRecommendedModel("grantFinder", userPreference);

    console.log(`Using model: ${modelToUse}`);

    // Create request payload - using exact format from curl example
    const payload = {
      model: modelToUse,
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that searchs the web for all the relevant grants available and are open now to apply and returns the web search results to me",
        },
        {
          role: "user",
          content: `Tell me about research grants available for ${searchTerm}`,
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
    };

    console.log(
      "Sending request to Venice AI with payload:",
      JSON.stringify(payload, null, 2),
    );

    // Using exact format from curl example
    const response = await axios.post(
      "https://api.venice.ai/api/v1/chat/completions",
      payload,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    console.log(
      "Venice AI web search response received with status:",
      response.status,
    );
    console.log("Response data structure:", Object.keys(response.data));

    if (
      response.data &&
      response.data.choices &&
      response.data.choices.length > 0
    ) {
      const aiResponse = response.data.choices[0].message.content;
      console.log(
        "AI response content sample (first 100 chars):",
        aiResponse.substring(0, 100),
      );

      // Get citations if they exist
      const citations =
        response.data.venice_parameters?.web_search_citations || [];
      console.log("Web search citations:", JSON.stringify(citations, null, 2));

      // Process the AI response to extract grant information
      const grants = processWebSearchResults(aiResponse, searchTerm, citations);
      console.log(`Extracted ${grants.length} grant results from response`);

      return grants;
    } else {
      console.log(
        "No valid choices in response data:",
        JSON.stringify(response.data, null, 2),
      );
    }

    return [];
  } catch (error: any) {
    console.error("Error searching for grants with Venice AI:", error);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
    throw new Error(
      "Failed to search for grants: " +
        (error instanceof Error ? error.message : "Unknown error"),
    );
  }
}

/**
 * Processes the AI response to extract structured grant information
 *
 * @param aiResponse The raw text response from the AI
 * @param searchTerm The original search term used
 * @param citations Web search citations if available
 * @returns Array of structured grant results
 */
function processWebSearchResults(
  aiResponse: string,
  searchTerm: string,
  citations: any[] = [],
): GrantSearchResult[] {
  const grants: GrantSearchResult[] = [];

  // First, use citations if available (more accurate)
  if (citations && citations.length > 0) {
    console.log(`Processing ${citations.length} citations`);

    citations.forEach((citation, index) => {
      try {
        // Check if this citation looks like it contains a grant
        if (
          citation &&
          (/grant|funding|award|scholarship|fellowship/i.test(citation.title) ||
            /grant|funding|award|scholarship|fellowship/i.test(
              citation.content,
            ))
        ) {
          const title = citation.title || "Untitled Grant";
          const url = citation.url || "";
          const snippet = citation.content || "";
          const date = citation.date
            ? new Date(citation.date).toISOString()
            : undefined;

          // Extract deadline with improved method
          let deadline = date;
          if (!deadline) {
            const extractedDeadline = extractDeadline(snippet);
            if (extractedDeadline) {
              try {
                // Try to parse as a date
                const parsedDate = new Date(extractedDeadline);
                if (!isNaN(parsedDate.getTime())) {
                  deadline = parsedDate.toISOString();
                } else {
                  deadline = extractedDeadline;
                }
              } catch (e) {
                deadline = extractedDeadline;
              }
            }
          }

          // Determine funding type
          const fundingType = determineGrantType(snippet, url, title);

          // Create the grant object with numeric ID
          grants.push({
            id: Number(index) + 1, // Ensure it's always a number
            title: title,
            url: url,
            snippet: snippet,
            organization: extractOrganization(url, title),
            amount: extractAmount(snippet),
            deadline: deadline || "",
            fundingType: fundingType,
          });
        }
      } catch (err) {
        console.error(`Error processing citation ${index}:`, err);
        // Skip this citation and continue
      }
    });

    console.log(`Created ${grants.length} grants from citations`);
  }

  // If we didn't get any grants from citations, fall back to processing the AI response text
  if (grants.length === 0) {
    console.log(
      "No grants from citations, falling back to AI response text parsing",
    );

    try {
      // Split the text into sections that might represent different grants
      const paragraphs = aiResponse.split(/\n\n+/);

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

          // Create the grant object with ensured numeric ID
          grants.push({
            id: Number(i) + 1, // Ensure it's always a number
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
    } catch (err) {
      console.error("Error processing AI response text:", err);
      // Continue with whatever grants we have
    }

    // If we still couldn't extract structured grants, create a single entry with the whole response
    if (grants.length === 0 && aiResponse.length > 0) {
      try {
        grants.push({
          id: 1, // Always a valid number
          title: `Grant Opportunities for ${searchTerm}`,
          url: "",
          snippet:
            aiResponse.substring(0, 500) +
            (aiResponse.length > 500 ? "..." : ""),
          organization: "Various Organizations",
          amount: extractAmount(aiResponse),
          deadline: extractDeadline(aiResponse),
          fundingType: "private", // Default to private if we can't determine
        });
      } catch (err) {
        console.error("Error creating fallback grant:", err);
        // Create an absolute minimum grant object if all else fails
        grants.push({
          id: 999, // Guaranteed valid numeric ID
          title: `Grant Opportunities for ${searchTerm}`,
          url: "",
          snippet: "Unable to process response data",
          organization: "Unknown Organization",
          amount: "Unknown",
          deadline: "Unknown",
          fundingType: "private",
        });
      }
    }
  }

  // Final safety check to make sure all grants have valid numeric IDs
  console.log("Final grant processing - ensuring all IDs are valid numbers");
  return grants.map((grant, index) => {
    // Create a new object to avoid reference issues
    const validGrant = { ...grant };

    // Force the id to be a valid number
    if (isNaN(Number(validGrant.id))) {
      console.log(
        `Found invalid ID (${validGrant.id}), replacing with index ${index + 1}`,
      );
      validGrant.id = index + 1;
    } else {
      validGrant.id = Number(validGrant.id);
    }

    return validGrant;
  });
}

/**
 * Function to determine if a grant is from a government or private source
 *
 * @param text The grant text content
 * @param url The grant URL if available
 * @param title The grant title
 * @returns 'government' or 'private' indicating the funding type
 */
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

/**
 * Extract organization name from URL or title
 *
 * @param url The grant URL if available
 * @param title The grant title
 * @returns Organization name or default value
 */
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

/**
 * Extract funding amount from text
 *
 * @param text The grant text content
 * @returns Funding amount as string or default value
 */
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

/**
 * Extract deadline from text
 *
 * @param text The grant text content
 * @returns Deadline date as string or default value
 */
function extractDeadline(text: string): string {
  // Common date formats in text
  const datePatterns = [
    /deadline[:\s]*([\w\s,]+\d{1,2}(st|nd|rd|th)?[\s,]+\w+[\s,]+\d{4})/i,
    /due[:\s]*([\w\s,]+\d{1,2}(st|nd|rd|th)?[\s,]+\w+[\s,]+\d{4})/i,
    /closes[:\s]*([\w\s,]+\d{1,2}(st|nd|rd|th)?[\s,]+\w+[\s,]+\d{4})/i,
    /(\d{1,2}\/\d{1,2}\/\d{2,4})/,
    /(\d{1,2}-\d{1,2}-\d{2,4})/,
    /(\d{1,2}\s+\w+\s+\d{4})/,
    /(\w+\s+\d{1,2}(st|nd|rd|th)?,?\s+\d{4})/i, // "May 15th, 2024" or "May 15 2024"
    /until\s+(\w+\s+\d{1,2}(st|nd|rd|th)?,?\s+\d{4})/i, // "until May 15th, 2024"
    /before\s+(\w+\s+\d{1,2}(st|nd|rd|th)?,?\s+\d{4})/i, // "before May 15th, 2024"
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      try {
        // Try to parse the date string
        const dateStr = match[1].trim();
        const parsedDate = new Date(dateStr);

        // Check if it's a valid date
        if (!isNaN(parsedDate.getTime())) {
          // Return in ISO format for reliable parsing
          return parsedDate.toISOString();
        }

        // If direct parsing fails, return the raw matched string
        return dateStr;
      } catch (e) {
        // Just return the raw matched string if parsing fails
        return match[1].trim();
      }
    }
  }

  // Check for year patterns that might indicate deadline
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;
  const yearPatterns = [
    new RegExp(`(${currentYear}|${nextYear})[\\/\\-]\\d{1,2}[\\/\\-]\\d{1,2}`), // 2024/05/15
    new RegExp(`\\d{1,2}[\\/\\-]\\d{1,2}[\\/\\-](${currentYear}|${nextYear})`), // 05/15/2024
  ];

  for (const pattern of yearPatterns) {
    const match = text.match(pattern);
    if (match && match[0]) {
      return match[0].trim();
    }
  }

  // No date found
  return "";
}
