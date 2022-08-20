import { Component, Injectable, Input, OnInit } from '@angular/core';

import { HelperFunctionsService } from "../services/helper-functions.service";
import { UserdataService } from "../services/userdata.service";

import { Post } from '../interfaces/post';
import { UserInfo } from "../interfaces/userinfo";
import { AppComponent } from '../app.component';

@Component({
  selector: 'app-post',
  templateUrl: './post.component.html',
  styleUrls: ['./post.component.css']
})
export class PostComponent implements OnInit {
  @Input() post!: Post;
  @Input() userinfo!: UserInfo;
  @Input() rootComponent!: AppComponent;

  @Input() commentsEnabled: boolean;
  @Input() profilePost: boolean;
  @Input() postClass: string;

  constructor(private userdataService: UserdataService) { 
    this.commentsEnabled = true;
    this.profilePost = false;
    this.postClass = 'FeedPost';
  }

  ngOnInit(): void {
    this.post.body = this.parsePost(this.post.body || '');
  }

  removePost(postID: number, showProfile: boolean = false) {
    var session = HelperFunctionsService.getCookie('session');
    if (session == null || session.length < 64 ) return;

    this.userdataService.removePost(session,postID).subscribe(data => {
      if (data.success) {
        if (showProfile) this.rootComponent.selectProfile(this.userinfo);
        else this.rootComponent.setMain('feed');
      }
    });
  }

  selectPost(post: Post) {
    this.rootComponent.selectedPost = post;
    this.rootComponent.setMain('comments');
  }

  parsePost(post: string) {
    var result = '';
    var matches = Array.from(post.matchAll(/\[img\].*?\[\/img\]/g));
    if (matches.length == 0) return post;

    var lastInd = 0;
    var temp: string;
    for (let x = 0; x < matches.length; x++) {
      temp = matches[x][0].replace('[img]','').replace('[/img]','');
      result += post.slice(lastInd,matches[x].index) + `<img class='PostImage' src='${temp}'>`;
      lastInd = matches[x].index! + matches[x][0].length;
    }

    return result;
  }

  likePost(post:Post,status:boolean) {
    var session = HelperFunctionsService.getCookie('session');
    if (session == null || session.length < 64 ) return;
    if (!post || !post.postID) return;

    this.userdataService.changeLikeStatus(session,post.postID,status).subscribe(data => {
      if (data.success) {
        if (!this.userinfo.ID) return;

        status ? post.likes!++ : post.likes!--;
        post.userLiked = status;
      }
    });
  }
}
