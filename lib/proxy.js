var MongoClient = require('mongodb').MongoClient
  , net = require('net')
  , Connection = require('./connection');

var Message = function() {  
  this.bytes = new Buffer();
}

Message.prototype.length = function() {
  return this.bytes.length;
}

var Proxy = function(options) {
  this.options = options; 
  this.debug = options.debug;
}

Proxy.prototype.start = function(callback) {
  var self = this;

  // Attempt to connect to MongoDB
  MongoClient.connect(self.options.u, function(err, db) {
    if(err) return callback(err);
    // Save the db object
    self.db = db;

    // Create a new tcp server
    self.server = net.createServer(function(conn) {
      if(self.debug) console.log('client connected');

      // Create connection object
      var connection = new Connection(self, conn);
    });

    // Listen to server
    self.server.listen(self.options.p, self.options.b, callback);
  });
}

module.exports = Proxy;