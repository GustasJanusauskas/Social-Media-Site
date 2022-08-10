import { Component, QueryList, Directive, ViewChildren } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';

import { UserdataService } from './services/userdata.service';
import { MessagingService } from "./services/messaging.service";

import { UserInfo } from './interfaces/userinfo';
import { Post } from './interfaces/post';
import { Chat } from './interfaces/chat';
import { Message, MessageSend } from './interfaces/message';
import { serializeNodes } from '@angular/compiler/src/i18n/digest';

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

      //Apply autoscroll on each chat if needed
      this.scrollDivs(scrollChat);

      if (VERBOSE_DEBUG) console.log("Response from websocket: " + msg);
    });

    //Connect messaging websock
    this.updateUI(() => {
      this.connectMsg();
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

    this.setMain('feed');
  }

  async ngOnDestroy() {
    this.messagingService.disconnect();
  }

  //Gets userinfo, updates friends list, 'logged in as' labels
  updateUI(callback?: Function) {
    var session = this.getCookie('session');
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
      this.friendList = [];
      data.friends?.forEach((value) => {
        this.userdataService.getPublicUserInfo(value).subscribe(data => {
          if (data.error) {
            console.log('Error for friend with user ID ' + value + ': ' + data.error);
            return;
          }
          //Don't add self to friends list.
          if (data.ID == this.userinfo.ID) return;
          
          this.friendList.push(data);
        });
      });

      //Sort alphabetically (doesn't work)
      /*
      this.friendList.sort((a,b) => {
        if (!a.firstName) return -1;
        else if (!b.firstName) return 1;

        return (a.firstName.toLowerCase() < b.firstName.toLowerCase()) ? -1 : (a.firstName.toLowerCase() > b.firstName.toLowerCase()) ? 1 : 0;
      });
      */

      if (callback) callback();
    });
  }

  getFriendPosts(userID: number,callback: Function) {
    this.userdataService.getFriendPosts(userID).subscribe(data => {
      callback(data);
      return data;
    });
    return null;
  }

  getUserPosts(userID: number,callback: Function) {
    this.userdataService.getUserPosts(userID).subscribe(data => {
      callback(data);
      return data;
    });
    return null;
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

    var session = this.getCookie('session');
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

    var session = this.getCookie('session');
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

  removePost(event: Event,postID: number, showProfile: boolean = false) {
    var session = this.getCookie('session');
    if (session == null || session.length < 64 ) return;

    this.userdataService.removePost(session,postID).subscribe(data => {
      if (data.success) {
        if (showProfile) this.selectProfile(event,this.userinfo);
        else this.setMain('feed');
      }
    });
  }

  setMain(text: string) {
    this.formError = '';
    this.bodyHTML = text;
    this.updateUI(() => {
      switch (text) {
        case 'feed':
          var session = this.getCookie('session');
          //Not logged in - show new public posts (-1 gets all new posts)
          if (session == null || session.length < 64 ) {
            this.getUserPosts(-1,(data:Post[]) => {
              this.postList = data;
            });
          }
          //Logged in - show friend posts
          else {
            if (this.userinfo.friends != undefined && this.userinfo.ID != undefined) {
              this.getFriendPosts(this.userinfo.ID,(data:Post[]) => {
                this.postList = data;
              });
            }
          }
          break;
      }
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
        this.setCookie('session','' + data.session,30);
        this.updateUI(() => {
          //Connect messaging websock
          this.connectMsg();
        });

        //Make background larger for expanded navigation/chat
        this.animateBackground(40);

        //Clear login form
        this.username = '';
        this.password = '';
      }
      else {
        this.formError = '' + data.session;
      }
    });
  }

  logoff(event: Event) {
    this.deleteCookie('session');
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

  changeFriendStatus(event: Event, profile: UserInfo, friend: boolean) {
    var session = this.getCookie('session');
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

  openChat(event: Event, profile: UserInfo) {
    var session = this.getCookie('session');
    if (session == null || session.length < 64 ) return;

    //If chat isn't already open, add new tab
    var bypass: boolean = false;
    this.chatList.forEach(chat => {
      if (chat.recipientID == profile.ID) {
        bypass = true;
        return;
      }
    });
    if (!bypass) this.chatList.push({recipientID:profile.ID || -1, sender: this.userinfo, messages:[]});

    //Request message history from server
    this.userdataService.getMessageHistory(session,profile.ID || -1).subscribe( data => {
      data.forEach(msg => {
        this.chatList[this.chatList.length - 1].messages.push({body:msg.body,author:msg.senderID == this.userinfo.ID ? this.userinfo : profile,date:new Date(Math.trunc(msg.date)).toLocaleString()});
      });
    });
  }

  connectMsg(disconnect:boolean = false) {
    var session;
    if (!disconnect) {
      session = this.getCookie('session');
      if (session ==null || session.length < 64 ) return;
    }

    var request: MessageSend = {body:'',recipientID:-1,date:0,session,handshake: (disconnect ? 'disconnect' : 'handshake')};
    this.messagingService.messages.next(request);
  }

  sendMsg() {
    var session = this.getCookie('session');
    if (session == null || session.length < 64 ) return;
    if (!this.currentChat || !this.currentChat.recipientID) return;
    if (this.chatMsgField.length > 350 || !this.chatMsgField) return;

    //Check whether autoscroll is required on each chat
    var scrollChat: boolean[] = new Array<boolean>(this.chatDiv.length);
    this.chatDiv.forEach( (item, index, arr) => {
      scrollChat[index] = item.nativeElement.scrollTop + item.nativeElement.clientHeight == item.nativeElement.scrollHeight;
    });

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
      this.getUserPosts(tempProfile.ID,(data:Post[]) => {
        this.postList = data;
        this.selectedProfile = tempProfile;
        this.setMain('profile');
      });
    }
  }

  scrollDivs(scrollAllowList?: boolean[]) {
    this.chatDiv.forEach( (item, index, arr) => {
      if ( ( scrollAllowList && scrollAllowList[index] ) || !scrollAllowList) setTimeout( () => {item.nativeElement.scrollTop = item.nativeElement.scrollHeight}, 10);
    });
  }

  convertPostDates(posts:Post[]) {
    posts.forEach(post => {
      post.date = '';
    });
  }

  lettersOnly(event: KeyboardEvent, extended: boolean = false) {
    if (extended) return `abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ,.;"'()`.includes(event.key);
    return 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.includes(event.key);
  }

  noJsonSymbols(event: KeyboardEvent) {
    return !`"{}`.includes(event.key);
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
    if (this.userinfo.session != '' && size < 40) size = 40; //minimum size is 40em (for chat window and navigation when logged in)

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

  getLocalFriendFromID(chat: Chat) {
    return this.friendList.find( (val) => {return val.ID == (chat.recipientID);}) || {session:''};
  }

  createFakeArray(l:number) {
    var res = new Array(l);
    for (let x = 0; x < l; x++) {
      res[x] = x;
    }
    return res;
  }

  toTitleCase(str: String) {
    return str.replace(
      /\w\S*/g,
      function(txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
      }
    );
  }

  setCookie(cname: string, cvalue: string, exdays: number) {
    const d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    let expires = 'expires='+ d.toUTCString();
    document.cookie = cname + '=' + cvalue + ';' + expires + ';path=/;SameSite=Strict;';
  }

  getCookie(name: string) {
    var nameEQ = name + '=';
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
  }

  deleteCookie( name: string ) {
      document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT;SameSite=Strict;';
  }

}
