import { loadEnv } from 'vite';
import { readPublicConfig } from '../src/lib/config-values.js';
const mode = process.argv[2] || 'production';
const { errors } = readPublicConfig(loadEnv(mode, process.cwd(), 'VITE_'));
if (errors.length) {
  console.error(`Configuration check failed (${mode}):\n${errors.map(error => `- ${error}`).join('\n')}`);
  process.exitCode = 1;
} else console.log(`Public configuration is valid (${mode}). Optional payment settings may be unavailable.`);
