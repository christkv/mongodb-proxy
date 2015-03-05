# MongoDB Proxy

The MongoDB proxy was developed to help drivers who do not have either replicaset or advanced authentication support for MongoDB. It aims to make it possible for any basic mongodb driver to be able to tap into the advanced features provided by MongoDB.

## Design of Proxy

The Proxy uses the node.js mongodb native driver to provide the glue between your driver and MongoDB. For each connection you open to the proxy an equal connection is opened to the MongoDB server on the other side (or in the case of a replicaset 1 connection per member in the Replicaset). The takes care of all the complex authentication mechanisms as well as managing connectivity to the MongoDB topology.

The proxy identifies itself to the driver as a `mongos` proxy and the connecting driver can route queries sending the `$readPreference` field in the query.

## Proxy Configuration Settings

### JSON Configuration file settings

The proxy configuration `json` file options

| Option | Description |
|-|-|
| port | The tcp port the proxy binds to |
| uri | The MongoDB Topology URI (See driver docs for parameters) |
| bind_to | The tcp address to bind the proxy to |
| log_level | The logging level [error/info/debug] |
| log_file | The log file to append to |
| auth.sslCA | Location of certificate authority file |
| auth.sslCert | Location of public certificate file we are presenting |
| auth.sslKey | Location of private certificate file we are presenting |
| auth.sslPass | SSL Certificate password |
| auth.sslValidate | Validate mongod certificate |

Example configuration file

```js
{
    "port": 51000
  , "uri": "mongodb://localhost:27017/test"
  , "bind_to": "127.0.0.1"
  , "auth": {
      "sslCA": "./ca.pem"
    , "sslCert": "./cert.pem"
    , "sslKey": "./cert.pem"
    , "sslPass": "somekey"
    , "sslValidate": false
  }
  , "log_level": "error"
  , "log_file": "./proxy.log"
}
```

### Command line configuration file settings

```
Usage: node ./index.js

Examples:
  node ./index.js -p 51000 -b 127.0.0.1 -u mongodb://localhost:27017    Run proxy on port 5100 and bind to localhost


Options:
  -p, --port          Port proxy is running on                                [default: 51000]
  -u, --uri           Connection url to mongodb                               [default: "mongodb://localhost:27017/test"]
  -b, --bind_to       Bind to host interface                                  [default: "127.0.0.1"]
  -c, --config        JSON configuration file
  --auth-sslCA        Location of certificate authority file
  --auth-sslCert      Location of public certificate file we are presenting
  --auth-sslKey       Location of private certificate file we are presenting
  --auth-sslPass      SSL Certificate password
  --auth-sslValidate  Validate mongod certificate                             [default: false]
  --log_level                                                                 [default: "error"]
  --log_file
```

### Simple Example of running the proxy

Start up a mongod process

```
mkdir data
mongod --dbpath=./data
```

Start up the proxy

```
node ./index.js -u mongodb://localhost:27017/test -p 61000
```

Connect to MongoDB via the proxy using the shell

```
mongo --port 61000
```