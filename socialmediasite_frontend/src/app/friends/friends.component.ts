import { Component, Injectable, Input, OnInit, ViewChildren, QueryList } from '@angular/core';

import { AppComponent, VERBOSE_DEBUG } from '../app.component';

import { HelperFunctionsService } from "../services/helper-functions.service";
import { UserdataService } from "../services/userdata.service";
import { MessagingService } from "../services/messaging.service";

import { UserInfo } from "../interfaces/userinfo";
import { Chat } from '../interfaces/chat';
import { Message, MessageSend } from '../interfaces/message';


@Component({
  selector: 'app-friends',
  templateUrl: './friends.component.html',
  styleUrls: ['./friends.component.css']
})
export class FriendsComponent implements OnInit {
  @Input() userinfo!: UserInfo;
  @Input() rootComponent!: AppComponent;

  //Private messages
  chatList: Chat[] = [];
  currentChat?: Chat;
  chatMsgField: string = "";

  //Imported helper functions
  noJsonSymbols = HelperFunctionsService.noJsonSymbols;

  @ViewChildren('chatDiv') chatDiv!: QueryList<any>;

  constructor(private userdataService: UserdataService, private messagingService: MessagingService) {
    //On websocket message: find correct chat and add message
    messagingService.messages.subscribe(msg => {
      //Check whether autoscroll is required on each chat
      var scrollChat: boolean[] = new Array<boolean>(this.chatDiv.length);
      this.chatDiv.forEach( (item, index, arr) => {
        scrollChat[index] = item.nativeElement.scrollTop + item.nativeElement.clientHeight == item.nativeElement.scrollHeight;
      });

      //If error message, find chat to add it to and set author to reserved 'SERVER' username
      if (msg.error) {
        var chat = this.chatList.find(chat => {
          if (!chat || !chat.recipientID) return false;
          return chat.recipientID == msg.recipientID;
        });

        chat?.messages.push({body:msg.error,author:{session:'',username:'SYSTEM'},date:new Date(Date.now()).toLocaleString()});

        //Apply autoscroll on each chat if needed
        this.scrollDivs(scrollChat);
        return;
      }

      var chat = this.chatList.find(chat => {
        if (!chat || !chat.recipientID || !msg.senderID) return false;
        return chat.recipientID == msg.senderID;
      });
      
      var localMessage: Message = {body:msg.body,date:new Date(msg.date).toLocaleString(),author:this.userinfo};
      //Get author data from memory, if ID isn't user's assume it's the sender's
      if (chat) {
        if (msg.senderID == this.userinfo.ID) {
          localMessage.author = chat.sender;
        }
        else {
          localMessage.author = this.rootComponent.friendList.find( (val) => {return val.ID == (chat!.recipientID);}) || {session:'',firstName:'Author not found.',username:'noauthor'};
        }
        //Convert date to readable format
        localMessage.date = new Date(msg.date).toLocaleString();
        
        chat.messages.push(localMessage);
      }
      //If message is not from a friend and a chat tab isn't open, add a message request tab
      else {
        if (!this.userinfo.friends) return;
        var friend = this.userinfo.friends.find(fID => {
          return msg.senderID == fID;
        });

        if (!friend) {
          this,userdataService.getPublicUserInfo(msg.senderID || -1).subscribe(data => {
            if (!data.error) {
              localMessage.author = data;

              this.openChat(data, undefined, true);
              this.chatList[this.chatList.length - 1].messages.push(localMessage);
            }
          });
        }
      }

      //Apply autoscroll on each chat if needed
      this.scrollDivs(scrollChat);

      if (VERBOSE_DEBUG) console.log("Response from websocket: " + msg);
    });
  }

  ngOnInit(): void {
    //Connect messaging websock
    this.connectMsg();
  }


  openChat(profile: UserInfo, callback?: Function, msgRequest: boolean = false) {
    var session = HelperFunctionsService.getCookie('session');
    if (session == null || session.length < 64 ) return;

    //Check if chat is already open
    var bypass: boolean = false;
    this.chatList.forEach(chat => {
      if (chat.recipientID == profile.ID) {
        bypass = true;
        return;
      }
    });
    if (bypass) {
      if (callback) callback(null);
      return;
    }

    //Create new chat, set any necessary flags
    var chat: Chat = {recipientID:profile.ID || -1, sender: this.userinfo, messages:[], recipient:profile};
    if (msgRequest) chat.msgRequest = true;
    this.chatList.push(chat);

    //Request message history from server
    this.userdataService.getMessageHistory(session,profile.ID || -1).subscribe( data => {
      data.forEach(msg => {
        this.chatList[this.chatList.length - 1].messages.push({body:msg.body,author:msg.senderID == this.userinfo.ID ? this.userinfo : profile,date:new Date(Math.trunc(msg.date)).toLocaleString()});
      });

      if (callback) callback(chat);
    });
  }

  connectMsg(disconnect:boolean = false) {
    var session;
    if (!disconnect) {
      session = HelperFunctionsService.getCookie('session');
      if (session == null || session.length < 64 ) return;
    }

    var request: MessageSend = {body:'',recipientID:-1,date:0,session,handshake: (disconnect ? 'disconnect' : 'handshake')};
    this.messagingService.messages.next(request);
  }

  sendMsg() {
    var session = HelperFunctionsService.getCookie('session');
    if (session == null || session.length < 64 ) return;
    if (!this.currentChat || !this.currentChat.recipientID) return;
    if (this.chatMsgField.length > 350 || !this.chatMsgField.trim()) return;

    //Check whether autoscroll is required on each chat
    var scrollChat: boolean[] = new Array<boolean>(this.chatDiv.length);
    this.chatDiv.forEach( (item, index, arr) => {
      scrollChat[index] = item.nativeElement.scrollTop + item.nativeElement.clientHeight == item.nativeElement.scrollHeight;
    });

    //If message request, add friend
    if (this.currentChat.msgRequest) {
      this.rootComponent.changeFriendStatus(this.currentChat.recipient,true);
      this.currentChat.msgRequest = false;
    }

    //Create 2 versions of message: a local one with all of the info, and a smaller, more secure sendable version.
    //An identical local message will be generated on receiver's computer.
    var timestamp = Date.now();
    var msg: MessageSend = {body:this.chatMsgField,session,recipientID:this.currentChat.recipientID,date: timestamp};
    var localmsg: Message = {body:this.chatMsgField,author:this.userinfo,date: timestamp};

    //Convert local date to readable format
    localmsg.date = new Date(timestamp).toLocaleString();

    //Send and store messages
    this.currentChat.messages.push(localmsg);
    this.messagingService.messages.next(msg);

    //Apply autoscroll if needed
    this.scrollDivs(scrollChat);

    //Clear form
    this.chatMsgField = "";
  }

  onTabChange(event: any) {
    if (event.index != 0) {
      this.currentChat = this.chatList[event.index - 1];
    }

    this.scrollDivs();
  }

  updateChatInfo() {
    this.chatList.forEach(chat => {
      const temp = this.rootComponent.friendList.find((value) => {
        return value.ID == chat.recipientID;
      });
      if (temp != undefined) chat.recipient = temp;
    });
  }

  scrollDivs(scrollAllowList?: boolean[]) {
    this.chatDiv.forEach( (item, index, arr) => {
      if ( ( scrollAllowList && scrollAllowList[index] ) || !scrollAllowList) setTimeout( () => {item.nativeElement.scrollTop = item.nativeElement.scrollHeight}, 10);
    });
  }
}