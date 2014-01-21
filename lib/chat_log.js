var mongo = require('mongodb');
var db;
var table_name = 'chat_log';

var CHAT_LIMIT = 100;

module.exports.set_db = function(current_db){
  db = current_db;
};

module.exports.add = function(data,callback){
  db.collection(table_name, function(err, collection) {
    collection.save( data, function(){
      if (callback != undefined ){
        callback();
      }
    });
  });
};

module.exports.remove = function(id){
  db.collection(table_name, function(err, collection) {
    collection.remove( {_id: new mongo.ObjectID(id)} ,{safe:true}, function(){});
  });
};


module.exports.get = function(callback){
  db.collection(table_name, function(err, collection) {
    collection.find({}, {limit: CHAT_LIMIT, sort:{date: -1}}).toArray(function(err, results) {
      callback(results);
    });
  });
};

module.exports.size = function(callback){
  db.collection(table_name, function(err, collection) {
    collection.find().toArray(function(err, results) {
      callback(results.length);
    });
  });
};
