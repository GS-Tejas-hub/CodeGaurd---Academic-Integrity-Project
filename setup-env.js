#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const envContent = `# CodeGuard Environment Variables
# Replace these placeholder values with your actual API keys

# GitHub API Token
GITHUB_TOKEN=your_github_token_here

# SerpAPI Key for web search
SERPAPI_KEY=your_serpapi_key_here

# Copyleaks API Credentials
COPYLEAKS_API_KEY=your_copyleaks_api_key_here
COPYLEAKS_API_SECRET=your_copyleaks_api_secret_here

# Google Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Stack Overflow API Key
STACKOVERFLOW_API_KEY=your_stackoverflow_api_key_here

# Application Settings
NODE_ENV=production
PORT=3000
MAX_FILE_SIZE=10485760
SESSION_SECRET=your_session_secret_here
CORS_ORIGIN=*
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
`;

const envPath = path.join(__dirname, '.env');

try {
    fs.writeFileSync(envPath, envContent);
    console.log('✅ .env file created successfully!');
    console.log('📝 Please replace the placeholder values with your actual API keys:');
    console.log('   - GITHUB_TOKEN: Your GitHub Personal Access Token');
    console.log('   - SERPAPI_KEY: Your SerpAPI key for web search');
    console.log('   - COPYLEAKS_API_KEY: Your Copyleaks API key');
    console.log('   - COPYLEAKS_API_SECRET: Your Copyleaks API secret');
    console.log('   - GEMINI_API_KEY: Your Google Gemini API key');
    console.log('   - STACKOVERFLOW_API_KEY: Your Stack Overflow API key');
    console.log('   - SESSION_SECRET: A random string for session security');
    console.log('');
    console.log('🔒 Never commit your actual API keys to version control!');
} catch (error) {
    console.error('❌ Error creating .env file:', error.message);
} 