export interface UserInfo {
    session: string;
    success?: boolean;

    email?: string;
    username?: string;
    creationdate?: any;

    firstName?: string;
    lastName?: string;
    profileDesc?: string;
    avatarPath?: string;
    friends?: number[];
    posts?: string[];
}