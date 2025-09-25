import React from 'react';
import { useParams } from 'react-router-dom';

const Leaderboard: React.FC = () => {
  const { id } = useParams();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Leaderboard</h1>
        <p className="text-gray-600">Contest ID: {id}</p>
        <p className="text-sm text-gray-500 mt-2">This page will show the contest leaderboard</p>
      </div>
    </div>
  );
};

export default Leaderboard;
