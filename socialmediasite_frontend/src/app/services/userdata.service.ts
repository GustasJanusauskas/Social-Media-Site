import { Injectable } from '@angular/core';
import { HttpClient, HttpHandler, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';

import {LoginResponse} from '../interfaces/loginresponse';
import {UserInfo} from '../interfaces/userinfo';
import {PostInfo} from '../interfaces/postinfo';
import { Post } from '../interfaces/post';
import { MessageSend } from "../interfaces/message";
import { Comment } from '../interfaces/comment';

const httpOptions = {
  headers: new HttpHeaders({
    'Content-Type':  'application/json'
  })
};

@Injectable({
  providedIn: 'root'
})
export class UserdataService {

  constructor(private http: HttpClient) {}

  findUsers(searchStr: string) {
    var data = {search:searchStr};
    return this.http.post<UserInfo[]>('/findusers',data,httpOptions);
  }

  getFriendPosts(userID: number, usePopularity: boolean = true): Observable<Post[]> {
    var data = {userID,usePopularity};
    return this.http.post<Post[]>('/friendposts',data,httpOptions);
  }

  getUserPosts(userID: number, usePopularity: boolean = true): Observable<Post[]> {
    var data = {userID,usePopularity};
    return this.http.post<Post[]>('/userposts',data,httpOptions);
  }

  getPublicPosts(userID: number, usePopularity: boolean = true): Observable<Post[]> {
    var data = {userID,usePopularity};
    return this.http.post<Post[]>('/publicposts',data,httpOptions);
  }

  getPublicUserInfo(userID: number): Observable<UserInfo> {
    var data = {ID:userID};
    return this.http.post<UserInfo>('/publicuserinfo',data,httpOptions);
  }

  getUserInfo(session: string): Observable<UserInfo> {
    var data = {session:session};
    return this.http.post<UserInfo>('/userinfo',data,httpOptions);
  }

  loginUser(user: string, pass: string): Observable<LoginResponse> {
    var data = {username: user, password: pass};
    return this.http.post<LoginResponse>('/login',data,httpOptions);
  }

  registerUser(user: string, pass: string, email: string): Observable<LoginResponse> {
    var data = {username: user, password: pass, email: email};
    return this.http.post<LoginResponse>('/register',data,httpOptions);
  }

  addPost(session: string, postTitle: string, postBody: string, postLinkedImages: string[] = []) {
    var data: PostInfo = {session:session,title:postTitle,body:postBody,postLinkedImages};
    return this.http.post<PostInfo>('/addpost',data,httpOptions);
  }

  removePost(session: string, postID: number) {
    var data = {session:session,postID: postID};
    return this.http.post<any>('/removepost',data,httpOptions);
  }

  getComments(postID: number) {
    var data = {postID};
    return this.http.post<Comment[]>('/getcomments',data,httpOptions);
  }

  addComment(session: string, postID: number, content: string) {
    var data = {session,postID,content};
    return this.http.post<any>('/addcomment',data,httpOptions);
  }

  updateProfile(session: string, userinfo: UserInfo) {
    var data: UserInfo = userinfo;
    data.session = session;

    return this.http.post<UserInfo>('/updateprofile',data,httpOptions);
  }

  uploadImage(session: string, image: string) {
    var data = {session,image};
    return this.http.post<any>('/uploadimage',data,httpOptions);
  }

  changeFriendStatus(session: string, userID: number, status: boolean) {
    var data = {session:session,friendID:userID,status:status};
    return this.http.post<any>('/changefriendstatus',data,httpOptions);
  }

  changeLikeStatus(session: string, postID: number, status: boolean) {
    var data = {session:session,postID:postID,status:status};
    return this.http.post<any>('/changelikestatus',data,httpOptions);
  }

  changeBlockStatus(session: string, userID: number, status: boolean) {
    var data = {session:session,friendID:userID,status:status};
    return this.http.post<any>('/changeblockstatus',data,httpOptions);
  }

  ignoreFriendRequest(session: string, userID: number) {
    var data = {session:session,friendID:userID};
    return this.http.post<any>('/ignorefriendrequest',data,httpOptions);
  }

  getMessageHistory(session: string, recipientID: number) {
    var data = {session,recipientID};
    return this.http.post<MessageSend[]>('/messagehistory',data,httpOptions);
  }
}