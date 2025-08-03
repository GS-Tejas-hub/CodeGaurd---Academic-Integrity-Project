#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 CodeGuard Setup Script');
console.log('========================\n');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, 'env.example');

if (!fs.existsSync(envPath)) {
    console.log('📝 Creating .env file from template...');
    if (fs.existsSync(envExamplePath)) {
        fs.copyFileSync(envExamplePath, envPath);
        console.log('✅ .env file created successfully!');
        console.log('⚠️  Please edit .env file with your API keys before running the application.\n');
    } else {
        console.log('❌ env.example file not found!');
        process.exit(1);
    }
} else {
    console.log('✅ .env file already exists');
}

// Create necessary directories
const directories = ['uploads', 'reports', 'logs'];

directories.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
    } else {
        console.log(`✅ Directory exists: ${dir}`);
    }
});

// Check package.json
if (!fs.existsSync('package.json')) {
    console.log('❌ package.json not found! Please run npm install first.');
    process.exit(1);
}

console.log('\n📋 Setup Complete!');
console.log('==================');
console.log('Next steps:');
console.log('1. Edit .env file with your API keys');
console.log('2. Run: npm install');
console.log('3. Run: npm start');
console.log('\nRequired API Keys:');
console.log('- GitHub Token: https://github.com/settings/tokens');
console.log('- Google Custom Search API: https://console.cloud.google.com/apis/credentials');
console.log('- OpenAI API Key: https://platform.openai.com/api-keys');
console.log('- Stack Overflow API (optional): https://api.stackexchange.com/');
console.log('\n🌐 Access the application at: http://localhost:3000'); 