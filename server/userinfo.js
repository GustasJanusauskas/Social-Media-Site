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

    ID = -1;

    constructor(a) { this.session = a}
}

module.exports = UserInfo;