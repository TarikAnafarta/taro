// ============================================================
// Taro Dashboard — Centralized API Client
// ============================================================

import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
  UserProfile,
  InterestTopic,
  NewsPreference,
  LearningGoal,
  CareerGoal,
  OnboardingStatus,
  OnboardingData,
  DailyBriefing,
  Agent,
  SystemHealth,
  NodeStatus,
  SystemInfo,
  Conversation,
  Message,
  ChatResponse,
} from './types';

const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    return `http://${window.location.hostname}:8000`;
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
};

const API_BASE_URL = getApiBaseUrl();

// ── Token Management ────────────────────────────────────────

const TOKEN_KEY = 'taro_access_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export function logout(): void {
  removeToken();
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}

// ── HTTP Helpers ────────────────────────────────────────────

class ApiRequestError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = 'ApiRequestError';
    this.status = status;
    this.detail = detail;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      removeToken();
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    let detail = 'An unexpected error occurred';
    try {
      const errorBody = await response.json();
      detail = errorBody.detail || errorBody.message || detail;
    } catch {
      detail = response.statusText || detail;
    }
    throw new ApiRequestError(response.status, detail);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

function get<T>(endpoint: string): Promise<T> {
  return request<T>(endpoint, { method: 'GET' });
}

function post<T>(endpoint: string, body?: unknown): Promise<T> {
  return request<T>(endpoint, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

function put<T>(endpoint: string, body?: unknown): Promise<T> {
  return request<T>(endpoint, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

function del<T>(endpoint: string): Promise<T> {
  return request<T>(endpoint, { method: 'DELETE' });
}

// ── Auth ────────────────────────────────────────────────────

export const auth = {
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const res = await post<AuthResponse>('/api/auth/register', data);
    setToken(res.access_token);
    return res;
  },

  async login(data: LoginRequest): Promise<AuthResponse> {
    const res = await post<AuthResponse>('/api/auth/login', data);
    setToken(res.access_token);
    return res;
  },

  async me(): Promise<User> {
    return get<User>('/api/auth/me');
  },
};

// ── Onboarding ──────────────────────────────────────────────

export const onboarding = {
  async getStatus(): Promise<OnboardingStatus> {
    return get<OnboardingStatus>('/api/onboarding/status');
  },

  async saveProfile(data: UserProfile): Promise<void> {
    return post('/api/onboarding/profile', data);
  },

  async saveInterests(data: InterestTopic[]): Promise<void> {
    return post('/api/onboarding/interests', data);
  },

  async saveNewsPreferences(data: NewsPreference[]): Promise<void> {
    return post('/api/onboarding/news-preferences', data);
  },

  async saveLearningGoals(data: LearningGoal[]): Promise<void> {
    return post('/api/onboarding/learning-goals', data);
  },

  async saveCareerGoals(data: CareerGoal[]): Promise<void> {
    return post('/api/onboarding/career-goals', data);
  },

  async complete(data: OnboardingData): Promise<void> {
    return post('/api/onboarding/complete', data);
  },
};

// ── Profile ─────────────────────────────────────────────────

export const profile = {
  async get(): Promise<UserProfile> {
    return get<UserProfile>('/api/profile');
  },

  async update(data: Partial<UserProfile>): Promise<UserProfile> {
    return put<UserProfile>('/api/profile', data);
  },

  async getInterests(): Promise<InterestTopic[]> {
    return get<InterestTopic[]>('/api/profile/interests');
  },

  async updateInterests(data: InterestTopic[]): Promise<InterestTopic[]> {
    return put<InterestTopic[]>('/api/profile/interests', data);
  },

  async getNewsPreferences(): Promise<NewsPreference[]> {
    return get<NewsPreference[]>('/api/profile/news-preferences');
  },

  async updateNewsPreferences(data: NewsPreference[]): Promise<NewsPreference[]> {
    return put<NewsPreference[]>('/api/profile/news-preferences', data);
  },

  async getLearningGoals(): Promise<LearningGoal[]> {
    return get<LearningGoal[]>('/api/profile/learning-goals');
  },

  async updateLearningGoals(data: LearningGoal[]): Promise<LearningGoal[]> {
    return put<LearningGoal[]>('/api/profile/learning-goals', data);
  },

  async getCareerGoals(): Promise<CareerGoal[]> {
    return get<CareerGoal[]>('/api/profile/career-goals');
  },

  async updateCareerGoals(data: CareerGoal[]): Promise<CareerGoal[]> {
    return put<CareerGoal[]>('/api/profile/career-goals', data);
  },
};

// ── Briefing ────────────────────────────────────────────────

export const briefing = {
  async getToday(): Promise<DailyBriefing> {
    return get<DailyBriefing>('/api/briefing/today');
  },

  async getByDate(date: string): Promise<DailyBriefing> {
    return get<DailyBriefing>(`/api/briefing/${date}`);
  },

  async getHistory(limit = 7): Promise<DailyBriefing[]> {
    return get<DailyBriefing[]>(`/api/briefing/history?limit=${limit}`);
  },

  async generate(): Promise<DailyBriefing> {
    return post<DailyBriefing>('/api/briefing/generate');
  },
};

// ── Agents ──────────────────────────────────────────────────

export const agents = {
  async list(): Promise<Agent[]> {
    return get<Agent[]>('/api/agents');
  },

  async getById(id: string): Promise<Agent> {
    return get<Agent>(`/api/agents/${id}`);
  },

  async execute(id: string, params?: Record<string, unknown>): Promise<Record<string, unknown>> {
    return post<Record<string, unknown>>(`/api/agents/${id}/execute`, params);
  },
};

// ── Chat ────────────────────────────────────────────────────

export const chat = {
  async send(message: string, conversationId?: string, model?: string): Promise<ChatResponse> {
    return post<ChatResponse>('/api/chat/send', {
      message,
      conversation_id: conversationId,
      model,
    });
  },

  async getConversations(): Promise<Conversation[]> {
    return get<Conversation[]>('/api/chat/conversations');
  },

  async getMessages(conversationId: string): Promise<Message[]> {
    return get<Message[]>(`/api/chat/conversations/${conversationId}/messages`);
  },

  async deleteConversation(conversationId: string): Promise<void> {
    return del<void>(`/api/chat/conversations/${conversationId}`);
  },
};

// ── System ──────────────────────────────────────────────────

export const system = {
  async health(): Promise<SystemHealth> {
    return get<SystemHealth>('/api/system/health');
  },

  async nodes(): Promise<NodeStatus[]> {
    return get<NodeStatus[]>('/api/system/nodes');
  },

  async info(): Promise<SystemInfo> {
    return get<SystemInfo>('/api/system/info');
  },
};

// ── Default Export ──────────────────────────────────────────

const api = {
  auth,
  onboarding,
  profile,
  briefing,
  agents,
  chat,
  system,
};

export default api;
