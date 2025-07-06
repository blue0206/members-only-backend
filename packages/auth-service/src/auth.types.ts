import type { User, RefreshToken } from '@members-only/database';

export interface RegisterServiceReturnType extends Omit<User, 'password'> {
    accessToken: string;
    refreshToken: string;
}

export interface LoginServiceReturnType extends User {
    accessToken: string;
    refreshToken: string;
}

export interface RefreshServiceReturnType extends Omit<User, 'password'> {
    accessToken: string;
    refreshToken: string;
}

export interface GetSessionsServiceReturnType {
    sessions: Omit<RefreshToken, 'tokenHash'>[];
    currentSessionId: string;
}
