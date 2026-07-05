// ============================================================
// Taro Dashboard — Utility Functions
// ============================================================

/**
 * Merge class names, filtering out falsy values.
 */
export function classNames(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Format a date string into a localized readable format.
 */
export function formatDate(dateStr: string, options?: Intl.DateTimeFormatOptions): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  });
}

/**
 * Format a date string into a short format (e.g. "Jul 4, 2026").
 */
export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a date/time into a relative "time ago" string.
 */
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDateShort(dateStr);
}

/**
 * Truncate text to a maximum length, appending ellipsis if needed.
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '…';
}

/**
 * Get an emoji icon for a briefing category.
 */
export function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    ai: '🤖',
    tech: '💻',
    technology: '💻',
    github: '📊',
    learning: '📚',
    career: '💼',
    health: '💪',
    fitness: '💪',
    focus: '🎯',
    news: '📰',
    general: '📰',
    finance: '💰',
    economy: '💰',
    music: '🎵',
    entertainment: '🎬',
    sports: '⚽',
    security: '🔒',
    devops: '🔧',
    programming: '👨‍💻',
    science: '🧠',
    productivity: '📈',
  };
  return icons[category.toLowerCase()] || '📌';
}

/**
 * Get a CSS color variable name for a briefing category.
 */
export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    ai: '#3b82f6',
    tech: '#3b82f6',
    technology: '#3b82f6',
    github: '#10b981',
    learning: '#8b5cf6',
    career: '#f59e0b',
    health: '#10b981',
    fitness: '#10b981',
    focus: '#3b82f6',
    news: '#6b7280',
    general: '#6b7280',
    finance: '#eab308',
    economy: '#eab308',
    music: '#ec4899',
    entertainment: '#ec4899',
    sports: '#f97316',
    security: '#ef4444',
    devops: '#06b6d4',
    programming: '#8b5cf6',
    science: '#a855f7',
    productivity: '#14b8a6',
  };
  return colors[category.toLowerCase()] || '#6b7280';
}

/**
 * Get a time-based greeting.
 */
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return 'Good night';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
}

/**
 * Format a relevance score (0–1) to a percentage string.
 */
export function formatRelevance(score: number): string {
  return `${Math.round(score * 100)}%`;
}

/**
 * Generate a unique ID for DOM elements.
 */
let idCounter = 0;
export function uniqueId(prefix = 'taro'): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

/**
 * Debounce a function call.
 */
export function debounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  delayMs: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delayMs);
  };
}

/**
 * Format today's date in ISO format (YYYY-MM-DD).
 */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Detect the user's timezone.
 */
export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}
