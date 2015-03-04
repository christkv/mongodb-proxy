var Long = require('mongodb').Long;

var WireMessage = function(data) {
  this.data = data;
}

WireMessage.prototype.messageLength = function() {
  var index = 0;
  // Return the messageLength
  return this.data[index] | this.data[index + 1] << 8 | this.data[index + 2] << 16 | this.data[index + 3] << 24;
}

WireMessage.prototype.requestID = function() {
  var index = 4;
  // Return the messageLength
  return this.data[index] | this.data[index + 1] << 8 | this.data[index + 2] << 16 | this.data[index + 3] << 24;
}

WireMessage.prototype.responseTo = function() {
  var index = 8;
  // Return the messageLength
  return this.data[index] | this.data[index + 1] << 8 | this.data[index + 2] << 16 | this.data[index + 3] << 24;
}

WireMessage.prototype.opCode = function() {
  var index = 12;
  // Return the messageLength
  return this.data[index] | this.data[index + 1] << 8 | this.data[index + 2] << 16 | this.data[index + 3] << 24;
}

WireMessage.prototype.responseResponseFlags = function() {
  var index = 16;
  // Return the messageLength
  return this.data[index] | this.data[index + 1] << 8 | this.data[index + 2] << 16 | this.data[index + 3] << 24;
}

WireMessage.prototype.responseCursorID = function() {
  var index = 20;

  // Unpack the cursor
  var lowBits = this.data[index] | this.data[index + 1] << 8 | this.data[index + 2] << 16 | this.data[index + 3] << 24;
  index = index + 4;
  var highBits = this.data[index] | this.data[index + 1] << 8 | this.data[index + 2] << 16 | this.data[index + 3] << 24;
  index = index + 4;
  
  // Create long object
  return new Long(lowBits, highBits);
}

WireMessage.prototype.getMoreCursorID = function() {
  var index = this.data.length - 8;
  // Unpack the cursor
  var lowBits = this.data[index] | this.data[index + 1] << 8 | this.data[index + 2] << 16 | this.data[index + 3] << 24;
  index = index + 4;
  var highBits = this.data[index] | this.data[index + 1] << 8 | this.data[index + 2] << 16 | this.data[index + 3] << 24;
  index = index + 4;
  
  // Create long object
  return new Long(lowBits, highBits);
}

module.exports = WireMessage;