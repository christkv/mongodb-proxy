var Proxy = require('./lib/proxy');

// Start the 
var yargs = require('yargs')
  .usage('Start a proxy.\nUsage: $0')
  .example('$0 -p 51000 -b 127.0.0.1 -u mongodb://localhost:27017', 'Run proxy on port 5100 and bind to localhost')
  // The Monitor process port
  .describe('p', 'Port proxy is running on')
  .default('p', 51000)
  // Number of processes to use in the execution
  .describe('u', 'Connection url to mongodb')
  .require('u')
  // Run all the processes locally
  .describe('b', 'Bind to host interface')
  .default('b', '127.0.0.1')
  // The scenario file to execute
  .describe('debug', 'Run with debug enables')
  .default('debug', false)

// Get parsed arguments
var argv = yargs.argv

// List help
if(argv.h) return console.log(yargs.help())

// Create and start the proxy
new Proxy(argv).start();