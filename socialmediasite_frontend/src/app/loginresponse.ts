export interface LoginResponse {
    username: string;
    password: string;
    email?: string;

    success?: boolean;
    session?: string;
}