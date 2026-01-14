export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  url: string;
  channelTitle: string;
  publishedAt: string;
  duration?: string;
  viewCount?: string;
}

export const youtubeService = {
  /**
   * Search YouTube for videos related to vehicle issues
   */
  async searchVideos(query: string, maxResults = 3): Promise<YouTubeVideo[]> {
    try {
      const apiKey = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;
      if (!apiKey) {
        console.warn('YouTube API key not found, using search URLs instead');
        return this.getFallbackVideos(query, maxResults);
      }

      const searchUrl = `https://www.googleapis.com/youtube/v3/search?` +
        `part=snippet&q=${encodeURIComponent(query)}&` +
        `type=video&maxResults=${maxResults}&` +
        `key=${apiKey}&` +
        `order=relevance&` +
        `safeSearch=strict&` +
        `videoDefinition=any&` +
        `videoEmbeddable=true`;

      const response = await fetch(searchUrl);

      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.items || data.items.length === 0) {
        return this.getFallbackVideos(query, maxResults);
      }

      return data.items.map((item: any, index: number) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        channelTitle: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
      }));

    } catch (error) {
      console.error('Error searching YouTube:', error);
      return this.getFallbackVideos(query, maxResults);
    }
  },

  /**
   * Get fallback video search URLs when API fails
   */
  getFallbackVideos(query: string, maxResults: number): YouTubeVideo[] {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

    return Array.from({ length: maxResults }, (_, index) => ({
      id: `fallback-${index}`,
      title: `${query} - Repair Tutorial ${index + 1}`,
      description: 'Search YouTube for repair tutorials and diagnostic guides',
      thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
      url: searchUrl,
      channelTitle: 'YouTube Search',
      publishedAt: new Date().toISOString(),
    }));
  },

  /**
   * Generate vehicle-specific search queries with enhanced relevance
   */
  generateSearchQueries(make: string, model: string, year: number, issue: string): string[] {
    const vehicleInfo = `${year} ${make} ${model}`;
    const cleanIssue = issue.toLowerCase().replace(/[^\w\s]/g, '').trim();

    // Extract key symptoms and components from issue description
    const keywords = this.extractKeywords(cleanIssue);
    const component = this.identifyComponent(cleanIssue);

    const queries = [
      // Most specific - exact vehicle + issue + repair
      `${vehicleInfo} ${cleanIssue} repair tutorial`,
      // Component specific if identified
      component ? `${vehicleInfo} ${component} ${keywords.join(' ')} fix` : `${vehicleInfo} ${cleanIssue} diagnosis`,
      // Symptom based
      keywords.length > 0 ? `${vehicleInfo} ${keywords.join(' ')} problem solution` : `${make} ${model} ${cleanIssue} repair`,
      // Make/model specific with issue
      `${make} ${model} ${cleanIssue} how to fix`,
      // Fallback - general repair for this vehicle
      `${vehicleInfo} common repair problems`
    ];

    return queries.filter(q => q.length > 0);
  },

  /**
   * Extract key symptoms from issue description
   */
  extractKeywords(issue: string): string[] {
    const symptomKeywords = [
      'noise', 'sound', 'grinding', 'squealing', 'clicking', 'knocking',
      'vibration', 'shaking', 'rough', 'idle', 'stalling', 'misfire',
      'leak', 'fluid', 'oil', 'coolant', 'brake', 'transmission',
      'smoke', 'burning', 'smell', 'overheating', 'temperature',
      'light', 'warning', 'dashboard', 'check', 'engine',
      'steering', 'pulling', 'wobble', 'hard', 'soft',
      'starting', 'cranking', 'battery', 'electrical', 'power'
    ];

    return symptomKeywords.filter(keyword =>
      issue.toLowerCase().includes(keyword)
    ).slice(0, 3); // Max 3 key symptoms
  },

  /**
   * Identify the main component from issue description
   */
  identifyComponent(issue: string): string | null {
    const components = {
      'engine': ['engine', 'motor', 'cylinder', 'piston', 'valve', 'timing'],
      'brake': ['brake', 'braking', 'stop', 'stopping', 'pad', 'rotor', 'disc'],
      'transmission': ['transmission', 'gear', 'shift', 'shifting', 'clutch'],
      'suspension': ['suspension', 'shock', 'strut', 'spring', 'bounce'],
      'steering': ['steering', 'wheel', 'turning', 'alignment', 'rack'],
      'electrical': ['electrical', 'battery', 'alternator', 'starter', 'light', 'power'],
      'cooling': ['cooling', 'radiator', 'coolant', 'temperature', 'overheat'],
      'exhaust': ['exhaust', 'muffler', 'pipe', 'emission', 'catalytic'],
      'fuel': ['fuel', 'gas', 'petrol', 'injection', 'pump', 'tank']
    };

    for (const [component, keywords] of Object.entries(components)) {
      if (keywords.some(keyword => issue.toLowerCase().includes(keyword))) {
        return component;
      }
    }

    return null;
  },

  /**
   * Get diagnostic videos based on AI analysis
   */
  async getDiagnosticVideos(
    make: string,
    model: string,
    year: number,
    issue: string,
    aiCauses: string[]
  ): Promise<YouTubeVideo[]> {
    const queries = this.generateSearchQueries(make, model, year, issue);

    // Add AI-specific queries based on diagnosed causes
    if (aiCauses && aiCauses.length > 0) {
      const primaryCause = aiCauses[0];
      queries.unshift(`${year} ${make} ${model} ${primaryCause} repair`);
    }

    const allVideos: YouTubeVideo[] = [];

    // Search for each query (limit to 1 video per query to get variety)
    for (let i = 0; i < Math.min(3, queries.length); i++) {
      const videos = await this.searchVideos(queries[i], 1);
      allVideos.push(...videos);
    }

    // Remove duplicates and return top 3
    const uniqueVideos = allVideos.filter((video, index, self) =>
      index === self.findIndex(v => v.id === video.id)
    );

    return uniqueVideos.slice(0, 3);
  }
};