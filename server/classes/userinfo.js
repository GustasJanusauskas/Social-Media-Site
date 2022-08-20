'use strict';

class UserInfo {
    session = "";
    success = false;
    error = "";

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
    posts = [0,0];
    blocked = [0,0];
    friendRequests = [0,0];

    online = false;
    ID = -1;

    constructor(a) { this.session = a}
}

module.exports = UserInfo;