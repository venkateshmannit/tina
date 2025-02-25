export interface User {
  username: string;
  api_key: string;
}

// src/types.ts
export interface Repository {
  id: number;
  node_id: string;
  name: string;
  full_name: string;
  description: string | null; // Allow null values
  // ... include other properties as needed
}


export interface LoginResponse {
  message: string;
  username: string;
  api_key: string;
}

export interface RegistrationResponse {
  message: string;
}

export interface ApiError {
  message: string;
  error?: string;
}