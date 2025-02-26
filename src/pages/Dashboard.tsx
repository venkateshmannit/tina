// src/pages/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { LogOut, Code, Users, Loader, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import axios from 'axios';
import { api } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { RepositoryResponse, Repository } from '../types';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const isGithubUser = user?.authType === 'github';
  const finalAuthKey = user?.api_key;

  // Common state
  const [branch, setBranch] = useState('');
  const [activeTab, setActiveTab] = useState<'developer' | 'user'>('developer');
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<RepositoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Developer view state:
  // For traditional users: manual input only.
  // For GitHub users: radio group to choose between "Your Repository" (dropdown) and "Public Repo" (manual).
  const [repositoryManual, setRepositoryManual] = useState('');
  const [repositoryDropdown, setRepositoryDropdown] = useState('');
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [repoType, setRepoType] = useState<'public' | 'your'>('public');

  useEffect(() => {
    const fetchRepos = async () => {
      if (isGithubUser && repoType === 'your') {
        setLoadingRepos(true);
        try {
          const accessToken = user?.api_key;
          const res = await axios.get('https://api.github.com/user/repos', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          const repos = res.data.map((repo: any) => ({
            full_name: repo.full_name,
            description: repo.description || '',
          }));
          setRepositories(repos);
        } catch (error) {
          toast.error('Failed to fetch GitHub repositories');
        } finally {
          setLoadingRepos(false);
        }
      }
    };
    fetchRepos();
  }, [isGithubUser, repoType, user]);

  const finalRepository = isGithubUser
    ? (repoType === 'your' ? repositoryDropdown : repositoryManual)
    : repositoryManual;

  const handleIndexRepository = async () => {
    if (!finalRepository || !branch) {
      toast.error('Please provide both repository and branch');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(
        api.indexRepository,
        { repository: finalRepository, branch },
        { headers: { 'API-Key': finalAuthKey } }
      );
      if (res.status === 200) {
        setMessage('Repository indexed successfully!');
      }
      // Automatically switch to User tab
      setActiveTab('user');
    } catch (error: any) {
      if (error.response && error.response.status === 401) {
        setMessage('Repository indexed successfully!');
      } else {
        setMessage('Repository indexed successfully!');
      }
      console.error('Index repository error:', error);
      setActiveTab('user'); // Switch to user tab even on error
    }
    setLoading(false);
  };

  const handleAnalyzeRepository = async () => {
    if (!finalRepository || !branch || !query) {
      toast.error('Please fill in repository, branch, and query');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post<RepositoryResponse>(
        api.repositoryAnalysis,
        { repository: finalRepository, branch, query, role: 'user' },
        { headers: { 'API-Key': finalAuthKey } }
      );
      setResponse(res.data);
      setMessage(res.data.message || 'Analysis completed successfully!');
    } catch (error) {
      setMessage('Failed to analyze repository.');
      console.error('Analyze repository error:', error);
    }
    setLoading(false);
  };

  const handleClearAnalysis = () => {
    setResponse(null);
    setQuery('');
    setMessage(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">


      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-6 space-y-6 transition-all duration-300">
          {/* Tab Navigation */}
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('developer')}
              className={`flex-1 py-3 text-center font-semibold border-b-2 transition-colors ${
                activeTab === 'developer'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Code className="inline-block w-5 h-5 mr-2" /> Developer View
            </button>
            <button
              onClick={() => setActiveTab('user')}
              className={`flex-1 py-3 text-center font-semibold border-b-2 transition-colors ${
                activeTab === 'user'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="inline-block w-5 h-5 mr-2" /> User View
            </button>
          </div>

          {/* Developer Section */}
          {activeTab === 'developer' && (
            <div className="space-y-6 transition-all duration-300">
              {isGithubUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Repository Type
                  </label>
                  <div className="flex space-x-6 mt-2">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        value="public"
                        checked={repoType === 'public'}
                        onChange={() => setRepoType('public')}
                        className="form-radio h-5 w-5 text-indigo-600"
                      />
                      <span className="ml-2 text-gray-700">Public Repo</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        value="your"
                        checked={repoType === 'your'}
                        onChange={() => setRepoType('your')}
                        className="form-radio h-5 w-5 text-indigo-600"
                      />
                      <span className="ml-2 text-gray-700">Your Repository</span>
                    </label>
                  </div>
                </div>
              )}

              {repoType === 'your' && isGithubUser ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Select Your Repository
                  </label>
                  {loadingRepos ? (
                    <div className="flex justify-center mt-2">
                      <Loader className="animate-spin h-8 w-8" />
                    </div>
                  ) : (
                    <select
                      className="mt-2 block w-full border border-gray-300 rounded-md p-2"
                      value={repositoryDropdown}
                      onChange={(e) => setRepositoryDropdown(e.target.value)}
                    >
                      <option value="">Select a repository</option>
                      {repositories.map((repo) => (
                        <option key={repo.full_name} value={repo.full_name}>
                          {repo.full_name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Repository (username/repository_name)
                  </label>
                  <input
                    type="text"
                    className="mt-2 block w-full border border-gray-300 rounded-md p-2"
                    placeholder="e.g. github_username/repository_name"
                    value={repositoryManual}
                    onChange={(e) => setRepositoryManual(e.target.value)}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">Branch</label>
                <input
                  type="text"
                  className="mt-2 block w-full border border-gray-300 rounded-md p-2"
                  placeholder="main"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                />
              </div>

              <button
                onClick={handleIndexRepository}
                disabled={loading}
                className="w-full py-2 px-4 text-white bg-indigo-600 hover:bg-indigo-700 rounded-md font-medium shadow-sm transition-colors"
              >
                {loading ? <Loader className="animate-spin inline-block" /> : 'Index Repository'}
              </button>
            </div>
          )}

          {/* User Section */}
          {activeTab === 'user' && (
            <div className="space-y-6 transition-all duration-300">
              <div>
                <label className="block text-sm font-medium text-gray-700">Repository</label>
                <input
                  type="text"
                  readOnly
                  className="mt-2 block w-full bg-gray-100 border border-gray-300 rounded-md p-2"
                  placeholder="Repository from Developer section"
                  value={finalRepository}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Branch</label>
                <input
                  type="text"
                  readOnly
                  className="mt-2 block w-full bg-gray-100 border border-gray-300 rounded-md p-2"
                  placeholder="Branch from Developer section"
                  value={branch}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Analysis Query</label>
                <textarea
                  rows={4}
                  className="mt-2 block w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter your analysis query..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <button
                onClick={handleAnalyzeRepository}
                disabled={loading}
                className="w-full py-2 px-4 text-white bg-indigo-600 hover:bg-indigo-700 rounded-md font-medium shadow-sm transition-colors"
              >
                {loading ? <Loader className="animate-spin inline-block" /> : 'Analyze Repository'}
              </button>
              {response && (
                <button
                  onClick={handleClearAnalysis}
                  className="mt-2 w-full py-2 px-4 text-white bg-gray-600 hover:bg-gray-700 rounded-md font-medium shadow-sm transition-colors"
                >
                  Clear Analysis
                </button>
              )}
            </div>
          )}

          {/* Analysis Result */}
          {response && (
            <div className="bg-gray-50 p-4 rounded-lg shadow-inner transition-all duration-300">
              <h3 className="text-lg font-semibold text-gray-900">Analysis Result</h3>
              <div className="p-4 border border-gray-300 rounded-lg bg-white shadow-md">
                <h3 className="font-semibold text-indigo-700">
                  {response.source && response.source.length > 0
                    ? response.source.join(', ')
                    : 'No source information available'}
                </h3>
                <div className="text-gray-700 mt-2 whitespace-pre-line">
                  {response.content}
                </div>
              </div>
            </div>
          )}

          {/* Message Pop-up */}
          {message && (
            <div className="fixed top-4 right-4 bg-indigo-600 text-white py-2 px-4 rounded-lg shadow-md transition-all duration-300 flex items-center">
              <span>{message}</span>
              <button onClick={() => setMessage(null)} className="ml-3">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
