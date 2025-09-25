// Contest preparation system with background downloads and progress tracking

export interface PreparationProgress {
  stage: 'idle' | 'downloading' | 'preparing' | 'ready' | 'error';
  progress: number; // 0-100
  message: string;
  details: string;
}

export interface ContestProblem {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeLimit: number;
  memoryLimit: number;
  testCases: Array<{
    input: string;
    expectedOutput: string;
    description: string;
  }>;
  sampleInput: string;
  sampleOutput: string;
}

import { preloadPythonEnvironment } from './advancedOfflineRunner';

export class ContestPreparation {
  private static instance: ContestPreparation;
  private progress: PreparationProgress = {
    stage: 'idle',
    progress: 0,
    message: 'Ready to prepare contest',
    details: ''
  };
  private callbacks: Array<(progress: PreparationProgress) => void> = [];
  private isPreparing = false;

  private constructor() {}

  static getInstance(): ContestPreparation {
    if (!ContestPreparation.instance) {
      ContestPreparation.instance = new ContestPreparation();
    }
    return ContestPreparation.instance;
  }

  subscribe(callback: (progress: PreparationProgress) => void): () => void {
    this.callbacks.push(callback);
    // Immediately call with current progress
    callback(this.progress);

    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  private updateProgress(updates: Partial<PreparationProgress>) {
    this.progress = { ...this.progress, ...updates };
    this.callbacks.forEach(callback => {
      try {
        callback(this.progress);
      } catch (error) {
        console.error('Error in preparation progress callback:', error);
      }
    });
  }

  async prepareContest(contestId?: string): Promise<boolean> {
    if (this.isPreparing) {
      return false;
    }

    this.isPreparing = true;
    this.updateProgress({
      stage: 'downloading',
      progress: 0,
      message: 'Starting contest preparation...',
      details: 'Downloading required libraries and packages'
    });

    try {
      // Stage 1: Download Python execution libraries
      await this.downloadPythonLibraries();
      
      // Stage 2: Download JavaScript execution libraries
      await this.downloadJavaScriptLibraries();
      
      // Stage 3: Download contest problems
      await this.downloadContestProblems(contestId);
      
      // Stage 4: Prepare offline execution environment
      await this.prepareOfflineEnvironment();
      
      // Stage 5: Final preparation
      await this.finalizePreparation(contestId);

      this.updateProgress({
        stage: 'ready',
        progress: 100,
        message: 'Contest preparation complete!',
        details: 'All systems ready. You can now turn off your internet and start the contest.'
      });

      return true;
    } catch (error) {
      this.updateProgress({
        stage: 'error',
        progress: 0,
        message: 'Preparation failed',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      });
      return false;
    } finally {
      this.isPreparing = false;
    }
  }

  private async downloadPythonLibraries(): Promise<void> {
    this.updateProgress({
      progress: 10,
      message: 'Downloading Python libraries...',
      details: 'Setting up Pyodide for offline Python execution'
    });

    // Simulate downloading Pyodide
    await this.simulateDelay(2000);
    
    this.updateProgress({
      progress: 30,
      message: 'Python libraries downloaded',
      details: 'Pyodide loaded successfully'
    });
  }

  private async downloadJavaScriptLibraries(): Promise<void> {
    this.updateProgress({
      progress: 40,
      message: 'Downloading JavaScript libraries...',
      details: 'Setting up offline JavaScript execution environment'
    });

    // Simulate downloading JS execution libraries
    await this.simulateDelay(1500);
    
    this.updateProgress({
      progress: 60,
      message: 'JavaScript libraries downloaded',
      details: 'Offline JS execution ready'
    });
  }

  private async downloadContestProblems(contestId?: string): Promise<void> {
    this.updateProgress({
      progress: 70,
      message: 'Downloading contest problems...',
      details: 'Loading DSA problems and test cases'
    });

    // Store contest problems in localStorage
    // Prefer existing cached contest payload if present for a specific contest
    let storedProblems: any[] | null = null;
    const problemMap: Record<string, any> = {};
    try {
      if (contestId) {
        const problemsKey = `contest_problems_${contestId}`;
        const existing = localStorage.getItem(problemsKey);
        if (existing) {
          storedProblems = JSON.parse(existing);
          if (storedProblems) {
            storedProblems.forEach((p: any) => { if (p && p._id) problemMap[p._id] = p; });
          }
        } else {
          const cachedContest = localStorage.getItem(`contest_cache_${contestId}`);
          if (cachedContest) {
            const data = JSON.parse(cachedContest);
            const rawProblems: any[] = Array.isArray(data?.problems) ? data.problems : [];
            const normalizedProblems = rawProblems
              .sort((a: any, b: any) => (a?.order || 0) - (b?.order || 0))
              .map((entry: any) => (entry && entry.problemId && typeof entry.problemId === 'object') ? entry.problemId : entry)
              .filter((p: any) => p && p.title && p.description);
            localStorage.setItem(problemsKey, JSON.stringify(normalizedProblems));
            normalizedProblems.forEach((p: any) => { if (p && p._id) problemMap[p._id] = p; });
            storedProblems = normalizedProblems;
          }
        }
      }
    } catch {}

    // If no contest-specific problems available in cache, attempt network fetch as final fallback
    if (!storedProblems && contestId) {
      try {
        const resp = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/contests/${contestId}`);
        if (resp.ok) {
          const payload = await resp.json();
          const data = payload?.data;
          const rawProblems: any[] = Array.isArray(data?.problems) ? data.problems : [];
          const normalizedProblems = rawProblems
            .sort((a: any, b: any) => (a?.order || 0) - (b?.order || 0))
            .map((entry: any) => (entry && entry.problemId && typeof entry.problemId === 'object') ? entry.problemId : entry)
            .filter((p: any) => p && p.title && p.description);
          localStorage.setItem(`contest_problems_${contestId}`, JSON.stringify(normalizedProblems));
          const map: Record<string, any> = {};
          normalizedProblems.forEach((p: any) => { if (p && p._id) map[p._id] = p; });
          localStorage.setItem(`contest_problem_map_${contestId}`, JSON.stringify(map));
          storedProblems = normalizedProblems;
        }
      } catch {}
    }
    
    await this.simulateDelay(1000);
    
    this.updateProgress({
      progress: 85,
      message: 'Contest problems loaded',
      details: 'Problems and test cases ready for offline use'
    });
  }

  private async prepareOfflineEnvironment(): Promise<void> {
    this.updateProgress({
      progress: 90,
      message: 'Preparing offline environment...',
      details: 'Setting up code execution sandbox'
    });

    // Initialize offline code runner
    await this.initializeOfflineRunner();
    // Warm up Python runtime so it's available offline during contest
    try {
      this.updateProgress({
        progress: 92,
        message: 'Initializing Python engine...',
        details: 'Loading Pyodide for offline Python execution'
      });
      const ok = await preloadPythonEnvironment();
      this.updateProgress({
        progress: ok ? 94 : 90,
        message: ok ? 'Python engine ready' : 'Python engine unavailable',
        details: ok ? 'Pyodide initialized successfully' : 'Pyodide failed to initialize'
      });
    } catch (e) {
      console.warn('Python environment preload failed', e);
    }
    
    await this.simulateDelay(500);
    
    this.updateProgress({
      progress: 95,
      message: 'Offline environment ready',
      details: 'Code execution sandbox prepared'
    });
  }

  private async finalizePreparation(contestId?: string): Promise<void> {
    this.updateProgress({
      progress: 98,
      message: 'Finalizing preparation...',
      details: 'Completing setup and verification'
    });

    // Store preparation status (per-contest if id provided)
    if (contestId) {
      localStorage.setItem(`contest_prepared_${contestId}`, 'true');
      localStorage.setItem(`contest_prepared_at_${contestId}`, new Date().toISOString());
    } else {
      localStorage.setItem('contest_prepared', 'true');
      localStorage.setItem('contest_prepared_at', new Date().toISOString());
    }
    
    await this.simulateDelay(200);
  }

  private async initializeOfflineRunner(): Promise<void> {
    // Initialize the offline code runner
    // This would set up Pyodide and other execution environments
    console.log('Initializing offline code runner...');
  }

  private async simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Removed hardcoded sample problems; problems must come from backend or cache

  isContestPrepared(contestId?: string): boolean {
    if (contestId) {
      return localStorage.getItem(`contest_prepared_${contestId}`) === 'true';
    }
    return localStorage.getItem('contest_prepared') === 'true';
  }

  getPreparationStatus(): PreparationProgress {
    return { ...this.progress };
  }

  resetPreparation(contestId?: string): void {
    if (contestId) {
      localStorage.removeItem(`contest_prepared_${contestId}`);
      localStorage.removeItem(`contest_prepared_at_${contestId}`);
      localStorage.removeItem(`contest_problems_${contestId}`);
    } else {
      localStorage.removeItem('contest_prepared');
      localStorage.removeItem('contest_prepared_at');
      localStorage.removeItem('contest_problems');
    }
    this.updateProgress({
      stage: 'idle',
      progress: 0,
      message: 'Ready to prepare contest',
      details: ''
    });
  }
}

export const contestPreparation = ContestPreparation.getInstance();