import axios from 'axios';
import * as cheerio from 'cheerio';
import { InsertGrant } from '@shared/schema';

/**
 * Interface for grant data sources
 */
interface GrantSource {
  name: string;
  fetchGrants: () => Promise<InsertGrant[]>;
}

/**
 * UK Research and Innovation (UKRI) grant source
 * Uses a mix of API and web scraping
 */
const UKRISource: GrantSource = {
  name: 'UK Research and Innovation',
  fetchGrants: async () => {
    try {
      console.log('Fetching grants from UKRI...');
      
      // Attempt to use their API endpoint (hypothetical)
      // In a real implementation, this would use their actual API if available
      try {
        const response = await axios.get('https://www.ukri.org/opportunity/');
        const $ = cheerio.load(response.data);
        
        const grants: InsertGrant[] = [];
        
        // Extract grant information from the page
        $('.opportunity-card').each((_, element) => {
          const title = $(element).find('.opportunity-card__title').text().trim();
          const description = $(element).find('.opportunity-card__content').text().trim();
          const organization = 'UK Research and Innovation';
          const url = $(element).find('a').attr('href') || '';
          const deadlineText = $(element).find('.opportunity-meta__date').text().trim();
          
          // Process dates and other metadata
          let deadline = '';
          if (deadlineText) {
            // Extract and format date
            const dateMatch = deadlineText.match(/(\d{1,2}\s+\w+\s+\d{4})/);
            if (dateMatch) {
              deadline = dateMatch[1];
            }
          }
          
          // Amount typically shown as range
          const amountText = $(element).find('.opportunity-meta__amount').text().trim();
          const amount = amountText || 'Varies';
          
          // Category from the type of grant
          const category = $(element).find('.opportunity-card__tag').text().trim() || 'Research';
          
          grants.push({
            title,
            description,
            organization,
            url,
            deadline,
            amount,
            category,
            status: 'open',
            country: 'United Kingdom'
          });
        });
        
        return grants;
      } catch (error) {
        console.error('Error fetching from UKRI website, using fallback data:', error);
        
        // If API/scraping fails, provide a small set of known grants
        return [
          {
            title: 'UKRI Open Research Fund',
            description: 'Funding to support projects that advance open research practices.',
            organization: 'UK Research and Innovation',
            url: 'https://www.ukri.org/opportunity/ukri-open-research-fund/',
            deadline: '31 December 2023',
            amount: '£5,000 - £50,000',
            category: 'Open Research',
            status: 'open',
            country: 'United Kingdom'
          },
          {
            title: 'AHRC-ESRC Business-led Innovation Partnerships',
            description: 'Funding for business-led partnerships with researchers in the arts, humanities and social sciences.',
            organization: 'UK Research and Innovation',
            url: 'https://www.ukri.org/opportunity/ahrc-esrc-business-led-innovation-partnerships/',
            deadline: '2 May 2024',
            amount: 'Up to £1 million',
            category: 'Business Innovation',
            status: 'open',
            country: 'United Kingdom'
          }
        ];
      }
    } catch (error) {
      console.error('Error in UKRI grant source:', error);
      return [];
    }
  }
};

/**
 * Innovate UK grant source
 */
const InnovateUKSource: GrantSource = {
  name: 'Innovate UK',
  fetchGrants: async () => {
    try {
      console.log('Fetching grants from Innovate UK...');
      
      // In a real implementation, attempt to use API or web scraping
      // For now, return sample data
      return [
        {
          title: 'Innovate UK Smart Grants',
          description: 'For disruptive R&D innovations that can significantly impact the UK economy.',
          organization: 'Innovate UK',
          url: 'https://www.ukri.org/councils/innovate-uk/smart-grants/',
          deadline: '24 May 2024',
          amount: '£25,000 - £500,000',
          category: 'R&D Innovation',
          status: 'open',
          country: 'United Kingdom'
        },
        {
          title: 'Knowledge Transfer Partnerships',
          description: 'Connecting businesses with academic institutions to deliver innovation projects.',
          organization: 'Innovate UK',
          url: 'https://www.ukri.org/councils/innovate-uk/knowledge-transfer-partnerships/',
          deadline: 'Ongoing',
          amount: 'Varies by project size',
          category: 'Knowledge Transfer',
          status: 'open',
          country: 'United Kingdom'
        }
      ];
    } catch (error) {
      console.error('Error in Innovate UK grant source:', error);
      return [];
    }
  }
};

/**
 * Bill & Melinda Gates Foundation grant source
 */
