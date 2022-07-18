import { Component, Input, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { UserdataService } from './userdata.service';

import {LoginResponse} from './loginresponse';
import {UserInfo} from './userinfo';
import {Post} from './post';

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
  friendList: string[] = [];
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

  selectedProfile: UserInfo = {session:''};

  constructor(private userdataService: UserdataService) {
    this.updateUI();
    this.searchInterval = setInterval(() => {
      if (this.lastSearchCharacterInput + 250 < Date.now() && this.search != '') {
        this.userdataService.findUsers(this.search.toLowerCase()).subscribe(data => {
          this.results = data;
        });
        this.lastSearchCharacterInput = Number.NaN;
      }
    },125);
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
          
          if ( (data.firstName == null || data.firstName?.length <= 0) && (data.lastName == null || data.lastName?.length <= 0) ) {
            this.friendList.push('' + data.username);
          }
          else {
            if (data.lastName == null) data.lastName = '';

            this.friendList.push(data.firstName + ' ' + data.lastName);
          }
        });
      });

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
    if (!this.userinfo.firstName || !this.userinfo.lastName || this.userinfo.firstName?.length <= 0 || this.userinfo.lastName?.length <= 0) {
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
    if (this.postTitle.length <= 0 || this.postBody.length <= 0) {
      this.formError = 'Post must have a title and body.';
      return;
    }
    if (this.postTitle.length > 256) {
      this.formError = 'Post title too long must be under 256 characters.';
      return;
    }
    if (this.postBody.length > 256) {
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
        this.formError = 'Post added to wall!';
      }
      else {
        this.formError = 'Failed to add post, please try again later.';
      }
    });
  }

  setMain(event: Event,text: string) {
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
        //Set session string, update UI, clear form
        this.formError = 'Logged in succesfully.';
        this.setCookie('session','' + data.session,30);
        this.updateUI();

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
    this.updateUI();
    this.setMain(event,'feed');
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
        this.formError = 'User registered! You can now log in.';
      }
      else {
        this.formError = '' + data.session;
      }
    });
  }

  selectProfile(event: Event) {
    this.selectedProfile = this.results.find((res) => {
      return res.username == this.search;
    }) || {session:''};
    this.setMain(event,'profile');
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

  setCookie(cname: string, cvalue: string, exdays: number) {
    const d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    let expires = "expires="+ d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/;SameSite=Strict;";
  }

  getCookie(name: string) {
    var nameEQ = name + "=";
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
