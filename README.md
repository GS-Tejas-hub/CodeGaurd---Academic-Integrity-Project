# CodeGuard - Academic Plagiarism Detection System

A comprehensive web application designed to help teachers detect plagiarism and AI-generated code in student submissions. CodeGuard analyzes code from various sources including GitHub repositories, uploaded files, and pasted code, providing detailed reports with evidence and similarity scores.

## 🌟 Features

- **Multi-Source Analysis**: Search across GitHub, Stack Overflow, and web sources
- **AI Detection**: Advanced AI-generated code detection using Google Gemini
- **Multiple Input Methods**: Support for file uploads, GitHub repositories, and direct code pasting
- **Comprehensive Reports**: Detailed PDF reports with evidence and similarity scores
- **Real-time Progress**: Live progress tracking during analysis
- **Modern UI/UX**: Beautiful, responsive design with intuitive interface
- **Secure & Private**: Encrypted data handling with no third-party sharing

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- API keys for required services

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/GS-Tejas-hub/CodeGaurd---Academic-Integrity-Project.git
   cd CodeGaurd---Academic-Integrity-Project
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   node setup-env.js
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Access the application**
   Open your browser and navigate to `http://localhost:3000`

## 🔑 Required API Keys

The following API keys are required for full functionality:

| Service | Purpose | Key Variable |
|---------|---------|--------------|
| GitHub | Repository access and code search | `GITHUB_TOKEN` |
| SerpAPI | Web search functionality | `SERPAPI_KEY` |
| Google Gemini | AI-generated code detection | `GEMINI_API_KEY` |
| Copyleaks | Advanced plagiarism detection | `COPYLEAKS_API_KEY` |
| Stack Overflow | Code search in Stack Overflow | `STACKOVERFLOW_API_KEY` |

### Setting up API Keys

1. **GitHub Token**: Create a personal access token at [GitHub Settings](https://github.com/settings/tokens)
2. **SerpAPI Key**: Sign up at [SerpAPI](https://serpapi.com/) and get your API key
3. **Google Gemini**: Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
4. **Copyleaks**: Sign up at [Copyleaks](https://api.copyleaks.com/) for API credentials
5. **Stack Overflow**: Use the free public API (key provided in setup)

## 📁 Project Structure

```
CodeGuard/
├── public/                 # Frontend static files
│   ├── index.html         # Home page
│   ├── analysis.html      # Analysis interface
│   ├── about.html         # About page
│   ├── dashboard.html     # Dashboard
│   └── styles/           # CSS styles
├── routes/               # API route handlers
│   ├── upload.js         # File upload endpoints
│   ├── analysis.js       # Analysis endpoints
│   └── reports.js        # Report generation endpoints
├── services/             # Business logic services
│   ├── githubService.js  # GitHub API integration
│   ├── searchService.js  # Web search functionality
│   ├── aiDetection.js    # AI detection logic
│   └── reportGenerator.js # PDF report generation
├── utils/                # Utility functions
│   └── fileProcessor.js  # File processing utilities
├── server.js             # Main application entry point
├── package.json          # Dependencies and scripts
├── vercel.json          # Vercel deployment configuration
└── README.md            # Project documentation
```

## 🛠️ Development

### Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build the application (no build step required)
- `npm run production` - Start production server with NODE_ENV=production

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
NODE_ENV=production
PORT=3000
GITHUB_TOKEN=your_github_token
SERPAPI_KEY=your_serpapi_key
COPYLEAKS_API_KEY=your_copyleaks_key
COPYLEAKS_API_SECRET=your_copyleaks_secret
GEMINI_API_KEY=your_gemini_key
STACKOVERFLOW_API_KEY=your_stackoverflow_key
REPORT_DIR=./reports
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
SESSION_SECRET=your_session_secret
CORS_ORIGIN=*
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
```

## 🚀 Deployment

### Vercel Deployment

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Production ready CodeGuard"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Connect your GitHub repository to Vercel
   - Set environment variables in Vercel dashboard
   - Deploy automatically on push

### Manual Deployment

1. **Build for production**
   ```bash
   npm run build
   ```

2. **Start production server**
   ```bash
   npm run production
   ```

## 📊 Usage

### For Teachers

1. **Upload Code**: Choose from file upload, GitHub repository, or paste code directly
2. **Configure Analysis**: Select which sources to search (GitHub, Stack Overflow, Web, AI detection)
3. **Start Analysis**: Click "Start Analysis" and monitor progress
4. **Review Results**: View detailed analysis with similarity scores and evidence
5. **Download Report**: Generate and download comprehensive PDF reports

### Analysis Features

- **Plagiarism Detection**: Identifies copied code from various sources
- **AI Detection**: Detects AI-generated code with high accuracy
- **Source Evidence**: Provides links and details for matched sources
- **Risk Assessment**: Categorizes findings by risk level
- **Detailed Reports**: Comprehensive PDF reports with all findings

## 🔒 Security & Privacy

- **Data Encryption**: All data is encrypted in transit and at rest
- **No Data Storage**: Code content is not permanently stored
- **Secure APIs**: All API keys are securely managed
- **Rate Limiting**: Built-in rate limiting to prevent abuse
- **CORS Protection**: Configurable CORS settings for security

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Powered by Demon AI** - Advanced AI detection capabilities
- **Built by Demon King** - [Portfolio](https://gs-tejas-hub.github.io/Demon-s-Portfolio/)
- **Educational Institutions** - For supporting academic integrity
- **Open Source Community** - For the amazing tools and libraries

## 📞 Support

For support and questions:
- **Email**: demonking8660@gmail.com
- **Phone**: +91 8660401238
- **GitHub Issues**: [Create an issue](https://github.com/GS-Tejas-hub/CodeGaurd---Academic-Integrity-Project/issues)

---

**Disclaimer**: This report is for educational purposes only. Please review all findings manually before taking any action. Because as a developer I can understand there are few things that can be common in codes so take action on large piece of code that matches and can ignore variables or function names. Powered by DemonAI built by DemonKing.

Every detail of the code is searched in the internet so kindly avoid similar words found but not to ignore where entire function or large lines of code is detected. 