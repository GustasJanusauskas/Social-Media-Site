import { UserInfo } from "./userinfo";

export interface Message {
    body: string;
    author: UserInfo;

    date: any;
}

export interface MessageSend {
    body: string;
    session?: string;
    recipientID: number;
    senderID?: number;

    date: number;
    error?: string;
    handshake?: string;
}