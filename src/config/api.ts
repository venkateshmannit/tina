// src/config/api.ts
export const API_BASE_URL = 'http://localhost:5000';

export const api = {
  login: (username: string, password: string) =>
    fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    }).then((res) => res.json()),

  register: (username: string, password: string) =>
    fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    }).then((res) => res.json()),

  indexRepository: `${API_BASE_URL}/index_repository`,
  repositoryAnalysis: `${API_BASE_URL}/repositoryanalysis`,

  getGitHubRepos: (accessToken: string) =>
    fetch(`${API_BASE_URL}/github/repos`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then((res) => res.json()),
};