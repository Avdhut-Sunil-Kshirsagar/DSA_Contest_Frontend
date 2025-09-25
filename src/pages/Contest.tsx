import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Trophy, 
  Clock, 
  Users, 
  Calendar,
  Play,
  Eye,
  Award
} from 'lucide-react';
import { api } from '../utils/api';

interface Contest {
  _id: string;
  title: string;
  description: string;
  startTime: string;
  duration: number;
  endTime: string;
  currentParticipants: number;
  maxParticipants: number;
  isLive: boolean;
  problems: Array<{
    problemId: {
      _id: string;
      title: string;
      difficulty: string;
      tags: string[];
    };
    points: number;
  }>;
}

const Contest: React.FC = () => {
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContests();
  }, []);

  const fetchContests = async () => {
    try {
      const response = await api.get('/contests');
      setContests(response.data.data);
    } catch (error) {
      console.error('Failed to fetch contests:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (duration: number) => {
    const hours = Math.floor(duration / 3600000);
    const minutes = Math.floor((duration % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return 'text-green-600 bg-green-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'hard':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-heading font-bold text-gray-900 mb-4">
            <span className="text-gradient-premium">DSA</span> Competitions
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Join our competitive programming contests and test your skills against other developers
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {contests.map((contest, index) => (
            <motion.div
              key={contest._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.6 }}
              className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow duration-300"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-heading font-bold text-gray-900">
                    {contest.title}
                  </h3>
                  {contest.isLive && (
                    <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                      LIVE
                    </span>
                  )}
                </div>

                <p className="text-gray-600 mb-4 line-clamp-2">
                  {contest.description}
                </p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>Starts: {formatDate(contest.startTime)}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="h-4 w-4 mr-2" />
                    <span>Duration: {formatDuration(contest.duration)}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="h-4 w-4 mr-2" />
                    <span>
                      {contest.currentParticipants}/{contest.maxParticipants} participants
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Trophy className="h-4 w-4 mr-2" />
                    <span>{contest.problems.length} problems</span>
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Problems:</h4>
                  <div className="flex flex-wrap gap-1">
                    {contest.problems.map((problem, idx) => (
                      <span
                        key={idx}
                        className={`px-2 py-1 text-xs font-medium rounded ${getDifficultyColor(problem.problemId.difficulty)}`}
                      >
                        {problem.problemId.difficulty}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Link
                    to={`/contests/${contest._id}`}
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors duration-200"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Link>
                  {contest.isLive && (
                    <Link
                      to={`/contest/${contest._id}/play`}
                      className="flex-1 flex items-center justify-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors duration-200"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Join Now
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {contests.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Award className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No contests available</h3>
            <p className="text-gray-600">Check back later for new competitions!</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Contest;
