const { Octokit } = require('octokit');
const axios = require('axios');

class GitHubService {
  constructor() {
    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN
    });
  }

  async extractFromGitHub(githubUrl) {
    try {
      // Parse GitHub URL to get owner and repo
      const urlParts = githubUrl.replace('https://github.com/', '').replace('.git', '').split('/');
      const owner = urlParts[0];
      const repo = urlParts[1].split('#')[0]; // Remove branch/tag reference if present

      console.log(`Extracting from GitHub: ${owner}/${repo}`);

      // Get repository contents recursively
      const files = await this.getRepositoryContents(owner, repo, '');
      
      // Filter and process code files
      const codeFiles = files.filter(file => this.isCodeFile(file.name));
      
      const extractedCode = [];
      
      for (const file of codeFiles) {
        try {
          const content = await this.getFileContent(owner, repo, file.path);
          if (content) {
            extractedCode.push({
              filename: file.name,
              path: file.path,
              content: content,
              size: content.length,
              language: this.getLanguageFromExtension(file.name)
            });
          }
        } catch (error) {
          console.warn(`Failed to extract ${file.path}:`, error.message);
        }
      }

      console.log(`Extracted ${extractedCode.length} code files from ${owner}/${repo}`);
      return extractedCode;

    } catch (error) {
      console.error('GitHub extraction error:', error);
      throw new Error(`Failed to extract from GitHub: ${error.message}`);
    }
  }

  async getRepositoryContents(owner, repo, path) {
    try {
      const response = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        headers: {
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      const contents = Array.isArray(response.data) ? response.data : [response.data];
      const files = [];

      for (const item of contents) {
        if (item.type === 'file') {
          files.push(item);
        } else if (item.type === 'dir') {
          // Recursively get contents of subdirectories
          const subFiles = await this.getRepositoryContents(owner, repo, item.path);
          files.push(...subFiles);
        }
      }

      return files;
    } catch (error) {
      console.error(`Error getting contents for ${owner}/${repo}/${path}:`, error.message);
      return [];
    }
  }

  async getFileContent(owner, repo, path) {
    try {
      const response = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        headers: {
          'Accept': 'application/vnd.github.v3.raw'
        }
      });

      // If the response is base64 encoded, decode it
      if (typeof response.data === 'string') {
        return response.data;
      } else if (response.data.content) {
        return Buffer.from(response.data.content, 'base64').toString('utf8');
      }

      return null;
    } catch (error) {
      console.error(`Error getting file content for ${path}:`, error.message);
      return null;
    }
  }

  isCodeFile(filename) {
    const codeExtensions = [
      '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.cs', 
      '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala', '.html', 
      '.css', '.scss', '.sass', '.sql', '.sh', '.bat', '.ps1', '.vue',
      '.jsx', '.tsx', '.json', '.xml', '.yaml', '.yml', '.md', '.txt'
    ];

    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return codeExtensions.includes(ext);
  }

  getLanguageFromExtension(filename) {
    const languageMap = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.cs': 'csharp',
      '.php': 'php',
      '.rb': 'ruby',
      '.go': 'go',
      '.rs': 'rust',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.scala': 'scala',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.sass': 'sass',
      '.sql': 'sql',
      '.sh': 'bash',
      '.bat': 'batch',
      '.ps1': 'powershell',
      '.vue': 'vue',
      '.json': 'json',
      '.xml': 'xml',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.md': 'markdown',
      '.txt': 'text'
    };

    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return languageMap[ext] || 'unknown';
  }

  async searchGitHubRepositories(query, language = null) {
    try {
      let searchQuery = query;
      if (language) {
        searchQuery += ` language:${language}`;
      }

      const response = await this.octokit.rest.search.repos({
        q: searchQuery,
        sort: 'stars',
        order: 'desc',
        per_page: 10
      });

      return response.data.items.map(repo => ({
        name: repo.full_name,
        description: repo.description,
        url: repo.html_url,
        stars: repo.stargazers_count,
        language: repo.language,
        size: repo.size
      }));
    } catch (error) {
      console.error('GitHub search error:', error);
      return [];
    }
  }

  async searchCode(query, language = null) {
    try {
      let searchQuery = query;
      if (language) {
        searchQuery += ` language:${language}`;
      }

      const response = await this.octokit.rest.search.code({
        q: searchQuery,
        sort: 'indexed',
        order: 'desc',
        per_page: 10
      });

      return response.data.items.map(item => ({
        name: item.name,
        path: item.path,
        repository: item.repository.full_name,
        url: item.html_url,
        language: item.language
      }));
    } catch (error) {
      console.error('GitHub code search error:', error);
      return [];
    }
  }
}

module.exports = new GitHubService(); 