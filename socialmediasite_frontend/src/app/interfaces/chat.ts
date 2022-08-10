import { UserInfo } from './userinfo';
import { Message } from './message';

export interface Chat {
    recipientID: number;
    sender: UserInfo;

    messages: Message[];
}