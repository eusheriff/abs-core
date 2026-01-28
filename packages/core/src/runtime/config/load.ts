/**
 * ABS Config Loader (D6.3) - Safe Version
 */

import dotenv from 'dotenv';
import { ConfigSchema, RuntimeConfig } from './schema';

let _config: RuntimeConfig | null = null;

export const Config = {
  load(): RuntimeConfig {
    if (_config) return _config;

    // Load .env only when load() is called
    dotenv.config();

    try {
      const parsed = ConfigSchema.parse(process.env);
      
      if (parsed.NODE_ENV === 'production' && !parsed.ABS_SECRET_KEY) {
        throw new Error('ABS_SECRET_KEY is mandatory in production mode');
      }

      _config = parsed;
      return _config;
    } catch (err) {
      console.error('FATAL: Invalid Configuration', err);
      process.exit(1);
    }
  },

  get(): RuntimeConfig {
    if (!_config) return this.load();
    return _config;
  }
};
