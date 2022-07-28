import { UserInfo } from "./userinfo";

export interface Message {
    body: string;
    author: UserInfo;

    date: any;
}