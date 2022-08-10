'use strict';

class UserInfo {
    session = "";
    success = false;
    search = "";

    email = "";
    username = "";
    creationdate = "";

    firstName = "";
    lastName = "";
    profileDesc = "";
    avatarPath = "";
    thumbPath = "";
    avatar = "";
    friends = [0,0];
    posts = [""];

    ID = -1;

    constructor(a) { this.session = a}
}

module.exports = UserInfo;