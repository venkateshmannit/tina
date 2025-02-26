// src/types.ts
export interface User {
  username: string;
  api_key: string;
  authType: 'github' | 'password';
}

export interface AuthContextType {
  user: User | null;
  login: (username: string, api_key: string, authType?: 'github' | 'password') => void;
  logout: () => void;
}

export interface RepositoryResponse {
  message?: string;
  source?: string[];
  content: string;
}

export interface Repository {
  full_name: string;
  description?: string;
}