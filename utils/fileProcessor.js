const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

class FileProcessor {
  constructor() {
    this.supportedExtensions = [
      '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.cs', 
      '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala', '.html', 
      '.css', '.scss', '.sass', '.sql', '.sh', '.bat', '.ps1', '.vue',
      '.json', '.xml', '.yaml', '.yml', '.md', '.txt'
    ];
  }

  extractCodeFromFiles(filePath) {
    try {
      const ext = path.extname(filePath).toLowerCase();
      
      if (ext === '.zip') {
        return this.extractFromZip(filePath);
      } else if (this.supportedExtensions.includes(ext)) {
        return this.extractFromSingleFile(filePath);
      } else {
        throw new Error(`Unsupported file type: ${ext}`);
      }
    } catch (error) {
      console.error('File extraction error:', error);
      throw error;
    }
  }

  extractFromZip(zipPath) {
    try {
      const zip = new AdmZip(zipPath);
      const zipEntries = zip.getEntries();
      const extractedFiles = [];

      for (const entry of zipEntries) {
        if (!entry.isDirectory) {
          const entryName = entry.entryName;
          const ext = path.extname(entryName).toLowerCase();

          if (this.supportedExtensions.includes(ext)) {
            const content = entry.getData().toString('utf8');
            extractedFiles.push({
              filename: entryName,
              content: content,
              size: content.length,
              language: this.getLanguageFromExtension(entryName)
            });
          }
        }
      }

      return extractedFiles;
    } catch (error) {
      console.error('ZIP extraction error:', error);
      throw new Error(`Failed to extract ZIP file: ${error.message}`);
    }
  }

  extractFromSingleFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const filename = path.basename(filePath);
      
