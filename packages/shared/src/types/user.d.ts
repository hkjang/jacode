export interface User {
    id: string;
    email: string;
    name: string;
    avatar?: string;
    role: UserRole;
    preferences: UserPreferences;
    createdAt: Date;
    updatedAt: Date;
}
export declare enum UserRole {
    USER = "USER",
    ADMIN = "ADMIN"
}
export interface UserPreferences {
    theme: 'light' | 'dark' | 'system';
    editor: {
        fontSize: number;
        fontFamily: string;
        tabSize: number;
        insertSpaces: boolean;
        wordWrap: 'on' | 'off' | 'wordWrapColumn';
        minimap: boolean;
        lineNumbers: 'on' | 'off' | 'relative';
    };
    ai: {
        defaultModel: string;
        autoComplete: boolean;
        showSuggestions: boolean;
    };
    notifications: {
        email: boolean;
        desktop: boolean;
        taskUpdates: boolean;
    };
    locale: string;
}
export declare const DEFAULT_USER_PREFERENCES: UserPreferences;
export interface TokenPayload {
    sub: string;
    email: string;
    role: UserRole;
    iat?: number;
    exp?: number;
}
export interface LoginDto {
    email: string;
    password: string;
}
export interface RegisterDto {
    email: string;
    password: string;
    name: string;
}
export interface AuthResponse {
    user: User;
    accessToken: string;
    refreshToken?: string;
}
export interface UpdateUserDto {
    name?: string;
    avatar?: string;
    preferences?: Partial<UserPreferences>;
}
