import { Component, OnInit, Input } from '@angular/core';

import { AppComponent } from '../app.component';
import { FriendsComponent } from '../friends/friends.component';

import { UserdataService } from '../services/userdata.service';
import { HelperFunctionsService } from "../services/helper-functions.service";

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  username: string = '';
  password: string = '';
  formError : string = '';

  @Input() rootComponent!: AppComponent;
  @Input() friendsComponent!: FriendsComponent;

  constructor(private userdataService: UserdataService) {

   }

  ngOnInit(): void {

  }

  login() {
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
        HelperFunctionsService.setCookie('session','' + data.session,-1);

        //Clear login form
        this.username = '';
        this.password = '';

        //Path to feed
        this.rootComponent.setMain('feed', () => {
          //Connect messaging websock
          this.friendsComponent.connectMsg();
        });
      }
      else {
        this.formError = '' + data.session;
      }
    });
  }
}