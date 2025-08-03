const axios = require('axios');
const stringSimilarity = require('string-similarity');

class SearchService {
  constructor() {
    this.serpApiKey = process.env.SERPAPI_KEY;
    this.stackOverflowApiKey = process.env.STACKOVERFLOW_API_KEY;
  }

  async searchWeb(query, language = null) {
    try {
      if (!this.serpApiKey) {
        console.warn('SerpAPI key not configured');
        return [];
      }

      let searchQuery = query;
      if (language) {
        searchQuery += ` ${language} code`;
      }

      const response = await axios.get('https://serpapi.com/search', {
        params: {
          api_key: this.serpApiKey,
          q: searchQuery,
          engine: 'google',
          num: 10,
          safe: 'active'
        }
      });

      if (response.data.organic_results) {
        return response.data.organic_results.map(item => ({
          title: item.title,
          link: item.link,
          snippet: item.snippet,
          source: 'web'
        }));
      }

      return [];
    } catch (error) {
      console.error('Web search error:', error.message);
      return [];
    }
  }

  async searchStackOverflow(query, language = null) {
    try {
      let searchQuery = query;
      if (language) {
        searchQuery += ` [${language}]`;
      }

      const response = await axios.get('https://api.stackexchange.com/2.3/search/advanced', {
        params: {
          site: 'stackoverflow',
          q: searchQuery,
          tagged: language || '',
          sort: 'relevance',
          order: 'desc',
          pagesize: 10,
          key: this.stackOverflowApiKey || 'anonymous'
        }
      });

      if (response.data.items) {
        const questions = response.data.items;
        const results = [];

        for (const question of questions) {
          // Get the best answer for each question
          if (question.answer_count > 0) {
            const answerResponse = await axios.get(`https://api.stackexchange.com/2.3/questions/${question.question_id}/answers`, {
              params: {
                site: 'stackoverflow',
                sort: 'votes',
                order: 'desc',
                pagesize: 1,
                filter: 'withbody',
                key: this.stackOverflowApiKey || 'anonymous'
              }
            });

            if (answerResponse.data.items && answerResponse.data.items.length > 0) {
              const answer = answerResponse.data.items[0];
              results.push({
                title: question.title,
                link: question.link,
                snippet: this.extractCodeFromAnswer(answer.body),
                source: 'stackoverflow',
                score: answer.score,
                answerId: answer.answer_id
              });
            }
          }
        }

        return results;
      }

      return [];
    } catch (error) {
      console.error('Stack Overflow search error:', error.message);
      return [];
    }
  }

  extractCodeFromAnswer(answerBody) {
    // Extract code blocks from Stack Overflow answer body
    const codeBlockRegex = /<pre><code>([\s\S]*?)<\/code><\/pre>/g;
    const inlineCodeRegex = /<code>([^<]*)<\/code>/g;
    
    let codeBlocks = [];
    let match;

    // Extract code blocks
    while ((match = codeBlockRegex.exec(answerBody)) !== null) {
      codeBlocks.push(match[1]);
    }

    // Extract inline code
    while ((match = inlineCodeRegex.exec(answerBody)) !== null) {
      codeBlocks.push(match[1]);
    }

    return codeBlocks.join('\n');
  }

  async analyzeCodeSimilarity(sourceCode, searchResults) {
    const similarities = [];

    for (const result of searchResults) {
      if (result.snippet) {
        const similarity = this.calculateSimilarity(sourceCode, result.snippet);
        
        if (similarity > 0.3) { // Threshold for similarity
          similarities.push({
            source: result.source,
            title: result.title,
            link: result.link,
            similarity: similarity,
            snippet: result.snippet
          });
        }
      }
    }

    // Sort by similarity score (highest first)
    return similarities.sort((a, b) => b.similarity - a.similarity);
  }

  calculateSimilarity(text1, text2) {
    // Normalize text for comparison
    const normalizeText = (text) => {
      return text
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ') // Remove special characters
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
    };

    const normalized1 = normalizeText(text1);
    const normalized2 = normalizeText(text2);

    // Use string similarity library
    return stringSimilarity.compareTwoStrings(normalized1, normalized2);
  }

