// Core browser extension types
export interface Tab {
  id: number;
  title?: string;
  url: string;
  favIconUrl?: string | undefined;
  pinned: boolean;
  windowId: number;
  active: boolean;
  lastAccessed: number;
  index?: number;
}

export interface Session {
  name: string;
  tabs: SessionTab[];
  date: number;
}

export interface SessionTab {
  url: string;
  title: string;
}

export interface SavedSessionData {
  sessions?: Session[];
}

// UI State types
export interface AppState {
  allTabs: Tab[];
  filteredTabs: Tab[];
  selectedTabs: Set<number>;
  closeConfirmation: boolean;
  focusedTabIndex: number;
  savedSessions: Session[];
  collapsedGroups: Set<string>;
}

export interface FilterOptions {
  timeFilter: number;
  searchTerm: string;
  viewMode: ViewMode;
  sortBy: SortBy;
  windowScope: WindowScope;
}

// Enums for better type safety
export enum ViewMode {
  LIST = "list",
  GROUPED = "grouped",
}

export enum SortBy {
  LAST_ACCESSED = "lastAccessed",
  TITLE = "title",
  URL = "url",
}

export enum WindowScope {
  CURRENT = "current",
  ALL = "all",
}

export enum TimeFilter {
  NONE = 0,
  ONE_HOUR = 3600000,
  ONE_DAY = 86400000,
  ONE_WEEK = 604800000,
  ONE_MONTH = 2592000000,
}

// Event types
export interface TabChangeMessage {
  tabsChanged: boolean;
}

export interface ToastOptions {
  message: string;
  isError?: boolean;
  duration?: number;
}

// Browser API response types
export interface BrowserError {
  message?: string;
}

export interface CreateWindowOptions {
  url?: string | string[];
  windowId?: number;
}

export interface TabUpdateProperties {
  active?: boolean;
  pinned?: boolean;
}

export interface WindowUpdateProperties {
  focused?: boolean;
}

export interface BookmarkCreateProperties {
  parentId?: string;
  title?: string;
  url?: string;
}

// Component props types
export interface TabListProps {
  tabs: Tab[];
  selectedTabs: Set<number>;
  onSelectionChange: (tabId: number, selected: boolean) => void;
  onPinTab: (tabId: number) => void;
  onGoToTab: (tabId: number, windowId: number) => void;
}

export interface GroupedTabListProps extends TabListProps {
  collapsedGroups: Set<string>;
  onToggleGroup: (domain: string) => void;
  onGroupSelectionChange: (domain: string, selected: boolean) => void;
}

export interface SessionListProps {
  sessions: Session[];
  onRestoreSession: (sessionIndex: number) => void;
  onDeleteSession: (sessionIndex: number) => void;
}

// Utility function return types
export interface GroupedTabs {
  [domain: string]: Tab[];
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// Browser API wrapper types
export type BrowserApi = typeof chrome;

export interface BrowserService {
  getAllTabs: (scope?: WindowScope) => Promise<Tab[]>;
  getSavedSessions: () => Promise<Session[]>;
  saveSessions: (sessions: Session[]) => Promise<void>;
  restoreSession: (session: Session) => Promise<void>;
  pinTab: (tabId: number, pinned: boolean) => Promise<void>;
  goToTab: (tabId: number, windowId: number) => Promise<void>;
  closeTabs: (tabIds: Set<number>) => Promise<void>;
  bookmarkTabs: (tabs: Tab[]) => Promise<void>;
  saveAsMht: (tabId: number) => Promise<Blob>;
  isMhtSaveAvailable: () => boolean;
}

// Error types
export class ExtensionError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ExtensionError";
  }
}

export class BrowserApiError extends ExtensionError {
  constructor(message: string, details?: unknown) {
    super(message, "BROWSER_API_ERROR", details);
    this.name = "BrowserApiError";
  }
}

export class SessionError extends ExtensionError {
  constructor(message: string, details?: unknown) {
    super(message, "SESSION_ERROR", details);
    this.name = "SessionError";
  }
}

export class ValidationError extends ExtensionError {
  constructor(message: string, details?: unknown) {
    super(message, "VALIDATION_ERROR", details);
    this.name = "ValidationError";
  }
}

// Constants
export const TIME_FILTERS = {
  [TimeFilter.NONE]: "All time",
  [TimeFilter.ONE_HOUR]: "1 hour ago",
  [TimeFilter.ONE_DAY]: "1 day ago",
  [TimeFilter.ONE_WEEK]: "1 week ago",
  [TimeFilter.ONE_MONTH]: "1 month ago",
} as const;

export const TOAST_DURATION = {
  SHORT: 2000,
  MEDIUM: 3000,
  LONG: 5000,
} as const;

// Type guards
export const isTab = (obj: unknown): obj is Tab => {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof (obj as Tab).id === "number" &&
    typeof (obj as Tab).url === "string" &&
    typeof (obj as Tab).pinned === "boolean" &&
    typeof (obj as Tab).windowId === "number" &&
    typeof (obj as Tab).active === "boolean" &&
    typeof (obj as Tab).lastAccessed === "number"
  );
};

export const isSession = (obj: unknown): obj is Session => {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof (obj as Session).name === "string" &&
    Array.isArray((obj as Session).tabs) &&
    typeof (obj as Session).date === "number" &&
    (obj as Session).tabs.every(isSessionTab)
  );
};

export const isSessionTab = (obj: unknown): obj is SessionTab => {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof (obj as SessionTab).url === "string" &&
    typeof (obj as SessionTab).title === "string"
  );
};

export const isTabChangeMessage = (obj: unknown): obj is TabChangeMessage => {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof (obj as TabChangeMessage).tabsChanged === "boolean"
  );
};
