import { Injectable } from '@angular/core';
import { HttpClient, HttpHandler, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';

import {LoginResponse} from './loginresponse';
import {UserInfo} from './userinfo';
import {PostInfo} from './postinfo';

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
    return this.http.put<PostInfo>('/addPost',data,httpOptions);
  }
}