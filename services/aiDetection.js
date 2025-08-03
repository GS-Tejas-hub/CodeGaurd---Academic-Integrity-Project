const { GoogleGenerativeAI } = require('@google/generative-ai');

class AIDetectionService {
  constructor() {
    this.gemini = null;
    if (process.env.GEMINI_API_KEY) {
      this.gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
  }

  async detectAIGeneratedCode(code, language = 'javascript') {
    try {
      const results = {
        aiProbability: 0,
        patterns: [],
        confidence: 0,
        analysis: {}
      };

      // Multiple detection methods
      const patternAnalysis = this.analyzeAIPatterns(code, language);
      const openaiAnalysis = await this.openaiAnalysis(code, language);
      const statisticalAnalysis = this.statisticalAnalysis(code);

      // Combine results
      results.patterns = patternAnalysis.patterns;
      results.analysis = {
        pattern: patternAnalysis,
        openai: openaiAnalysis,
        statistical: statisticalAnalysis
      };

      // Calculate overall AI probability
      const patternScore = patternAnalysis.aiScore || 0;
      const openaiScore = openaiAnalysis.aiProbability || 0;
      const statisticalScore = statisticalAnalysis.aiScore || 0;

      // Weighted average
      results.aiProbability = (patternScore * 0.4 + openaiScore * 0.4 + statisticalScore * 0.2);
      results.confidence = this.calculateConfidence(results.analysis);

      return results;

    } catch (error) {
      console.error('AI detection error:', error);
      return {
        aiProbability: 0,
        patterns: [],
        confidence: 0,
        analysis: {},
        error: error.message
      };
    }
  }

  analyzeAIPatterns(code, language) {
    const patterns = [];
    let aiScore = 0;

    // Pattern 1: Excessive comments and documentation
    const commentRatio = this.calculateCommentRatio(code, language);
    if (commentRatio > 0.3) {
      patterns.push({
        type: 'excessive_comments',
        description: 'High ratio of comments to code',
        score: commentRatio * 0.3,
        evidence: `Comment ratio: ${(commentRatio * 100).toFixed(1)}%`
      });
      aiScore += commentRatio * 0.3;
    }

    // Pattern 2: Perfect formatting and consistency
    const formattingScore = this.analyzeFormatting(code);
    if (formattingScore > 0.8) {
      patterns.push({
        type: 'perfect_formatting',
        description: 'Exceptionally consistent formatting',
        score: formattingScore * 0.2,
        evidence: `Formatting consistency: ${(formattingScore * 100).toFixed(1)}%`
      });
      aiScore += formattingScore * 0.2;
    }

    // Pattern 3: Generic variable names
    const genericNamesScore = this.analyzeVariableNames(code);
    if (genericNamesScore > 0.6) {
      patterns.push({
        type: 'generic_names',
        description: 'Use of generic variable names',
        score: genericNamesScore * 0.25,
        evidence: `Generic naming score: ${(genericNamesScore * 100).toFixed(1)}%`
      });
      aiScore += genericNamesScore * 0.25;
    }

    // Pattern 4: Over-engineering
    const overEngineeringScore = this.analyzeOverEngineering(code);
    if (overEngineeringScore > 0.7) {
      patterns.push({
        type: 'over_engineering',
        description: 'Signs of over-engineering',
        score: overEngineeringScore * 0.3,
        evidence: `Over-engineering score: ${(overEngineeringScore * 100).toFixed(1)}%`
      });
      aiScore += overEngineeringScore * 0.3;
    }

    // Pattern 5: Lack of personal style
    const personalStyleScore = this.analyzePersonalStyle(code);
    if (personalStyleScore < 0.3) {
      patterns.push({
        type: 'lack_personal_style',
        description: 'Lack of personal coding style',
        score: (1 - personalStyleScore) * 0.2,
        evidence: `Personal style score: ${(personalStyleScore * 100).toFixed(1)}%`
      });
      aiScore += (1 - personalStyleScore) * 0.2;
    }

    return {
      patterns,
      aiScore: Math.min(aiScore, 1),
      totalPatterns: patterns.length
    };
  }

  async openaiAnalysis(code, language) {
    try {
      if (!this.gemini) {
        return { aiProbability: 0, reasoning: 'Gemini API not configured' };
      }

      const prompt = `Analyze the following ${language} code and determine if it appears to be AI-generated. Consider factors like:
1. Code structure and organization
2. Variable naming patterns
3. Comment style and frequency
4. Error handling patterns
5. Overall code quality and consistency

Code:
\`\`\`${language}
${code.substring(0, 2000)} // Limit to first 2000 characters
\`\`\`

Provide a probability score (0-1) and brief reasoning. Format your response as JSON:
{
  "aiProbability": 0.75,
  "reasoning": "The code shows consistent formatting, generic variable names, and comprehensive error handling typical of AI-generated code."
}`;

      const model = this.gemini.getGenerativeModel({ model: 'gemini-1.5-pro' });
      const result = await model.generateContent(prompt);
      const content = result.response.text();
      
      try {
        const parsedResult = JSON.parse(content);
        return {
          aiProbability: parsedResult.aiProbability || 0,
          reasoning: parsedResult.reasoning || 'No reasoning provided'
        };
      } catch (parseError) {
        // If JSON parsing fails, extract probability from text
        const probabilityMatch = content.match(/(\d+\.?\d*)/);
        return {
          aiProbability: probabilityMatch ? parseFloat(probabilityMatch[1]) / 100 : 0,
          reasoning: content
        };
      }

    } catch (error) {
      console.error('Gemini analysis error:', error);
      return {
        aiProbability: 0,
        reasoning: 'Analysis failed: ' + error.message
      };
    }
  }

  statisticalAnalysis(code) {
    const stats = {
      totalLines: code.split('\n').length,
      totalCharacters: code.length,
      nonWhitespaceCharacters: code.replace(/\s/g, '').length,
      commentLines: 0,
      functionCount: 0,
      classCount: 0,
      variableCount: 0,
      aiScore: 0
    };

    const lines = code.split('\n');

    // Count various code elements
    lines.forEach(line => {
      const trimmedLine = line.trim();
      
      // Count comment lines
      if (trimmedLine.startsWith('//') || trimmedLine.startsWith('#') || 
          trimmedLine.startsWith('/*') || trimmedLine.startsWith('*')) {
        stats.commentLines++;
      }

      // Count functions
      if (/function\s+\w+\s*\(/.test(line) || /def\s+\w+\s*\(/.test(line)) {
        stats.functionCount++;
      }

      // Count classes
      if (/class\s+\w+/.test(line)) {
        stats.classCount++;
      }

      // Count variable declarations
      if (/const\s+\w+|let\s+\w+|var\s+\w+/.test(line)) {
        stats.variableCount++;
      }
    });

    // Calculate AI probability based on statistical patterns
    const commentRatio = stats.commentLines / stats.totalLines;
    const functionDensity = stats.functionCount / stats.totalLines;
    const variableDensity = stats.variableCount / stats.totalLines;

    // AI-generated code tends to have:
    // - Higher comment ratios
    // - More consistent function density
    // - More variable declarations
    // - Better code organization

    let aiScore = 0;
    
    if (commentRatio > 0.2) aiScore += 0.2;
    if (functionDensity > 0.05 && functionDensity < 0.15) aiScore += 0.2;
    if (variableDensity > 0.1) aiScore += 0.2;
    if (stats.totalLines > 50) aiScore += 0.2;
    if (stats.classCount > 0) aiScore += 0.2;

    stats.aiScore = Math.min(aiScore, 1);

    return stats;
  }

  calculateCommentRatio(code, language) {
    const lines = code.split('\n');
    let commentLines = 0;
    let totalLines = lines.length;

    lines.forEach(line => {
      const trimmedLine = line.trim();
      
      if (language === 'python') {
        if (trimmedLine.startsWith('#') || trimmedLine.startsWith('"""') || trimmedLine.startsWith("'''")) {
          commentLines++;
        }
      } else {
        if (trimmedLine.startsWith('//') || trimmedLine.startsWith('/*') || trimmedLine.startsWith('*')) {
          commentLines++;
        }
      }
    });

    return commentLines / totalLines;
  }

  analyzeFormatting(code) {
    const lines = code.split('\n');
    let consistentLines = 0;
    let totalLines = lines.length;

    // Check for consistent indentation
    const indentations = lines.map(line => {
      const match = line.match(/^(\s*)/);
      return match ? match[1].length : 0;
    });

    // Check for consistent spacing around operators
    const operatorSpacing = lines.filter(line => {
      return /[+\-*/=<>!&|]/.test(line) && /\s[+\-*/=<>!&|]\s/.test(line);
    }).length;

    // Check for consistent line endings
    const hasConsistentEndings = lines.every(line => 
      line.endsWith(';') || line.trim() === '' || 
      line.trim().endsWith('{') || line.trim().endsWith('}') ||
      line.trim().endsWith(':') || line.trim().startsWith('//')
    );

    if (hasConsistentEndings) consistentLines += totalLines * 0.3;
    if (operatorSpacing > totalLines * 0.1) consistentLines += totalLines * 0.3;
    
    // Check indentation consistency
    const indentVariance = Math.var(indentations);
    if (indentVariance < 2) consistentLines += totalLines * 0.4;

    return Math.min(consistentLines / totalLines, 1);
  }

  analyzeVariableNames(code) {
    const variableRegex = /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
    const matches = [...code.matchAll(variableRegex)];
    
    const genericNames = [
      'data', 'result', 'value', 'item', 'element', 'obj', 'arr', 'str', 'num',
      'temp', 'temp1', 'temp2', 'var1', 'var2', 'x', 'y', 'z', 'i', 'j', 'k',
      'count', 'index', 'length', 'size', 'name', 'type', 'id', 'key'
    ];

    let genericCount = 0;
    matches.forEach(match => {
      if (genericNames.includes(match[1].toLowerCase())) {
        genericCount++;
      }
    });

    return matches.length > 0 ? genericCount / matches.length : 0;
  }

  analyzeOverEngineering(code) {
    let score = 0;
    const lines = code.split('\n');

    // Check for excessive error handling
    const errorHandlingLines = lines.filter(line => 
      /try\s*\{|catch\s*\(|finally\s*\{|throw\s+new/.test(line)
    ).length;
    
    if (errorHandlingLines > lines.length * 0.1) score += 0.3;

    // Check for excessive abstraction
    const functionLines = lines.filter(line => 
      /function\s+\w+|def\s+\w+/.test(line)
    ).length;
    
    if (functionLines > lines.length * 0.15) score += 0.3;

    // Check for excessive comments
    const commentLines = lines.filter(line => 
      line.trim().startsWith('//') || line.trim().startsWith('#')
    ).length;
    
    if (commentLines > lines.length * 0.3) score += 0.4;

    return Math.min(score, 1);
  }

  analyzePersonalStyle(code) {
    let score = 0;

    // Check for inconsistent formatting (more human-like)
    const lines = code.split('\n');
    const indentations = lines.map(line => {
      const match = line.match(/^(\s*)/);
      return match ? match[1].length : 0;
    });

    const indentVariance = Math.var(indentations);
    if (indentVariance > 2) score += 0.3;

    // Check for mixed naming conventions
    const camelCaseVars = (code.match(/[a-z][a-zA-Z0-9]*/g) || []).length;
    const snakeCaseVars = (code.match(/[a-z][a-z0-9_]*/g) || []).length;
    
    if (camelCaseVars > 0 && snakeCaseVars > 0) score += 0.3;

    // Check for personal comments
    const personalComments = lines.filter(line => 
      /TODO|FIXME|HACK|NOTE|BUG/.test(line.toUpperCase())
    ).length;
    
    if (personalComments > 0) score += 0.4;

    return Math.min(score, 1);
  }

  calculateConfidence(analysis) {
    const { pattern, openai, statistical } = analysis;
    
    let confidence = 0;
    let factors = 0;

    if (pattern.totalPatterns > 0) {
      confidence += pattern.totalPatterns * 0.1;
      factors++;
    }

    if (openai.aiProbability > 0) {
      confidence += 0.3;
      factors++;
    }

    if (statistical.aiScore > 0) {
      confidence += 0.2;
      factors++;
    }

    return factors > 0 ? Math.min(confidence / factors, 1) : 0;
  }
}

// Helper function for variance calculation
Math.var = function(array) {
  const mean = array.reduce((a, b) => a + b) / array.length;
  const variance = array.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / array.length;
  return variance;
};

module.exports = new AIDetectionService(); 