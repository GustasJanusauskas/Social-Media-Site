import { Component, Injectable, Input, OnInit } from '@angular/core';

import { HelperFunctionsService } from "../services/helper-functions.service";
import { UserdataService } from "../services/userdata.service";

import { Post } from '../interfaces/post';
import { Comment } from "../interfaces/comment";
import { UserInfo } from "../interfaces/userinfo";
import { AppComponent } from '../app.component';

@Component({
  selector: 'app-comments',
  templateUrl: './comments.component.html',
  styleUrls: ['./comments.component.css']
})
@Injectable({providedIn: 'root'})
export class CommentsComponent implements OnInit {
  @Input() post!: Post;
  @Input() userinfo!: UserInfo;
  @Input() rootComponent!: AppComponent;

  commentsList: Comment[] = [];
  commentField: string = "";

  //Imported helper functions
  noJsonSymbols = HelperFunctionsService.noJsonSymbols;

  constructor(private userdataService: UserdataService) {

  }

  ngOnInit(): void {
    this.getComments();
  }

  getComments() {
    if (!this.post) console.log('no post');

    this.userdataService.getComments(this.post.postID || -1).subscribe( (data) => {
      data.forEach(comment => {
        this.userdataService.getPublicUserInfo(comment.authorID || -1).subscribe( (data) => {
          comment.author = `${data.firstName} ${data.lastName} (${data.username})`;
          this.commentsList.push(comment);
        });
      });
    });
  }

  addReply(username: string) {
    this.commentField += `@${username} `;
  }

  postComment() {
    var session = HelperFunctionsService.getCookie('session');
    if (session == null || session.length < 64) return;
    if (!this.post.postID) return;
    if (this.commentField.length > 2000 || !this.commentField.trim()) return;

    this.userdataService.addComment(session,this.post.postID,this.commentField).subscribe(data => {
      if (data.comment_id == -1) {
        console.log(data.err);
        return;
      }

      //if comment submitted successfully, add local version and clear form
      const author = `${this.userinfo.firstName} ${this.userinfo.lastName} (${this.userinfo.username})`;
      this.commentsList.push({authorID:this.userinfo.ID,postID:this.post.postID || -1, commentID: data.comment_id,content:this.commentField,author,date:HelperFunctionsService.formatToPSQLTime(new Date())});
      this.commentField = "";
    });
  }
}
