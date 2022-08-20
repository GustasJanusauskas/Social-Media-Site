'use strict';

const UserInfo = require('./classes/userinfo');
const PostInfo = require('./classes/postinfo');
const CommentInfo = require('./classes/commentinfo');

const fs = require('fs');
const ws = require('ws');
const { Client } = require('pg');
const sanitizeHtml = require('sanitize-html');
const crypto = require('crypto');
const express = require("express");
const path = require('path');
const imageThumbnail = require('image-thumbnail');

const wss = new ws.Server({ port: 4001 });

const PORT = process.env.PORT || 3001;
const app = express();

const linkRegex = new RegExp(String.raw`[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)$`);
const base64Regex = new RegExp(String.raw`^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})$`);
const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

//Enables extra debug messages
const VERBOSE_DEBUG = true;

//CONFIG
const dbclient = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'socialsitedb',
  password: 'root',
  port: 5432
}); dbclient.connect();

app.use(express.json({limit: '16mb'}));

//WEBSOCKETS
var wsUsers = [];

wss.on('connection', (ws,req) => {
  ws.on('message', function(message) {
    var connip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    var jsonMessage = JSON.parse(message);
    if (VERBOSE_DEBUG) console.log(`Received ${jsonMessage.handshake ? jsonMessage.handshake : 'message'} from ${connip}${jsonMessage.handshake == 'message' ? ': ' + jsonMessage.body : '.'}`);

    //Handshake
    if (jsonMessage.handshake == 'handshake') {
      RegisterNewWebsocket(ws,connip,jsonMessage);
    }
    //Disconnect
    else if (jsonMessage.handshake == 'disconnect') {
      ClearWebsocket(connip);
    }
    //Message
    else {
      var sender = wsUsers.find((user => {return user.session == jsonMessage.session;}));
      var receiver = wsUsers.find((user => {return user.id == jsonMessage.recipientID;}));
      if (sender && receiver) {
        //Replace sender session with ID before sending message to receiver.
        jsonMessage.senderID = sender.id;
        jsonMessage.session = '';
        jsonMessage.body = jsonMessage.body.replace('{','').replace('}','').replace('"','') ;

        //Save message to DB
        AddMessage(sender.id,jsonMessage.recipientID,jsonMessage.body);
        //Send
        receiver.ws.send(JSON.stringify(jsonMessage));
      }
      //If receiver isn't online, send an error message back to sender.
      else if (sender) {
        //Save message to DB
        AddMessage(sender.id,jsonMessage.recipientID,jsonMessage.body);

        if (VERBOSE_DEBUG) console.log(`Couldn't send ${sender.id}'s message to ${jsonMessage.recipientID}.`);
        //Error message no longer necessary
        //sender.ws.send(JSON.stringify({recipientID:jsonMessage.recipientID,error:'Recipient could not receive message, please try again later.'}));
      }
    }
  });
  ws.on('close', function() {
    var connip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    ClearWebsocket(connip);
  });
});

//FILES
app.use(express.static(path.join(__dirname,'..',String.raw`socialmediasite_frontend\dist\socialmediasite_frontend`)));
app.use(express.static(path.join(__dirname,'..',String.raw`avatars`)));

//HTTP
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname,'..',String.raw`socialmediasite_frontend\dist\socialmediasite_frontend\index.html`));
});

//API
app.put("/friendposts", (req, res) => {
  GetPosts(req.body.userID,'friend',req.body.usePopularity,(success,inf) => {
    res.json(inf);
  });
});

app.put("/userposts", (req, res) => {
  GetPosts(req.body.userID,'user',req.body.usePopularity,(success,inf) => {
    res.json(inf);
  });
});

app.put("/publicposts", (req, res) => {
  GetPosts(req.body.userID,'public',req.body.usePopularity,(success,inf) => {
    res.json(inf);
  });
});

app.put("/publicuserinfo", (req, res) => {
  GetPublicUserInfo(req.body.ID,(success,inf) => {
    res.json(inf);
  });
});

