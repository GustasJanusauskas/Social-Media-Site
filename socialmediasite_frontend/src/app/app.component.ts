import { Component, QueryList, Directive, ViewChildren } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';

import { CommentsComponent } from "./comments/comments.component";

import { UserdataService } from './services/userdata.service';
import { MessagingService } from "./services/messaging.service";
import { HelperFunctionsService } from "./services/helper-functions.service";

import { UserInfo } from './interfaces/userinfo';
import { Post } from './interfaces/post';
import { Chat } from './interfaces/chat';
import { Message, MessageSend } from './interfaces/message';

//Enables extra debug messages
export const VERBOSE_DEBUG = true;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent {
  emailRegex : RegExp = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  title = 'socialmediasite';

  // Login/Register
  email: string = '';
  username: string = '';
  password: string = '';
  formError : string = '';

  //UserData
  loggedInAs: string = 'Not logged in';
  userinfo: UserInfo = {session:''};
  friendList: UserInfo[] = [];
  profileDescCharLeft : number = 1024;
  profilePic: File = File.prototype;
  updateProfileEnabled: boolean = true;

  //Add Post
  postTitle: string = '';
  postBody: string = '';
  postCharLeft : number = 4096;

  //Main Body
  bodyHTML: string = '';
  postList: Post[] = [];

  //Search
  search: string = '';
  results: UserInfo[] = [];
  lastSearchCharacterInput: number = Number.NaN;
  searchInterval;

  //Profiles
  selectedProfile!: UserInfo;
  pageEvent: PageEvent = {pageIndex:0,pageSize:1,length:1};

  //Private messages
  chatList: Chat[] = [];
  currentChat?: Chat;
  chatMsgField: string = "";

  //Comments
  selectedPost: Post = {authorID:-1};

  //Imported helper functions
  noJsonSymbols = HelperFunctionsService.noJsonSymbols;
  lettersOnly = HelperFunctionsService.lettersOnly;
  toTitleCase = HelperFunctionsService.toTitleCase;
  createFakeArray = HelperFunctionsService.createFakeArray;
  
  @ViewChildren('chatDiv') chatDiv!: QueryList<any>;
  @ViewChildren('backgroundDiv') backgroundDiv!: QueryList<any>;

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
          localMessage.author = this.friendList.find( (val) => {return val.ID == (chat!.recipientID);}) || {session:'',firstName:'Author not found.',username:'noauthor'};
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

    //Setup search input checking
    this.searchInterval = setInterval(() => {
      if (this.lastSearchCharacterInput + 250 < Date.now() && this.search != '') {
        this.userdataService.findUsers(this.search.toLowerCase()).subscribe(data => {
          this.results = data;
        });
        this.lastSearchCharacterInput = Number.NaN;
      }
    },125);

    //Connect messaging websock
    this.setMain('feed',() => {
      this.connectMsg();
    },false);
  }

  async ngOnDestroy() {
    this.messagingService.disconnect();
  }

  //Gets userinfo, updates friends list, 'logged in as' labels
  updateUI(callback?: Function) {
    var session = HelperFunctionsService.getCookie('session');
    if (session == null || session.length < 64 ) {
      //Clear user data if session was deleted/expired
      this.loggedInAs= 'Not logged in';
      this.userinfo = {session:''};
      this.friendList = [];

      if (callback) callback();
      return;
    }

    this.userdataService.getUserInfo(session).subscribe(data => {
      if (!data.success) {
        console.log(data.error);
        return;
      }

      //Update userinfo, displayed data
      this.userinfo = data;
      this.loggedInAs = '' + data.username;
      
      //Update friends list
      var promises: Promise<void>[] = [];
      this.friendList = [];
      data.friends?.forEach((value) => {
        promises.push(new Promise<void>((resolve,reject) => {
          this.userdataService.getPublicUserInfo(value).subscribe(data => { console.log(promises);
            if (data.error) {
              console.log('Error for friend with user ID ' + value + ': ' + data.error);
              reject();
              return;
            }
            //Don't add self to friends list.
            if (data.ID == this.userinfo.ID) {
              reject();
              return;
            }
            
            this.friendList.push(data);
            resolve();
          });
        }));
      });

      //When all friend list data is received and updated
      Promise.allSettled(promises).then(() => {
        //Sort friend list alphabetically
        this.friendList.sort((a:UserInfo,b:UserInfo) => {
          if (!a.firstName) return -1;
          else if (!b.firstName) return 1;
  
          return (a.firstName.toLowerCase() < b.firstName.toLowerCase()) ? -1 : (a.firstName.toLowerCase() > b.firstName.toLowerCase()) ? 1 : 0;  
        });

        //Update chat info
        this.updateChatInfo();

        if (callback) callback();
      });
    });
  }

  updateProfile(event: Event) {
    if (!this.userinfo.firstName || !this.userinfo.lastName || this.userinfo.firstName?.trim().length == 0 || this.userinfo.lastName?.trim().length == 0) {
      this.formError = 'Profile must have both a first and last name set.';
      return;
    }

    if (this.profilePic != File.prototype && this.profilePic.size > 8.192 * 1000 * 1000) {
      this.formError = 'Profile picture size must be under 8 megabytes.';
      return;
    }

    var session = HelperFunctionsService.getCookie('session');
    if (session == null || session.length < 64 ) {
      this.formError = 'Must be logged in to update profile.';
      return;
    }

    this.formError = 'Updating profile..';
    this.userdataService.updateProfile(session,this.userinfo).subscribe(data => {
      if (data.success) {
        this.formError = 'Profile updated!';
      }
      else {
        this.formError = 'Failed to update profile, please try again later.';
      }
    });
  }

  addPost(event: Event) {
    if (this.postTitle.trim().length == 0 || this.postBody.trim().length == 0) {
      this.formError = 'Post must have a title and body.';
      return;
    }
    if (this.postTitle.length > 256) {
      this.formError = 'Post title too long must be under 256 characters.';
      return;
    }
    if (this.postBody.length > 4096) {
      this.formError = 'Post too long, must be under 4096 characters.';
      return;
    }

    var session = HelperFunctionsService.getCookie('session');
    if (session == null || session.length < 64 ) {
      this.formError = 'Must be logged in to make a post.';
      return;
    }

    this.formError = 'Posting..';
    this.userdataService.addPost(session,this.postTitle,this.postBody).subscribe(data => {
      if (data.success) {
        this.postTitle = '';
        this.postBody = '';
        this.formError = 'Post added to wall!';
      }
      else {
        this.formError = 'Failed to add post, please try again later.';
      }
    });
  }

  setMain(text: string, callback?: Function, animate: boolean = true) {
    this.formError = '';
    this.bodyHTML = text;
    this.updateUI(() => {
      switch (text) {
        case 'feed':
          var session = HelperFunctionsService.getCookie('session');
          //Not logged in - show new public posts (-1 gets all new posts)
          if (session == null || session.length < 64 ) {
            this.userdataService.getUserPosts(-1).subscribe( data => {
              this.postList = data;
            });
          }
          //Logged in - show friend posts
          else {
            if (this.userinfo.friends != undefined && this.userinfo.ID != undefined) {
              this.userdataService.getFriendPosts(this.userinfo.ID).subscribe(data => {
                this.postList = data;
              });
            }
          }
          if (animate) this.animateBackground(45.75);
          break;
        case 'post':
          if (animate) this.animateBackground(35.5);
          break;
        case 'profile':
          if (animate) this.animateBackground(61.25);
          break;
        case 'ownprofile':
          if (animate) this.animateBackground(45);
          break;
        case 'settings':
          if (animate) this.animateBackground(30);
          break;
        case 'login':
          if (animate) this.animateBackground(16.15);
          break;
        case 'register':
          if (animate) this.animateBackground(17.85);
          break;
      }

      if (callback) callback();
    });
  }

  login(event: Event) {
    //Verify data
    if (this.username.length < 4 || this.username.length > 128) {
      this.formError = 'Username must be between 4 and 128 characters long.';
      return;
    }
    if (this.password.length < 12 || this.password.length > 128) {
      this.formError = 'Password must be between 12 and 128 characters long.';
      return;
    }

    this.formError = 'Logging in..';
    //Send data to backend
    this.userdataService.loginUser(this.username,this.password).subscribe(data => {
      if (data.success) {
        //Set session string, update UI
        this.formError = 'Logged in succesfully.';
        HelperFunctionsService.setCookie('session','' + data.session,30);

        //Clear login form
        this.username = '';
        this.password = '';

        //Path to feed
        this.setMain('feed', () => {
          //Connect messaging websock
          this.connectMsg();
        });
      }
      else {
        this.formError = '' + data.session;
      }
    });
  }

  logoff(event: Event) {
    HelperFunctionsService.deleteCookie('session');
    this.connectMsg(true);

    this.updateUI();
    this.setMain('feed');

    //Clear previous user's data
    this.chatList = [];
    this.chatMsgField = '';
    this.currentChat = undefined;
    this.selectedProfile = {session:''};
    this.postTitle = '';
    this.postBody = '';
  }

  register(event: Event) {
    //Verify data
    if (!this.emailRegex.test(this.email)) {
      this.formError = 'Your email is invalid.';
      return;
    }
    if (this.username.length < 4 || this.username.length > 128) {
      this.formError = 'Username must be between 4 and 128 characters long.';
      return;
    }
    if (this.password.length < 12 || this.password.length > 128) {
      this.formError = 'Password must be between 12 and 128 characters long.';
      return;
    }

    this.formError = 'Registering user...';
    //Send data to backend
    this.userdataService.registerUser(this.username,this.password,this.email).subscribe(data => {
      if (data.success) {
        this.email = '';
        this.formError = 'User registered! You can now log in.';
      }
      else {
        this.formError = '' + data.session;
      }
    });
  }

  changeFriendStatus(profile: UserInfo, friend: boolean) {
    var session = HelperFunctionsService.getCookie('session');
    if (session == null || session.length < 64 ) return;

    this.userdataService.changeFriendStatus(session,profile.ID || -1,friend).subscribe(data => {
      if (data.success) {
        this.updateUI();

        if (VERBOSE_DEBUG) console.log('Friend removed.');
      }
      else {
        if (VERBOSE_DEBUG) console.log('Error, removing friend failed.');
      }
    });
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
      if (session ==null || session.length < 64 ) return;
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
      this.changeFriendStatus(this.currentChat.recipient,true);
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

  selectProfile(event: Event, profile: UserInfo = {session:''}) {
    var tempProfile: UserInfo;
    //If profile not provided, search results array, assume search bar used
    if (!profile.ID) {
      tempProfile = this.results.find((res) => {
        return res.username == this.search;
      }) || {session:''};
    }
    else {
      tempProfile = profile;
    }

    //Get user's posts
    if (tempProfile.ID) {
      this.userdataService.getUserPosts(tempProfile.ID).subscribe( data => {
        this.postList = data;
        this.selectedProfile = tempProfile;
        this.setMain('profile');
      });
    }
    //Update paginator
    this.pageEvent.pageIndex = 0;
    this.pageEvent.length = this.postList.length;
  }

  scrollDivs(scrollAllowList?: boolean[]) {
    this.chatDiv.forEach( (item, index, arr) => {
      if ( ( scrollAllowList && scrollAllowList[index] ) || !scrollAllowList) setTimeout( () => {item.nativeElement.scrollTop = item.nativeElement.scrollHeight}, 10);
    });
  }

  searchUpdate(event: Event) {
    this.lastSearchCharacterInput = Date.now();
  }

  onAvatarChange(event: Event) {
    const target = event.target as HTMLInputElement;

    if (target.files) {
      this.profilePic = target.files[0];
      this.updateProfileEnabled = false;

      const reader = new FileReader();
      reader.readAsDataURL(this.profilePic);
      reader.onload = () => {
        this.userinfo.avatar = reader.result?.toString().substring(reader.result?.toString().indexOf(',') + 1);
        this.userinfo.avatarPath = this.profilePic.name;

        this.updateProfileEnabled = true;
      }
    }
  }

  animateBackground(size: number = 40) { //size in em
    var session = HelperFunctionsService.getCookie('session');
    if (size < 40 && (session != null && session.length >= 64) ) size = 40; //minimum size is 40em (for chat window and navigation when logged in)

    this.backgroundDiv.forEach((item,index,arr) => {
      item.nativeElement.style = `max-height: ${size}em; height: ${1000}em;`;
    });
  }

  onTabChange(event: any) {
    if (event.index != 0) {
      this.currentChat = this.chatList[event.index - 1];
    }

    this.scrollDivs();
  }

  updateCharCounter(event: Event,counterID: string = 'post') {
    switch (counterID) {
      case 'post':
        this.postCharLeft = 4096 - this.postBody.length;
        break;
      case 'profile':
        if (this.userinfo.profileDesc) this.profileDescCharLeft = 1024 - this.userinfo.profileDesc?.length;
        break;
    }
  }

  updateChatInfo() {
    this.chatList.forEach(chat => {
      const temp = this.friendList.find((value) => {
        return value.ID == chat.recipientID;
      });
      if (temp != undefined) chat.recipient = temp;
    });
  }
}
