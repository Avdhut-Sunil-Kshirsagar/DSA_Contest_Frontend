import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '../components/ui/resizable';
import AceCodeEditor from '../components/AceCodeEditor';
import { advancedOfflineRunner } from '../utils/advancedOfflineRunner';
import type { ExecutionResult } from '../utils/advancedOfflineRunner';
import { internetMonitor } from '../utils/internetMonitor';
import type { InternetStatus } from '../utils/internetMonitor';
import { userStateManager } from '../utils/userStateManager';
import api from '../utils/api';
import type { Problem as BackendProblem } from '../lib/api';
import { FadeInUp } from '../components/animations';
import toast from 'react-hot-toast';
import {
  Play,
  CheckCircle,
  Wifi,
  WifiOff,
  Clock,
  XCircle,
  AlertTriangle,
  Eye,
  Undo2,
  Redo2
} from 'lucide-react';

const languages = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' }
];

const EnhancedProblemSolver: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // State management
  // contest state is not currently used; timer derives from cached contest duration
  const [problems, setProblems] = useState<BackendProblem[]>([]);
  const [problem, setProblem] = useState<BackendProblem | null>(null);
  const [code, setCode] = useState<string>('');
  const [language, setLanguage] = useState<string>('javascript');
  const [theme, setTheme] = useState<string>('monokai');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [testResults, setTestResults] = useState<ExecutionResult[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [contestStarted, setContestStarted] = useState<boolean>(false);
  const [totalPossibleScore, setTotalPossibleScore] = useState<number>(0);

  // Internet monitoring
  const [internetStatus, setInternetStatus] = useState<InternetStatus>(internetMonitor.getCurrentStatus());
  const [violationCount, setViolationCount] = useState<number>(0);
  const [showInternetWarning, setShowInternetWarning] = useState<boolean>(false);
  const [penaltyPoints, setPenaltyPoints] = useState<number>(0);

  // Contest state
  const [currentProblemIndex, setCurrentProblemIndex] = useState<number>(0);
  const [problemResults, setProblemResults] = useState<any[]>([]);
  const [contestCompleted, setContestCompleted] = useState<boolean>(false);
  const [showFinalSubmission, setShowFinalSubmission] = useState<boolean>(false);
  const [contestStartTime, setContestStartTime] = useState<number>(0);

  // Layout state
  const [isSmall, setIsSmall] = useState<boolean>(false);
  const [showConsole, setShowConsole] = useState<boolean>(false);
  const [output, setOutput] = useState<string>('');
  const [showHarness, setShowHarness] = useState<boolean>(false);
  const [isPageRefresh, setIsPageRefresh] = useState<boolean>(false);
  const editorRef = useRef<any>(null);

  // Disable copy/paste and related actions (mouse + keyboard) strictly on this page
  useEffect(() => {
    const prevent = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const key = (e.key || '').toLowerCase();
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      const isCopy = isCtrlOrMeta && key === 'c';
      const isPaste = isCtrlOrMeta && key === 'v';
      const isCut = isCtrlOrMeta && key === 'x';
      const isShiftInsertPaste = e.shiftKey && key === 'insert';
      const isCtrlInsertCopy = e.ctrlKey && key === 'insert';

      if (isCopy || isPaste || isCut || isShiftInsertPaste || isCtrlInsertCopy) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener('copy', prevent, true);
    document.addEventListener('cut', prevent, true);
    document.addEventListener('paste', prevent, true);
    document.addEventListener('contextmenu', prevent, true);
    document.addEventListener('dragstart', prevent, true);
    document.addEventListener('drop', prevent, true);
    document.addEventListener('keydown', onKeyDown, true);

    return () => {
      document.removeEventListener('copy', prevent, true);
      document.removeEventListener('cut', prevent, true);
      document.removeEventListener('paste', prevent, true);
      document.removeEventListener('contextmenu', prevent, true);
      document.removeEventListener('dragstart', prevent, true);
      document.removeEventListener('drop', prevent, true);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, []);

  // Initialize code template when component mounts or language changes
  useEffect(() => {
    if (problem && (problem as any).codeTemplates && (problem as any).codeTemplates[language as keyof any]) {
      setCode((problem as any).codeTemplates[language as keyof any] as string);
    }
  }, [problem, language]);

  // Ensure a problem is selected once problems are available
  useEffect(() => {
    if (!problem && problems.length > 0) {
      const first = problems[0] as any;
      setProblem(first);
      const templates = first?.codeTemplates ?? {};
      if (templates && templates[language as keyof any]) {
        setCode(templates[language as keyof any]);
      } else {
        setCode('');
      }
    }
  }, [problems, problem, language]);

  // Fetch contest and problems with offline cache fallback
  useEffect(() => {
    const CACHE_KEY = (cid: string) => `contest_cache_${cid}`;

    const loadFromCache = (cid: string) => {
      try {
        const cachedContest = localStorage.getItem(CACHE_KEY(cid));
        const cachedProblems = localStorage.getItem(`contest_problems_${cid}`);
        const problemMapStr = localStorage.getItem(`contest_problem_map_${cid}`);
        if (!cachedContest && !cachedProblems) {
          return null;
        }
        const contestData = cachedContest ? JSON.parse(cachedContest) : null;
        const problemsData = cachedProblems ? JSON.parse(cachedProblems) : null;
        const problemMap = problemMapStr ? JSON.parse(problemMapStr) : {};
        if (problemsData) {
          const expanded = (problemsData || []).map((p: any) => {
            if (p && typeof p === 'string' && problemMap[p]) return problemMap[p];
            if (p && p._id && problemMap[p._id]) return problemMap[p._id];
            return p;
          });
          return { ...(contestData || {}), problems: expanded.map((p: any, idx: number) => ({ problemId: p, order: idx + 1 })) };
        }
        return contestData;
      } catch {
        return null;
      }
    };

    const saveToCache = (cid: string, data: any) => {
      try {
        localStorage.setItem(CACHE_KEY(cid), JSON.stringify(data));
      } catch {}
    };

    const hydrateFromData = (data: any) => {

      // Initialize timer from contest duration if present
      const durationMs = Number(data?.duration) || 0;
      if (durationMs > 0) {
        const seconds = Math.max(1, Math.floor(durationMs / 1000));
        setTimeLeft(seconds);
      } else if (timeLeft === 0) {
        // Fallback default 120 minutes to match preparation page display
        setTimeLeft(7200);
      }

      // Normalize problems from cache or API
      const rawProblems: any[] = Array.isArray(data.problems) ? data.problems : [];
      const normalized: BackendProblem[] = rawProblems
        .sort((a: any, b: any) => (a?.order || 0) - (b?.order || 0))
        .map((entry: any) => {
          if (entry && entry.problemId && typeof entry.problemId === 'object') {
            return entry.problemId as BackendProblem;
          }
          return entry as BackendProblem;
        })
        .filter((p: any) => p && (p._id || p.id) && p.title);

      setProblems(normalized);
      // Capture contest total possible score if provided by backend
      const tps = Number((data as any)?.totalPossibleScore) || 0;
      setTotalPossibleScore(tps);
      setCurrentProblemIndex(0);

      if (normalized.length > 0) {
        const first = normalized[0];
        setProblem(first);
        const templates = (first as any).codeTemplates;
          if (templates && templates[language as keyof any]) {
            setCode(templates[language as keyof any]);
        } else {
          setCode('');
        }
      }
    };

    const fetchContest = async () => {
      if (!id) {
        return;
      }

      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        const cached = loadFromCache(id);
        if (cached) {
          hydrateFromData(cached);
          return;
        }
        return;
      }

      try {
        const res = await api.get(`/contests/${id}`);
        const data = res.data?.data as any;
        saveToCache(id, data);
        try {
          const rawProblems: any[] = Array.isArray(data?.problems) ? data.problems : [];
          const normalizedProblems = rawProblems
            .sort((a: any, b: any) => (a?.order || 0) - (b?.order || 0))
            .map((entry: any) => (entry && entry.problemId && typeof entry.problemId === 'object') ? entry.problemId : entry)
            .filter((p: any) => p && (p._id || p.id) && p.title);
          localStorage.setItem(`contest_problems_${id}`, JSON.stringify(normalizedProblems));
          const problemMap: Record<string, any> = {};
          normalizedProblems.forEach((p: any) => { if (p && p._id) problemMap[p._id] = p; });
          localStorage.setItem(`contest_problem_map_${id}`, JSON.stringify(problemMap));
        } catch {}
        hydrateFromData(data);
      } catch (e: any) {
        const cached = loadFromCache(id);
        if (cached) {
          hydrateFromData(cached);
          return;
        }
      }
    };

    fetchContest();
  }, [id]);

  // Handle user changes and reset state if needed
  useEffect(() => {
    if (user?.id) {
      const stateWasReset = userStateManager.checkAndResetUserState(user.id);

      if (stateWasReset) {
        setContestStarted(false);
        setCurrentProblemIndex(0);
        setProblemResults([]);
        setContestCompleted(false);
        setTimeLeft((prev) => prev > 0 ? prev : 7200);
        setContestStartTime(Date.now());
        setViolationCount(0);
        setPenaltyPoints(0);
        setShowFinalSubmission(false);
        if (problems[0]) setProblem(problems[0]);

        internetMonitor.stopMonitoring();

        toast.success('Welcome! Contest state has been reset for new user.');
      }
    }
  }, [user?.id]);

  // Initialize contest timer from saved state or start fresh
  useEffect(() => {
    const initializeInternetMonitoring = async () => {
      checkInternetStatusFromUI();
      await manualInternetCheck();
      if (contestStarted && !contestCompleted) {
        internetMonitor.startMonitoring(2000);
      }
    };

    initializeInternetMonitoring();

    if (user?.id && userStateManager.isSameUser(user.id)) {
      const savedContestState = localStorage.getItem('contest_state');
      if (savedContestState) {
        try {
          const state = JSON.parse(savedContestState);
          setContestStarted(state.contestStarted || false);
          setCurrentProblemIndex(state.currentProblemIndex || 0);
          setProblemResults(state.problemResults || []);
          setContestCompleted(state.contestCompleted || false);
          setTimeLeft(state.timeLeft || timeLeft || 0);
          setContestStartTime(state.contestStartTime || Date.now());
          setViolationCount(state.violationCount || 0);
          setPenaltyPoints(state.penaltyPoints || 0);

          if (state.currentProblemIndex !== undefined && problems[state.currentProblemIndex]) {
            setProblem(problems[state.currentProblemIndex]);
          }

          if (state.contestCompleted) {
            setShowFinalSubmission(true);
          } else if (state.contestStarted && !state.contestCompleted) {
            internetMonitor.startMonitoring(2000);
          }
        } catch (error) {
          setTimeLeft((prev) => prev > 0 ? prev : 5400);
          if (!contestStarted) {
            startContest();
          }
        }
      } else {
        setTimeLeft((prev) => prev > 0 ? prev : 7200);
        if (!contestStarted) {
          startContest();
        }
      }
    } else if (user?.id) {
        setTimeLeft((prev) => prev > 0 ? prev : 7200);
      setTimeLeft((prev) => prev > 0 ? prev : 7200);
      if (!contestStarted) {
        startContest();
      }
    }
  }, [user?.id]);

  // Responsive split direction based on viewport width
  useEffect(() => {
    const onResize = () => setIsSmall(window.innerWidth < 1024);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Internet monitoring
  useEffect(() => {
    const currentStatus = internetMonitor.getCurrentStatus();
    setInternetStatus(currentStatus);

    internetMonitor.performCheck().then(() => {
      const updatedStatus = internetMonitor.getCurrentStatus();
      setInternetStatus(updatedStatus);

      if (contestStarted && !contestCompleted && updatedStatus.isOnline) {
        const lastStatus = localStorage.getItem('last_internet_status');
        const pageLoadTime = Date.now();
        const lastPageLoad = localStorage.getItem('last_page_load_time');
        const timeSinceLastLoad = lastPageLoad ? pageLoadTime - parseInt(lastPageLoad) : 0;

        if (!lastStatus || lastStatus === 'offline' || timeSinceLastLoad < 5000) {
          setIsPageRefresh(timeSinceLastLoad < 5000);
          handleInternetViolation();
        }
        localStorage.setItem('last_internet_status', 'online');
        localStorage.setItem('last_page_load_time', pageLoadTime.toString());
      } else if (updatedStatus.isOnline === false) {
        localStorage.setItem('last_internet_status', 'offline');
      }
    });

    const unsubscribe = internetMonitor.subscribe((status) => {
      const previousStatus = internetStatus;
      setInternetStatus(status);
      localStorage.setItem('last_internet_status', status.isOnline ? 'online' : 'offline');
      if (contestStarted && !contestCompleted && status.isOnline && !previousStatus.isOnline) {
        handleInternetViolation();
      }
    });

    return unsubscribe;
  }, [contestStarted, contestCompleted]);

  // Enhanced internet monitoring for page refresh scenarios
  useEffect(() => {
    if (contestStarted && !contestCompleted) {
      const checkInterval = setInterval(async () => {
        try {
          const uiStatus = checkInternetStatusFromUI();
          await internetMonitor.performCheck();
          const currentStatus = internetMonitor.getCurrentStatus();

          if (uiStatus.isOnline !== currentStatus.isOnline) {
            setInternetStatus({
              isOnline: uiStatus.isOnline,
              lastChecked: new Date(),
              connectionQuality: uiStatus.isOnline ? 'good' as const : 'offline' as const
            });
          } else {
            setInternetStatus(currentStatus);
          }

          const finalStatus = uiStatus.isOnline !== currentStatus.isOnline ? uiStatus : currentStatus;
          if (finalStatus.isOnline) {
            const lastStatus = localStorage.getItem('last_internet_status');
            if (lastStatus === 'offline') {
              handleInternetViolation();
            }
            localStorage.setItem('last_internet_status', 'online');
          } else {
            localStorage.setItem('last_internet_status', 'offline');
          }
        } catch (error) {
          // ignore
        }
      }, 2000);

      return () => clearInterval(checkInterval);
    }
  }, [contestStarted, contestCompleted]);

  // Contest timer with auto complete on timeout
  useEffect(() => {
    if (contestStarted && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            // End contest on timeout exactly once
            if (!contestCompleted) {
            toast.error('Contest time is up!');
              setContestStarted(false);
              completeContest();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [contestStarted, timeLeft, contestCompleted]);

  // Save contest state whenever it changes
  useEffect(() => {
    if (contestStarted || contestCompleted) {
      saveContestState();
    }
  }, [contestStarted, currentProblemIndex, problemResults, contestCompleted, timeLeft, violationCount, penaltyPoints]);

  const handleInternetViolation = () => {
    if (!user || !id) return;

    internetMonitor.handleInternetViolation(id, user.id);
    setViolationCount(prev => prev + 1);
    setPenaltyPoints(prev => prev + 10);
    setShowInternetWarning(true);

    const violationMessage = isPageRefresh
      ? '🚨 Page refresh with internet ON detected! 10 points penalty applied.'
      : '🚨 Internet violation detected! 10 points will be deducted from your final score.';

    toast.error(violationMessage, {
      duration: 8000,
      style: {
        background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
        color: '#fff',
        fontSize: '16px',
        fontWeight: 'bold'
      }
    });

    setTimeout(() => {
      setShowInternetWarning(false);
      setIsPageRefresh(false);
    }, 10000);
  };

  const buildHarnessSnippet = (_lang: string) => {
    if (!problem) return "// No problem loaded";
    const harsh = (problem as any).harshnessCode || (problem as any).harnessCode;
    let harnessCode = '';
    if (typeof harsh === 'object' && harsh !== null) {
      harnessCode = String(harsh[language as keyof any] || '').trim();
    } else if (typeof harsh === 'string' && harsh.trim().length > 0) {
      harnessCode = harsh.trim();
    }
    if (harnessCode) return harnessCode;
    const firstTestCase = problem.testCases?.[0];
    if (!firstTestCase) return "// No test cases available";
    return "// Harness preview is not provided for this problem";
  };

  const runCode = async (): Promise<ExecutionResult[] | undefined> => {
    if (!problem || !code.trim()) {
      toast.error('Please write some code first');
      return undefined;
    }

    setIsRunning(true);
    setShowConsole(true);
    setOutput('Running...');

    try {
      const tests = (problem.testCases || []);
      const rawHarness: any = (problem as any).harshnessCode || (problem as any).harnessCode || '';
      let harnessToUse = '';
      if (rawHarness && typeof rawHarness === 'object') {
        harnessToUse = String(rawHarness[language as keyof any] || '').trim();
      } else if (typeof rawHarness === 'string') {
        harnessToUse = rawHarness.trim();
      }
      
      let combined = code;
      if (harnessToUse) {
        if (language === 'javascript') {
          combined = `${code}\n// --- HARNESS START ---\n${harnessToUse}\n// --- HARNESS END ---`;
        } else if (language === 'python') {
          combined = `${code}\n# --- HARNESS START ---\n${harnessToUse}\n# --- HARNESS END ---`;
        } else if (language === 'cpp') {
          combined = `${code}\n// --- HARNESS START ---\n${harnessToUse}\n// --- HARNESS END ---`;
        } else if (language === 'java') {
          combined = `${code}\n// --- HARNESS START ---\n${harnessToUse}\n// --- HARNESS END ---`;
        }
      }

      const results = await advancedOfflineRunner.runCode(combined, language, tests);
      setTestResults(results);

      const passedTests = results.filter(r => r.passed).length;
      const totalTests = results.length;

      if (passedTests === totalTests) {
        setOutput(`✅ All ${totalTests} test(s) passed.`);
        toast.success(`All ${totalTests} test cases passed!`);
      } else {
        const failedResult = results.find(r => !r.passed);
        setOutput(`Test failed\nInput: ${failedResult?.testCase.input}\nExpected: ${failedResult?.testCase.expectedOutput}\nYour Output: ${failedResult?.output || '<empty>'}`);
        toast.error(`${passedTests}/${totalTests} test cases passed`);
      }
      return results;
    } catch (error) {
      setOutput(`Run error: ${error}`);
      toast.error('Failed to run code');
      return undefined;
    } finally {
      setIsRunning(false);
    }
  };

  const markProblemDone = async () => {
    if (!problem || !code.trim()) {
      toast.error('Please write some code first');
      return;
    }

    setIsSubmitting(true);
    try {
      // Ensure we have fresh test results if user didn't click Run
      let resultsToUse: ExecutionResult[] | undefined = testResults;
      if (!resultsToUse || resultsToUse.length === 0) {
        resultsToUse = await runCode();
      }
      const safeResults: ExecutionResult[] = Array.isArray(resultsToUse) ? resultsToUse : [];

      // Score using per-test-case points if available; fallback to even distribution over 100
      const ptsArray: number[] = Array.isArray((problem as any).testCases)
        ? ((problem as any).testCases as any[]).map(tc => Number(tc.points) || 0)
        : [];
      const perProblemMax = ptsArray.length > 0 ? ptsArray.reduce((s, p) => s + p, 0) : 100;
      const score = safeResults.reduce((sum, r, idx) => {
        const pts = ptsArray.length > 0 ? (ptsArray[idx] || 0) : (100 / Math.max(1, safeResults.length));
        return sum + (r.passed ? pts : 0);
      }, 0);

      const currentTime = Date.now();
      const timeTaken = currentTime - contestStartTime;
      const timeFormatted = formatTime(Math.floor(timeTaken / 1000));

      const problemResult = {
        userId: user?.id,
        problemId: (problem as any)._id,
        problemTitle: problem.title,
        score: score,
        time: timeFormatted,
        language: language,
        code: code,
        testResults: safeResults,
        timestamp: new Date().toISOString()
      };

      const existingResults = JSON.parse(localStorage.getItem('contest_results') || '[]');
      existingResults.push(problemResult);
      localStorage.setItem('contest_results', JSON.stringify(existingResults));

      setProblemResults(existingResults);

      toast.success(`✅ Problem ${problem.title} completed! Score: ${Math.round(score)}/${perProblemMax}`);

      if (currentProblemIndex >= 2 || existingResults.length >= problems.length) {
        setTimeout(() => {
          completeContest();
        }, 1500);
      } else {
        setTimeout(() => {
          loadNextProblem();
        }, 1500);
      }

    } catch (error) {
      toast.error('Failed to save problem result');
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadNextProblem = () => {
    const nextIndex = currentProblemIndex + 1;
    if (nextIndex < problems.length) {
      const nextProblem = problems[nextIndex];
      setProblem(nextProblem);
      setCurrentProblemIndex(nextIndex);
      setCode('');
      setTestResults([]);
      setOutput('');
      setShowConsole(false);
      setShowHarness(false);

      const templates = (nextProblem as any).codeTemplates;
      if (templates && templates[language as keyof any]) {
        setCode(templates[language as keyof any]);
      } else {
        setCode('');
      }
    }
  };

  const completeContest = () => {
    setContestCompleted(true);
    setShowFinalSubmission(true);

    internetMonitor.stopMonitoring();

    const totalScore = problemResults.reduce((sum, result) => sum + result.score, 0);
    const finalScore = totalScore - penaltyPoints;

    const minimalProblemResults = (problemResults || []).map((r: any) => ({
      problemId: r.problemId,
      score: Number(r.score) || 0
    }));

    const finalResult = {
      userId: user?.id,
      contestId: id,
      totalScore: finalScore,
      penaltyPoints: penaltyPoints,
      problemResults: minimalProblemResults,
      totalTime: formatTime(Math.floor((Date.now() - contestStartTime) / 1000)),
      timestamp: new Date().toISOString()
    };

    localStorage.setItem('final_contest_result', JSON.stringify(finalResult));
    localStorage.removeItem('contest_state');

    toast.success('🎉 Contest Completed! All problems processed!', {
      duration: 5000,
      style: {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: '#fff',
        fontSize: '16px',
        fontWeight: 'bold'
      }
    });

    setTimeout(() => {
      setShowFinalSubmission(true);
    }, 2000);
  };

  const submitFinalResults = async (retryCount = 0) => {
    if (!internetStatus.isOnline) {
      toast.error('Please turn on your internet connection to submit results');
      return;
    }

    const maxRetries = 3;

    try {
      // Load or construct final result payload to match backend expectations
      let finalResult: any = {};
      try {
        const stored = localStorage.getItem('final_contest_result');
        finalResult = stored ? JSON.parse(stored) : {};
      } catch {}

      if (!finalResult || !finalResult.userId || !finalResult.contestId) {
        const computedTotalScore = problemResults.reduce((sum, r) => sum + (Number(r.score) || 0), 0);
        finalResult = {
          userId: user?.id,
          contestId: id,
          totalScore: computedTotalScore - penaltyPoints,
          penaltyPoints: penaltyPoints,
          problemResults: (problemResults || []).map((r: any) => ({
            problemId: r.problemId,
            score: Number(r.score) || 0
          })),
          totalTime: formatTime(Math.floor((Date.now() - contestStartTime) / 1000)),
          timestamp: new Date().toISOString()
        };
      } else {
        // Normalize types and strip unnecessary fields
        finalResult.userId = finalResult.userId || user?.id;
        finalResult.contestId = finalResult.contestId || id;
        finalResult.penaltyPoints = Number(finalResult.penaltyPoints) || 0;
        finalResult.totalScore = Number(finalResult.totalScore) || 0;
        finalResult.totalTime = String(finalResult.totalTime || formatTime(Math.floor((Date.now() - contestStartTime) / 1000)));
        finalResult.problemResults = (finalResult.problemResults || []).map((r: any) => ({
          problemId: r.problemId,
          score: Number(r.score) || 0
        }));
      }

      if (!finalResult.userId || !finalResult.contestId) {
        toast.error('Missing user or contest information for final submission');
        return;
      }

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/api/submissions/final`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(finalResult)
      });

      if (response.ok) {
        await response.json();
        toast.success('Final results submitted successfully!');
        setShowFinalSubmission(false);
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } else {
        let errorMessage = 'Server error';
        try {
          const text = await response.text();
          try {
            const data = JSON.parse(text);
            errorMessage = data?.message || errorMessage;
          } catch {
            errorMessage = text || errorMessage;
          }
        } catch {}
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      if (retryCount < maxRetries - 1) {
        const delay = Math.pow(2, retryCount) * 1000;
        toast.error(`Submission failed: ${error?.message || 'Unknown error'}. Retrying in ${Math.floor(delay / 1000)}s... (${retryCount + 1}/${maxRetries})`);
        setTimeout(() => {
          submitFinalResults(retryCount + 1);
        }, delay);
      } else {
        toast.error(`Failed to submit after ${maxRetries} attempts: ${error?.message || 'Unknown error'}. Results saved locally.`);
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          toast.error('Unable to connect to server. Please check your internet connection.');
        } else {
          toast.error('Server error. Please try again later.');
        }
        setTimeout(() => {
          setShowFinalSubmission(false);
          navigate('/');
        }, 3000);
      }
    }
  };

  const saveContestState = () => {
    const contestState = {
      contestStarted,
      currentProblemIndex,
      problemResults,
      contestCompleted,
      timeLeft,
      contestStartTime,
      violationCount,
      penaltyPoints
    };
    localStorage.setItem('contest_state', JSON.stringify(contestState));
  };

  const startContest = () => {
    setContestStarted(true);
    setContestStartTime(Date.now());
    internetMonitor.startMonitoring(2000);

    localStorage.removeItem('contest_results');
    localStorage.removeItem('final_contest_result');
    setProblemResults([]);
    setCurrentProblemIndex(0);
    setProblem(problems[0]);
    setContestCompleted(false);
    setShowFinalSubmission(false);

    internetMonitor.performCheck().then(() => {
      const status = internetMonitor.getCurrentStatus();
      setInternetStatus(status);
      if (status.isOnline) {
        toast.error('⚠️ Internet is ON! Please turn off your internet connection to avoid penalties.');
      }
      localStorage.setItem('last_internet_status', status.isOnline ? 'online' : 'offline');
      localStorage.setItem('last_page_load_time', Date.now().toString());
    });

    toast.success('Contest started! Internet monitoring is active.');
  };

  const manualInternetCheck = async () => {
    try {
      await internetMonitor.performCheck();
      const currentStatus = internetMonitor.getCurrentStatus();
      setInternetStatus(currentStatus);

      if (contestStarted && !contestCompleted && currentStatus.isOnline) {
        const lastStatus = localStorage.getItem('last_internet_status');
        if (lastStatus === 'offline') {
          handleInternetViolation();
        }
        localStorage.setItem('last_internet_status', 'online');
      } else if (!currentStatus.isOnline) {
        localStorage.setItem('last_internet_status', 'offline');
      }

      return currentStatus;
    } catch (error) {
      return { isOnline: false, lastChecked: Date.now() } as any;
    }
  };

  const checkInternetStatusFromUI = () => {
    const statusElement = document.getElementById('internet-status-text');
    if (statusElement) {
      const statusText = statusElement.textContent?.trim();
      const isOnline = statusText === 'Online';
      if (isOnline !== internetStatus.isOnline) {
        setInternetStatus({ isOnline, lastChecked: new Date(), connectionQuality: 'good' });
        if (contestStarted && !contestCompleted && isOnline) {
          const lastStatus = localStorage.getItem('last_internet_status');
          if (!lastStatus || lastStatus === 'offline') {
            handleInternetViolation();
          }
          localStorage.setItem('last_internet_status', 'online');
        } else if (!isOnline) {
          localStorage.setItem('last_internet_status', 'offline');
        }
      }
      return { isOnline, lastChecked: new Date(), connectionQuality: 'good' } as any;
    }
    return { isOnline: false, lastChecked: new Date(), connectionQuality: 'offline' } as any;
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!problem) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading problem...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden max-h-screen">
      {showInternetWarning && internetStatus.isOnline && (
        <div className="fixed inset-0 bg-red-600 z-50 flex items-center justify-center">
          <div className="text-center text-white p-8">
            <XCircle className="h-24 w-24 mx-auto mb-6 text-white" />
            <h1 className="text-4xl font-bold mb-4">VIOLATION DETECTED!</h1>
            <p className="text-xl mb-6">
              You are destroying the instruction! Your points will be deducted from the final score.
            </p>
            <p className="text-lg mb-8">
              Please turn off your internet connection immediately!
            </p>
            <div className="text-2xl font-mono">
              Penalty: -{penaltyPoints} points
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800/90 to-purple-800/90 backdrop-blur-xl border-b border-white/10 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-lg">{currentProblemIndex + 1}</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">{problem.title}</h1>
                  <p className="text-purple-200 text-sm">Problem {currentProblemIndex + 1} of {Math.max(3, problems.length)}</p>
                </div>
              </div>
              <div className={`${(problem?.difficulty === 'Easy') ? 'bg-gradient-to-r from-green-400 to-green-600 text-white' :
                  (problem?.difficulty === 'Medium') ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white' :
                    'bg-gradient-to-r from-red-400 to-red-600 text-white'
                } px-4 py-2 rounded-full text-sm font-semibold shadow-lg`}>
                {(problem?.difficulty || '').toUpperCase()}
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-3 bg-slate-800/50 px-4 py-2 rounded-xl backdrop-blur-sm">
                {internetStatus.isOnline ? (
                  <Wifi className="h-5 w-5 text-green-400" />
                ) : (
                  <WifiOff className="h-5 w-5 text-red-400" />
                )}
                <span id="internet-status-text" className="text-sm text-white font-medium">
                  {internetStatus.isOnline ? 'Online' : 'Offline'}
                </span>
              </div>

              {contestStarted && (
                <div className="flex items-center space-x-3 bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 rounded-xl shadow-lg">
                  <Clock className="h-6 w-6 text-white" />
                  <span className="text-xl font-mono text-white font-bold">
                    {formatTime(timeLeft)}
                  </span>
                </div>
              )}

              <div className="flex items-center space-x-3 bg-slate-800/50 px-4 py-2 rounded-xl backdrop-blur-sm">
                <span className="text-sm text-purple-200 font-medium">Progress:</span>
                <div className="flex space-x-2">
                  {[...Array(Math.max(3, problems.length)).keys()].map((index) => (
                    <div
                      key={index}
                      className={`w-4 h-4 rounded-full transition-all duration-300 ${index < problemResults.length
                          ? 'bg-gradient-to-r from-green-400 to-green-600 shadow-lg'
                          : index === currentProblemIndex && !contestCompleted
                            ? 'bg-gradient-to-r from-blue-400 to-blue-600 shadow-lg animate-pulse'
                            : contestCompleted && index < problemResults.length
                              ? 'bg-gradient-to-r from-green-400 to-green-600 shadow-lg'
                              : 'bg-slate-600'
                        }`}
                    />
                  ))}
                </div>
                {contestCompleted && (
                  <span className="text-green-400 font-bold text-sm">🎉 ALL DONE!</span>
                )}
              </div>

              {violationCount > 0 && (
                <div className="flex items-center space-x-3 bg-red-600/20 px-4 py-2 rounded-xl backdrop-blur-sm border border-red-500/30">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                  <span className="text-sm text-red-300 font-medium">
                    {violationCount} violations (-{penaltyPoints} points)
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="h-[calc(100vh-80px)] overflow-hidden">
        <ResizablePanelGroup direction={isSmall ? "vertical" : "horizontal"} className="h-full w-full flex">
          {/* Problem Description */}
          <ResizablePanel defaultSize={50} minSize={30} className="resizable-panel bg-gradient-to-br from-slate-800/50 to-purple-800/30 border-r border-white/10 data-[panel-group-direction=vertical]:border-b data-[panel-group-direction=vertical]:border-r-0 backdrop-blur-xl flex-shrink-0">
            <div className="problem-description-panel h-full w-full overflow-y-auto overflow-x-auto scrollbar-thin scrollbar-thumb-purple-500 scrollbar-track-slate-800 hover:scrollbar-thumb-purple-400">
              <div className="p-6 space-y-8 min-h-full">
                {/* Header */}
                <FadeInUp>
                  <div className="space-y-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl">
                        <span className="text-white font-bold text-xl">{currentProblemIndex + 1}</span>
                      </div>
                      <div>
                        <h1 className="font-bold text-3xl text-white">{problem.title}</h1>
                        <div className="flex items-center space-x-4 mt-2">
                          <span className={`px-4 py-2 rounded-full text-sm font-semibold shadow-lg ${(problem?.difficulty === 'Easy') ? 'bg-gradient-to-r from-green-400 to-green-600 text-white' :
                              (problem?.difficulty === 'Medium') ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white' :
                                'bg-gradient-to-r from-red-400 to-red-600 text-white'
                            }`}>
                            {(problem?.difficulty || '').toUpperCase()}
                          </span>
                          <div className="flex items-center space-x-4 text-sm text-purple-200">
                            <span className="flex items-center space-x-1">
                              <Clock className="h-4 w-4" />
                              <span>{problem.timeLimit}ms</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <span>💾</span>
                              <span>{problem.memoryLimit}MB</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </FadeInUp>

                <FadeInUp delay={0.3}>
                  <div className="space-y-8 min-w-0 break-words">
                    {/* Description */}
                    <div className="bg-slate-800/40 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                      <h3 className="font-bold text-xl text-white mb-4 flex items-center space-x-2">
                        <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                        <span>Description</span>
                      </h3>
                      <p className="text-gray-200 leading-relaxed whitespace-pre-wrap text-lg">
                        {problem.description}
                      </p>
                    </div>

                    {/* Examples */}
                    <div className="space-y-6">
                      <h3 className="font-bold text-xl text-white flex items-center space-x-2">
                        <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                        <span>Examples</span>
                      </h3>
                          {(problem.examples || []).map((example: any, index: number) => (
                        <div key={index} className="bg-gradient-to-r from-slate-700/50 to-purple-700/30 rounded-2xl p-6 border border-white/10 backdrop-blur-sm">
                          <div className="space-y-4 font-mono text-sm">
                            <div className="bg-slate-800/60 rounded-xl p-4">
                              <div className="text-green-400 font-semibold mb-2">Input:</div>
                              <div className="text-white break-words">{example.input}</div>
                            </div>
                            <div className="bg-slate-800/60 rounded-xl p-4">
                              <div className="text-blue-400 font-semibold mb-2">Output:</div>
                              <div className="text-white break-words">{example.output}</div>
                            </div>
                            {example.explanation && (
                              <div className="bg-purple-800/30 rounded-xl p-4 border border-purple-500/30">
                                <div className="text-purple-300 font-semibold mb-2">Explanation:</div>
                                <div className="text-purple-100">{example.explanation}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Constraints */}
                    <div className="bg-slate-800/40 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                      <h3 className="font-bold text-xl text-white mb-4 flex items-center space-x-2">
                        <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                        <span>Constraints</span>
                      </h3>
                      <ul className="space-y-2 text-sm text-gray-200 font-mono">
                        {(problem.constraints || []).map((constraint: any, index: number) => (
                          <li key={index} className="flex items-start space-x-3">
                            <span className="text-purple-400 mt-1">•</span>
                            <span>{constraint}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Hints */}
                    <div className="space-y-4">
                      <h3 className="font-bold text-xl text-white flex items-center space-x-2">
                        <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                        <span>Hints</span>
                      </h3>
                      {(problem.hints || []).map((hint: any, index: number) => (
                        <div key={index} className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl p-6 border border-blue-500/30 backdrop-blur-sm">
                          <div className="flex items-start space-x-4">
                            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                              <span className="text-white font-bold text-sm">{index + 1}</span>
                            </div>
                            <p className="text-blue-100 leading-relaxed text-lg">{hint}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </FadeInUp>
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Code Editor Section */}
          <ResizablePanel defaultSize={50} minSize={30} className="resizable-panel flex flex-col h-full w-full bg-gradient-to-br from-slate-900/90 to-purple-900/50 backdrop-blur-xl flex-shrink-0">
            {/* Editor Header */}
            {/* Code Editor and Console Area */}
            <FadeInUp delay={0.2} className="flex-1">
              <div className="editor-header flex items-center justify-between p-6 border-b border-white/10 bg-gradient-to-r from-slate-800/50 to-purple-800/30 backdrop-blur-sm gap-4 flex-wrap">
                <div className="flex items-center gap-3 flex-wrap min-w-0">
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="px-4 py-2 bg-slate-700/50 border border-white/20 rounded-xl text-white text-sm font-medium backdrop-blur-sm hover:bg-slate-600/50 transition-all duration-200"
                  >
                    {languages.map((lang) => (
                      <option key={lang.value} value={lang.value}>
                        {lang.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    className="px-4 py-2 bg-slate-700/50 border border-white/20 rounded-xl text-white text-sm font-medium backdrop-blur-sm hover:bg-slate-600/50 transition-all duration-200"
                  >
                    <option value="monokai">Monokai</option>
                    <option value="github">GitHub</option>
                    <option value="twilight">Twilight</option>
                    <option value="xcode">Xcode</option>
                  </select>

                  <button
                    className="px-4 py-2 bg-gradient-to-r from-blue-600/50 to-purple-600/50 border border-white/20 rounded-xl text-white text-sm font-medium backdrop-blur-sm hover:from-blue-600/70 hover:to-purple-600/70 transition-all duration-200 flex items-center gap-2"
                    onClick={() => {
                      try { editorRef.current?.undo?.(); } catch { }
                    }}
                  >
                    <Undo2 className="h-4 w-4" />
                    Undo
                  </button>

                  <button
                    className="px-4 py-2 bg-gradient-to-r from-blue-600/50 to-purple-600/50 border border-white/20 rounded-xl text-white text-sm font-medium backdrop-blur-sm hover:from-blue-600/70 hover:to-purple-600/70 transition-all duration-200 flex items-center gap-2"
                    onClick={() => {
                      try { editorRef.current?.redo?.(); } catch { }
                    }}
                  >
                    <Redo2 className="h-4 w-4" />
                    Redo
                  </button>

                  <button
                    className="px-4 py-2 bg-gradient-to-r from-green-600/50 to-emerald-600/50 border border-white/20 rounded-xl text-white text-sm font-medium backdrop-blur-sm hover:from-green-600/70 hover:to-emerald-600/70 transition-all duration-200 flex items-center gap-2"
                    onClick={() => {
                      const templates = (problem as any)?.codeTemplates ?? {};
                      if (problem && templates[language as keyof any]) {
                        setCode(templates[language as keyof any]);
                      }
                    }}
                  >
                    <Eye className="h-4 w-4" />
                    Reset
                  </button>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 border border-blue-500/30 rounded-xl text-white text-sm font-semibold backdrop-blur-sm hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl"
                    onClick={runCode}
                    disabled={isRunning}
                  >
                    <Play className="h-4 w-4" />
                    <span>{isRunning ? 'Running...' : 'Run Code'}</span>
                  </button>

                  <button
                    className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 border border-green-500/30 rounded-xl text-white text-sm font-semibold backdrop-blur-sm hover:from-green-700 hover:to-emerald-700 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={markProblemDone}
                    disabled={isSubmitting || contestCompleted}
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>
                      {contestCompleted ? 'Contest Completed!' :
                        isSubmitting ? 'Saving...' : 'Submit Solution'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="editor-content flex flex-col h-3/4 w-full bg-gradient-to-br from-slate-900/90 to-purple-900/50">
                <ResizablePanelGroup direction="vertical" className=" w-full">
                  {/* Editor Panel */}
                  <div className="h-full flex flex-col">
                      {/* Code Editor */}
                      <div className="ace-editor-container flex-1 bg-slate-900/80 border border-white/10 rounded-t-2xl m-4 mb-0 overflow-y-auto overflow-x-scroll">
                        <AceCodeEditor
                          value={code}
                          onChange={setCode}
                          language={language as 'javascript' | 'python'}
                          theme={theme as any}
                          className="ace-editor h-auto w-full"
                          onFocus={() => setShowConsole(false)}
                          onEditorLoad={(ed: any) => {
                            editorRef.current = ed;
                            try {
                              // Neutralize Ace clipboard shortcuts
                              ed.commands.bindKey({ win: 'Ctrl-C', mac: 'Command-C' }, 'null');
                              ed.commands.bindKey({ win: 'Ctrl-V', mac: 'Command-V' }, 'null');
                              ed.commands.bindKey({ win: 'Ctrl-X', mac: 'Command-X' }, 'null');
                              ed.commands.bindKey({ win: 'Shift-Insert', mac: 'Shift-Insert' }, 'null');
                              ed.commands.bindKey({ win: 'Ctrl-Insert', mac: 'Ctrl-Insert' }, 'null');
                            } catch {}
                            try {
                              // Best-effort: block Ace's internal clipboard events
                              ed.container.addEventListener('copy', (e: Event) => { e.preventDefault(); e.stopPropagation(); }, true);
                              ed.container.addEventListener('cut', (e: Event) => { e.preventDefault(); e.stopPropagation(); }, true);
                              ed.container.addEventListener('paste', (e: Event) => { e.preventDefault(); e.stopPropagation(); }, true);
                              ed.container.addEventListener('contextmenu', (e: Event) => { e.preventDefault(); e.stopPropagation(); }, true);
                              ed.container.addEventListener('dragstart', (e: Event) => { e.preventDefault(); e.stopPropagation(); }, true);
                              ed.container.addEventListener('drop', (e: Event) => { e.preventDefault(); e.stopPropagation(); }, true);
                            } catch {}
                          }}
                        />
                      </div>

                      {/* Harness Preview Toggle */}
                      <div className="editor-header border-t border-white/10 bg-gradient-to-r from-slate-800/50 to-purple-800/30 backdrop-blur-sm px-6 py-3 flex items-center justify-between mx-4 mb-4 rounded-b-2xl">
                        <span className="text-sm text-purple-200 font-medium">Execution harness (read-only)</span>
                        <button
                          className="px-4 py-2 bg-gradient-to-r from-purple-600/50 to-blue-600/50 border border-white/20 rounded-xl text-white text-sm font-medium backdrop-blur-sm hover:from-purple-600/70 hover:to-blue-600/70 transition-all duration-200"
                          onClick={() => setShowHarness((v) => !v)}
                        >
                          {showHarness ? "Hide" : "Show"}
                        </button>
                      </div>
                      {showHarness && (
                        <div className="editor-header px-6 py-4 bg-slate-800/40 backdrop-blur-sm border-t border-white/10 mx-4 mb-4 rounded-2xl">
                          <pre className="text-sm font-mono whitespace-pre-wrap overflow-x-auto max-h-40 text-gray-200">{buildHarnessSnippet(language)}</pre>
                        </div>
                      )}
                    </div>
                  
                  {/* Output Console Panel */}
                  {showConsole && (
                    <>
                      <ResizableHandle withHandle />
                      <ResizablePanel defaultSize={30} minSize={20} className="resizable-panel h-full w-full bg-gradient-to-br from-slate-900/90 to-purple-900/50">
                        <div className="h-full w-full border-t border-white/10 bg-slate-800/40 backdrop-blur-sm flex flex-col m-4 mt-0 rounded-2xl">
                          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-slate-700/50 to-purple-700/30">
                            <span className="font-semibold text-white text-lg">Output Console</span>
                            <div className="flex items-center space-x-3">
                              <Clock className="h-4 w-4 text-purple-300" />
                              <span className="text-sm text-purple-200 font-medium">
                                {isRunning ? "Running..." : "Ready"}
                              </span>
                            </div>
                          </div>
                          <div className="console-output flex-1 p-6 font-mono text-sm whitespace-pre-wrap overflow-y-auto overflow-x-auto text-gray-200 bg-slate-900/50 scrollbar-thin scrollbar-thumb-purple-500 scrollbar-track-slate-800 hover:scrollbar-thumb-purple-400">
                            {output || "Click 'Run Code' to test your solution or 'Submit Solution' when ready..."}
                          </div>
                        </div>
                      </ResizablePanel>
                    </>
                  )}
                </ResizablePanelGroup>
              </div>
            </FadeInUp>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Final Submission Modal */}
      {showFinalSubmission && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-slate-800 to-purple-900 rounded-3xl p-8 max-w-lg w-full mx-4 border border-white/20 shadow-2xl">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 mb-6 shadow-2xl">
                <CheckCircle className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">
                Contest Completed! 🎉
              </h3>
              <p className="text-purple-200 mb-6 text-lg leading-relaxed">
                All 3 problems have been completed! Internet connection is required to submit your final results. No penalty will be applied during submission.
              </p>

              {/* Final Score Display */}
              <div className="bg-gradient-to-r from-slate-700/50 to-purple-700/30 rounded-2xl p-6 mb-6 border border-white/10 backdrop-blur-sm">
                <h4 className="font-bold text-white mb-4 text-lg">Final Results:</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Total Score:</span>
                    <span className="font-bold text-white text-lg">{problemResults.reduce((sum, result) => sum + (Number(result.score) || 0), 0)}/{totalPossibleScore || 100 * Math.max(1, problems.length)}</span>
                  </div>
                  <div className="flex justify-between items-center text-red-400">
                    <span className="text-gray-300">Penalty Points:</span>
                    <span className="font-bold text-lg">-{penaltyPoints}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-white/20 pt-3">
                    <span className="font-bold text-white text-lg">Final Score:</span>
                    <span className={`font-bold text-2xl ${(problemResults.reduce((sum, result) => sum + (Number(result.score) || 0), 0) - penaltyPoints) < 0
                        ? 'text-red-400'
                        : 'text-green-400'
                      }`}>
                      {problemResults.reduce((sum, result) => sum + (Number(result.score) || 0), 0) - penaltyPoints}/{totalPossibleScore || 100 * Math.max(1, problems.length)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => submitFinalResults(0)}
                  disabled={!internetStatus.isOnline}
                  className={`flex-1 px-6 py-4 rounded-xl text-lg font-semibold transition-all duration-200 ${internetStatus.isOnline
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl'
                      : 'bg-slate-600 text-gray-400 cursor-not-allowed'
                    }`}
                >
                  {internetStatus.isOnline ? 'Submit Results' : 'Turn On Internet First'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedProblemSolver;
