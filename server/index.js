'use strict';

const fs = require('fs');
const ws = require('ws');
const { Client } = require('pg');
const sanitizeHtml = require('sanitize-html');
const crypto = require('crypto');
const express = require("express");
const path = require('path');

const linkRegex = new RegExp(String.raw`[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)$`);
const base64Regex = new RegExp(String.raw`^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})$`);
const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

const PORT = process.env.PORT || 3001;
const app = express();

const dbclient = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'socialsitedb',
  password: 'root',
  port: 5432
}); dbclient.connect();

app.use(express.static(path.join(__dirname,'..',String.raw`socialmediasite_frontend\dist\socialmediasite_frontend`)));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname,'..',String.raw`socialmediasite_frontend\dist\socialmediasite_frontend\index.html`));
});

app.get("/api", (req, res) => {
  //RegisterUser('TestUser','TestPass','TestEmail@email.com');
  res.json({ message: "Hello from server!" });
});

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});

function RegisterUser(user,passw,email) {
  if (!email || !user || !passw) {
    //toSend[ip].send("Make sure all the fields are filled.");
    return;
  }

  if (email.length > 256 || user.length > 64) {
    //toSend[ip].send("Username or email is too long.");
    return;
  }

  if(!emailRegex.test(email.toLowerCase())) {
    //toSend[ip].send("Email invalid.");
    return;
  }

  var passSalt = RandomString(8);
  var passPepper = RandomString(8);

  var finalPass = crypto.createHash('BLAKE2b512').update(passSalt + passw + passPepper).digest('hex');
  var query = 'INSERT INTO users(username,password,email,created,salt,pepper) VALUES($1,$2,$3,NOW(),$4,$5)';
  var data = [user,finalPass,email,passSalt,passPepper];

  dbclient.query(query,data, (err, res) => {
    if (err) {
        //toSend[ip].send("Account already exists.");
        console.log("DB ERROR: \n" + err);
    }
    else return;//toSend[ip].send("Account created!");
  });
}

function RandomString(length) {
  var pool = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  var result = "";
  for (var x = 0; x < length;x++) {
    result += pool.charAt(Math.random() * pool.length - 1);
  }
  return result;
}