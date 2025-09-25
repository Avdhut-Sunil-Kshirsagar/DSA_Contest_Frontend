import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const Profile: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Profile</h1>
        <p className="text-gray-600">Welcome, {user?.name}!</p>
        <p className="text-sm text-gray-500 mt-2">This page will show user profile information</p>
      </div>
    </div>
  );
};

export default Profile;
