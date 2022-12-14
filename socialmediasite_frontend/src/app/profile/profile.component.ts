import { Component, OnInit, Input } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';

import { AppComponent } from '../app.component';

import { HelperFunctionsService } from "../services/helper-functions.service";
import { UserdataService } from "../services/userdata.service";

import { UserInfo } from '../interfaces/userinfo';
import { Post } from "../interfaces/post";

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  @Input() userinfo!: UserInfo;
  @Input() rootComponent!: AppComponent;

  selectedProfile: UserInfo = {session:''};
  postList: Post[] = [];
  pageEvent: PageEvent = {pageIndex:0,pageSize:1,length:1};

  //Imported helper functions
  toTitleCase = HelperFunctionsService.toTitleCase;
  createFakeArray = HelperFunctionsService.createFakeArray;

  constructor(private userdataService: UserdataService) {

  }

  ngOnInit(): void {
    
  }

  getProfile(profile: UserInfo) {
    //Update profile description to included <br>
    profile.profileDesc = profile.profileDesc?.replace(/\n/g,"<br>");

    //Get user's posts, order chronologically
    if (profile.ID) {
      this.userdataService.getUserPosts(profile.ID,false).subscribe( data => {
        this.postList = data;
        this.selectedProfile = profile;
      });
    }
    //Update paginator
    this.pageEvent.pageIndex = 0;
    this.pageEvent.length = this.postList.length;
  }
}