const assert = require('assert');
const USERS = 'users';
const DEFAULT_USERS = './users_data';
const DATA = '_data';
const PASSWORD = 'pw';

function Users(db) {
  this.db = db;
  this.users = db.collection(USERS);
}

function initUsers(db, usersData=null) {
  return new Promise(function(resolve, reject) {
    if (usersData === null) {
      usersData = require(DEFAULT_USERS);
    }
    let d = [];
    for (let u of usersData) { d.push({_id: u.id, DATA: u}); }
    const collection = db.collection(USERS);
    collection.deleteMany({}, function(err, result) {
      if (err !== null) reject(err);
      collection.insertMany(d, function(err, result) {
	if (err !== null) reject(err);
	if (result.insertedCount !== d.length) {
	  reject(Error(`insert count ${result.insertedCount} !== ` +
		       `${d.length}`));
	}
	resolve(db);
      });
    });
  });
}


Users.prototype.getUser = function(id, mustFind=true) {
  const searchSpec = { _id: id };
  return this.users.find(searchSpec).toArray().
    then(function(users) {
      return new Promise(function(resolve, reject) {
	if (users.length === 1) {
	  resolve(users[0]);
	}
	else if (users.length == 0 && !mustFind) {
	  resolve(null);
	}
	else {
	  reject(new Error(`cannot find user ${id}`));
	}
      });
    });
}

Users.prototype.updateUser = function(id, randomobj) {
const d = { _id: id, $push:{AUTHTOKEN: randomobj}};
return this.users.replaceOne( { _id: id },{ $push:{ AUTHTOKEN:randomobj}}).
    then(function(result) {
      return new Promise(function(resolve, reject) {
	if (result.modifiedCount != 1) {
	  reject(new Error(`updated ${result.modifiedCount} users`));
	}
	else {
	  resolve();
	}
      });
    });
  
}

Users.prototype.newUser = function(id, hash, randomobj, user) {
	const d = { _id: id, PASSWORD: hash , AUTHTOKEN :[randomobj], DATA: user};
	return this.users.insertOne(d).
	then(function(results) {
	return new Promise((resolve) => resolve(results.insertedId));      
	});
}

Users.prototype.checkUser = function(id, randomvalue, user) {
	const k = { _id : id };
	return this.users.find(k).toArray().
	then(function(users) {
	return new Promise((resolve) => resolve(users[0]));
	
    });

}

module.exports = {
  Users: Users,
  initUsers: initUsers
};
