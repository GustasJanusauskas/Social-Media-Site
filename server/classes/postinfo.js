'use strict';

class PostInfo {
    success = false;

    title = "";
    body = "";
    date = "";
    author = "";
    authorID = 0;
    postID = 0;

    constructor(a) { this.authorID = a}
}

module.exports = PostInfo;