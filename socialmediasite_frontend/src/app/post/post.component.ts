import { Component, Injectable, Input, OnInit, ViewEncapsulation, ViewChildren, QueryList, ElementRef, SimpleChanges } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { interval } from 'rxjs';

import { HelperFunctionsService } from "../services/helper-functions.service";
import { UserdataService } from "../services/userdata.service";

import { Post } from '../interfaces/post';
import { UserInfo } from "../interfaces/userinfo";
import { AppComponent } from '../app.component';

@Component({
  selector: 'app-post',
  templateUrl: './post.component.html',
  styleUrls: ['./post.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class PostComponent implements OnInit {
  @Input() post!: Post;
  @Input() userinfo!: UserInfo;
  @Input() rootComponent!: AppComponent;

  @Input() commentsEnabled: boolean;
  @Input() profilePost: boolean;
  @Input() postClass: string;

  postContent?: SafeHtml = undefined;

  constructor(private userdataService: UserdataService, private domSanitizer: DomSanitizer) { 
    this.commentsEnabled = true;
    this.profilePost = false; //obsolete
    this.postClass = 'FeedPost';
  }

  ngOnChanges(changes: SimpleChanges) {
    this.post.body = this.parsePost(this.post.body || '');
    this.postContent = this.domSanitizer.bypassSecurityTrustHtml(this.post.body);
  }

  ngOnInit(): void {
    
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

  getPostProfile(profileID: number, callback?: Function) {
    this.userdataService.getPublicUserInfo(profileID).subscribe(data => {
      this.rootComponent.selectProfile(data);
      if (callback) callback(data);
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
      result += post.slice(lastInd,matches[x].index) + `<img class="PostImage" src="${temp}" onerror="this.src='assets/imageMissing.png'; this.onerror=null">`;
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
