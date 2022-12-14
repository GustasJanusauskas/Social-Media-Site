export interface UserInfo {
    session: string;
    success?: boolean;
    error?: string;

    email?: string;
    username?: string;
    creationdate?: string;

    firstName?: string;
    lastName?: string;
    profileDesc?: string;
    avatarPath?: string;
    thumbPath?: string;
    avatar?: string;
    friends?: number[];
    posts?: number[];
    blocked?: number[];
    friendRequests?: number[];

    online?: boolean;
    ID?: number;
}