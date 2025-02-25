// src/pages/Dashboard.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api';
import { Repository } from '../types';
import { Button } from '../components/Button';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRepositories = async () => {
      
      try {
        
        // Check if the access token is present in the URL query params.
        const urlParams = new URLSearchParams(window.location.search);
        let accessToken = urlParams.get("access_token");
        let username = urlParams.get("username");

        // If the token is present in the URL, store it in localStorage.
        if (accessToken) {
          const user = { access_token: accessToken, username };
          localStorage.setItem('user', JSON.stringify(user));
        } else {
          // Otherwise, try to get it from localStorage.
          const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
          accessToken = storedUser.access_token;
        }
        
        if (!accessToken) {
          navigate('/login');
          return;
        }

        const repos = await api.getGitHubRepos(accessToken);
        setRepositories(repos);
        // In src/pages/Dashboard.tsx inside your fetchRepositories function
        const sanitizedRepos = repos.map((repo: Repository) => ({
            ...repo,
            description: repo.description ?? '', // Replace null with an empty string
          }));

        setRepositories(sanitizedRepos);

      } catch (error) {
        toast.error('Failed to fetch repositories');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRepositories();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Repository Analysis</h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 bg-white hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <LogOut className="h-5 w-5 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="space-y-6">
              <div>
                <label htmlFor="repository" className="block text-sm font-medium text-gray-700">
                  Select Repository
                </label>
                <select
                  id="repository"
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  value={selectedRepo}
                  onChange={(e) => setSelectedRepo(e.target.value)}
                >
                  <option value="">Select a repository</option>
                  {repositories.map((repo) => (
                    <option key={repo.full_name} value={repo.full_name}>
                      {repo.full_name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedRepo && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="query" className="block text-sm font-medium text-gray-700">
                      Analysis Query
                    </label>
                    <textarea
                      id="query"
                      rows={4}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="Enter your analysis query..."
                    />
                  </div>

                  <Button type="button">
                    Analyze Repository
                  </Button>
                </div>
              )}

              {isLoading && (
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
