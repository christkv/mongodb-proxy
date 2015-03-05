var Proxy = require('./lib/proxy')
  , fs = require('fs');

// Start the 
var yargs = require('yargs')
  .usage('Start a proxy.\nUsage: $0')
  .example('$0 -p 51000 -b 127.0.0.1 -u mongodb://localhost:27017', 'Run proxy on port 5100 and bind to localhost')
  // The Monitor process port
  .describe('p', 'Port proxy is running on')
  .default('p', 51000)
  .alias('p', 'port')
  // Number of processes to use in the execution
  .describe('u', 'Connection url to mongodb')
  .default('u', 'mongodb://localhost:27017/test')
  .alias('u', 'uri')
  // Run all the processes locally
  .describe('b', 'Bind to host interface')
  .default('b', '127.0.0.1')
  .alias('b', 'bind_to')
  // Allow us to specify a json configuration file
  .describe('c', 'JSON configuration file')
  .alias('c', 'config')
  // SSL Cert options
  .describe('auth-sslCA', 'Location of certificate authority file')
  .describe('auth-sslCert', 'Location of public certificate file we are presenting')
  .describe('auth-sslKey', 'Location of private certificate file we are presenting')
  .describe('auth-sslPass', 'SSL Certificate password')
  .describe('auth-sslValidate', 'Validate mongod certificate')
  .default('auth-sslValidate', false)
  // Logger information
  .describe('log_level')
  .default('log_level', 'error')
  .describe('log_file')

// Parse options
var parseOptions = function(argv) {
  // Do we have a configuration file
  if(argv.c) return JSON.parse(fs.readFileSync(argv.c, 'utf8'));

  // Create options object from cmd line options
  var options = {auth: {}};
  
  // Let's create the final object
  if(argv.p) options.port = argv.p;
  if(argv.u) options.uri = argv.u;
  if(argv.b) options.bind_to = argv.b;
  if(argv.debug) options.debug = argv.debug;
  
  // Set the authentication options
  if(argv['auth-sslCA']) options.auth.sslCA = argv['auth-sslCA'];
  if(argv['auth-sslCert']) options.auth.sslCert = argv['auth-sslCert'];
  if(argv['auth-sslKey']) options.auth.sslKey = argv['auth-sslKey'];
  if(argv['auth-sslPass']) options.auth.sslCA = argv['auth-sslPass'];
  options.auth.sslValidate = argv['auth-sslValidate'];
  
  // Logger options
  if(argv['log_level']) options['log_level'] = argv['log_level'];
  if(argv['log_file']) options['log_file'] = argv['log_file'];

  // Return the options
  return options;
}

// Get parsed arguments
var argv = yargs.argv

// List help
if(argv.h) return console.log(yargs.help())

// Parse the options and generate final field
var options = parseOptions(argv);

// Create and start the proxy
new Proxy(options).start();