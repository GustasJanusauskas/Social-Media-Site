import { Component, Injectable, Input, OnInit } from '@angular/core';

import { HelperFunctionsService } from "../services/helper-functions.service";
import { UserdataService } from "../services/userdata.service";

import { Post } from '../interfaces/post';
import { UserInfo } from "../interfaces/userinfo";
import { AppComponent } from '../app.component';

@Component({
  selector: 'app-new-post',
  templateUrl: './new-post.component.html',
  styleUrls: ['./new-post.component.css']
})
export class NewPostComponent implements OnInit {
  postTitle: string = '';
  postBody: string = '';
  postCharLeft : number = 4096;
  formError: string = "";

  //Imported helper functions
  noJsonSymbols = HelperFunctionsService.noJsonSymbols;

  constructor(private userdataService: UserdataService) { 

  }

  ngOnInit(): void {

  }

  updateCharCounter() {
    this.postCharLeft = 4096 - this.postBody.length;
  }

  addPost() {
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
}