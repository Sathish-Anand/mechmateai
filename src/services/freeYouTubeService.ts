class FreeYouTubeService {

  async getDiagnosticVideos(make: string, model: string, year: number, issueDescription: string, possibleCauses?: string[]) {
    try {
      // Generate multiple search queries for better coverage
      const searchQueries = this.generateSearchQueries(make, model, year, issueDescription, possibleCauses);

      // Create video recommendations based on search queries
      const videos = searchQueries.map((query, index) => ({
        id: `yt_${index + 1}`,
        title: this.generateVideoTitle(query),
        description: this.generateVideoDescription(query, make, model, year),
        url: this.generateYouTubeSearchURL(query),
        channelTitle: this.suggestChannelType(query),
        thumbnail: null, // We can't get thumbnails without API
        duration: null,
        viewCount: null,
        publishedAt: null,
      }));

      return videos;
    } catch (error) {
      console.error('Error generating YouTube videos:', error);
      return this.getFallbackVideos(make, model, year, issueDescription);
    }
  }

  // Enhanced method with AI diagnosis, engine type, and OBDII codes
  async getEnhancedVideoRecommendations(make: string, model: string, year: number, aiDiagnosis: any, engine?: string, obdiiCodes?: string) {
    try {
      // Generate enhanced search queries with more details
      const searchQueries = this.generateEnhancedSearchQueries(make, model, year, aiDiagnosis, engine, obdiiCodes);

      // Create video recommendations based on enhanced search queries
      const videos = searchQueries.map((query, index) => ({
        id: `yt_enhanced_${index + 1}`,
        title: this.generateEnhancedVideoTitle(query, aiDiagnosis),
        description: this.generateEnhancedVideoDescription(query, make, model, year, engine),
        url: this.generateYouTubeSearchURL(query),
        channelTitle: this.suggestChannelType(query),
        thumbnail: null,
        duration: null,
        viewCount: null,
        publishedAt: null,
      }));

      return videos;
    } catch (error) {
      console.error('Error generating enhanced YouTube videos:', error);
      return this.getFallbackVideos(make, model, year, aiDiagnosis.diagnosis || 'general issue');
    }
  }

  private generateEnhancedSearchQueries(make: string, model: string, year: number, aiDiagnosis: any, engine?: string, obdiiCodes?: string): string[] {
    const vehicleInfo = `${year} ${make} ${model}`;
    const engineInfo = engine ? ` ${engine}` : '';
    const cleanTitle = aiDiagnosis.title?.toLowerCase().replace(/[^\w\s]/g, ' ').trim() || '';
    const queries = [];

    // Main diagnostic query with AI diagnosis title
    if (cleanTitle) {
      queries.push(`${vehicleInfo}${engineInfo} ${cleanTitle} repair tutorial`);
    }

    // OBDII code specific queries if provided
    if (obdiiCodes && obdiiCodes.trim()) {
      const codes = obdiiCodes.split(/[,\s]+/).filter(code => code.trim());
      codes.slice(0, 1).forEach(code => {
        queries.push(`${vehicleInfo} ${code.trim()} error code fix tutorial`);
      });
    }

    // Cause-specific queries from AI diagnosis
    if (aiDiagnosis.possibleCauses && aiDiagnosis.possibleCauses.length > 0) {
      const topCause = aiDiagnosis.possibleCauses[0]?.toLowerCase().replace(/[^\w\s]/g, ' ').trim();
      if (topCause && topCause.length > 5) {
        queries.push(`${vehicleInfo}${engineInfo} ${topCause.substring(0, 30)} repair`);
      }
    }

    // Fallback to general repair if no specific queries
    if (queries.length === 0) {
      queries.push(`${vehicleInfo}${engineInfo} repair troubleshooting`);
      queries.push(`${vehicleInfo} common problems fix`);
      queries.push(`${make} ${model} DIY repair guide`);
    }

    return queries.slice(0, 3); // Limit to 3 videos
  }

  private generateEnhancedVideoTitle(query: string, aiDiagnosis: any): string {
    const keywords = query.split(' ');
    const make = keywords.find(k => ['toyota', 'honda', 'ford', 'bmw', 'mercedes', 'audi', 'volkswagen', 'nissan', 'mazda', 'subaru', 'hyundai', 'kia', 'chevrolet', 'dodge', 'jeep'].includes(k.toLowerCase()));
    const year = keywords.find(k => /^\d{4}$/.test(k) && parseInt(k) > 1990 && parseInt(k) <= new Date().getFullYear());

    // Use AI diagnosis title if available
    if (aiDiagnosis.title) {
      return `${make ? make.toUpperCase() : 'Vehicle'} ${year || ''} - ${aiDiagnosis.title} Repair Guide`;
    }

    // Check for specific patterns in query
    if (query.includes('error code') || query.includes('P0')) {
      return `${make ? make.toUpperCase() : 'Vehicle'} Error Code Fix - Step by Step Tutorial`;
    } else if (query.includes('repair tutorial')) {
      return `${make ? make.toUpperCase() : 'Vehicle'} ${year || ''} Repair Tutorial - Professional Guide`;
    } else {
      return `${make ? make.toUpperCase() : 'Vehicle'} Repair - Expert Tips & Solutions`;
    }
  }

  private generateEnhancedVideoDescription(query: string, make: string, model: string, year: number, engine?: string): string {
    const vehicleInfo = `${year} ${make} ${model}`;
    const engineInfo = engine ? ` with ${engine} engine` : '';

    if (query.includes('error code')) {
      return `Complete guide to diagnosing and fixing error codes in ${vehicleInfo}${engineInfo}. OBDII troubleshooting made easy.`;
    } else if (query.includes('repair tutorial')) {
      return `Professional repair tutorial for ${vehicleInfo}${engineInfo}. Tools, parts, and step-by-step instructions.`;
    } else {
      return `Expert repair guide for ${vehicleInfo}${engineInfo}. Learn professional techniques and save money on repairs.`;
    }
  }

  private generateSearchQueries(make: string, model: string, year: number, issue: string, causes?: string[]): string[] {
    const vehicleInfo = `${year} ${make} ${model}`;
    const cleanIssue = this.cleanIssueDescription(issue);
    const queries = [];

    // Main diagnostic query
    queries.push(`${vehicleInfo} ${cleanIssue} diagnosis repair`);

    // How-to repair query
    queries.push(`how to fix ${cleanIssue} ${make} ${model}`);

    // Troubleshooting query
    queries.push(`${vehicleInfo} ${cleanIssue} troubleshooting`);

    // Cause-specific queries based on AI diagnosis
    if (causes && causes.length > 0) {
      causes.slice(0, 2).forEach(cause => {
        const cleanCause = cause.toLowerCase().replace(/[^\w\s]/g, '').trim();
        if (cleanCause.length > 5) {
          queries.push(`${vehicleInfo} ${cleanCause} repair tutorial`);
        }
      });
    }

    // DIY repair query
    queries.push(`${vehicleInfo} ${cleanIssue} DIY repair`);

    return queries.slice(0, 3); // Limit to 3 videos
  }

  private cleanIssueDescription(issue: string): string {
    return issue
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove special characters
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim()
      .substring(0, 50); // Limit length for better search results
  }

  private generateVideoTitle(query: string): string {
    const keywords = query.split(' ');
    const make = keywords.find(k => ['toyota', 'honda', 'ford', 'bmw', 'mercedes', 'audi', 'volkswagen', 'nissan', 'mazda', 'subaru', 'hyundai', 'kia', 'chevrolet', 'dodge', 'jeep'].includes(k.toLowerCase()));
    const year = keywords.find(k => /^\d{4}$/.test(k) && parseInt(k) > 1990 && parseInt(k) <= new Date().getFullYear());

    if (query.includes('diagnosis')) {
      return `${make ? make.toUpperCase() : 'Vehicle'} Diagnostic Guide - Common Issues & Solutions`;
    } else if (query.includes('how to fix')) {
      return `How to Fix: ${make ? make.toUpperCase() : ''} ${year || ''} Repair Tutorial`;
    } else if (query.includes('troubleshooting')) {
      return `${make ? make.toUpperCase() : 'Vehicle'} Troubleshooting Guide - Step by Step`;
    } else if (query.includes('DIY')) {
      return `DIY Repair: ${make ? make.toUpperCase() : 'Vehicle'} ${year || ''} - Save Money!`;
    } else {
      return `${make ? make.toUpperCase() : 'Vehicle'} Repair Tutorial - Professional Tips`;
    }
  }

  private generateVideoDescription(query: string, make: string, model: string, year: number): string {
    const vehicleInfo = `${year} ${make} ${model}`;

    if (query.includes('diagnosis')) {
      return `Professional diagnostic guide for ${vehicleInfo}. Learn to identify symptoms, understand error codes, and determine root causes.`;
    } else if (query.includes('how to fix')) {
      return `Step-by-step repair tutorial for ${vehicleInfo}. Tools needed, parts required, and detailed instructions for DIY repair.`;
    } else if (query.includes('troubleshooting')) {
      return `Complete troubleshooting guide for ${vehicleInfo}. Systematic approach to identify and resolve common issues.`;
    } else if (query.includes('DIY')) {
      return `DIY repair guide for ${vehicleInfo}. Save money with this detailed tutorial covering tools, parts, and procedures.`;
    } else {
      return `Professional repair tutorial for ${vehicleInfo}. Expert tips and techniques for successful repair and maintenance.`;
    }
  }

  private generateYouTubeSearchURL(query: string): string {
    try {
      if (!query || typeof query !== 'string' || query.trim() === '') {
        console.error('Invalid query for YouTube URL generation:', query);
        return 'https://www.youtube.com/results?search_query=automotive+repair';
      }

      const cleanQuery = query.trim();
      const encodedQuery = encodeURIComponent(cleanQuery);
      const url = `https://www.youtube.com/results?search_query=${encodedQuery}`;

      console.log('Generated YouTube URL:', url);
      return url;
    } catch (error) {
      console.error('Error generating YouTube URL:', error);
      return 'https://www.youtube.com/results?search_query=automotive+repair';
    }
  }

  private suggestChannelType(query: string): string {
    if (query.includes('DIY')) {
      return 'DIY Automotive Channel';
    } else if (query.includes('diagnosis')) {
      return 'Automotive Diagnostic Expert';
    } else if (query.includes('how to fix')) {
      return 'Repair Tutorial Channel';
    } else if (query.includes('troubleshooting')) {
      return 'Automotive Technician';
    } else {
      return 'Professional Mechanic';
    }
  }

  private getFallbackVideos(make: string, model: string, year: number, issue: string): any[] {
    const vehicleInfo = `${year} ${make} ${model}`;

    return [
      {
        id: 'yt_fallback_1',
        title: `${make.toUpperCase()} ${model.toUpperCase()} Repair Guide - Common Issues`,
        description: `Comprehensive repair guide for ${vehicleInfo} covering common problems and solutions.`,
        url: this.generateYouTubeSearchURL(`${vehicleInfo} repair common problems`),
        channelTitle: 'Automotive Repair Channel',
        thumbnail: null,
        duration: null,
        viewCount: null,
        publishedAt: null,
      },
      {
        id: 'yt_fallback_2',
        title: `How to Diagnose ${make.toUpperCase()} Problems - Step by Step`,
        description: `Professional diagnostic techniques for ${make} vehicles. Learn to identify issues quickly and accurately.`,
        url: this.generateYouTubeSearchURL(`${make} diagnostic troubleshooting guide`),
        channelTitle: 'Professional Mechanic',
        thumbnail: null,
        duration: null,
        viewCount: null,
        publishedAt: null,
      },
      {
        id: 'yt_fallback_3',
        title: `${vehicleInfo} Maintenance Tips - Prevent Future Issues`,
        description: `Essential maintenance guide for ${vehicleInfo} to prevent common problems and extend vehicle life.`,
        url: this.generateYouTubeSearchURL(`${vehicleInfo} maintenance schedule tips`),
        channelTitle: 'Automotive Maintenance Expert',
        thumbnail: null,
        duration: null,
        viewCount: null,
        publishedAt: null,
      },
    ];
  }

  // Alternative method: Generate specific video types based on issue categories
  async getSpecificRepairVideos(make: string, model: string, year: number, issueCategory: string, specificIssue: string) {
    const vehicleInfo = `${year} ${make} ${model}`;
    const videos = [];

    switch (issueCategory.toLowerCase()) {
      case 'engine':
        videos.push(
          {
            id: 'engine_1',
            title: `${make.toUpperCase()} Engine Problems - Diagnosis & Repair`,
            description: `Complete guide to diagnosing and repairing engine issues in ${vehicleInfo}. Covers common symptoms and solutions.`,
            url: this.generateYouTubeSearchURL(`${vehicleInfo} engine problems repair tutorial`),
            channelTitle: 'Engine Repair Specialist',
          },
          {
            id: 'engine_2',
            title: `How to Fix Engine Issues - ${make.toUpperCase()} ${model.toUpperCase()}`,
            description: `Step-by-step repair guide for engine problems. Tools, parts, and detailed procedures for DIY repair.`,
            url: this.generateYouTubeSearchURL(`${vehicleInfo} engine repair DIY tutorial`),
            channelTitle: 'DIY Automotive',
          }
        );
        break;

      case 'brake':
        videos.push(
          {
            id: 'brake_1',
            title: `${make.toUpperCase()} Brake System Repair - Complete Guide`,
            description: `Professional brake repair guide for ${vehicleInfo}. Safety procedures and detailed instructions.`,
            url: this.generateYouTubeSearchURL(`${vehicleInfo} brake repair replacement tutorial`),
            channelTitle: 'Brake Specialist',
          },
          {
            id: 'brake_2',
            title: `Brake Problems Diagnosis - ${vehicleInfo}`,
            description: `Learn to identify brake problems early. Symptoms, causes, and repair recommendations.`,
            url: this.generateYouTubeSearchURL(`${vehicleInfo} brake problems diagnosis squealing`),
            channelTitle: 'Automotive Safety Expert',
          }
        );
        break;

      case 'transmission':
        videos.push(
          {
            id: 'trans_1',
            title: `${make.toUpperCase()} Transmission Issues - Repair Guide`,
            description: `Comprehensive transmission repair guide for ${vehicleInfo}. Common problems and solutions.`,
            url: this.generateYouTubeSearchURL(`${vehicleInfo} transmission problems repair`),
            channelTitle: 'Transmission Specialist',
          }
        );
        break;

      case 'electrical':
        videos.push(
          {
            id: 'elec_1',
            title: `${make.toUpperCase()} Electrical Problems - Troubleshooting`,
            description: `Electrical system diagnosis for ${vehicleInfo}. Wiring, fuses, and component testing.`,
            url: this.generateYouTubeSearchURL(`${vehicleInfo} electrical problems troubleshooting`),
            channelTitle: 'Automotive Electrician',
          }
        );
        break;

      default:
        videos.push(
          {
            id: 'general_1',
            title: `${vehicleInfo} Repair Guide - ${specificIssue}`,
            description: `Professional repair guide for ${specificIssue} in ${vehicleInfo}. Expert tips and procedures.`,
            url: this.generateYouTubeSearchURL(`${vehicleInfo} ${specificIssue} repair tutorial`),
            channelTitle: 'Professional Mechanic',
          }
        );
    }

    return videos;
  }

  // Enhanced search with multiple search strategies
  async getEnhancedVideoRecommendations(make: string, model: string, year: number, diagnosis: any) {
    const videos = [];
    const vehicleInfo = `${year} ${make} ${model}`;

    // Strategy 1: Direct issue search with enhanced search terms
    if (diagnosis.title) {
      videos.push({
        id: 'enhanced_1',
        title: `${diagnosis.title} Fix - ${year} ${make} ${model} Step-by-Step Guide`,
        description: `Professional mechanic shows how to diagnose and repair ${diagnosis.title.toLowerCase()} in your ${vehicleInfo}. Includes tools needed, parts identification, and complete repair procedure.`,
        url: this.generateYouTubeSearchURL(`${vehicleInfo} ${diagnosis.title} repair fix how to tutorial mechanic`),
        channelTitle: 'Professional Mechanic',
        thumbnail: null,
        duration: null,
        viewCount: null,
        publishedAt: null,
      });
    }

    // Strategy 2: Cause-based searches with specific vehicle targeting
    if (diagnosis.possibleCauses && diagnosis.possibleCauses.length > 0) {
      diagnosis.possibleCauses.slice(0, 2).forEach((cause: string, index: number) => {
        const cleanCause = cause.replace(/[^\w\s]/g, ' ').trim();
        videos.push({
          id: `cause_${index + 1}`,
          title: `${cleanCause} Repair - ${year} ${make} ${model} Diagnostic Guide`,
          description: `Expert diagnosis and repair guide for ${cleanCause.toLowerCase()} problems in ${vehicleInfo}. Covers symptoms, testing procedures, parts needed, and complete repair steps.`,
          url: this.generateYouTubeSearchURL(`${vehicleInfo} ${cleanCause} repair fix diagnostic tutorial symptoms`),
          channelTitle: index === 0 ? 'Automotive Diagnostic Expert' : 'Professional Repair Channel',
          thumbnail: null,
          duration: null,
          viewCount: null,
          publishedAt: null,
        });
      });
    }

    // Strategy 3: General maintenance for prevention
    videos.push({
      id: 'maintenance_1',
      title: `${vehicleInfo} Maintenance Guide - Prevent Future Issues`,
      description: `Essential maintenance schedule and tips for ${vehicleInfo} to prevent common problems and ensure reliability.`,
      url: this.generateYouTubeSearchURL(`${vehicleInfo} maintenance schedule guide`),
      channelTitle: 'Maintenance Expert',
      thumbnail: null,
      duration: null,
      viewCount: null,
      publishedAt: null,
    });

    // Strategy 4: Cost-saving DIY approach
    if (diagnosis.difficulty === 'EASY' || diagnosis.difficulty === 'MODERATE') {
      videos.push({
        id: 'diy_1',
        title: `DIY ${diagnosis.title || 'Repair'} - Save Money on ${make.toUpperCase()}`,
        description: `Money-saving DIY guide for ${vehicleInfo}. Complete tutorial with tools list and safety tips.`,
        url: this.generateYouTubeSearchURL(`${vehicleInfo} DIY repair tutorial save money`),
        channelTitle: 'DIY Automotive Channel',
        thumbnail: null,
        duration: null,
        viewCount: null,
        publishedAt: null,
      });
    }

    return videos.slice(0, 5); // Limit to 5 videos for better UX
  }
}

export const freeYouTubeService = new FreeYouTubeService();