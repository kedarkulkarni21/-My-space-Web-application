const express = require('express');
const bodyParser = require('body-parser');
const https = require('https');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const tokenLength = 30;
const app = express();
const KEY_PATH = '/home/kedar/auth/key.pem';
const CERT_PATH = '/home/kedar/auth/cert.pem';
const fs = require('fs');

const OK = 200;
const CREATED = 201;
const NO_CONTENT = 204;
const MOVED_PERMANENTLY = 301;
const FOUND = 302;
const SEE_OTHER = 303;
const NOT_MODIFIED = 303;
const BAD_REQUEST = 400;
const UNAUTHORIZED = 401;
const NOT_FOUND = 404;
const CONFLICT = 409;
const SERVER_ERROR = 500;

function serve(port, authTimeout, model) 
{
	app.locals.model = model;
	app.locals.port = port;
	app.locals.authTimeout = authTimeout;
	setupRoutes(app);
	https.createServer({
	key: fs.readFileSync(KEY_PATH),
	cert: fs.readFileSync(CERT_PATH),
	}, app).listen(port);
	console.log(`listening on port ${port}`);
}

function setupRoutes(app) 
{
	app.use('/users/:id', bodyParser.json());
	app.use('/users/:id', cacheUser(app));
	app.put('/users/:id', newUser(app));
	app.put('/users/:id/:auth', checkUser(app));
	app.get('/users/:id', getUser(app));
}

module.exports = {
	serve: serve
}

function getUser(app) 
{
	return function(request, response) {
	const milliseconds = Date.now();	
	const id = request.params.id;	
	let validity =0;
	if(typeof request.headers.authorization === 'undefined'){
	response.status(UNAUTHORIZED).json({ "status": "ERROR_UNAUTHORIZED",
					"info": "/users/"+id+" requires a bearer authorization header"
				});

	}
		if (!request.user) 	
		{
			response.status(NOT_FOUND).json({"status" : "ERROR_NOT_FOUND" , "info" : `user ${id} not found`});
		}
		else
		{
			request.app.locals.model.users.getUser(id).	
			then(function(user) {
				if(user) 
				{	
					for(i=0; i < user.AUTHTOKEN.length; i++) {					
						let tokengenTime = user.AUTHTOKEN[i].time;
						if ((milliseconds - tokengenTime) < (app.locals.authTimeout*1000)){
							validity = 1;
							response.status(OK).json({"status": "OK", "DATA": user.DATA});
							break;
						}
					}
			if(validity === 0){

			response.status(UNAUTHORIZED).json({"status": "ERROR_UNAUTHORIZED", "info" : "/users/"+id+" requires a bearer authorization header"});
			}
				}
			}).
			catch((err) => {
				console.error(err);
				response.sendStatus(SERVER_ERROR);
			});
		
		}
	};
	
}

function newUser(app) 
{
	return function(request, response) {
	const userInfo = request.body;
	const id = request.params.id;
	const pw = request.query.pw;
	const milliseconds = Date.now();
	//REFERENCE : GOOGLE
	function randomizer(length) {
		var text = "";
		var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
		for(var i = 0; i < length; i++)
		{
	        	text += possible.charAt(Math.floor(Math.random() * possible.length));
		}
	    	return text;
	}
	//
	var randomvalue = randomizer(tokenLength);
	const randomobj = { token : randomvalue , time : milliseconds};

	var salt = bcrypt.genSaltSync(saltRounds);
	var hash = bcrypt.hashSync(pw, salt);
	if(pw === ""){
		response.status(BAD_REQUEST).json( { "status": "ERROR_BAD_REQUEST",
				"info": "/users/"+id+"/auth requires a valid 'pw' password query parameter"
			 });
	}

	if (JSON.stringify(userInfo) === '{}') 
	{
		console.error(`missing body`);	
		response.status(BAD_REQUEST).json( { "status": "ERROR_BAD_REQUEST",
				"info": "/users/"+id+"/auth requires a valid body"
			 });
	}
	else if (request.user) 
	{
		response.status(SEE_OTHER).json({"status" : "EXISTS" , "info" : `user ${id} already exists`});
	}
	else 
	{
		request.app.locals.model.users.newUser(id, hash, randomobj, userInfo).	
		then(function(id) {
			response.status(CREATED).json({"status": "CREATED", "authToken" : `${randomvalue}`});
		}).
		catch((err) => {
			console.error(err);
			response.sendStatus(SERVER_ERROR);
		});
	}
	};
}

function checkUser(app)
{
	return function (request, response) 
	{
		const userInfo = request.body;
		const id = request.params.id;
	if(typeof request.body.pw === 'undefined'){
		response.status(BAD_REQUEST).json( { "status": "ERROR_BAD_REQUEST",
				"info": "/users/"+id+"/auth requires a valid 'pw' password query parameter"
			 });
	}
	else{
		function randomizer(length) 
		{
			var text = "";
			var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
			for(var i = 0; i < length; i++)
			{
	       		 	text += possible.charAt(Math.floor(Math.random() * possible.length));
			}
	    		return text;
		}
		//
		var randomval = randomizer(tokenLength);
		var milliseconds = Date.now();

		const randomobj = { token : randomval , time : milliseconds};

		if (typeof userInfo === 'undefined') 
		{
			console.error(`missing body`);	
			response.sendStatus(BAD_REQUEST);
		}
		else if (!request.user)
		{
			response.status(NOT_FOUND).json({"status" : "ERROR_NOT_FOUND" , "info" : `user ${id} not found`});
		}
		else 
		{
			request.app.locals.model.users.getUser(id).	
			then(function(user) {
				if(user) 
				{
					const pass = user.PASSWORD;
					var flag = bcrypt.compareSync(request.body.pw,pass);	
					if(flag === true){
					request.app.locals.model.users.updateUser(id, randomobj).
					then(() => {
					response.status(OK).json({"status": "OK", "authToken" : `${randomval}`});
					}).catch((err) => {
				  	console.error(err);
				  	response.sendStatus(SERVER_ERROR);
					});
					}
					else {
					response.status(UNAUTHORIZED).json({"status": "ERROR_UNAUTHORIZED", "info" : "/users/<ID>/auth requires a valid 'pw' password query parameter"});
					}
				}
			}).
			catch((err) => {
				console.error(err);
				response.sendStatus(SERVER_ERROR);
			});
		}
	}
	};
}

function cacheUser(app) 
{
	return function(request, response, next) {
	const id = request.params.id;
	if (typeof id === 'undefined') 
	{
		response.sendStatus(BAD_REQUEST);
	}
	else
	{
		request.app.locals.model.users.getUser(id, false).
		then(function(user) {
			request.user = user;
			next();
		}).
		catch((err) => {
			console.error(err);
			response.sendStatus(SERVER_ERROR);
		});
	}
	}
}

//Should not be necessary but could not get relative URLs to work
//in redirect().
function requestUrl(req) 
{
	const port = req.app.locals.port;
	return `${req.protocol}://${req.hostname}:${port}${req.originalUrl}`;
}