const GatesFoundationSource: GrantSource = {
  name: 'Bill & Melinda Gates Foundation',
  fetchGrants: async () => {
    try {
      console.log('Fetching grants from Gates Foundation...');
      
      // Fetch from their website
      try {
        const response = await axios.get('https://www.gatesfoundation.org/ideas/open-calls');
        const $ = cheerio.load(response.data);
        
        const grants: InsertGrant[] = [];
        
        // Extract grant information from the page
        $('.open-call-card').each((_, element) => {
          const title = $(element).find('.open-call-card__title').text().trim();
          const description = $(element).find('.open-call-card__description').text().trim();
          const organization = 'Bill & Melinda Gates Foundation';
          const url = 'https://www.gatesfoundation.org' + ($(element).find('a').attr('href') || '');
          
          // Other metadata if available
          const deadlineText = $(element).find('.open-call-card__deadline').text().trim();
          const deadline = deadlineText.replace('Deadline:', '').trim();
          
          // Category from tags
          const category = $(element).find('.open-call-card__focus-area').text().trim() || 'Global Health';
          
          grants.push({
            title,
            description,
            organization,
            url,
            deadline,
            amount: 'Varies',
            category,
            status: 'open',
            country: 'Global'
          });
        });
        
        // If we successfully extracted grants, return them
        if (grants.length > 0) {
          return grants;
        }
        
        // Otherwise fall back to sample data
        throw new Error('No grants found on the page');
        
      } catch (error) {
        console.error('Error fetching from Gates Foundation website, using fallback data:', error);
        
        // Fallback to sample data
        return [
          {
            title: 'Grand Challenges Explorations',
            description: 'Seeking innovative ideas to address key global health and development challenges.',
            organization: 'Bill & Melinda Gates Foundation',
            url: 'https://gcgh.grandchallenges.org/challenges',
            deadline: 'Various deadlines',
            amount: 'Up to $100,000 initial funding',
            category: 'Global Health',
            status: 'open',
            country: 'Global'
          },
          {
            title: 'Agricultural Development Initiative',
            description: 'Supporting sustainable agricultural solutions for smallholder farmers.',
            organization: 'Bill & Melinda Gates Foundation',
            url: 'https://www.gatesfoundation.org/our-work/programs/global-growth-and-opportunity/agricultural-development',
            deadline: '1 June 2024',
            amount: 'Varies by project',
            category: 'Agricultural Development',
            status: 'open',
            country: 'Global'
          }
        ];
      }
    } catch (error) {
      console.error('Error in Gates Foundation grant source:', error);
      return [];
    }
  }
};

/**
 * Grants Online UK grant source
 */
const GrantsOnlineSource: GrantSource = {
  name: 'Grants Online UK',
  fetchGrants: async () => {
    try {
      console.log('Fetching grants from Grants Online UK...');
      
      // In a real implementation, attempt to use API or web scraping
      // For now, return sample data
      return [
        {
          title: 'National Lottery Community Fund',
          description: 'Grants to help communities across the UK to thrive.',
          organization: 'National Lottery Community Fund',
          url: 'https://www.tnlcommunityfund.org.uk/funding',
          deadline: 'Various deadlines',
          amount: '£300 - £500,000',
          category: 'Community Development',
          status: 'open',
          country: 'United Kingdom'
        },
        {
          title: 'Arts Council England Project Grants',
          description: 'Funding for arts, museums and libraries projects that engage people in England.',
          organization: 'Arts Council England',
          url: 'https://www.artscouncil.org.uk/project-grants',
          deadline: 'Ongoing',
          amount: '£1,000 - £100,000',
          category: 'Arts and Culture',
          status: 'open',
          country: 'England'
        }
      ];
    } catch (error) {
      console.error('Error in Grants Online UK source:', error);
      return [];
    }
  }
};

/**
 * Array of all grant sources
 */
export const grantSources: GrantSource[] = [
  UKRISource,
  InnovateUKSource,
  GatesFoundationSource,
  GrantsOnlineSource
];

/**
 * Fetch grants from all configured sources
 */
export async function fetchGrantsFromAllSources(): Promise<InsertGrant[]> {
  try {
    console.log(`Fetching grants from ${grantSources.length} sources...`);
    
    const allGrantsPromises = grantSources.map(source => source.fetchGrants());
    const results = await Promise.allSettled(allGrantsPromises);
    
    let allGrants: InsertGrant[] = [];
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        console.log(`Successfully fetched ${result.value.length} grants from ${grantSources[index].name}`);
        allGrants = [...allGrants, ...result.value];
      } else {
        console.error(`Failed to fetch grants from ${grantSources[index].name}:`, result.reason);
      }
    });
    
    console.log(`Total grants fetched: ${allGrants.length}`);
    return allGrants;
  } catch (error) {
    console.error('Error fetching from all sources:', error);
    return [];
  }
}

/**
 * Fetch grants from a specific source by name
 */
export async function fetchGrantsFromSource(sourceName: string): Promise<InsertGrant[]> {
  try {
    const source = grantSources.find(s => 
      s.name.toLowerCase().includes(sourceName.toLowerCase())
    );
    
    if (!source) {
      console.error(`Source not found: ${sourceName}`);
      return [];
    }
    
    console.log(`Fetching grants from ${source.name}...`);
    const grants = await source.fetchGrants();
    console.log(`Fetched ${grants.length} grants from ${source.name}`);
    
    return grants;
  } catch (error) {
    console.error(`Error fetching from source ${sourceName}:`, error);
    return [];
  }
}