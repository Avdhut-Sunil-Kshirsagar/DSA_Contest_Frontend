// API Configuration and utilities
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  SOCKET_URL: SOCKET_URL,
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/api/auth/login',
      REGISTER: '/api/auth/register',
      ME: '/api/auth/me',
      LOGOUT: '/api/auth/logout'
    },
    CONTESTS: {
      LIST: '/api/contests',
      DETAIL: '/api/contests',
      JOIN: '/api/contests',
      LEADERBOARD: '/api/contests'
    },
    SUBMISSIONS: {
      CREATE: '/api/submissions',
      LIST: '/api/submissions',
      FINAL: '/api/submissions/final'
    },
    HEALTH: '/api/health'
  }
};

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  lastLogin?: string;
  createdAt: string;
}

export interface Contest {
  _id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  duration: number;
  isActive: boolean;
  isLive: boolean;
  maxParticipants: number;
  currentParticipants: number;
  problems: ContestProblem[];
  rules: string;
  createdBy: string;
  createdAt: string;
}

export interface ContestProblem {
  problemId: {
    _id: string;
    title: string;
    difficulty: string;
    tags: string[];
  };
  order: number;
  points: number;
}

export interface Problem {
  _id: string;
  title: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tags: string[];
  timeLimit: number;
  memoryLimit: number;
  testCases: TestCase[];
  sampleInput: string;
  sampleOutput: string;
  createdAt: string;
  codeTemplates?: Record<string, string>;
  harnessCode?: string;
  harshnessCode?: string;
  constraints?: string[];
  examples?: Array<{ input: string; output: string; explanation?: string }>;
  hints?: string[];
}

export interface TestCase {
  input: string;
  expectedOutput: string;
  description: string;
}

export interface Submission {
  _id: string;
  userId: string;
  contestId: string;
  problemId: string;
  code: string;
  language: string;
  status: 'pending' | 'accepted' | 'wrong_answer' | 'time_limit_exceeded' | 'runtime_error' | 'compilation_error';
  score: number;
  executionTime: number;
  memoryUsed: number;
  createdAt: string;
}

export interface ContestResult {
  _id: string;
  userId: string;
  contestId: string;
  totalScore: number;
  penaltyPoints: number;
  totalTime: string;
  problemResults: ProblemResult[];
  rank: number;
  completedAt: string;
}

export interface ProblemResult {
  problemId: string;
  score: number;
  attempts: number;
  solvedAt?: string;
  timeToSolve: number;
}

// Environment configuration
export const ENV_CONFIG = {
  APP_NAME: import.meta.env.VITE_APP_NAME || 'DSA Competition Platform',
  APP_VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
  APP_DESCRIPTION: import.meta.env.VITE_APP_DESCRIPTION || 'A production-ready web application for DSA coding competitions',
  ENABLE_ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  ENABLE_DEBUG_MODE: import.meta.env.VITE_ENABLE_DEBUG_MODE === 'true',
  DEFAULT_THEME: import.meta.env.VITE_DEFAULT_THEME || 'light',
  ENABLE_DARK_MODE: import.meta.env.VITE_ENABLE_DARK_MODE === 'true',
  DEFAULT_CONTEST_DURATION: parseInt(import.meta.env.VITE_DEFAULT_CONTEST_DURATION || '7200000'),
  MAX_FILE_SIZE: parseInt(import.meta.env.VITE_MAX_FILE_SIZE || '10485760')
};

// Log environment configuration in development
if (import.meta.env.DEV) {
  console.log('API Configuration:', API_CONFIG);
  console.log('Environment Configuration:', ENV_CONFIG);
}

