var WireMessage = require('./wire_message')
  , ReplyMessage = require('./reply_message')
  , m = require('mongodb');

/*
 * Connection wrapper
 */
var Connection = function(proxy, connection) {
  // The actual connection
  this.connection = connection;
  // Set up the message handler
  this.proxy = proxy;

  // Get server config
  this.db = proxy.db;

  // Connections by cursorId
  this.connections = {}

  // Unpack the mongodb-core
  if(this.db.serverConfig instanceof m.Server) {
    this.topology = this.db.serverConfig.s.server;
  } else if(this.db.serverConfig instanceof m.ReplSet) {
    this.topology = this.db.serverConfig.s.replset;
  } else if(this.db.serverConfig instanceof m.Mongos) {
    this.topology = this.db.serverConfig.s.mongos;
  }

  // Connection closed by peer
  connection.on('end', function() {
    if(proxy.debug) console.log('connection closed by client');
  });

  // Data handler
  connection.on('data', dataHandler(this));

  // Data handler
  connection.on('parseError', function(err) {
    if(proxy.debug) console.log('parseError received');
    connection.destroy();
  });
}

// Checks
var ismaster = new Buffer('ismaster');
var readPreference = new Buffer('$readPreference');

Connection.prototype.messageHandler = function(data) {
  var self = this;
  if(this.proxy.debug) console.log('message decoded');

  // Get the request Id
  var message = new WireMessage(data);
  
  // We need this to build a response message
  var requestId = message.requestID();
  var responseTo = message.responseTo();
  var opCode = message.opCode();

  // Check if we have an ismaster command
  if(bufferIndexOf(data, ismaster, 0) != -1) {
    if(this.proxy.debug) console.log('decoded ismaster command');
        
    // Create the response document
    var ismasterResponse = {
      "ismaster" : true,
      "msg" : "isdbgrid",
      "maxBsonObjectSize" : 16777216,
      "maxMessageSizeBytes" : 48000000,
      "maxWriteBatchSize" : 1000,
      "localTime" : new Date(),
      "maxWireVersion" : 3,
      "minWireVersion" : 0,
      "ok" : 1
    }

    // Create a new Message Response and reply to the ismaster
    var reply = new ReplyMessage(self.topology.bson, requestId, responseTo, [ismasterResponse]);
    // Write it to the connection
    self.connection.write(reply.toBin());
  } else {
    // Associate responses with specfic connections
    var callbackFunction = function(_clientMessage, _clientConnection) {
      // Client message
      var clientMessage = new WireMessage(_clientMessage);
      // Store a new connection if needed
      var connection = null;

      // If we have a getmore
      if(clientMessage.opCode() == 2005) {
        // Unpack the cursor Id
        var curs = clientMessage.getMoreCursorID();
        // Use the pinned connection
        self.connections[curs.toString()].connection.write(_clientMessage);
      } else if(clientMessage.opCode() == 2004) {
        // Get the connection
        connection = server.getConnection();
        // Write the data to the connection
        connection.connection.write(_clientMessage);
      }
     
      //
      // Return the handler    
      return function(err, data) {
        // Extract WireProtocol information
        var responseMessage = new WireMessage(data.raw);
        // Extract the cursor
        var cursorID = responseMessage.responseCursorID();

        // If we have a zero cursorId delete any pinned connections
        if(cursorID.isZero()
          && (clientMessage.opCode() == 2004 || clientMessage.opCode() == 2005)) {
          delete self.connections[clientMessage.getMoreCursorID()];
        } else if(!cursorID.isZero()
          && self.connections[cursorID] == null && (clientMessage.opCode() == 2004 || clientMessage.opCode() == 2005)) {
          self.connections[cursorID] = connection;
        }

        // Return the result
        _clientConnection.write(data.raw);        
      }
    }

    // Proxy all the commands to the server
    var server = this.topology.getServer();
    // Get the callbacks
    var callbacks = server.s.callbacks;    
    // Register a callback
    callbacks.register(requestId, callbackFunction(data, this.connection));
  }
}

/*
 * Buffer indexOf
 */
var bufferIndexOf = function(buf,search,offset){
  offset = offset||0
  
  var m = 0;
  var s = -1;
  for(var i=offset;i<buf.length;++i){
    if(buf[i] == search[m]) {
      if(s == -1) s = i;
      ++m;
      if(m == search.length) break;
    } else {
      s = -1;
      m = 0;
    }
  }

  if (s > -1 && buf.length - s < search.length) return -1;
  return s;
} 

/*
 * Read wire protocol message off the sockets
 */
