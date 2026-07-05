// ============================================================
// Taro Dashboard — TypeScript Type Definitions
// ============================================================

// --- User & Auth ---

export interface User {
  id: string;
  username: string;
  email?: string;
  is_onboarded: boolean;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  email?: string;
}

// --- Profile ---

export interface UserProfile {
  display_name: string;
  preferred_language: string;
  timezone: string;
  country: string;
  occupation: string;
  professional_status: string;
}

// --- Interests ---

export interface InterestTopic {
  id?: string;
  category: string;
  topic: string;
  is_custom: boolean;
  priority: number;
}

// --- News Preferences ---

export type NewsFrequency = 'daily' | 'every_6h' | 'weekly';

export interface NewsPreference {
  id?: string;
  topic: string;
  frequency: NewsFrequency;
  is_active: boolean;
}

// --- Learning & Career Goals ---

export type GoalStatus = 'active' | 'completed' | 'paused';

export interface LearningGoal {
  id?: string;
  topic: string;
  status: GoalStatus;
  notes?: string;
}

export interface CareerGoal {
  id?: string;
  goal: string;
  status: GoalStatus;
  target_date?: string;
  notes?: string;
}

// --- Daily Briefing ---

export interface DailyBriefing {
  id: string;
  date: string;
  generated_at: string;
  status: string;
  items: BriefingItem[];
}

export interface BriefingItem {
  id: string;
  category: string;
  title: string;
  summary: string;
  source_url?: string;
  source_name?: string;
  relevance_score: number;
  metadata: Record<string, unknown>;
  sort_order: number;
}

// --- Agents ---

export interface Agent {
  id: string;
  name: string;
  description: string;
  version: string;
  capabilities: string[];
  status: string;
  last_executed_at?: string;
}

// --- System ---

export interface SystemHealth {
  status: string;
  services: ServiceHealth[];
}

export interface ServiceHealth {
  name: string;
  status: string;
  latency_ms?: number;
  details?: Record<string, unknown>;
}

export interface NodeStatus {
  node_id: string;
  host: string;
  services: ServiceHealth[];
}

export interface SystemInfo {
  version: string;
  uptime?: string;
  active_models?: string[];
}

// --- Chat ---

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  created_at: string;
  model?: string;
}

export interface ChatRequest {
  message: string;
  conversation_id?: string;
  model?: string;
}

export interface ChatResponse {
  message: Message;
  conversation_id: string;
}

// --- Onboarding ---

export interface OnboardingStatus {
  is_onboarded: boolean;
  completed_steps: string[];
}

export interface OnboardingData {
  profile: UserProfile;
  interests: InterestTopic[];
  news_preferences: NewsPreference[];
  learning_goals: LearningGoal[];
  career_goals: CareerGoal[];
}

// --- API Response Wrappers ---

export interface ApiError {
  detail: string;
  status_code: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
}
