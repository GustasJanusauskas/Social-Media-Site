'use strict';

class UserInfo {
    session = "";
    success = false;

    email = "";
    username = "";
    creationdate = "";

    firstName = "";
    lastName = "";
    profileDesc = "";
    avatarPath = "";
    friends = [0,0];
    posts = [""];

    constructor(a) { this.session = a}
}

module.exports = UserInfo;