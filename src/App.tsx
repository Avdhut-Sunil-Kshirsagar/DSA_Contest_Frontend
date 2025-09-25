import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { Toaster } from 'react-hot-toast';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Contest from './pages/Contest';
import ContestPage from './pages/ContestPage';
import EnhancedProblemSolver from './pages/EnhancedProblemSolver';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';

// Components
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
              <Routes>
                {/* Public routes */}
                <Route path="/" element={
                  <div>
                    <Navbar />
                    <main>
                      <Home />
                    </main>
                  </div>
                } />
                <Route path="/login" element={
                  <div>
                    <Navbar />
                    <main>
                      <Login />
                    </main>
                  </div>
                } />
                <Route path="/register" element={
                  <div>
                    <Navbar />
                    <main>
                      <Register />
                    </main>
                  </div>
                } />
                <Route path="/contests" element={
                  <div>
                    <Navbar />
                    <main>
                      <Contest />
                    </main>
                  </div>
                } />
                <Route path="/contests/:id" element={
                  <div>
                    <Navbar />
                    <main>
                      <ContestPage />
                    </main>
                  </div>
                } />
                <Route path="/leaderboard/:id" element={
                  <div>
                    <Navbar />
                    <main>
                      <Leaderboard />
                    </main>
                  </div>
                } />
                
                {/* Protected routes */}
                <Route path="/contest/:id/play" element={
                  <ProtectedRoute>
                    <EnhancedProblemSolver />
                  </ProtectedRoute>
                } />
                <Route path="/profile" element={
                  <ProtectedRoute>
                    <div>
                      <Navbar />
                      <main>
                        <Profile />
                      </main>
                    </div>
                  </ProtectedRoute>
                } />
                
                {/* 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: '#4ade80',
                    secondary: '#fff',
                  },
                },
                error: {
                  duration: 5000,
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
          </div>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;