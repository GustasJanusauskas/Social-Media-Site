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
  @Input() selectedProfile!: UserInfo;
  @Input() userinfo!: UserInfo;
  @Input() rootComponent!: AppComponent;

  postList: Post[] = [];
  pageEvent: PageEvent = {pageIndex:0,pageSize:1,length:1};

  //Imported helper functions
  toTitleCase = HelperFunctionsService.toTitleCase;
  createFakeArray = HelperFunctionsService.createFakeArray;

  constructor(private userdataService: UserdataService) {

  }

  ngOnInit(): void {
    this.getProfile(this.selectedProfile);
  }

  getProfile(profile: UserInfo) {
    //Get user's posts
    if (profile.ID) {
      this.userdataService.getUserPosts(profile.ID).subscribe( data => {
        this.postList = data;
        this.selectedProfile = profile;
      });
    }
    //Update paginator
    this.pageEvent.pageIndex = 0;
    this.pageEvent.length = this.postList.length;
  }
}