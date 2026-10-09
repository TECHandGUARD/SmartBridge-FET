// src/lib/config-validator.js
// ============================================================
// Configuration Validator - Ensures app startup safety
// ============================================================

const REQUIRED_VARS = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
];

const OPTIONAL_VARS = [
  'VITE_APP_NAME',
  'VITE_APP_ENV',
  'VITE_ADMIN_EMAILS',
  'VITE_ENABLE_ERROR_BOUNDARY',
];

/**
 * Validates that all required environment variables are present
 * @returns {Object} { isValid: boolean, errors: string[], warnings: string[] }
 */
export const validateConfig = () => {
  const errors = [];
  const warnings = [];

  // Check required variables
  for (const varName of REQUIRED_VARS) {
    const value = import.meta.env[varName];
    if (!value || value.trim() === '') {
      errors.push(`❌ REQUIRED: ${varName} is missing or empty`);
    }
  }

  // Check optional variables and warn if missing
  for (const varName of OPTIONAL_VARS) {
    const value = import.meta.env[varName];
    if (!value || value.trim() === '') {
      warnings.push(`⚠️ OPTIONAL: ${varName} is missing (using default)`);
    }
  }

  const isValid = errors.length === 0;

  return {
    isValid,
    errors,
    warnings,
    timestamp: new Date().toISOString(),
  };
};

/**
 * Logs configuration validation results
 */
export const logConfigValidation = (validation) => {
  console.log('🔍 Configuration Validation Report');
  console.log('=====================================');

  if (validation.isValid) {
    console.log('✅ All required environment variables are configured');
  } else {
    console.error('❌ Configuration validation FAILED:');
    validation.errors.forEach(err => console.error(`   ${err}`));
  }

  if (validation.warnings.length > 0) {
    console.warn('⚠️ Configuration warnings:');
    validation.warnings.forEach(warn => console.warn(`   ${warn}`));
  }

  console.log(`📅 Validation timestamp: ${validation.timestamp}`);
};

/**
 * Returns a user-friendly error message for missing config
 */
export const getConfigErrorMessage = (validation) => {
  if (validation.isValid) return null;

  return {
    title: 'Configuration Error',
    message: 'SmartBridge FET could not start because required configuration is missing.',
    details: validation.errors,
    action: 'Please contact your system administrator or check the application logs.',
  };
};

/**
 * Run validation on app startup
 */
export const initializeConfig = () => {
  const validation = validateConfig();
  logConfigValidation(validation);
  return validation;
};
