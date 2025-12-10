/**
 * User - Represents an authenticated user
 */
export interface User {
  /** Unique identifier */
  id: string;
  /** Email address */
  email: string;
  /** Display name */
  name: string;
  /** Avatar URL */
  avatar?: string;
  /** User role */
  role: UserRole;
  /** User preferences */
  preferences: UserPreferences;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * User Role
 */
export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

/**
 * User Preferences
 */
export interface UserPreferences {
  /** UI Theme */
  theme: 'light' | 'dark' | 'system';
  /** Editor settings */
  editor: {
    fontSize: number;
    fontFamily: string;
    tabSize: number;
    insertSpaces: boolean;
    wordWrap: 'on' | 'off' | 'wordWrapColumn';
    minimap: boolean;
    lineNumbers: 'on' | 'off' | 'relative';
  };
  /** AI settings */
  ai: {
    defaultModel: string;
    autoComplete: boolean;
    showSuggestions: boolean;
  };
  /** Notification settings */
  notifications: {
    email: boolean;
    desktop: boolean;
    taskUpdates: boolean;
  };
  /** Language/locale */
  locale: string;
}

/**
 * Default user preferences
 */
export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  theme: 'system',
  editor: {
    fontSize: 14,
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    tabSize: 2,
    insertSpaces: true,
    wordWrap: 'on',
    minimap: true,
    lineNumbers: 'on',
  },
  ai: {
    defaultModel: 'codellama:13b',
    autoComplete: true,
    showSuggestions: true,
  },
  notifications: {
    email: true,
    desktop: true,
    taskUpdates: true,
  },
  locale: 'en',
};

/**
 * Authentication Token Payload
 */
export interface TokenPayload {
  sub: string; // User ID
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

/**
 * Login DTO
 */
export interface LoginDto {
  email: string;
  password: string;
}

/**
 * Register DTO
 */
export interface RegisterDto {
  email: string;
  password: string;
  name: string;
}

/**
 * Auth Response
 */
export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken?: string;
}

/**
 * Update User DTO
 */
export interface UpdateUserDto {
  name?: string;
  avatar?: string;
  preferences?: Partial<UserPreferences>;
}
