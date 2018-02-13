#!/usr/bin/env nodejs

const assert = require('assert');
const mongo = require('mongodb').MongoClient;
const process = require('process');

const users = require('./model/users');
const model = require('./model/model');
const server = require('./server/server');
const options = require('./options');

const DB_URL = 'mongodb://localhost:27017/users';
const options1 = options;

mongo.connect(DB_URL).
then(function(db) 
{
	const model1 = new model.Model(db);
	server.serve(options1.options.port, options1.options.authTimeout, model1);	
	//server.serve(options1.options.authTime, model1);
	//db.close(); no simple way to shutdown express.js; hence ^C to shutdown
}).
catch((e) => console.error(e));
