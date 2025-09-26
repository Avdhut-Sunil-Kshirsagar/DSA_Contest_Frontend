import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { contestPreparation } from '../utils/contestPreparation';
import type { PreparationProgress } from '../utils/contestPreparation';
import { internetMonitor } from '../utils/internetMonitor';
import toast from 'react-hot-toast';
import { 
  Play, 
  Download, 
  CheckCircle, 
  Clock, 
  Wifi, 
  WifiOff, 
  AlertTriangle,
  Trophy,
  Users,
  Calendar
} from 'lucide-react';

const ContestPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [contest, setContest] = useState<any>(null);
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();
  const [preparationProgress, setPreparationProgress] = useState<PreparationProgress>({
    stage: 'idle',
    progress: 0,
    message: 'Ready to prepare contest',
    details: ''
  });
  const [isPreparing, setIsPreparing] = useState(false);
  const [isContestReady, setIsContestReady] = useState(false);
  const [internetStatus, setInternetStatus] = useState(internetMonitor.getCurrentStatus());

  useEffect(() => {
    // Load contest details from backend
    const load = async () => {
      if (!id) return;
      try {
        const res = await api.get(`/contests/${id}`);
        const data = res.data?.data;
        setContest(data);
        // Cache full contest payload for offline play page
        try {
          localStorage.setItem(`contest_cache_${id}`, JSON.stringify(data));
          // Additionally cache problems and a per-contest problem map for the play page
          const rawProblems: any[] = Array.isArray(data?.problems) ? data.problems : [];
          const sorted = rawProblems.sort((a: any, b: any) => (a?.order || 0) - (b?.order || 0));
          const problemMap: Record<string, any> = {};
          const fullProblems: any[] = sorted.map((entry: any) => {
            const obj = (entry && entry.problemId && typeof entry.problemId === 'object') ? entry.problemId : entry;
            if (obj && obj._id) {
              problemMap[obj._id] = obj;
            }
            return obj;
          });
          // Store as-is without filtering so that offline hydration can use the map even if some fields are missing
          localStorage.setItem(`contest_problems_${id}`, JSON.stringify(fullProblems));
          localStorage.setItem(`contest_problem_map_${id}`, JSON.stringify(problemMap));
          console.log('[ContestPage] Cached contest and problems', {
            contestId: id,
            problems: fullProblems.length,
            mapKeys: Object.keys(problemMap).length
          });
        } catch {}
      } catch (e) {
        console.error('Failed to fetch contest', e);
        // Attempt to display cached contest if available
        try {
          const cached = localStorage.getItem(`contest_cache_${id}`);
          if (cached) {
            setContest(JSON.parse(cached));
          }
        } catch {}
      }
    };
    load();

    // Redirect to login if not authenticated
    if (!loading && !isAuthenticated) {
      navigate('/login', { state: { from: `/contests/${id}` } });
      return;
    }

    // Check if contest is already prepared
    const isPrepared = contestPreparation.isContestPrepared(id);
    if (isPrepared) {
      setIsContestReady(true);
      setPreparationProgress({
        stage: 'ready',
        progress: 100,
        message: 'Contest is ready!',
        details: 'All systems prepared. You can start the contest.'
      });
    }

    // Subscribe to preparation progress
    const unsubscribe = contestPreparation.subscribe((progress) => {
      setPreparationProgress(progress);
      if (progress.stage === 'ready') {
        setIsContestReady(true);
        setIsPreparing(false);
      } else if (progress.stage === 'error') {
        setIsPreparing(false);
      }
    });

    // Subscribe to internet status
    const unsubscribeInternet = internetMonitor.subscribe((status) => {
      setInternetStatus(status);
    });

    return () => {
      unsubscribe();
      unsubscribeInternet();
    };
  }, [isAuthenticated, loading, navigate, id]);

  const handlePrepareContest = async () => {
    if (isPreparing) return;

    setIsPreparing(true);
    const success = await contestPreparation.prepareContest(id);
    
    if (success) {
      toast.success('Contest preparation completed!');
    } else {
      toast.error('Contest preparation failed. Please try again.');
    }
  };

  const handleStartContest = () => {
    if (!isContestReady) {
      toast.error('Contest is not ready yet. Please complete preparation first.');
      return;
    }

    if (internetStatus.isOnline) {
      toast.error('Please turn off your internet connection before starting the contest.');
      return;
    }

    // Start the contest
    navigate(`/contest/${id}/play`);
  };

  const handleResetPreparation = () => {
    contestPreparation.resetPreparation(id);
    setIsContestReady(false);
    setPreparationProgress({
      stage: 'idle',
      progress: 0,
      message: 'Ready to prepare contest',
      details: ''
    });
    toast.success('Contest preparation reset. You can prepare again.');
  };

  const getProgressColor = () => {
    switch (preparationProgress.stage) {
      case 'ready': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      case 'downloading':
      case 'preparing': return 'bg-blue-500';
      default: return 'bg-gray-300';
    }
  };

  const getStageIcon = () => {
    switch (preparationProgress.stage) {
      case 'ready': return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'error': return <AlertTriangle className="h-6 w-6 text-red-500" />;
      case 'downloading':
      case 'preparing': return <Download className="h-6 w-6 text-blue-500 animate-spin" />;
      default: return <Clock className="h-6 w-6 text-gray-500" />;
    }
  };

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h1>
          <p className="text-gray-600 mb-6">Please log in to access contest preparation.</p>
          <button
            onClick={() => navigate('/login', { state: { from: `/contests/${id}` } })}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg shadow hover:from-blue-700 hover:to-purple-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">DSA Contest</h1>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                {contest?.title ? contest.title : `Contest #${id}`}
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Internet Status */}
              <div className="flex items-center space-x-2">
                {internetStatus.isOnline ? (
                  <Wifi className="h-5 w-5 text-green-500" />
                ) : (
                  <WifiOff className="h-5 w-5 text-red-500" />
                )}
                <span className="text-sm text-gray-600">
                  {internetStatus.isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Contest Information */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Contest Information</h2>
            <div className="flex items-center space-x-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <span className="text-sm text-gray-600">DSA Competition</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="flex items-center space-x-3">
              <Clock className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Duration</p>
                <p className="font-medium">{Math.round(((typeof contest?.duration !== 'number' ? contest?.duration : 7200000)/3600000))} Hours</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Users className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">Problems</p>
                <p className="font-medium">{contest?.problems?.length || 0} DSA Problems</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Calendar className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600">Test Cases</p>
                <p className="font-medium">Test cases vary per problem</p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">Contest Rules</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Internet must be turned off during the contest</li>
              <li>• Duration depends on the contest data</li>
              <li>• Each problem has multiple test cases</li>
              <li>• Code execution is completely offline</li>
              <li>• Submit only when all test cases pass</li>
            </ul>
          </div>
        </div>

        {/* Preparation Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Contest Preparation</h2>
            {getStageIcon()}
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>{preparationProgress.message}</span>
              <span>{preparationProgress.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all duration-300 ${getProgressColor()}`}
                style={{ width: `${preparationProgress.progress}%` }}
              />
            </div>
            {preparationProgress.details && (
              <p className="text-sm text-gray-500 mt-2">{preparationProgress.details}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4">
            {!isContestReady && !isPreparing && (
              <button
                onClick={handlePrepareContest}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg shadow hover:from-blue-700 hover:to-blue-800 flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>Prepare Contest</span>
              </button>
            )}

            {isContestReady && (
              <button
                onClick={handleStartContest}
                disabled={internetStatus.isOnline}
                className={`px-6 py-3 font-semibold rounded-lg shadow flex items-center space-x-2 ${
                  internetStatus.isOnline 
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700'
                }`}
              >
                <Play className="h-4 w-4" />
                <span>Start Contest</span>
              </button>
            )}

            {isContestReady && (
              <button
                onClick={handleResetPreparation}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Reset Preparation
              </button>
            )}
          </div>

          {internetStatus.isOnline && isContestReady && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <p className="text-sm text-red-700">
                  Please turn off your internet connection before starting the contest.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Preparation Tips instead of Problems Preview */}
        {isContestReady && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Preparation Tips</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 text-sm">
              <li>Test your code locally with sample test cases before starting.</li>
              <li>Keep internet turned off during the contest to avoid penalties.</li>
              <li>Read constraints carefully; optimize for time and memory limits.</li>
              <li>Submit only when all visible tests pass in the offline runner.</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContestPage;
