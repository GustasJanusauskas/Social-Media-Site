import { UserInfo } from './userinfo';
import { Message } from './message';

export interface Chat {
    recipient: UserInfo;
    sender: UserInfo;

    messages: Message[];
}