var dataHandler = function(self) {
  return function(data) {
    // Parse until we are done with the data
    while(data.length > 0) {
      // If we still have bytes to read on the current message
      if(self.bytesRead > 0 && self.sizeOfMessage > 0) {
        // Calculate the amount of remaining bytes
        var remainingBytesToRead = self.sizeOfMessage - self.bytesRead;
        // Check if the current chunk contains the rest of the message
        if(remainingBytesToRead > data.length) {
          // Copy the new data into the exiting buffer (should have been allocated when we know the message size)
          data.copy(self.buffer, self.bytesRead);
          // Adjust the number of bytes read so it point to the correct index in the buffer
          self.bytesRead = self.bytesRead + data.length;

          // Reset state of buffer
          data = new Buffer(0);
        } else {
          // Copy the missing part of the data into our current buffer
          data.copy(self.buffer, self.bytesRead, 0, remainingBytesToRead);
          // Slice the overflow into a new buffer that we will then re-parse
          data = data.slice(remainingBytesToRead);

          // Emit current complete message
          try {
            var emitBuffer = self.buffer;
            // Reset state of buffer
            self.buffer = null;
            self.sizeOfMessage = 0;
            self.bytesRead = 0;
            self.stubBuffer = null;
            // Emit the buffer
            self.messageHandler(emitBuffer, self);
          } catch(err) {
            var errorObject = {err:"socketHandler", trace:err, bin:self.buffer, parseState:{
              sizeOfMessage:self.sizeOfMessage,
              bytesRead:self.bytesRead,
              stubBuffer:self.stubBuffer}};
            // We got a parse Error fire it off then keep going
            self.emit("parseError", errorObject, self);
          }
        }
      } else {
        // Stub buffer is kept in case we don't get enough bytes to determine the
        // size of the message (< 4 bytes)
        if(self.stubBuffer != null && self.stubBuffer.length > 0) {
          // If we have enough bytes to determine the message size let's do it
          if(self.stubBuffer.length + data.length > 4) {
            // Prepad the data
            var newData = new Buffer(self.stubBuffer.length + data.length);
            self.stubBuffer.copy(newData, 0);
            data.copy(newData, self.stubBuffer.length);
            // Reassign for parsing
            data = newData;

            // Reset state of buffer
            self.buffer = null;
            self.sizeOfMessage = 0;
            self.bytesRead = 0;
            self.stubBuffer = null;

          } else {

            // Add the the bytes to the stub buffer
            var newStubBuffer = new Buffer(self.stubBuffer.length + data.length);
            // Copy existing stub buffer
            self.stubBuffer.copy(newStubBuffer, 0);
            // Copy missing part of the data
            data.copy(newStubBuffer, self.stubBuffer.length);
            // Exit parsing loop
            data = new Buffer(0);
          }
        } else {
          if(data.length > 4) {
            // Retrieve the message size
            // var sizeOfMessage = data.readUInt32LE(0);
            var sizeOfMessage = data[0] | data[1] << 8 | data[2] << 16 | data[3] << 24;
            // If we have a negative sizeOfMessage emit error and return
            if(sizeOfMessage < 0 || sizeOfMessage > self.maxBsonMessageSize) {
              var errorObject = {err:"socketHandler", trace:'', bin:self.buffer, parseState:{
                sizeOfMessage: sizeOfMessage,
                bytesRead: self.bytesRead,
                stubBuffer: self.stubBuffer}};
              // We got a parse Error fire it off then keep going
              self.emit("parseError", errorObject, self);
              return;
            }

            // Ensure that the size of message is larger than 0 and less than the max allowed
            if(sizeOfMessage > 4 && sizeOfMessage < self.maxBsonMessageSize && sizeOfMessage > data.length) {
              self.buffer = new Buffer(sizeOfMessage);
              // Copy all the data into the buffer
              data.copy(self.buffer, 0);
              // Update bytes read
              self.bytesRead = data.length;
              // Update sizeOfMessage
              self.sizeOfMessage = sizeOfMessage;
              // Ensure stub buffer is null
              self.stubBuffer = null;
              // Exit parsing loop
              data = new Buffer(0);

            } else if(sizeOfMessage > 4 && sizeOfMessage < self.maxBsonMessageSize && sizeOfMessage == data.length) {
              try {
                var emitBuffer = data;
                // Reset state of buffer
                self.buffer = null;
                self.sizeOfMessage = 0;
                self.bytesRead = 0;
                self.stubBuffer = null;
                // Exit parsing loop
                data = new Buffer(0);
                // Emit the message
                self.messageHandler(emitBuffer, self);
              } catch (err) {
                var errorObject = {err:"socketHandler", trace:err, bin:self.buffer, parseState:{
                  sizeOfMessage:self.sizeOfMessage,
                  bytesRead:self.bytesRead,
                  stubBuffer:self.stubBuffer}};
                // We got a parse Error fire it off then keep going
                self.emit("parseError", errorObject, self);
              }
            } else if(sizeOfMessage <= 4 || sizeOfMessage > self.maxBsonMessageSize) {
              var errorObject = {err:"socketHandler", trace:null, bin:data, parseState:{
                sizeOfMessage:sizeOfMessage,
                bytesRead:0,
                buffer:null,
                stubBuffer:null}};
              // We got a parse Error fire it off then keep going
              self.emit("parseError", errorObject, self);

              // Clear out the state of the parser
              self.buffer = null;
              self.sizeOfMessage = 0;
              self.bytesRead = 0;
              self.stubBuffer = null;
              // Exit parsing loop
              data = new Buffer(0);
            } else {
              var emitBuffer = data.slice(0, sizeOfMessage);
              // Reset state of buffer
              self.buffer = null;
              self.sizeOfMessage = 0;
              self.bytesRead = 0;
              self.stubBuffer = null;
              // Copy rest of message
              data = data.slice(sizeOfMessage);
              // Emit the message
              self.messageHandler(emitBuffer, self);
            }
          } else {
            // Create a buffer that contains the space for the non-complete message
            self.stubBuffer = new Buffer(data.length)
            // Copy the data to the stub buffer
            data.copy(self.stubBuffer, 0);
            // Exit parsing loop
            data = new Buffer(0);
          }
        }
      }
    }
  }
}

module.exports = Connection;