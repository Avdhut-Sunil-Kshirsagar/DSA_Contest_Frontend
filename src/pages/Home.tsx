import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  Trophy, 
  Code, 
  Users, 
  Clock, 
  Target,
  Zap,
  Brain,
  Star,
  Award
} from 'lucide-react';

const Home: React.FC = () => {
  const features = [
    {
      title: "Real-time Competition",
      description: "Compete with other programmers in real-time DSA contests",
      icon: Trophy,
      gradient: "from-amber-500 to-orange-500",
    },
    {
      title: "Multiple Languages",
      description: "Support for Python, JavaScript, C++, and Java",
      icon: Code,
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      title: "Live Leaderboard",
      description: "See your ranking in real-time during contests",
      icon: Users,
      gradient: "from-purple-500 to-pink-500",
    },
  ];

  const stats = [
    { label: "Active Contests", value: "5+", icon: Trophy },
    { label: "Problems Solved", value: "10K+", icon: Code },
    { label: "Active Users", value: "500+", icon: Users },
    { label: "Success Rate", value: "95%", icon: Target },
  ];

  // Add local UI state for a Rules modal
  const [showRules, setShowRules] = React.useState(false);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-screen overflow-hidden bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/60 via-purple-900/50 to-indigo-900/60" />
        
        {/* Hero Content */}
        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="flex flex-col items-center text-center space-y-6 sm:space-y-8">
            {/* Main Hero Content */}
            <motion.div
              initial={{ opacity: 0, y: 24, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-6 sm:space-y-8"
            >
              <div className="px-4 sm:px-6 py-2 sm:py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white font-medium text-sm sm:text-lg shadow-lg">
                <Star className="w-4 h-4 sm:w-5 sm:h-5 mr-2 inline" />
                Level Up Your Coding Skills
              </div>
              
              <h1 className="font-heading font-bold text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl text-white leading-tight drop-shadow-2xl px-4">
                Master DSA,
                <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-blue-400 to-purple-500 drop-shadow-sm">
                  Dominate Coding
                </span>
              </h1>
              
              <p className="text-lg sm:text-xl lg:text-2xl text-white/90 max-w-3xl leading-relaxed font-medium p-4 sm:p-6 rounded-lg backdrop-blur-sm bg-white/10 border border-white/20 shadow-xl mx-4">
                Solve problems, compete in real-time, and climb leaderboards in the most 
                advanced DSA competition platform designed for competitive programmers.
              </p>
              
              {/* Feature Pills */}
              <div className="flex flex-wrap gap-2 sm:gap-4 justify-center px-4">
                <div className="px-3 sm:px-4 py-2 bg-cyan-500/20 rounded-full border border-cyan-400/30 text-cyan-200 text-xs sm:text-sm font-medium shadow-lg backdrop-blur-md flex items-center hover:bg-cyan-500/30 transition-all duration-300">
                  <Zap className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /> Real-time Competition
                </div>
                <div className="px-3 sm:px-4 py-2 bg-blue-500/20 rounded-full border border-blue-400/30 text-blue-200 text-xs sm:text-sm font-medium shadow-lg backdrop-blur-md flex items-center hover:bg-blue-500/30 transition-all duration-300">
                  <Trophy className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /> Live Leaderboard
                </div>
                <div className="px-3 sm:px-4 py-2 bg-purple-500/20 rounded-full border border-purple-400/30 text-purple-200 text-xs sm:text-sm font-medium shadow-lg backdrop-blur-md flex items-center hover:bg-purple-500/30 transition-all duration-300">
                  <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /> Community
                </div>
                <div className="px-3 sm:px-4 py-2 bg-pink-500/20 rounded-full border border-pink-400/30 text-pink-200 text-xs sm:text-sm font-medium shadow-lg backdrop-blur-md flex items-center hover:bg-pink-500/30 transition-all duration-300">
                  <Brain className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /> AI-Powered Learning
                </div>
              </div>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 sm:gap-6 px-4"
            >
              <Link
                to="/contests"
                className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-bold shadow-2xl group bg-gradient-to-r from-cyan-400 to-blue-500 text-white hover:from-cyan-500 hover:to-blue-600 transition-all duration-300 scale-100 hover:scale-105 border border-cyan-300/50 backdrop-blur-sm w-full sm:w-auto rounded-lg"
              >
                Go to Contest
                <ArrowRight className="ml-2 sm:ml-3 h-5 w-5 sm:h-6 sm:w-6 group-hover:translate-x-1 transition-transform" />
              </Link>

              {/* One-click rules button opens modal */}
              <button
                onClick={() => setShowRules(true)}
                className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-bold border-2 border-white/50 text-white bg-white/10 backdrop-blur-md hover:bg-white/20 shadow-2xl transition-all duration-300 scale-100 hover:scale-105 w-full sm:w-auto rounded-lg"
              >
                View Rules
                <Award className="ml-2 sm:ml-3 h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </motion.div>
          </div>
        </div>

        {/* Live Metrics */}
        <div className="relative z-20 backdrop-blur-md border-t border-white/20 bg-black/60">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="text-center border border-white/20 bg-white/10 backdrop-blur-md text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 group rounded-lg p-4 sm:p-6"
                >
                  <div className="flex justify-center mb-3 sm:mb-4">
                    <div className="p-3 sm:p-4 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl shadow-md group-hover:shadow-cyan-400/20 group-hover:animate-pulse">
                      <stat.icon className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                    </div>
                  </div>
                  <div className="font-heading font-bold text-2xl sm:text-3xl lg:text-4xl text-cyan-200 mb-1 sm:mb-2 drop-shadow-sm">
                    {stat.value}
                  </div>
                  <div className="text-xs sm:text-sm text-white/70 font-semibold uppercase tracking-wider">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="font-heading font-bold text-4xl lg:text-6xl mb-6 text-gray-900">
              <span className="text-gradient-premium">Why Choose</span> Our Platform?
            </h2>
            <p className="text-xl lg:text-2xl text-gray-600 max-w-3xl mx-auto font-medium leading-relaxed">
              Experience the most comprehensive DSA learning platform with competitive features
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.2, duration: 0.6 }}
                className="group hover:shadow-2xl hover-lift transition-all duration-500 border-2 border-gray-200 bg-white text-gray-900 relative overflow-hidden rounded-lg"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-all duration-500`} />
                
                <div className="p-10 text-center relative z-10">
                  <div className="flex justify-center mb-8">
                    <div className={`p-6 bg-gradient-to-br ${feature.gradient} rounded-3xl group-hover:shadow-xl group-hover:scale-110 transition-all duration-500 shadow-lg`}>
                      <feature.icon className="h-12 w-12 text-white" />
                    </div>
                  </div>
                  <h3 className="font-heading font-bold text-2xl mb-4 text-gray-900 group-hover:text-gradient-premium transition-all duration-500">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed text-lg font-medium">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Rules Modal */}
      {showRules && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4">
            <div className="px-6 py-4 border-b">
              <h3 className="text-xl font-bold text-gray-900">Contest Rules</h3>
            </div>
            <div className="px-6 py-5 space-y-3 text-gray-700">
              <p>• Internet must be turned off during the contest</p>
              <p>• Duration depends on the contest (e.g., 2–4 hours)</p>
              <p>• Each problem has multiple test cases</p>
              <p>• Code executes offline; submit only after all tests pass</p>
              <p>• Violations may reduce your final score</p>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowRules(false)}
                className="px-5 py-2 rounded-lg border text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              <Link
                to="/contests"
                className="px-5 py-2 rounded-lg text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
                onClick={() => setShowRules(false)}
              >
                Browse Contests
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
