var util = require('./util');
var path = require('path');
module.exports.action = function(data, callback){
  util.getFileList('./lib/bots',function(files){
    console.log(files);
    files.forEach(function(file){
      if (file.match(/.js$/)){
        var bot = require("./bots/" + file);
        if (typeof bot.action == "function"){
          try {
            bot.action(data, callback);
          }catch(e){
            console.log("Error: " + file + e);
            var reply = {
              name: "Bot",
              msg: "@" + data.name + "さん " + file + " に誤りがあるようです<br> " + e,
              interval: 1,
            };

            callback(reply);
          }
        }
        // for hot deploy
        delete(require.cache[path.resolve("./lib/bots/" + file)]);
      }
    });
  });
};


