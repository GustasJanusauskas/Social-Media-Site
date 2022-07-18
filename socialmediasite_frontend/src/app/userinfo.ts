export interface UserInfo {
    session: string;
    success?: boolean;
    error?: string;
    search?: string;

    email?: string;
    username?: string;
    creationdate?: any;

    firstName?: string;
    lastName?: string;
    profileDesc?: string;
    avatarPath?: string;
    avatar?: string;
    friends?: number[];
    posts?: string[];

    ID?: number;
}