import { UserInfo } from './userinfo';
import { Message } from './message';

export interface Chat {
    recipientID: number;
    recipient: UserInfo;

    sender: UserInfo;
    messages: Message[];

    msgRequest?: boolean;
}