  async searchCodeSnippets(codeSnippet, language = null) {
    const results = [];

    try {
      // Search on GitHub
      const githubResults = await this.searchGitHubCode(codeSnippet, language);
      results.push(...githubResults);

      // Search on Stack Overflow
      const stackOverflowResults = await this.searchStackOverflow(codeSnippet, language);
      results.push(...stackOverflowResults);

      // Search on web
      const webResults = await this.searchWeb(codeSnippet, language);
      results.push(...webResults);

    } catch (error) {
      console.error('Code snippet search error:', error);
    }

    return results;
  }

  async searchGitHubCode(query, language = null) {
    try {
      // This would integrate with the GitHub service
      // For now, return empty array - will be implemented in analysis service
      return [];
    } catch (error) {
      console.error('GitHub code search error:', error);
      return [];
    }
  }

  extractCodeFingerprint(code) {
    // Create a fingerprint of the code for faster comparison
    return {
      length: code.length,
      lines: code.split('\n').length,
      characters: code.replace(/\s/g, '').length,
      keywords: this.extractKeywords(code),
      structure: this.analyzeCodeStructure(code)
    };
  }

  extractKeywords(code) {
    // Extract programming keywords from code
    const keywords = [
      'function', 'class', 'if', 'else', 'for', 'while', 'return', 'import', 'export',
      'const', 'let', 'var', 'def', 'print', 'console.log', 'public', 'private', 'static',
      'try', 'catch', 'finally', 'throw', 'new', 'this', 'super', 'extends', 'implements'
    ];

    const normalizedCode = code.toLowerCase();
    const foundKeywords = keywords.filter(keyword => 
      normalizedCode.includes(keyword)
    );

    return foundKeywords;
  }

  analyzeCodeStructure(code) {
    // Analyze code structure patterns
    const structure = {
      hasFunctions: /function\s+\w+\s*\(/.test(code) || /def\s+\w+\s*\(/.test(code),
      hasClasses: /class\s+\w+/.test(code),
      hasLoops: /for\s*\(/.test(code) || /while\s*\(/.test(code),
      hasConditionals: /if\s*\(/.test(code) || /else\s*{/.test(code),
      hasComments: /\/\//.test(code) || /\/\*/.test(code) || /#/.test(code),
      hasImports: /import\s+/.test(code) || /require\s*\(/.test(code),
      hasExports: /export\s+/.test(code) || /module\.exports/.test(code)
    };

    return structure;
  }

  async batchSearch(codeFiles) {
    const allResults = [];

    for (const file of codeFiles) {
      console.log(`Searching for matches in ${file.filename}...`);
      
      // Extract key code snippets for search
      const snippets = this.extractSearchSnippets(file.content);
      
      for (const snippet of snippets) {
        const results = await this.searchCodeSnippets(snippet, file.language);
        allResults.push({
          filename: file.filename,
          snippet: snippet,
          results: results
        });
      }
    }

    return allResults;
  }

  extractSearchSnippets(code) {
    // Extract meaningful code snippets for search
    const lines = code.split('\n');
    const snippets = [];
    
    // Extract function definitions
    const functionRegex = /(?:function\s+\w+\s*\([^)]*\)\s*\{[\s\S]*?\n\s*\})|(?:def\s+\w+\s*\([^)]*\):[\s\S]*?)(?=\n\s*\n|\n\s*def|\n\s*class|$)/g;
    let match;
    
    while ((match = functionRegex.exec(code)) !== null) {
      snippets.push(match[0]);
    }

    // Extract class definitions
    const classRegex = /(?:class\s+\w+[\s\S]*?)(?=\n\s*\n|\n\s*class|$)/g;
    while ((match = classRegex.exec(code)) !== null) {
      snippets.push(match[0]);
    }

    // If no functions or classes found, extract lines with significant content
    if (snippets.length === 0) {
      const significantLines = lines.filter(line => 
        line.trim().length > 20 && 
        !line.trim().startsWith('//') && 
        !line.trim().startsWith('#') &&
        !line.trim().startsWith('/*')
      );
      
      // Group significant lines into chunks
      for (let i = 0; i < significantLines.length; i += 5) {
        const chunk = significantLines.slice(i, i + 5).join('\n');
        if (chunk.length > 50) {
          snippets.push(chunk);
        }
      }
    }

    return snippets.slice(0, 10); // Limit to 10 snippets per file
  }
}

module.exports = new SearchService(); 