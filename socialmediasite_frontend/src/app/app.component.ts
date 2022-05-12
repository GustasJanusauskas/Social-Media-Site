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

  //Add Post
  postTitle: string = '';
  postBody: string = '';
  postCharLeft : number = 4096;

  //Main Body
  bodyHTML: string = '';
  postList: Post[] = [new Post('TestT',' Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec interdum gravida risus sed fringilla. Donec viverra, orci sed tempor accumsan, sapien diam placerat leo, in porttitor nunc quam ut magna. Donec dictum enim in nisl venenatis, vitae pretium eros volutpat. In tempus tristique ipsum nec egestas. Etiam imperdiet enim vitae mollis varius. Pellentesque finibus porttitor mi, sodales auctor leo. Aenean vulputate in dui sed vehicula. Maecenas nunc leo, dapibus feugiat suscipit non, vestibulum et sapien. Aenean malesuada nunc dolor, ac cursus odio mattis vitae. Suspendisse vitae tempor dui. Vivamus vestibulum, ex non maximus viverra, nisl ante luctus elit, in sagittis purus urna quis felis. In fringilla, nisl ac placerat condimentum, est diam pharetra libero, at gravida leo mauris id tellus. Quisque odio mauris, tincidunt eu eros vel, dignissim aliquam magna. Aenean finibus luctus nibh a aliquam. Quisque eu velit consequat, suscipit lorem eget, pretium ligula.\n\nNulla dapibus nec neque id efficitur. Nulla sodales, diam sed sollicitudin elementum, urna risus accumsan dui, vel lobortis sem lacus a tortor. Nullam sed eros a metus dapibus cursus id et nunc. Proin rhoncus nisl nec congue egestas. Aliquam lectus lacus, aliquam eget convallis at, faucibus at justo. Quisque posuere enim at sapien porta, lobortis ornare arcu malesuada. Integer mattis, dolor id porttitor dictum, odio orci accumsan velit, id mollis orci lacus quis massa. Fusce venenatis rhoncus finibus. Suspendisse porttitor consequat fermentum.\n\nCras rutrum sem quis justo tincidunt, sed pellentesque velit auctor. Aenean malesuada massa ligula, quis condimentum enim porta eu. Morbi luctus nulla dolor, non scelerisque odio consequat sit amet. Phasellus dapibus magna turpis, et facilisis dui ultrices eget. Nam tincidunt odio ultrices felis congue, cursus vestibulum urna aliquam. Donec tempus odio a est viverra gravida. Etiam sed augue id justo interdum ullamcorper. Fusce iaculis odio in justo maximus elementum. Etiam ac ante dui. Vestibulum molestie ornare dui, nec dignissim tellus pharetra vitae. Orci varius natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Duis iaculis fermentum tempus.','TestAuth',0)];

  constructor(private userdataService: UserdataService) {
    this.updateUI();
    this.getUserPosts(8,function () {});
  }

  //Gets userinfo, updates friends list, 'logged in as' labels
  updateUI() {
    var session = this.getCookie('session');
    if (!session || session.length < 64 ) {
      //Clear user data if session was deleted/expired
      this.loggedInAs= 'Not logged in';
      this.userinfo = {session:''};
      this.friendList = [];

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
          
          if ( (data.firstName == undefined || data.firstName?.length <= 0) && (data.lastName == undefined || data.lastName?.length <= 0) ) {
            this.friendList.push('' + data.username);
          }
          else {
            this.friendList.push(data.firstName + ' ' + data.lastName);
          }
        });
      });
    });
  }

  /*getOwnPosts() {
    var session = this.getCookie('session');
    if (!session || session.length < 64 ) {
      return;
    }
    this.getUserPosts(this.userinfo.ID,d => {
      d.
    });

  }*/

  getUserPosts(userID: number,callback: Function) { //TODO Finish
    this.userdataService.getUserPosts(userID).subscribe(data => {
      console.log('a');
      console.log(data);
      //callback(data);
      return data;
    });
    return null;
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
    if (!session || session.length < 64 ) {
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

  updateCharCounter(event: Event) {
    this.postCharLeft = 4096 - this.postBody.length;
  }

  setCookie(cname: string, cvalue: string, exdays: number) {
    const d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    let expires = "expires="+ d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/;SameSite=Strict";
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
      document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
  }
}
