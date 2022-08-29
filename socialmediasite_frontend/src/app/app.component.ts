import { Component, QueryList, ViewChildren } from '@angular/core';

import { FriendsComponent } from './friends/friends.component';
import { ProfileComponent } from "./profile/profile.component";

import { UserdataService } from './services/userdata.service';
import { MessagingService } from "./services/messaging.service";
import { HelperFunctionsService } from "./services/helper-functions.service";

import { UserInfo } from './interfaces/userinfo';
import { Post } from './interfaces/post';

//Enables extra debug messages
export const VERBOSE_DEBUG = true;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent {
  //UserData
  userinfo: UserInfo = {session:''};
  friendList: UserInfo[] = [];
  friendRequestList: UserInfo[] = [];

  //Profiles/Comments
  selectedPost: Post = {authorID:-1};

  //Main Body/Feed
  bodyHTML: string = '';
  postList: Post[] = [];
  publicFeed: boolean = true;

  //Search
  search: string = '';
  results: UserInfo[] = [];
  lastSearchCharacterInput: number = Number.NaN;
  searchInterval;
  
  @ViewChildren('backgroundDiv') backgroundDiv!: QueryList<any>;
  @ViewChildren(FriendsComponent) friendsComponent!: QueryList<FriendsComponent>;
  @ViewChildren(ProfileComponent) profileComponent!: QueryList<ProfileComponent>;

  constructor(private userdataService: UserdataService, private messagingService: MessagingService) {
    const session = HelperFunctionsService.getCookie('session');

    //Setup search input checking
    this.searchInterval = setInterval(() => {
      if (this.lastSearchCharacterInput + 250 < Date.now() && this.search != '') {
        this.userdataService.findUsers(this.search.toLowerCase()).subscribe(data => {
          this.results = data;
        });
        this.lastSearchCharacterInput = Number.NaN;
      }
    },125);

    this.setMain('feed',() => {
      if (session != null && session.length >= 64) this.friendsComponent.first.connectMsg();
    },false);
  }

  async ngOnDestroy() {
    this.messagingService.disconnect();
  }

  //Gets userinfo, updates friends list
  updateUI(callback?: Function) {
    const session = HelperFunctionsService.getCookie('session');
    if (session == null || session.length < 64 ) {
      //Clear user data if session was deleted/expired
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
      
      //Update friend list and friend request list
      var promises: Promise<void>[] = [];

      var newFriendList : UserInfo[] = [];
      //Gather public info for all friends
      data.friends?.forEach((value) => {
        promises.push(new Promise<void>((resolve,reject) => {
          this.userdataService.getPublicUserInfo(value).subscribe(data => {
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
            
            newFriendList.push(data);
            resolve();
          });
        }));
      });

      var newFriendRequestList : UserInfo[] = [];
      //Gather public info for all friend requests
      data.friendRequests?.forEach((value) => {
        promises.push(new Promise<void>((resolve,reject) => {
          this.userdataService.getPublicUserInfo(value).subscribe(data => {
            if (data.error) {
              console.log('Error for friend request with user ID ' + value + ': ' + data.error);
              reject();
              return;
            }
            
            newFriendRequestList.push(data);
            resolve();
          });
        }));
      });
      
      //When all friend list data is received and updated
      Promise.allSettled(promises).then(() => {
        //Sort reconstructed friend list alphabetically
        newFriendList.sort((a:UserInfo,b:UserInfo) => {
          if (!a.firstName) return -1;
          else if (!b.firstName) return 1;
  
          return (a.firstName.toLowerCase() < b.firstName.toLowerCase()) ? -1 : (a.firstName.toLowerCase() > b.firstName.toLowerCase()) ? 1 : 0;  
        });

        //Update lists
        this.friendList = newFriendList;
        this.friendRequestList = newFriendRequestList;

        //Update chat info
        if (this.friendsComponent.first) this.friendsComponent.first.updateChatInfo();

        if (callback) callback();
      });
    });
  }

  setMain(text: string, callback?: Function, animate: boolean = true, publicPosts: boolean = false) {
    this.bodyHTML = text;
    this.updateUI(() => {
      switch (text) {
        case 'feed':
          const session = HelperFunctionsService.getCookie('session');
          this.publicFeed = publicPosts;
          //Not logged in - show popular new public posts
          if (session == null || session.length < 64) {
            this.userdataService.getPublicPosts(-1).subscribe( data => {
              this.postList = data;
            });
          }
          //Logged in - show friend or public posts
          else {
            if (this.userinfo.friends != undefined && this.userinfo.ID != undefined) {
              if (publicPosts) {
                this.userdataService.getPublicPosts(this.userinfo.ID).subscribe(data => {
                  this.postList = data;
                });
              }
              else {
                this.userdataService.getFriendPosts(this.userinfo.ID).subscribe(data => {
                  this.postList = data;
                });
              }
            }
          }
          if (animate) this.animateBackground(45.75);
          break;
        case 'post':
          if (animate) this.animateBackground(45);
          break;
        case 'profile':
          if (animate) this.animateBackground(64.5);
          break;
        case 'ownprofile':
          if (animate) this.animateBackground(45);
          break;
        case 'login':
          if (animate) this.animateBackground(16.15);
          break;
        case 'register':
          if (animate) this.animateBackground(17.85);
          break;
        case 'comments':
          if (animate) this.animateBackground(62.125);
          break;
        case 'about':
          if (animate) this.animateBackground(18);
          break;
      }

      if (callback) callback();
    });
  }

  logoff() {
    HelperFunctionsService.deleteCookie('session');
    if (this.friendsComponent.first) {
      this.friendsComponent.first.connectMsg(true);
      this.friendsComponent.first.chatList = [];
    }

    this.updateUI();
    this.setMain('feed');
  }

  changeFriendStatus(profile: UserInfo, friend: boolean, callback?: Function) {
    const session = HelperFunctionsService.getCookie('session');
    if (session == null || session.length < 64 ) {
      if (callback) callback();
      return;
    }

    this.userdataService.changeFriendStatus(session,profile.ID || -1,friend).subscribe(data => {
      if (data.success) {
        this.updateUI();
        if (!friend) {
          //If unfriend, close chat tab if open
          const tabIndex = this.friendsComponent.first.chatList.findIndex( (value) => {
            return value.recipientID == profile.ID;
          });
          if (tabIndex != -1) this.friendsComponent.first.chatList.splice(tabIndex,1);
        }

        if (VERBOSE_DEBUG) console.log('Friend removed.');
      }
      else {
        if (VERBOSE_DEBUG) console.log('Error, removing friend failed.');
      }

      if (callback) callback();
    });
  }

  ignoreFriendRequest(profile: UserInfo) {
    const session = HelperFunctionsService.getCookie('session');
    if (session == null || session.length < 64 ) return;

    this.userdataService.ignoreFriendRequest(session ,profile.ID || -1).subscribe( data => {
      if (data.success) {
        this.updateUI();
      }
    });
  }

  changeBlockStatus(profile: UserInfo, block: boolean) {
    const session = HelperFunctionsService.getCookie('session');
    if (session == null || session.length < 64 ) return;

    //Block
    if (block) {
      //Remove friend
      this.changeFriendStatus(profile,false, () => {
        //Add to block list
        this.userdataService.changeBlockStatus(session,profile.ID || -1,true).subscribe(data => {
          if (data.success) {
            this.updateUI();

            if (VERBOSE_DEBUG) console.log('Friend blocked.');
          }
          else {
            if (VERBOSE_DEBUG) console.log('Error, blocking friend failed.');
          }
        });
      });
    }
    //Unblock
    else {
      this.userdataService.changeBlockStatus(session,profile.ID || -1,false).subscribe(data => {
        if (data.success) {
          this.updateUI();
        }
      });
    }
  }

  selectProfile(profile?: UserInfo) {
    var tempProfile: UserInfo;
    //If profile not provided, search results array, assume search bar used
    if (!profile) {
      tempProfile = this.results.find((res) => {
        return res.username == this.search;
      }) || {session:''};
      
      //Clear search bar and results
      this.search = '';
      this.results = [];
    }
    else {
      tempProfile = profile;
    }

    this.setMain('profile',() => {
      this.profileComponent.first.getProfile(tempProfile);
    });
  }

  searchUpdate() {
    this.lastSearchCharacterInput = Date.now();
  }

  animateBackground(size: number = 40) { //size in em
    const session = HelperFunctionsService.getCookie('session');
    if (size < 40 && (session != null && session.length >= 64) ) size = 40; //minimum size is 40em (for chat window and navigation when logged in)

    this.backgroundDiv.forEach((item) => {
      item.nativeElement.style = `max-height: ${size}em; height: ${1000}em;`;
    });
  }
}