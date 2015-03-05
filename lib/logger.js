var f = require('util').format
  , fs = require('fs');

var Logger = function(logger, level) {
  this.logger = logger;
  this.level = level;
}

Logger.prototype.isError = function() {
  return this.level == 'error';
}

Logger.prototype.isInfo = function() {
  return this.level == 'info';
}

Logger.prototype.isDebug = function() {
  return this.level == 'debug';
}

Logger.prototype.error = function(message) {  
  this.logger.log(f('[ERROR] %s %s', new Date(), message));
}

Logger.prototype.info = function(message) {  
  this.logger.log(f('[INFO] %s %s', new Date(), message));
}

Logger.prototype.debug = function(message) {  
  this.logger.log(f('[DEBUG] %s %s', new Date(), message));
}

Logger.createFileLogger = function(file, level) {
  return new Logger(new FileLogger(file), level);
}

Logger.createStdioLogger = function(level) {  
  return new Logger(new StdioLogger(), level);
}

/*
 * File logger
 */
var FileLogger = function(file) {
  this.file = file;
}

FileLogger.prototype.log = function(message) {
  fs.appendFileSync(this.file, f("%s\n", message));
}

/*
 * StdioLogger
 */
var StdioLogger = function() {  
}

StdioLogger.prototype.log = function(message) {
  console.log(message);
}

module.exports = Logger;