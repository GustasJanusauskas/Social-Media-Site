import { Component, OnInit } from '@angular/core';

import { HelperFunctionsService } from "../services/helper-functions.service";

import { Post } from '../interfaces/post';
import { Comment } from "../interfaces/comment";

@Component({
  selector: 'app-comments',
  templateUrl: './comments.component.html',
  styleUrls: ['./comments.component.css']
})
export class CommentsComponent implements OnInit {
  post: Post = {authorID:0};
  userID: number = -1;

  commentsList: Comment[] = [{content:'testComment',author:'testAuth',date:new Date().toLocaleString(),postID:0,authorID:0,commentID:0}];
  commentField: string = "";

  //Imported helper functions
  noJsonSymbols = HelperFunctionsService.noJsonSymbols;

  constructor() { }

  ngOnInit(): void {
  }

}
