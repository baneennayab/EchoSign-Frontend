// Environment Configuration for EchoSign
// Centralized backend URL management

// Default to local development server
// In production, these should be set via environment variables
export const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://bannu021-echosign.hf.space';
export const TRANSLATE_URL = `${BACKEND_URL}/translate`;
export const UPLOAD_URL = `${BACKEND_URL}/upload`;

// API endpoints
export const API = {
    translate: TRANSLATE_URL,
    upload: UPLOAD_URL,
    health: `${BACKEND_URL}/health`,
    videos: `${BACKEND_URL}/videos`,
};

// App configuration
export const APP_CONFIG = {
    appName: 'EchoSign',
    version: 'ES26',
    organization: 'Narjis Khatoon Organization',
    supportedLanguages: ['PSL', 'ASL', 'DE'],
    defaultLanguage: 'PSL',
};

export default { BACKEND_URL, API, APP_CONFIG };
