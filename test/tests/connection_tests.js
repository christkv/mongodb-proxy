exports.beforeTests = function(configuration, callback) {
  var Proxy = require('../../lib/proxy')
    , MongoClient = require('mongodb').MongoClient;

  // URI
  var mongodburi = "mongodb://localhost:31000/test";
  // Create a new proxy and start it
  var proxy = new Proxy({
    p: 51000, u: mongodburi, b: '127.0.0.1', debug:true
  });

  MongoClient.connect(mongodburi, function(err, db) {
    db.dropDatabase(function() {
      // Start the proxy
      proxy.start(callback);
    });
  });
}

exports['Should correctly connect to proxy'] = {
  metadata: { requires: { } },

  // The actual test we wish to run
  test: function(configuration, test) {
    var MongoClient = require('mongodb').MongoClient;

    // Url for connection to proxy
    var url = 'mongodb://localhost:51000/test';

    // Connect to mongodb
    MongoClient.connect(url, function(err, db) {
      test.equal(null, err);

      // Perform an inserts
      db.collection('t').insert([{a:1}, {b:1}, {c:1}, {d:1}], function(err, r) {
        test.equal(null, err);

        db.collection('t').find({}).batchSize(2).toArray(function(err, docs) {
          test.equal(null, err);

          db.close();
          test.done();
        });
      });
    });
  }
}

exports['Concurrent cursors'] = {
  metadata: { requires: { } },

  // The actual test we wish to run
  test: function(configuration, test) {
    var MongoClient = require('mongodb').MongoClient;

    // Url for connection to proxy
    var url = 'mongodb://localhost:51000/test';

    // Connect to mongodb
    MongoClient.connect(url, function(err, db) {
      test.equal(null, err);

      // Perform an inserts
      db.collection('t2').insert([{a:1}, {b:1}, {c:1}, {d:1}], function(err, r) {
        test.equal(null, err);

        var total = 10;
        var numberLeft = total;

        for(var i = 0; i < total; i++) {
          db.collection('t2').find({}).batchSize(2).toArray(function(err, docs) {
            test.equal(null, err);
            numberLeft = numberLeft - 1;

            if(numberLeft == 0) {
              db.close();
              test.done();
            }
          });          
        }
      });
    });
  }
}