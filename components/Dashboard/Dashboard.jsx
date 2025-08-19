import React from 'react';

const Dashboard = ({ onNavigateToMemories }) => {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Emma Memory Companion</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Memories</h2>
          <p className="text-gray-600 mb-4">Create and manage your precious memories</p>
          <button 
            onClick={() => onNavigateToMemories(false)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            View Memories
          </button>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">People</h2>
          <p className="text-gray-600 mb-4">Manage the people in your memories</p>
          <button className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded">
            View People
          </button>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Quick Add</h2>
          <p className="text-gray-600 mb-4">Quickly add a new memory</p>
          <button 
            onClick={() => onNavigateToMemories(true)}
            className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded"
          >
            Add Memory
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
