CREATE DATABASE socialsitedb;
\c socialsitedb;

CREATE TABLE users(
	usr_id bigserial UNIQUE NOT NULL,
	username varchar(128) UNIQUE NOT NULL,
	password varchar(128) NOT NULL,
	email varchar(256) UNIQUE NOT NULL,
	created timestamp,
	salt varchar(8),
	pepper varchar(8)
	PRIMARY KEY(usr_id)
);

CREATE TABLE sessions(
	usr_id bigint UNIQUE NOT NULL,
	sessionID varchar(64) UNIQUE
);

CREATE TABLE profiles(
	usr_id bigint UNIQUE NOT NULL,
	firstname varchar(128),
	lastname varchar(128),
	description varchar(1024),
	picture varchar(256),
	thumb varchar(256),
	friends bigint[] DEFAULT '{}',
	posts bigint[] DEFAULT '{}',
	blocked bigint[] DEFAULT '{}',
	friendrequests bigint[] DEFAULT '{}',
	usedspace real DEFAULT 0
);

CREATE TABLE posts(
	post_id bigserial UNIQUE NOT NULL,
	usr_id bigint NOT NULL,
	ptitle varchar(256),
	pbody varchar(4096),
	pdate timestamp DEFAULT '2022-01-01 08:00:00',
	usr_likes bigint[] DEFAULT '{}',
	linked_images varchar(256)[] DEFAULT '{}',
	PRIMARY KEY(post_id)
);

CREATE TABLE messages(
	msg_id bigserial UNIQUE NOT NULL,
	sender bigint NOT NULL,
	recipient bigint NOT NULL,
	msg varchar(512) NOT NULL,
	date timestamptz,
	PRIMARY KEY(msg_id)
);

CREATE TABLE comments(
	comment_id bigserial UNIQUE NOT NULL,
	post_id bigint NOT NULL,
	usr_id bigint NOT NULL,
	content varchar(2048),
	cdate timestamp DEFAULT '2022-01-01 08:00:00',
	PRIMARY KEY(comment_id)
);