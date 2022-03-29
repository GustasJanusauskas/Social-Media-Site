export interface LoginResponse {
    username: string;
    password: string;

    success?: boolean;
    session?: string;
}