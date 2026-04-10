/**
 * API Client for Mouva Backend
 */

// In production, API might be on a different domain (e.g., api.mouva.ai)
// In development, vite proxy handles /api routes
const API_BASE = import.meta.env.VITE_API_URL || '/api';

// Token storage
let authToken: string | null = localStorage.getItem('mouva-token');

/**
 * Set the auth token for API requests
 */
export function setAuthToken(token: string | null): void {
  authToken = token;
  if (token) {
    localStorage.setItem('mouva-token', token);
  } else {
    localStorage.removeItem('mouva-token');
  }
}

/**
 * Get the current auth token
 */
export function getAuthToken(): string | null {
  return authToken;
}

/**
 * Make an authenticated API request
 */
async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (authToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include', // Include cookies
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ====================
// Auth API
// ====================

export interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  createdAt?: string;
  subscription?: {
    plan: string;
    planName: string;
    status: string;
    expiresAt?: string | null;
  };
}

export interface AuthResponse {
  user: User;
  token: string;
}

/**
 * Register a new user
 */
export async function register(email: string, password: string): Promise<AuthResponse> {
  const response = await apiRequest<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setAuthToken(response.token);
  return response;
}

/**
 * Login with email and password
 */
export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setAuthToken(response.token);
  return response;
}

/**
 * Login with Google OAuth
 */
export async function loginWithGoogle(credential: string): Promise<AuthResponse> {
  const response = await apiRequest<AuthResponse>('/auth/oauth/google', {
    method: 'POST',
    body: JSON.stringify({ credential }),
  });
  setAuthToken(response.token);
  return response;
}

/**
 * Login with Microsoft OAuth
 */
export async function loginWithMicrosoft(accessToken: string): Promise<AuthResponse> {
  const response = await apiRequest<AuthResponse>('/auth/oauth/microsoft', {
    method: 'POST',
    body: JSON.stringify({ accessToken }),
  });
  setAuthToken(response.token);
  return response;
}

/**
 * Send verification code to email
 */
export async function sendVerificationCode(email: string): Promise<{ success: boolean; expiresIn: number }> {
  return apiRequest('/auth/code/send', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

/**
 * Verify code and login
 */
export async function verifyCode(email: string, code: string): Promise<AuthResponse> {
  const response = await apiRequest<AuthResponse>('/auth/code/verify', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  });
  setAuthToken(response.token);
  return response;
}

/**
 * Send magic link to email
 */
export async function sendMagicLink(email: string): Promise<{ success: boolean; expiresIn: number }> {
  return apiRequest('/auth/magic/send', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

/**
 * Verify magic link token
 */
export async function verifyMagicLink(email: string, token: string): Promise<AuthResponse> {
  const response = await apiRequest<AuthResponse>('/auth/magic/verify', {
    method: 'POST',
    body: JSON.stringify({ email, token }),
  });
  setAuthToken(response.token);
  return response;
}

/**
 * Logout the current user
 * Clears all local session data to ensure user isolation on shared devices
 */
export async function logout(): Promise<void> {
  try {
    await apiRequest('/auth/logout', { method: 'POST' });
  } finally {
    setAuthToken(null);
    // Clear all local session data to prevent next user from seeing cached data
    localStorage.removeItem('ai-designer-sessions');
    localStorage.removeItem('ai-designer-current-session');
    localStorage.removeItem('ai-designer-messages');
  }
}

/**
 * Get the current authenticated user
 */
export async function getCurrentUser(): Promise<User | null> {
  if (!authToken) return null;
  try {
    const response = await apiRequest<{ user: User }>('/auth/me');
    return response.user;
  } catch {
    setAuthToken(null);
    return null;
  }
}

// ====================
// Sessions API
// ====================

export interface Session {
  id: string;
  title: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  templateSnapshot?: any;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get all sessions for the current user
 */
export async function getSessions(): Promise<Session[]> {
  const response = await apiRequest<{ sessions: Session[] }>('/sessions');
  return response.sessions;
}

/**
 * Get a single session by ID
 */
export async function getSession(id: string): Promise<Session> {
  const response = await apiRequest<{ session: Session }>(`/sessions/${id}`);
  return response.session;
}

/**
 * Create a new session
 */
export async function createSession(data: {
  title?: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  templateSnapshot?: any;
}): Promise<Session> {
  const response = await apiRequest<{ session: Session }>('/sessions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.session;
}

/**
 * Update an existing session
 */
export async function updateSession(
  id: string,
  data: {
    title?: string;
    messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
    templateSnapshot?: any;
  }
): Promise<Session> {
  const response = await apiRequest<{ session: Session }>(`/sessions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return response.session;
}

/**
 * Delete a session
 */
export async function deleteSession(id: string): Promise<void> {
  await apiRequest(`/sessions/${id}`, { method: 'DELETE' });
}

// ====================
// Subscription API
// ====================

export interface AiLimitStatus {
  allowed: boolean;
  used: number;
  limit: number;  // -1 means unlimited
  planName: string;
}

/**
 * Check if user can make an AI request (daily limit check)
 * Returns limit status including whether the request is allowed
 */
export async function checkAiLimit(): Promise<AiLimitStatus> {
  try {
    const response = await apiRequest<AiLimitStatus>('/subscription/check-limit');
    return response;
  } catch (error) {
    console.error('[API] Failed to check AI limit:', error);
    // Default to allowed if check fails (fail-open for better UX)
    return { allowed: true, used: 0, limit: -1, planName: 'Unknown' };
  }
}

/**
 * Increment usage counter after AI generation
 * @param type - The type of usage: 'ai_request' | 'template' | 'pdf'
 */
export async function incrementUsage(type: 'ai_request' | 'template' | 'pdf'): Promise<void> {
  try {
    await apiRequest('/subscription/increment-usage', {
      method: 'POST',
      body: JSON.stringify({ type }),
    });
  } catch (error) {
    console.error('[API] Failed to increment usage:', error);
    // Non-blocking: don't throw, just log
  }
}

// ====================
// Document Conversion API
// ====================

export interface ConvertResult {
  success: boolean;
  pdfBase64: string;
  filename: string;
}

/**
 * Convert an office document (PPT, DOCX, XLSX) to PDF via server-side LibreOffice.
 * @param base64 - Base64 encoded file content
 * @param filename - Original filename (used to detect format)
 * @returns PDF as base64 string
 */
export async function convertDocument(base64: string, filename: string): Promise<ConvertResult> {
  return apiRequest<ConvertResult>('/convert', {
    method: 'POST',
    body: JSON.stringify({ base64, filename }),
  });
}

/**
 * Check if server-side document conversion (LibreOffice) is available
 */
export async function checkConvertStatus(): Promise<{ available: boolean; version?: string; supportedFormats: string[] }> {
  try {
    return await apiRequest('/convert/status');
  } catch {
    return { available: false, supportedFormats: [] };
  }
}

