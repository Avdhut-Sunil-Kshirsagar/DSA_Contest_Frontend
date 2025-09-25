// Advanced offline code runner with enhanced JavaScript and Python support
// Optimized for the new resizable layout

export interface TestCase {
  input: string;
  expectedOutput: string;
  description?: string;
}

export interface ExecutionResult {
  passed: boolean;
  executionTime: number;
  output: string;
  error?: string;
  testCase: TestCase;
}

// Pyodide loader (lazy)
let pyodideInstance: any | null = null;
//const RUN_TIMEOUT_MS = 4000;

async function loadPyodideIfNeeded(): Promise<any> {
  if (pyodideInstance) return pyodideInstance;
  
  // Load Pyodide script dynamically
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.mjs';
    script.type = 'module';
    script.onload = async () => {
      try {
        // @ts-ignore
        const { loadPyodide } = await import("https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.mjs");
        pyodideInstance = await loadPyodide({ 
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/" 
        });
        resolve(pyodideInstance);
      } catch (error) {
        reject(error);
      }
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// Public helper to warm up Python environment proactively (used during preparation)
export async function preloadPythonEnvironment(): Promise<boolean> {
  try {
    await loadPyodideIfNeeded();
    try { localStorage.setItem('python_ready', 'true'); } catch {}
    return true;
  } catch (e) {
    console.warn('preloadPythonEnvironment failed:', e);
    try { localStorage.setItem('python_ready', 'false'); } catch {}
    return false;
  }
}

// Removed problem-specific input parsers; runner is problem-agnostic

  // JavaScript execution that runs combined (template + harness) in browser
// It removes Node fs usage and injects the test input literal
async function runJavaScriptUserCode(sourceCode: string, testCase: TestCase): Promise<{ stdout: string; result: any; error?: string }> {
  try {
    let buffer: string[] = [];
    const INPUT_LITERAL = JSON.stringify(testCase.input);
    let src = String(sourceCode);

    // Transform Node.js stdin harness to browser-friendly form
    if (/fs\.readFileSync\(/.test(src)) {
      // Remove require('fs') lines
      src = src.replace(/\n?\s*const\s+fs\s*=\s*require\(['"]fs['"]\);?/g, '');
      // Replace fs.readFileSync(...) with literal input
      src = src.replace(/fs\.readFileSync\([^)]*\)/g, INPUT_LITERAL);
    }

    const wrapped = `{
      const __origLog = console.log;
      try {
        console.log = (...args) => { __buffer.push(args.join(' ')); };
        ${src}
        return { stdout: __buffer.join('\\n'), result: undefined };
      } catch(e){
        return { stdout: __buffer.join('\\n'), result: undefined, error: String(e && e.message || e) };
      } finally { console.log = __origLog; }
    }`;

    // eslint-disable-next-line no-new-func
    const fn = new Function("__buffer", wrapped);
    const out = fn(buffer) as { stdout: string; result: any; error?: string };
    return out;
  } catch (e: any) {
    return { stdout: "", result: undefined, error: String(e?.message || e) };
  }
}

// Python execution that runs combined (template + harness) with stdin mocked
async function runPythonUserCode(sourceCode: string, testCase: TestCase): Promise<{ stdout: string; result: any; error?: string }> {
  try {
    const py = await loadPyodideIfNeeded();

    const escapedInput = testCase.input
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\'");

    const prolog = [
      "import sys, io",
      "__stdout_capture = io.StringIO()",
      "__orig_stdout = sys.stdout",
      "__orig_stdin = sys.stdin",
      "sys.stdout = __stdout_capture",
      `sys.stdin = io.StringIO('''${escapedInput}''')`
    ].join("\n");

    const epilog = [
      "__captured_out = __stdout_capture.getvalue()",
      "sys.stdout = __orig_stdout",
      "sys.stdin = __orig_stdin"
    ].join("\n");

    let error: string | undefined;
    try {
      await py.runPythonAsync(prolog + "\n" + sourceCode + "\n" + epilog);
    } catch (e: any) {
      error = String(e?.message || e);
    }

    const stdout: string = await py.runPythonAsync("__captured_out if '" +
      "__captured_out' in globals() else ''");

    return { stdout: String(stdout || '').trim(), result: undefined, error };
  } catch (e: any) {
    return { stdout: "", result: undefined, error: String(e?.message || e) };
  }
}

// Normalize output for comparison
function normalizeOutput(result: any): string {
  try {
    if (Array.isArray(result)) return JSON.stringify(result);
    if (result === undefined || result === null) return String(result);
    if (typeof result === "object") {
      try { return JSON.stringify(result); } catch { return String(result); }
    }
    return typeof result === "string" ? result : JSON.stringify(result);
  } catch {
    return String(result);
  }
}

export class AdvancedOfflineRunner {
  private static instance: AdvancedOfflineRunner;
  private isPythonReady = false;
  private isJavaScriptReady = true;

  private constructor() {
    this.initializePython();
  }

  static getInstance(): AdvancedOfflineRunner {
    if (!AdvancedOfflineRunner.instance) {
      AdvancedOfflineRunner.instance = new AdvancedOfflineRunner();
    }
    return AdvancedOfflineRunner.instance;
  }

  private async initializePython(): Promise<void> {
    try {
      await loadPyodideIfNeeded();
      this.isPythonReady = true;
      console.log('Python execution environment ready');
    } catch (error) {
      console.warn('Failed to load Pyodide, Python execution will not be available:', error);
      this.isPythonReady = false;
    }
  }

  async runCode(
    code: string,
    language: string,
    testCases: TestCase[]
  ): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];

    for (const testCase of testCases) {
      try {
        const result = await this.executeTestCase(code, language, testCase);
        results.push(result);
      } catch (error) {
        results.push({
          passed: false,
          executionTime: 0,
          output: '',
          error: error instanceof Error ? error.message : 'Unknown error',
          testCase
        });
      }
    }

    return results;
  }

  private async executeTestCase(
    code: string,
    language: string,
    testCase: TestCase
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      let output = '';
      let passed = false;

      if (language === 'python') {
        if (!this.isPythonReady) {
          throw new Error('Python execution environment not available');
        }
        
        const result = await runPythonUserCode(code, testCase);
        const actualResult = normalizeOutput(result.result);
        const actualStdout = result.stdout || '';
        const expected = testCase.expectedOutput.trim();
        
        output = actualStdout || actualResult;
        passed = actualResult === expected || actualStdout === expected;
        
        if (result.error) {
          output = result.error;
          passed = false;
        }
      } else if (language === 'javascript') {
        const result = await runJavaScriptUserCode(code, testCase);
        const actualResult = normalizeOutput(result.result);
        const actualStdout = result.stdout || '';
        const expected = testCase.expectedOutput.trim();
        
        output = actualStdout || actualResult;
        passed = actualResult === expected || actualStdout === expected;
        
        if (result.error) {
          output = result.error;
          passed = false;
        }
      } else {
        throw new Error(`Unsupported language: ${language}`);
      }

      const executionTime = Date.now() - startTime;

      return {
        passed,
        executionTime,
        output: output.trim(),
        testCase
      };
    } catch (error) {
      return {
        passed: false,
        executionTime: Date.now() - startTime,
        output: '',
        error: error instanceof Error ? error.message : 'Unknown error',
        testCase
      };
    }
  }

  isLanguageSupported(language: string): boolean {
    if (language === 'javascript') {
      return this.isJavaScriptReady;
    }
    if (language === 'python') {
      return this.isPythonReady;
    }
    return false;
  }

  getSupportedLanguages(): string[] {
    const languages = [];
    if (this.isJavaScriptReady) languages.push('javascript');
    if (this.isPythonReady) languages.push('python');
    return languages;
  }
}

export const advancedOfflineRunner = AdvancedOfflineRunner.getInstance();


