'use strict';

class PostInfo {
    success = false;

    title = "";
    body = "";
    date = "";
    authorID = 0;

    constructor(a) { this.authorID = a}
}

module.exports = PostInfo;