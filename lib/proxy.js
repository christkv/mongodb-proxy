var MongoClient = require('mongodb').MongoClient
  , net = require('net')
  , f = require('util').format
  , Logger = require('./logger')
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

  // Create log file based logger or stdio
  if(options.log_file) {
    this.logger = Logger.createFileLogger(options.log_file, options.log_level);
  } else {
    this.logger = Logger.createStdioLogger(options.log_level);
  }
}

Proxy.prototype.start = function(callback) {
  var self = this;

  // Create a new tcp server
  self.server = net.createServer(function(conn) {
    // if(self.debug) console.log('client connected');
    if(self.logger.isInfo()) self.logger.info(f('client connected from %s:%s', conn.remoteAddress, conn.remotePort));

    // Create connection object
    var connection = new Connection(self, conn, self.logger);
  });

  // Listen to server
  self.server.listen(self.options.port, self.options.bind_to, callback);
}

module.exports = Proxy;