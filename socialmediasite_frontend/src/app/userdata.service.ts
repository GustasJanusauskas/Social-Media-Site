import { Injectable } from '@angular/core';
import { HttpClient, HttpHandler, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';

import {LoginResponse} from './loginresponse';
import {UserInfo} from './userinfo';

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

  getUserInfo(session: string): Observable<UserInfo> {
    var data: UserInfo = {session:session};
    return this.http.put<UserInfo>('/userinfo',data,httpOptions);
  }

  loginUser(user: string, pass: string): Observable<LoginResponse> {
    var data: LoginResponse = {username: user, password: pass};
    return this.http.put<LoginResponse>('/login',data,httpOptions);
  }
}