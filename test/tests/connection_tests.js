exports.beforeTests = function(configuration, callback) {
  var Proxy = require('../../lib/proxy');

  // Create a new proxy and start it
  var proxy = new Proxy({
    p: 51000, u: 'mongodb://localhost:31000/test', b: '127.0.0.1', debug:true
  });

  // Start the proxy
  proxy.start(callback);
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
          console.dir(docs)

          db.close();
          test.done();
        });
      });
    });
  }
}