'use strict';

class CommentInfo {
    content = "";
    date = "";

    authorID = -1;
    postID = -1;
    commentID = -1;

    constructor(id) { this.commentID=id; }
}

module.exports = CommentInfo;