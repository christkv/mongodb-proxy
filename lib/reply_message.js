var Buffer = require('buffer').Buffer;

var ReplyMessage = function(bson, requestId, responseTo, documents) {  
  this.bson = bson;
  this.requestId =  requestId;
  this.responseTo = responseTo;
  this.documents = documents;
}

//
// Uses a single allocated buffer for the process, avoiding multiple memory allocations
ReplyMessage.prototype.toBin = function() {
  // var length = 4 + Buffer.byteLength(this.ns) + 1 + 4 + 8 + (4 * 4);
  var length = 16 + 4 + 8 + 4 + 4;

  // Calculate documents length
  for(var i = 0; i < this.documents.length; i++) {
    length += this.bson.calculateObjectSize(this.documents[0]);
  }

  // Create command buffer
  var index = 0;
  // Allocate buffer
  var _buffer = new Buffer(length);
  
  // Write header length
  _buffer[index + 3] = (length >> 24) & 0xff;
  _buffer[index + 2] = (length >> 16) & 0xff;
  _buffer[index + 1] = (length >> 8) & 0xff;
  _buffer[index] = (length) & 0xff;
  index = index + 4;

  // Write responseTo as requestId
  _buffer[index + 3] = (this.responseTo >> 24) & 0xff;
  _buffer[index + 2] = (this.responseTo >> 16) & 0xff;
  _buffer[index + 1] = (this.responseTo >> 8) & 0xff;
  _buffer[index] = (this.responseTo) & 0xff;
  index = index + 4;

  // Write requestId as responseTo 
  _buffer[index + 3] = (this.requestId >> 24) & 0xff;
  _buffer[index + 2] = (this.requestId >> 16) & 0xff;
  _buffer[index + 1] = (this.requestId >> 8) & 0xff;
  _buffer[index] = (this.requestId) & 0xff;
  index = index + 4;

  // Write opCode OP_REPLY
  _buffer[index + 3] = (1 >> 24) & 0xff;
  _buffer[index + 2] = (1 >> 16) & 0xff;
  _buffer[index + 1] = (1 >> 8) & 0xff;
  _buffer[index] = (1) & 0xff;
  index = index + 4;

  // Write reponseFlags
  _buffer[index + 3] = (0 >> 24) & 0xff;
  _buffer[index + 2] = (0 >> 16) & 0xff;
  _buffer[index + 1] = (0 >> 8) & 0xff;
  _buffer[index] = (0) & 0xff;
  index = index + 4;

  // Write cursorId 0 part 1
  _buffer[index + 3] = (0 >> 24) & 0xff;
  _buffer[index + 2] = (0 >> 16) & 0xff;
  _buffer[index + 1] = (0 >> 8) & 0xff;
  _buffer[index] = (0) & 0xff;
  index = index + 4;

  // Write cursorId 0 part 2
  _buffer[index + 3] = (0 >> 24) & 0xff;
  _buffer[index + 2] = (0 >> 16) & 0xff;
  _buffer[index + 1] = (0 >> 8) & 0xff;
  _buffer[index] = (0) & 0xff;
  index = index + 4;

  // Starting from
  _buffer[index + 3] = (0 >> 24) & 0xff;
  _buffer[index + 2] = (0 >> 16) & 0xff;
  _buffer[index + 1] = (0 >> 8) & 0xff;
  _buffer[index] = (0) & 0xff;
  index = index + 4;

  // Write number of documents returned
  _buffer[index + 3] = (this.documents.length >> 24) & 0xff;
  _buffer[index + 2] = (this.documents.length >> 16) & 0xff;
  _buffer[index + 1] = (this.documents.length >> 8) & 0xff;
  _buffer[index] = (this.documents.length) & 0xff;
  index = index + 4;

  // Write all the documents
  for(var i = 0; i < this.documents.length; i++) {
    var buffer = this.bson.serialize(this.documents[i], false, true);
    // Write the document into the buffer
    buffer.copy(_buffer, index, 0, buffer.length);
    // Adjust the index
    index = index + buffer.length;
  }

  // Return buffer
  return _buffer;
}

module.exports = ReplyMessage;