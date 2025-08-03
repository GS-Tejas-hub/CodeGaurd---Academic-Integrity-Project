const express = require('express');
const searchService = require('../services/searchService');
const aiDetectionService = require('../services/aiDetection');
const githubService = require('../services/githubService');

const router = express.Router();

// Main analysis endpoint
router.post('/analyze', async (req, res) => {
  try {
    const { codeFiles, options = {} } = req.body;

    if (!codeFiles || !Array.isArray(codeFiles) || codeFiles.length === 0) {
      return res.status(400).json({ error: 'Code files are required' });
    }

    console.log(`Starting analysis of ${codeFiles.length} files...`);

    const analysisId = generateAnalysisId();
    const results = {
      analysisId,
      timestamp: new Date().toISOString(),
      totalFiles: codeFiles.length,
      summary: {
        plagiarismScore: 0,
        aiGeneratedScore: 0,
        totalMatches: 0,
        highRiskFiles: []
      },
      files: [],
      sources: {
        github: [],
        stackoverflow: [],
        web: []
      }
    };

    // Process each file
    for (const file of codeFiles) {
      console.log(`Analyzing file: ${file.filename}`);
      
      const fileResult = await analyzeFile(file, options);
      results.files.push(fileResult);

      // Update summary
      if (fileResult.plagiarismScore > 0.7) {
        results.summary.highRiskFiles.push({
          filename: file.filename,
          score: fileResult.plagiarismScore,
          reason: 'High plagiarism detected'
        });
      }

      results.summary.totalMatches += fileResult.matches.length;
    }

    // Calculate overall scores
    const totalPlagiarismScore = results.files.reduce((sum, file) => sum + file.plagiarismScore, 0);
    const totalAIScore = results.files.reduce((sum, file) => sum + file.aiGeneratedScore, 0);

    results.summary.plagiarismScore = totalPlagiarismScore / results.files.length;
    results.summary.aiGeneratedScore = totalAIScore / results.files.length;

    // Aggregate sources
    results.sources = aggregateSources(results.files);

    console.log(`Analysis completed. Plagiarism score: ${results.summary.plagiarismScore.toFixed(2)}, AI score: ${results.summary.aiGeneratedScore.toFixed(2)}`);

    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Analysis failed: ' + error.message });
  }
});

// Analyze specific file
router.post('/analyze-file', async (req, res) => {
  try {
    const { code, filename, language, options = {} } = req.body;

    if (!code || !filename) {
      return res.status(400).json({ error: 'Code content and filename are required' });
    }

    const file = {
      filename,
      content: code,
      language: language || 'unknown'
    };

    const result = await analyzeFile(file, options);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('File analysis error:', error);
    res.status(500).json({ error: 'File analysis failed: ' + error.message });
  }
});

// Get analysis status
router.get('/status/:analysisId', (req, res) => {
  // This would typically check against a database
  // For now, return a simple response
  res.json({
    analysisId: req.params.analysisId,
    status: 'completed',
    timestamp: new Date().toISOString()
  });
});

// Helper function to analyze a single file
async function analyzeFile(file, options = {}) {
  const {
    searchGitHub = true,
    searchStackOverflow = true,
    searchWeb = true,
    detectAI = true,
    similarityThreshold = 0.3
  } = options;

  const result = {
    filename: file.filename,
    language: file.language,
    size: file.content.length,
    plagiarismScore: 0,
    aiGeneratedScore: 0,
    matches: [],
    aiAnalysis: null,
    timestamp: new Date().toISOString()
  };

  try {
    // 1. AI Detection
    if (detectAI) {
      console.log(`Detecting AI patterns in ${file.filename}...`);
      result.aiAnalysis = await aiDetectionService.detectAIGeneratedCode(file.content, file.language);
      result.aiGeneratedScore = result.aiAnalysis.aiProbability;
    }

    // 2. Plagiarism Detection
    console.log(`Searching for plagiarism in ${file.filename}...`);
    
    // Extract searchable snippets
    const snippets = searchService.extractSearchSnippets(file.content);
    const allMatches = [];

    for (const snippet of snippets) {
      const matches = [];

      // Search GitHub
      if (searchGitHub) {
        try {
          const githubMatches = await githubService.searchCode(snippet, file.language);
          matches.push(...githubMatches.map(match => ({
            ...match,
            source: 'github',
            snippet: snippet
          })));
        } catch (error) {
          console.warn(`GitHub search failed for ${file.filename}:`, error.message);
        }
      }

      // Search Stack Overflow
      if (searchStackOverflow) {
        try {
          const stackOverflowMatches = await searchService.searchStackOverflow(snippet, file.language);
          matches.push(...stackOverflowMatches.map(match => ({
            ...match,
            source: 'stackoverflow',
            snippet: snippet
          })));
        } catch (error) {
          console.warn(`Stack Overflow search failed for ${file.filename}:`, error.message);
        }
      }

      // Search Web
      if (searchWeb) {
        try {
          const webMatches = await searchService.searchWeb(snippet, file.language);
          matches.push(...webMatches.map(match => ({
            ...match,
            source: 'web',
            snippet: snippet
          })));
        } catch (error) {
          console.warn(`Web search failed for ${file.filename}:`, error.message);
        }
      }

      // Calculate similarities
      for (const match of matches) {
        if (match.snippet) {
          const similarity = searchService.calculateSimilarity(snippet, match.snippet);
          if (similarity > similarityThreshold) {
            allMatches.push({
              ...match,
              similarity: similarity,
              risk: getRiskLevel(similarity)
            });
          }
        }
      }
    }

    // Sort matches by similarity
    result.matches = allMatches.sort((a, b) => b.similarity - a.similarity);

    // Calculate overall plagiarism score
    if (result.matches.length > 0) {
      const maxSimilarity = Math.max(...result.matches.map(m => m.similarity));
      const avgSimilarity = result.matches.reduce((sum, m) => sum + m.similarity, 0) / result.matches.length;
      result.plagiarismScore = (maxSimilarity * 0.7 + avgSimilarity * 0.3);
    }

  } catch (error) {
    console.error(`Error analyzing file ${file.filename}:`, error);
    result.error = error.message;
  }

  return result;
}

// Helper function to aggregate sources
function aggregateSources(files) {
  const sources = {
    github: [],
    stackoverflow: [],
    web: []
  };

  const sourceMap = new Map();

  files.forEach(file => {
    file.matches.forEach(match => {
      const key = `${match.source}-${match.link}`;
      
      if (!sourceMap.has(key)) {
        sourceMap.set(key, {
          source: match.source,
          title: match.title,
          link: match.link,
          files: [],
          maxSimilarity: 0,
          totalMatches: 0
        });
      }

      const source = sourceMap.get(key);
      source.files.push(file.filename);
      source.maxSimilarity = Math.max(source.maxSimilarity, match.similarity);
      source.totalMatches++;
    });
  });

  // Convert map to arrays
  sourceMap.forEach(source => {
    if (sources[source.source]) {
      sources[source.source].push(source);
    }
  });

  // Sort by max similarity
  Object.keys(sources).forEach(key => {
    sources[key].sort((a, b) => b.maxSimilarity - a.maxSimilarity);
  });

  return sources;
}

// Helper function to get risk level
function getRiskLevel(similarity) {
  if (similarity >= 0.9) return 'critical';
  if (similarity >= 0.7) return 'high';
  if (similarity >= 0.5) return 'medium';
  if (similarity >= 0.3) return 'low';
  return 'minimal';
}

// Helper function to generate analysis ID
function generateAnalysisId() {
  return 'analysis_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

module.exports = router; 