      return [{
        filename: filename,
        content: content,
        size: content.length,
        language: this.getLanguageFromExtension(filename)
      }];
    } catch (error) {
      console.error('Single file extraction error:', error);
      throw new Error(`Failed to read file: ${error.message}`);
    }
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

    const ext = path.extname(filename).toLowerCase();
    return languageMap[ext] || 'unknown';
  }

  validateFile(file) {
    const maxSize = parseInt(process.env.MAX_FILE_SIZE || '52428800'); // 50MB
    const allowedExtensions = [...this.supportedExtensions, '.zip'];

    if (file.size > maxSize) {
      throw new Error(`File size exceeds maximum limit of ${this.formatFileSize(maxSize)}`);
    }

    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      throw new Error(`File type not allowed. Supported types: ${allowedExtensions.join(', ')}`);
    }

    return true;
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  sanitizeFilename(filename) {
    // Remove or replace potentially dangerous characters
    return filename
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .substring(0, 255); // Limit length
  }

  extractCodeSnippets(content, language = 'javascript') {
    const snippets = [];
    const lines = content.split('\n');

    // Extract function definitions
    const functionPatterns = {
      javascript: /(?:function\s+\w+\s*\([^)]*\)\s*\{[\s\S]*?\n\s*\})|(?:const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*\{[\s\S]*?\n\s*\})/g,
      python: /(?:def\s+\w+\s*\([^)]*\):[\s\S]*?)(?=\n\s*\n|\n\s*def|\n\s*class|$)/g,
      java: /(?:public\s+)?(?:static\s+)?(?:final\s+)?(?:void|int|String|boolean|double|float|long|short|byte|char|Object|List|Map|Set|Queue|Stack|ArrayList|HashMap|HashSet|LinkedList|TreeMap|TreeSet|PriorityQueue|ArrayDeque|Vector|Hashtable|Properties|Enum|BigInteger|BigDecimal|Date|Calendar|LocalDate|LocalTime|LocalDateTime|ZonedDateTime|Instant|Duration|Period|Optional|Stream|CompletableFuture|Future|Callable|Runnable|Thread|Executor|ExecutorService|ScheduledExecutorService|ForkJoinPool|ThreadPoolExecutor|ScheduledThreadPoolExecutor|ForkJoinTask|RecursiveTask|RecursiveAction|CountedCompleter|Phaser|CyclicBarrier|CountDownLatch|Semaphore|Exchanger|BlockingQueue|TransferQueue|BlockingDeque|ConcurrentMap|ConcurrentNavigableMap|ConcurrentSkipListMap|ConcurrentSkipListSet|CopyOnWriteArrayList|CopyOnWriteArraySet|DelayQueue|PriorityBlockingQueue|SynchronousQueue|LinkedBlockingQueue|LinkedBlockingDeque|ArrayBlockingQueue|LinkedTransferQueue|ConcurrentLinkedQueue|ConcurrentLinkedDeque|LinkedBlockingQueue|LinkedBlockingDeque|ArrayBlockingQueue|LinkedTransferQueue|ConcurrentLinkedQueue|ConcurrentLinkedDeque)\s+\w+\s*\([^)]*\)\s*\{[\s\S]*?\n\s*\}/g,
      cpp: /(?:void|int|string|bool|double|float|long|short|char|auto|template|class|struct|enum|union|namespace|inline|virtual|static|const|volatile|mutable|explicit|friend|operator|typedef|using|extern|register|thread_local|constexpr|decltype|noexcept|override|final|default|delete|nullptr|true|false|and|and_eq|bitand|bitor|compl|not|not_eq|or|or_eq|xor|xor_eq|asm|break|case|catch|continue|default|do|else|for|goto|if|return|switch|throw|try|while|new|delete|sizeof|typeid|alignof|alignas|static_assert|thread_local|constexpr|decltype|noexcept|override|final|default|delete|nullptr|true|false|and|and_eq|bitand|bitor|compl|not|not_eq|or|or_eq|xor|xor_eq|asm|break|case|catch|continue|default|do|else|for|goto|if|return|switch|throw|try|while|new|delete|sizeof|typeid|alignof|alignas|static_assert)\s+\w+\s*\([^)]*\)\s*\{[\s\S]*?\n\s*\}/g
    };

    const pattern = functionPatterns[language] || functionPatterns.javascript;
    let match;

    while ((match = pattern.exec(content)) !== null) {
      snippets.push(match[0]);
    }

    // If no functions found, extract significant code blocks
    if (snippets.length === 0) {
      const significantLines = lines.filter(line => 
        line.trim().length > 20 && 
        !line.trim().startsWith('//') && 
        !line.trim().startsWith('#') &&
        !line.trim().startsWith('/*') &&
        !line.trim().startsWith('*')
      );

      // Group significant lines into chunks
      for (let i = 0; i < significantLines.length; i += 5) {
        const chunk = significantLines.slice(i, i + 5).join('\n');
        if (chunk.length > 50) {
          snippets.push(chunk);
        }
      }
    }

    return snippets.slice(0, 10); // Limit to 10 snippets
  }

  calculateCodeMetrics(content) {
    const lines = content.split('\n');
    const metrics = {
      totalLines: lines.length,
      codeLines: 0,
      commentLines: 0,
      blankLines: 0,
      functionCount: 0,
      classCount: 0,
      variableCount: 0,
      complexity: 0
    };

    lines.forEach(line => {
      const trimmedLine = line.trim();
      
      if (trimmedLine === '') {
        metrics.blankLines++;
      } else if (trimmedLine.startsWith('//') || trimmedLine.startsWith('#') || 
                 trimmedLine.startsWith('/*') || trimmedLine.startsWith('*')) {
        metrics.commentLines++;
      } else {
        metrics.codeLines++;
        
        // Count functions
        if (/function\s+\w+\s*\(/.test(line) || /def\s+\w+\s*\(/.test(line)) {
          metrics.functionCount++;
        }
        
        // Count classes
        if (/class\s+\w+/.test(line)) {
          metrics.classCount++;
        }
        
        // Count variables
        if (/const\s+\w+|let\s+\w+|var\s+\w+/.test(line)) {
          metrics.variableCount++;
        }
        
        // Calculate complexity (simple metric)
        if (/if\s*\(|for\s*\(|while\s*\(|switch\s*\(|catch\s*\(/.test(line)) {
          metrics.complexity++;
        }
      }
    });

    return metrics;
  }
}

module.exports = new FileProcessor(); 