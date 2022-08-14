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
    var data: UserInfo = {session:'',search:searchStr};
    return this.http.put<UserInfo[]>('/findusers',data,httpOptions);
  }

  getFriendPosts(userID: number): Observable<Post[]> {
    var data: Post = {authorID:userID};
    return this.http.put<Post[]>('/friendposts',data,httpOptions);
  }

  getUserPosts(userID: number): Observable<Post[]> {
    var data: Post = {authorID:userID};
    return this.http.put<Post[]>('/userposts',data,httpOptions);
  }

  getPublicUserInfo(userID: number): Observable<UserInfo> {
    var data: UserInfo = {session:'',ID:userID};
    return this.http.put<UserInfo>('/publicuserinfo',data,httpOptions);
  }

  getUserInfo(session: string): Observable<UserInfo> {
    var data: UserInfo = {session:session};
    return this.http.put<UserInfo>('/userinfo',data,httpOptions);
  }

  loginUser(user: string, pass: string): Observable<LoginResponse> {
    var data: LoginResponse = {username: user, password: pass};
    return this.http.put<LoginResponse>('/login',data,httpOptions);
  }

  registerUser(user: string, pass: string, email: string): Observable<LoginResponse> {
    var data: LoginResponse = {username: user, password: pass, email: email};
    return this.http.put<LoginResponse>('/register',data,httpOptions);
  }

  addPost(session: string, postTitle: string, postBody: string) {
    var data: PostInfo = {session:session,title:postTitle,body:postBody};
    return this.http.put<PostInfo>('/addpost',data,httpOptions);
  }

  removePost(session: string, postID: number) {
    var data = {session:session,postID: postID};
    return this.http.put<any>('/removepost',data,httpOptions);
  }

  getComments(postID: number) {
    var data: Comment = {postID};
    return this.http.put<Comment[]>('/getcomments',data,httpOptions);
  }

  addComment(session: string, postID: number, content: string) {
    var data = {session,postID,content};
    return this.http.put<any>('/addcomment',data,httpOptions);
  }

  updateProfile(session: string, userinfo: UserInfo) {
    var data: UserInfo = userinfo;
    data.session = session;

    return this.http.put<UserInfo>('/updateprofile',data,httpOptions);
  }

  changeFriendStatus(session: string, userID: number, status: boolean) {
    var data = {session:session,friendID:userID,status:status};

    return this.http.put<any>('/changefriendstatus',data,httpOptions);
  }

  changeLikeStatus(session: string, postID: number, status: boolean) {
    var data = {session:session,postID:postID,status:status};

    return this.http.put<any>('/changelikestatus',data,httpOptions);
  }

  getMessageHistory(session: string, recipientID: number) {
    var data = {session,recipientID};

    return this.http.put<MessageSend[]>('/messagehistory',data,httpOptions);
  }
}