app.put("/userinfo", (req, res) => {
  GetUserInfo(req.body.session,(success,inf) => {
    res.json(inf);
  });
});

app.put("/findusers", (req, res) => {
  FindUsers(req.body.search,(success,inf) => {
    res.json(inf);
  });
});

app.put("/updateprofile", (req, res) => {
  UpdateProfile( req.body,(success,msg) => {
    res.json({
      success: success,
      session: msg
    });
  });
});

app.put("/login", (req, res) => {
  LoginUser( sanitizeHtml( req.body.username ),req.body.password,req.headers.host,(success,msg) => {
    res.json({
      username: '',
      password: '',
      success: success,
      session: msg
    });
  });
});

app.put("/register", (req, res) => {
  RegisterUser( sanitizeHtml( req.body.username ),req.body.password,req.body.email,(success,msg) => {
    res.json({
      username: '',
      password: '',
      success: success,
      session: msg
    });
  });
});

app.put("/addpost", (req, res) => {
  AddPost( req.body.session, sanitizeHtml( req.body.title ), sanitizeHtml( req.body.body ), (success,msg) => {
    if (!success) console.log(msg);
    res.json({
      success:success
    });
  });
});

app.put("/removepost", (req, res) => {
  RemovePost( req.body.session, req.body.postID, (success,msg) => {
    if (!success) console.log(msg);
    res.json({
      success:success
    });
  });
});

app.put("/getcomments", (req, res) => {
  GetComments(req.body.postID,(success,inf) => {
    res.json(inf);
  });
});

app.put("/addcomment", (req, res) => {
  AddComment( req.body.session, sanitizeHtml( req.body.content ), req.body.postID , (cid,msg) => {
    if (cid == -1) console.log(msg);
    res.json({
      comment_id: cid,
      err: cid == -1 ? msg : ''
    });
  });
});

app.put("/changefriendstatus", (req,res) => {
  ChangeFriend(req.body.session,req.body.friendID,req.body.status, (success,msg) => {
    if (!success) console.log(msg);
    res.json({
      success:success
    });
  });
});

app.put("/changelikestatus", (req,res) => {
  ChangeLike(req.body.session,req.body.postID,req.body.status, (success,msg) => {
    if (!success) console.log(msg);
    res.json({
      success:success
    });
  });
});

