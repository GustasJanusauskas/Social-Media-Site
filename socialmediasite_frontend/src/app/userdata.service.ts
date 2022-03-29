import { Injectable } from '@angular/core';
import { HttpClient, HttpHandler, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';

import {LoginResponse} from './loginresponse';

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

  loginUser(user: string, pass: string): Observable<LoginResponse> {
    var data: LoginResponse = {username: user, password: pass, success: false, session: ''};
    return this.http.put<LoginResponse>('/login',data,httpOptions);
  }
}