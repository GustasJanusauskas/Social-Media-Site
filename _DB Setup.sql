CREATE DATABASE socialsitedb;
\c socialsitedb;

CREATE TABLE users(
	usr_id bigserial UNIQUE NOT NULL,
	username varchar(128) UNIQUE NOT NULL,
	password varchar(128) NOT NULL,
	email varchar(256) UNIQUE NOT NULL,
	created timestamp,
	salt varchar(8),
	pepper varchar(8),
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
	friends bigint[],
	posts varchar(4096)[]
);

CREATE TABLE messages(
	msg_id bigserial UNIQUE NOT NULL,
	usr_id bigint UNIQUE NOT NULL,
	msg varchar(300) NOT NULL,
	recipient bigint NOT NULL,
	date timestamp,
	ip varchar(45),
	file varchar(256),
	PRIMARY KEY(msg_id)
);