app.put("/messagehistory", (req, res) => {
  GetIDFromSession(req.body.session, (userID) => {
    GetConversation(userID,req.body.recipientID,(success,inf) => {
      res.json(inf);
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});

//FUNCTIONS
function RegisterNewWebsocket(ws,connip,jsonMessage) {
  var tempUser = wsUsers.find((user => {return user.ip == connip;}));
  //Update existing connection
  if (tempUser) {
    GetIDFromSession(jsonMessage.session,(id) => {
      tempUser.ip = connip;
      tempUser.session = jsonMessage.session;
      tempUser.id = id;
      tempUser.ws = ws;
    });
  }
  //New connection, get user ID from session and associate with IP
  else {
    GetIDFromSession(jsonMessage.session,(id) => {
      wsUsers.push({ip:connip,session:jsonMessage.session,id,ws});
    });
  }
}

function ClearWebsocket(connip) {
  //Find and remove closed websocket from list
  var tempUser = wsUsers.find((user => {return user.ip == connip;}));
  if (tempUser) {
    if (VERBOSE_DEBUG) console.log(`User ${connip} disconnected from ws.`);
    wsUsers.splice(wsUsers.indexOf(tempUser),1);
  }
}

function AddMessage(senderID,recipientID,message) {
  var innerQuery = 'INSERT INTO messages(sender,recipient,msg,date) VALUES($1,$2,$3,now());';
  var innerData = [senderID,recipientID,message];

  dbclient.query(innerQuery,innerData, (err, res) => {
    if (err) {
      console.log("DB ERROR AddMessage: \n" + err);
      return;
    }

  });
}

function GetConversation(usr1,usr2,callback) {
  var result = [];

  var innerQuery = String.raw`SELECT msg, recipient, sender, extract(epoch from date) * 1000 AS date FROM messages WHERE sender = ANY(ARRAY[CAST($1 AS BIGINT),CAST($2 AS BIGINT)]) AND recipient = ANY(ARRAY[CAST($1 AS BIGINT),CAST($2 AS BIGINT)]) ORDER BY date;`;
  var innerData = [usr1,usr2];

  dbclient.query(innerQuery,innerData, (err, res) => {
    if (err || res.rows.length == 0) {
      if (err) console.log("DB ERROR GetConvo: \n" + err);
      callback(false,result);
      return;
    }

    res.rows.forEach(row => {
      result.push({body:row.msg,recipientID:row.recipient,senderID:row.sender,date:row.date});
    });

    callback(true,result);
  });
}

function ChangeLike(session,postID,status,callback) {
  //Getting UserID from session
  GetIDFromSession(session, (userID) => {
    var innerQuery;
    var innerData;
    //Add like
    if (status) {
      innerQuery = 'UPDATE posts SET usr_likes = ( CASE WHEN $1 = ANY(usr_likes) THEN usr_likes ELSE array_append(usr_likes,$1) END ) WHERE post_id = $2;';
      innerData = [userID,postID];
    }
    //Remove like
    else {
      innerQuery = 'UPDATE posts SET usr_likes = array_remove(usr_likes,$1) WHERE post_id = $2;';
      innerData = [userID,postID];
    }

    if (VERBOSE_DEBUG) {
      console.log('Like status change:');
      console.log({pID:postID,uID:userID,status});
    }

    dbclient.query(innerQuery,innerData, (err, res) => {
      if (err) {
        console.log("DB ERROR ChangeLike: \n" + err);
        callback(false,'Failed to change like status.');
        return;
      }

      callback(true,'Like status changed successfully!');
    });
  });
}

function ChangeFriend(session,friendID,status,callback) {
  //Getting UserID from session
  GetIDFromSession(session, (userID) => {
    var innerQuery;
    var innerData;
    //Add friend
    if (status) {
      innerQuery = 'UPDATE profiles SET friends = ( CASE WHEN $1 = ANY(friends) THEN friends ELSE array_append(friends,$1) END ) WHERE usr_id = $2;';
      innerData = [friendID,userID];
    }
    //Remove friend
    else {
      innerQuery = 'UPDATE profiles SET friends = array_remove(friends,$1) WHERE usr_id = $2;';
      innerData = [friendID,userID];
    }

    if (VERBOSE_DEBUG) {
      console.log('Friend status change:');
      console.log({fID:friendID,uID:userID,status});
    }

    dbclient.query(innerQuery,innerData, (err, res) => {
      if (err) {
        console.log("DB ERROR ChangeFriend: \n" + err);
        callback(false,'Failed to change friend status.');
        return;
      }

      callback(true,'Friend status changed successfully!');
    });
  });
}

function RemovePost(session,postID,callback) {
  GetIDFromSession(session, (userID) => {
    //Remove post ID from profile
    var innerQuery = 'UPDATE profiles SET posts = array_remove(posts,$1) WHERE usr_id = $2;';
    var innerData = [postID,userID];

    dbclient.query(innerQuery,innerData, (err, res) => {
      //If no rows updated, assume user doesn't actually have a post with this ID
      if (err || res.rowCount == 0) {
        console.log("DB ERROR RemovePostUpdateProfile: \n" + err);
        callback(false,'Failed to remove post ID from profile.');
        return;
      }
      //Then remove post from the posts table
      //Extra check of usr_id to prevent malicious user from deleting another user's post.
      var innerInQuery = 'DELETE FROM posts WHERE post_ID = $1 AND usr_id = $2;';
      dbclient.query(innerInQuery,innerData, (err, res) => {
        if (err) {
          console.log("DB ERROR RemovePost: \n" + err);
          callback(false,'Failed to remove post.');
          return;
        }

        //Finally, remove all comments that were on the post.
        //If a malicious user tries to delete another user's post, server will have thrown a DB ERROR RemovePostUpdateProfile before now.
        var innerInInQuery = 'DELETE FROM comments WHERE post_ID = $1';
        var innerInInData = [postID];
        dbclient.query(innerInInQuery,innerInInData, (err, res) => {
          if (err) {
            console.log("DB ERROR RemovePostComments: \n" + err);
            callback(false,'Failed to remove post comments.');
            return;
          }

          if (VERBOSE_DEBUG) console.log('User ' + userID + ' deleted post ' + postID);
          callback(true,'Post removed successfully.');
        });
      });
    });
  });
}

function AddPost(session,title,body,callback) {
  GetIDFromSession(session, (userID) => {
    var innerQuery = "INSERT INTO posts(usr_id,ptitle,pbody,pdate,usr_likes) VALUES($1,$2,$3,now(),'{}') RETURNING post_id;";
    var innerData = [userID,title,body];

    dbclient.query(innerQuery,innerData, (err, res) => {
      if (err || res.rows.length == 0) {
        if (err) console.log("DB ERROR AddPost: \n" + err);
        callback(false,'Failed to add post.');
        return;
      }

      //Add post ID to user profile
      var innerInQuery = 'UPDATE profiles SET posts = array_append(posts,$2) WHERE usr_id = $1;';
      var innerInData = [userID,res.rows[0].post_id];

      dbclient.query(innerInQuery,innerInData, (err, res) => {
        if (err) {
          if (err) console.log("DB ERROR RegPost: \n" + err);
          callback(false,'Failed to register post.');
          return;
        }

        callback(true,'Post registered successfully.');
      });
    });
  });
}

function AddComment(session,content,postID,callback) {
  GetIDFromSession(session, (userID) => {
    var innerQuery = 'INSERT INTO comments(usr_id,post_id,content,cdate) VALUES($1,$2,$3,now()) RETURNING comment_id;';
    var innerData = [userID,postID,content];

    dbclient.query(innerQuery,innerData, (err, res) => {
      if (err) {
        console.log("DB ERROR AddComment: \n" + err);
        callback(-1,'Failed to add comment.');
        return;
      }

      callback(res.rows[0].comment_id,'Comment added successfully.');
    });
  });
}

function GetComments(postID,callback) {
  var innerQuery = "SELECT comment_id, content, post_id, usr_id, to_char(cdate, 'YYYY-MM-DD at HH12:MIam') AS date FROM comments WHERE post_id = $1 ORDER BY cdate LIMIT 500;";
  var innerData = [postID];

  var result = [];
  dbclient.query(innerQuery,innerData, (err, res) => {
    if (err || res.rows.length == 0) {
      if (err) console.log("DB ERROR GetComments: \n" + err);
      result.error = 'Failed to get comments.';
      callback(false,result);
      return;
    }

    for (var x = 0; x < res.rowCount; x++) {
      var temp = new CommentInfo(res.rows[x].comment_id);

      temp.content = res.rows[x].content;
      temp.date = res.rows[x].date;
      temp.postID = res.rows[x].post_id;
      temp.authorID = res.rows[x].usr_id;

      result.push(temp);
    }

    callback(true, result);
  });
}

function GetPosts(ID,postType,usePopularity,callback) {
  var innerQuery;
  var innerData = [ID];

  if (postType == 'public') {
    //Gets newest posts by all users
    if (usePopularity) {
      //Popularity = 3 * likes - age (in hours);
      innerQuery = "SELECT posts.ptitle, posts.pbody, to_char(posts.pdate, 'YYYY-MM-DD at HH12:MIam') AS pdate, posts.usr_id, posts.post_id, array_length(posts.usr_likes,1) AS likes, CONCAT(profiles.firstname,' ',profiles.lastname) AS author, $1 = ANY(posts.usr_likes) as userliked, COALESCE(array_length(posts.usr_likes,1),0) * 3 - (EXTRACT(EPOCH FROM (NOW() - posts.pdate) ) / 3600) as popularity FROM posts,profiles WHERE profiles.usr_id = posts.usr_id ORDER BY popularity DESC LIMIT 100;";
    }
    else {
      innerQuery = "SELECT posts.ptitle, posts.pbody, to_char(posts.pdate, 'YYYY-MM-DD at HH12:MIam') AS pdate, posts.usr_id, posts.post_id, array_length(posts.usr_likes,1) AS likes, CONCAT(profiles.firstname,' ',profiles.lastname) AS author, $1 = ANY(posts.usr_likes) as userliked FROM posts,profiles WHERE profiles.usr_id = posts.usr_id ORDER BY posts.pdate DESC LIMIT 100;";
    }
  }
  else if (postType == 'user') {
    //Get one users posts, ordered chronologically
    innerQuery = "SELECT posts.ptitle, posts.pbody, to_char(posts.pdate, 'YYYY-MM-DD at HH12:MIam') AS pdate, posts.usr_id, posts.post_id, array_length(posts.usr_likes,1) AS likes, CONCAT(profiles.firstname,' ',profiles.lastname) AS author, $1 = ANY(posts.usr_likes) as userliked FROM posts, profiles WHERE posts.usr_id = $1 AND posts.usr_id = profiles.usr_id ORDER BY posts.pdate DESC;";
  }
  else if (postType == 'friend') {
    //Gets the users friends posts
    if (usePopularity) {
      //Popularity = 3 * likes - age (in hours);
      innerQuery = "SELECT posts.ptitle, posts.pbody, to_char(posts.pdate, 'YYYY-MM-DD at HH12:MIam') AS pdate, posts.usr_id, posts.post_id, array_length(posts.usr_likes,1) AS likes, CONCAT(profiles.firstname,' ',profiles.lastname) AS author, $1 = ANY(posts.usr_likes) as userliked, COALESCE(array_length(posts.usr_likes,1),0) * 3 - (EXTRACT(EPOCH FROM (NOW() - posts.pdate) ) / 3600) as popularity FROM posts, profiles WHERE posts.usr_id = ANY(array(SELECT friends FROM profiles WHERE usr_id = $1 )) AND posts.usr_id = profiles.usr_id ORDER BY popularity DESC LIMIT 100;";
    }
    else {
      innerQuery = "SELECT posts.ptitle, posts.pbody, to_char(posts.pdate, 'YYYY-MM-DD at HH12:MIam') AS pdate, posts.usr_id, posts.post_id, array_length(posts.usr_likes,1) AS likes, CONCAT(profiles.firstname,' ',profiles.lastname) AS author, $1 = ANY(posts.usr_likes) as userliked FROM posts, profiles WHERE posts.usr_id = ANY(array(SELECT friends FROM profiles WHERE usr_id = $1 )) AND posts.usr_id = profiles.usr_id ORDER BY posts.pdate DESC LIMIT 100;";
    }
  }

  var result = [];
  dbclient.query(innerQuery,innerData, (err, res) => {
    if (err || res.rows.length == 0) {
      if (err) console.log("DB ERROR GetUserPosts: \n" + err);
      callback(false,result);
      return;
    }

    for (var x = 0; x < res.rowCount; x++) {
      var temp = new PostInfo(res.rows[x].usr_id);

      temp.title = res.rows[x].ptitle;
      temp.body = res.rows[x].pbody;
      temp.date = res.rows[x].pdate;
      temp.likes = res.rows[x].likes || 0;
      temp.author = res.rows[x].author;
      temp.userLiked = res.rows[x].userliked;

      temp.authorID = res.rows[x].usr_id;
      temp.postID = res.rows[x].post_id;

      result.push(temp);
    }

    callback(true,result);
  });
}

function GetPublicUserInfo(ID,callback,resolve = null) {
  var userID = ID;
  var innerQuery = 'SELECT username, created, firstname, lastname, description, picture, thumb, friends, posts FROM users, profiles WHERE profiles.usr_id = users.usr_id AND users.usr_id = $1;';
  var innerData = [userID];

  var result = new UserInfo();
  dbclient.query(innerQuery,innerData, (err, res) => {
    if (err || res.rows.length == 0) {
      if (err) console.log("DB ERROR GetPublicUserInfo: \n" + err);
      result.error = 'Failed to get public user info.';
      callback(false,result);
      return;
    }

    result.username = res.rows[0].username;

    result.firstName = res.rows[0].firstname;
    result.lastName = res.rows[0].lastname;
    result.profileDesc = res.rows[0].description;
    result.avatarPath = res.rows[0].picture;
    result.thumbPath = res.rows[0].thumb;

    result.friends = res.rows[0].friends;
    result.posts = res.rows[0].posts;

    result.ID = userID;

    result.online = wsUsers.find((user => {return user.id == userID;})) != undefined;

    result.success = true;

    if (resolve) callback(true,result,resolve);
    else callback(true,result);
  });
}

function GetPublicUserInfoPromise(ID,callback) {
  return new Promise((resolve,reject) => {
    GetPublicUserInfo(ID,callback,resolve);
  });
}

function GetIDFromSession(session,callback) {
  var query = 'SELECT * FROM sessions WHERE sessionid = $1';
  var data = [session];

  dbclient.query(query,data, (err, res) => {
    if (err || res.rows.length == 0) {
      if (err) console.log("DB ERROR GetUserIDFromSession: \n" + err);
      callback(-1);
      return;
    }

    callback(res.rows[0].usr_id);
  });
}

function GetUserInfo(session, callback) {
  GetIDFromSession(session, (userID) => {
    var innerQuery = 'SELECT username, password, email, created, salt, pepper, firstname, lastname, description, picture, thumb, friends, posts FROM users, profiles WHERE profiles.usr_id = users.usr_id AND users.usr_id = $1;';
    var innerData = [userID];
    var result = new UserInfo();

    dbclient.query(innerQuery,innerData, (err, res) => {
      if (err || res.rows.length == 0) {
        if (err) console.log("DB ERROR GetUserInfo: \n" + err);
        result.error = 'Failed to get user info.';
        callback(false,result);
        return;
      }

      result.email = res.rows[0].email;
      result.username = res.rows[0].username;
      result.creationdate = res.rows[0].created;

      result.firstName = res.rows[0].firstname;
      result.lastName = res.rows[0].lastname;
      result.profileDesc = res.rows[0].description;
      result.avatarPath = res.rows[0].picture;
      result.thumbPath = res.rows[0].thumb;

      result.friends = res.rows[0].friends;
      result.posts = res.rows[0].posts;

      result.online = wsUsers.find((user => {return user.id == userID;})) != undefined;

      result.ID = userID;

      result.success = true;

      callback(true,result);
    });
  });
}

function FindUsers(search,callback) {
  //Prepare search term 
  search = search.replace('%','');
  search += '%';

  var query = "SELECT users.usr_id FROM users,profiles WHERE (LOWER(CONCAT(profiles.firstname,' ',profiles.lastname)) LIKE $1 OR LOWER(profiles.firstname) LIKE $1 OR LOWER(profiles.lastname) LIKE $1 OR LOWER(users.username) LIKE $1) AND users.usr_id = profiles.usr_id LIMIT 50;";
  var data = [search];

  var result = [];
  var promises = [];
  dbclient.query(query,data, (err, res) => {
    if (err || res.rows.length == 0) {
      if (err) console.log("DB ERROR FindUsers: \n" + err);
      callback(false,result);
      return;
    }

    for (var x = 0; x < res.rowCount; x++) {
      promises.push(GetPublicUserInfoPromise(res.rows[x].usr_id,(success,res,resolve) => {
        result.push(res);
        resolve();
      }));
    }
    
    //When all API calls are finished, return the result
    Promise.allSettled(promises).then(() => {
      callback(true,result);
    });
  });
}


function UpdateProfile(userinfo,callback) {
  //Check data
  if (userinfo.firstName.length <= 0 || userinfo.lastName.length <= 0) {
    callback(false,"First and last name must be filled.");
    return;
  }

  //Get user ID from session
  GetIDFromSession(userinfo.session, (userID) => {
    if (userinfo.avatar) {
      var fileext = GetFilenameExtension(userinfo.avatarPath);
      //Reject files that are not images, verify by extension then by binary signature
      if (!['png','jpg','jpeg','bmp','gif','tiff','tif'].includes(fileext) || !VerifyImageBase64(userinfo.avatar)) {
        userinfo.avatarPath = '';
        UpdateProfileText(userID,userinfo, (success,msg) => {
          callback(success,msg);
        });
        return;
      }

      //Avatar - User ID - Salt (for security) . File extension
      const salt = RandomString(8);
      var avPath = `avatar-${userID}-${salt}.${fileext}`;
      var thPath = `thumb-${userID}-${salt}.jpg`;

      //if avatar directory doesn't exist create one
      if (!fs.existsSync(`avatars`)) fs.mkdirSync(`avatars`);

      //Delete old image
      GetPublicUserInfo(userID, (success,result) => {
        if(success && result.avatarPath) fs.rmSync(`avatars\\${result.avatarPath}`);

        //Save new image
        var img = Buffer.from(userinfo.avatar, 'base64');
        fs.writeFile(`avatars\\${avPath}`,img,() => {
          //Generate image thumbnail
          imageThumbnail(img,{percentage: 20,responseType:'buffer',jpegOptions:{force:true,quality:80}}).then(thumbnail => {
            //Save thumbnail
            fs.writeFile(`avatars\\${thPath}`,thumbnail,() => {
              //Set save paths
              userinfo.avatarPath = avPath;
              userinfo.thumbPath = thPath;
              //Finally, update profile row
              UpdateProfileText(userID,userinfo, (success,msg) => {
                callback(success,msg);
              });
            });
          });
        });
      });
    }
    else UpdateProfileText(userID,userinfo, (success,msg) => {
      callback(success,msg);
    });
  });
}

function UpdateProfileText(userID,userinfo,callback) {
  var innerQuery;
  var innerData;
  if (userinfo.avatarPath == '') {
    //New profile image rejected, do not update path
    innerQuery = 'UPDATE profiles SET firstname = $2, lastname = $3, description = $4 WHERE usr_id = $1;';
    innerData = [userID,userinfo.firstName,userinfo.lastName,userinfo.profileDesc];
  }
  else {
    innerQuery = 'UPDATE profiles SET firstname = $2, lastname = $3, description = $4, picture = $5, thumb = $6 WHERE usr_id = $1;';
    innerData = [userID,userinfo.firstName,userinfo.lastName,userinfo.profileDesc,userinfo.avatarPath,userinfo.thumbPath];
  }

  dbclient.query(innerQuery,innerData, (err, res) => {
    if (err) {
      console.log("DB ERROR UpdateProfileText: \n" + err);
      callback(false,'Failed to update user profile text.');
      return;
    }

    callback(true,'Updated user profile successfully.');
  });
}

function LoginUser (user,passw,ip,callback) {
  //Check data
  if (!user || !passw) {
    callback(false,"Make sure all the fields are filled.");
    return;
  }

  if (user.length > 128 || user.length < 4) {
    callback(false,"Username or email has to be between 4 and 128 characters long.");
    return;
  }

  var query;
  var data = [user];
  //Check if user is logging in with email, else assume a username
  if(emailRegex.test(user.toLowerCase())) query = 'SELECT * FROM users WHERE email = $1';
  else query = 'SELECT * FROM users WHERE username = $1';

  dbclient.query(query,data, (err, res) => {
    if (err || res.rows.length == 0) {
      if (err) console.log("DB ERROR Login: \n" + err);
      callback(false, "User not found, check email/username.");
      return;
    }

    //Hash password
    var passSalt = res.rows[0].salt;
    var passPepper = res.rows[0].pepper;
    var finalPass = crypto.createHash('BLAKE2b512').update(passSalt + passw + passPepper).digest('hex');
    //Check if password matches DB..
    var DBErr = false;
    if (finalPass == res.rows[0].password) {
      //Generate and update session string
      var sessionID = RandomString(64).replace('^','a');
      var innerData = [sessionID,res.rows[0].usr_id];
      var innerQuery = 'UPDATE sessions SET sessionID = $1 WHERE usr_id = $2;';

      dbclient.query(innerQuery,innerData, (err, res) => {
        if (err) {
            console.log("DB ERROR UpdateSession: \n" + err);
            DBErr = true;
            return;
        }
      });

      //Check for unhandled DB errors.
      if (DBErr) {
        callback(false,"Database Error.");
        return;
      }

      //Succesful login
      console.log("User " + user + " logged in.");
      callback(true,sessionID);
    }
    else {
      callback(false,"Wrong password.");
    }
  });
}

//Registers a new user
function RegisterUser(user,passw,email,callback) {
  //Check data
  if (!email || !user || !passw) {
    callback(false,"Make sure all the fields are filled.");
    return;
  }

  if (email.length > 256 || user.length < 4 || user.length > 128) {
    callback(false,"Username or email has to be between 4 and 128 characters long.");
    return;
  }

  if(!emailRegex.test(email.toLowerCase())) {
    callback(false,"Email is invalid.");
    return;
  }
  //Reserved usernames
  if (['server','host','owner','system'].indexOf(user.toLowerCase()) != -1) {
    callback(false,"Username reserved. Pick another username.");
    return;
  }

  //Hash password
  var passSalt = RandomString(8);
  var passPepper = RandomString(8);
  var finalPass = crypto.createHash('BLAKE2b512').update(passSalt + passw + passPepper).digest('hex');

  //Create user row
  var query = 'INSERT INTO users(username,password,email,created,salt,pepper) VALUES($1,$2,$3,NOW(),$4,$5) RETURNING usr_id, username;';
  var data = [user,finalPass,email,passSalt,passPepper];

  var DBErr = false;
  dbclient.query(query,data, (err, res) => {
    if (err) {
        callback(false,"Account already exists.");
        console.log("DB ERROR RegUser: \n" + err);
        DBErr = true;
        return;
    }

    //Create session for user, session string empty until login
    var innerData = [res.rows[0].usr_id];
    var innerQuery = 'INSERT INTO sessions(usr_id,sessionID) VALUES($1,NULL);';

    dbclient.query(innerQuery,innerData, (err, res) => {
      if (err) {
          console.log("DB ERROR RegSession: \n" + err);
          DBErr = true;
          return;
      }
      return;
    });

    //Create user profile row
    innerQuery = "INSERT INTO profiles(usr_id,firstname,lastname,friends) VALUES($1,$2,'',ARRAY[CAST($3 AS BIGINT)]);";
    innerData = [res.rows[0].usr_id,res.rows[0].username,res.rows[0].usr_id];
  
    dbclient.query(innerQuery,innerData, (err, res) => {
      if (err) {
          console.log("DB ERROR RegProfile: \n" + err);
          DBErr = true;
          return;
      }
      return;
    });

    //Check for unhandled DB errors.
    if (DBErr) {
      callback(false,"Database Error.");
      return;
    }
    else callback(true,"Account created!");
  });
}

//HELPER FUNCTIONS
function VerifyImageBase64(bufferString) {
  var result = false;

  //png,jpeg,bmp,gif87a,gif89a,tiff LE,tiff BE
  var allowedFormats = ['89504E470D0A1A0A','FFD8FF','424D','474946383761','474946383961','49492A00','4D4D002A'];

  for (var x = 0; x < allowedFormats.length; x++) {

    if (Buffer.from(bufferString,'base64').subarray(0,allowedFormats[x].length / 2).toString('hex').toUpperCase() == allowedFormats[x]) {
      result = true;
      break;
    }
  }

  return result;
}

function RandomString(length) {
  var pool = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  var result = "";
  for (var x = 0; x < length;x++) {
    result += pool.charAt(Math.random() * pool.length - 1);
  }
  return result;
}

function GetFilenameExtension(filename) {
  if (filename.lastIndexOf('.') == -1) return '';
  return filename.substring(filename.lastIndexOf('.')+1, filename.length) || '';
}