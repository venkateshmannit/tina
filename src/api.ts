import axios from 'axios';
import { Octokit } from '@octokit/rest';

const API_URL = 'http://localhost:5000';

export const api = {
  login: async (username: string, password: string) => {
    const response = await axios.post(`${API_URL}/login`, { username, password });
    return response.data;
  },

  register: async (username: string, password: string) => {
    const response = await axios.post(`${API_URL}/register`, { username, password });
    return response.data;
  },

  getGitHubRepos: async (token: string) => {
    const octokit = new Octokit({ auth: token });
    const { data } = await octokit.repos.listForAuthenticatedUser();
    return data;
  }
};