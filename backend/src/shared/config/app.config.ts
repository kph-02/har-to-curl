/**
 * Application configuration with all tunable parameters
 * All values can be overridden via environment variables
 */
export const AppConfig = {
  // OpenAI Configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || '',
  },

  // LLM Strategy Configuration
  llm: {
    singlePassThreshold: parseInt(process.env.LLM_SINGLE_PASS_THRESHOLD || '15', 10),
    topKCandidates: parseInt(process.env.LLM_TOP_K_CANDIDATES || '3', 10),
  },

  // HAR Upload & Filtering Configuration
  har: {
    maxSizeMB: parseInt(process.env.MAX_HAR_SIZE_MB || '100', 10),
    maxEntries: parseInt(process.env.MAX_HAR_ENTRIES || '500', 10),
    bodyTruncateLimit: parseInt(process.env.BODY_TRUNCATE_LIMIT || '2000', 10),
  },

  // Session Management Configuration
  session: {
    ttlMinutes: parseInt(process.env.SESSION_STORE_TTL_MINUTES || '30', 10),
  },

  // Rate Limiting Configuration
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL || '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT || '10', 10),
  },

  // Server Configuration
  server: {
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
};

/**
 * Validate required configuration at startup
 * Call this from main.ts before bootstrapping the app
 */
export function validateConfig(): void {
  if (!AppConfig.openai.apiKey || AppConfig.openai.apiKey.trim() === '') {
    throw new Error(
      'OPENAI_API_KEY is required. Please set it in .env.secrets file.',
    );
  }

  if (!AppConfig.openai.model || AppConfig.openai.model.trim() === '') {
    throw new Error(
      'OPENAI_MODEL is required. Please set it in .env.secrets file.',
    );
  }

  // Validate numeric bounds
  if (AppConfig.har.maxSizeMB <= 0 || AppConfig.har.maxSizeMB > 200) {
    throw new Error('MAX_HAR_SIZE_MB must be between 1 and 200');
  }

  if (AppConfig.har.maxEntries <= 0 || AppConfig.har.maxEntries > 1000) {
    throw new Error('MAX_HAR_ENTRIES must be between 1 and 1000');
  }

  if (AppConfig.llm.topKCandidates <= 0 || AppConfig.llm.topKCandidates > 10) {
    throw new Error('LLM_TOP_K_CANDIDATES must be between 1 and 10');
  }
}
