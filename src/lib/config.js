import { readPublicConfig } from './config-values.js';
const settings = readPublicConfig(import.meta.env, typeof window === 'undefined' ? '' : window.location.origin);
export const appConfig = settings.config;
export const configurationError = settings.connectionErrors.length
  ? 'The app connection settings are missing or invalid. Please contact support.' : null;
