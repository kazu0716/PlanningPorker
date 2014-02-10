var mongo = require('mongodb');

var db;
var table_latest_text_name = 'latest_text';
var table_log_name = 'text_log';
var table_active_number = 'active_number';
var LOG_LIMIT = 20;
var DEFAULT_ACTIVE_NUMBER = 3;

module.exports.set_db = function(current_db){
  db = current_db;
};

// latest text cache
var text_log = [];

module.exports.update_latest_text = function(text_log){
  db.collection(table_latest_text_name, function(err, collection) {
    collection.findOne({no: text_log.no},function(err, latest_text) {
      if (latest_text != null){
        collection.update( {_id: latest_text._id}, {'$set': text_log }, {safe: true}, function(){});
      }else{
        collection.save( text_log, function(){} );
      }
    });
  });
}

module.exports.get_latest = function(callback){
  db.collection(table_latest_text_name, function(err, collection) {
    collection.find().toArray(function(err, latest_texts) {
      if (latest_texts != null && latest_texts.length != 0){
        callback(latest_texts);
        text_log = latest_texts;
      }else{
        callback([]);
      }
    });
  });
}

module.exports.get_logs = function(callback){
  db.collection(table_log_name, function(err, collection) {
    collection.find({}, {limit: LOG_LIMIT, sort: {date: -1}}).toArray(function(err, results) {
      callback(results);
    });
  });
}

module.exports.get_logs_by_no = function(no, callback){
  db.collection(table_log_name, function(err, collection) {
    collection.find({no: no}, {limit: LOG_LIMIT, sort: {date: -1}}).toArray(function(err, results) {
      callback({no: no, logs: results});
    });
  });
}

module.exports.add_history = function(no, callback){
  var that = this;

  db.collection(table_latest_text_name, function(err, collection) {
    collection.findOne({no: no},function(err, latest_text) {
      if (latest_text != null){
        delete latest_text['_id'];
        that.add(latest_text, callback);
      }
    });
  });
}

module.exports.add = function(current_log, callback){
  var that = this;

  this.can_add(current_log,function(result){
    if (result){
      that.add_impl(current_log,function(){
        callback(true);
      });
    }else{
      callback(false);
    }
  });
}

// 前回データを履歴に保存するか判定する
module.exports.can_add = function(current_log, callback){
  // バックアップ対象が空文字と改行のみの場合は保存しない
  var blank = new RegExp("(^[ \r\n]+$|^$)");
  if (blank.test(current_log.text)) { callback(false); return; }

  // 前回のバックアップと同様であれば保存しない
  db.collection(table_log_name, function(err, collection) {
    collection.find({no: current_log.no}, {limit:1, sort:{date: -1}}).toArray(function(err, logs) {
      if (logs.length > 0 && logs[0].text == current_log.text ){ callback(false); return; }
      callback(true);
    });
  });
}

module.exports.add_impl = function(text_log,callback){
  db.collection(table_log_name, function(err, collection) {
    collection.insert( text_log, callback );
  });
}

module.exports.remove = function(id,callback){
  db.collection(table_log_name, function(err, collection) {
    collection.remove( {_id: new mongo.ObjectID(id)} ,{safe:true}, function(err, numberOfRemovedDocs) {
      callback();
    });
  });
}

module.exports.get_active_number = function(callback){
  db.collection(table_active_number, function(err, collection) {
    collection.findOne({},function(err, number) {
      if (number == null){
        number = {num: DEFAULT_ACTIVE_NUMBER};
      }

      callback(number);
    });
  });
}

module.exports.update_active_number = function(number){
  db.collection(table_active_number, function(err, collection) {
    collection.findOne({},function(err, active_number) {
      if (active_number != null){
        collection.update( {_id: active_number._id}, {'$set': number}, {safe: true}, function(){});
      }else{
        collection.save( number, function(){} );
      }
    });
  });
}
