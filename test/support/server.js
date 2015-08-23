var
  http = require('http'),
  rdf = require('rdf-interfaces'),
  Ldp = require('../../ldp');


require('rdf-ext')(rdf);


var LdpServer = function () {
  var
    store = new rdf.InMemoryStore(),
    ldp = new Ldp(rdf, store/*, {log:console.log}*/),
    server = http.createServer(ldp.middleware);

  this.start = function (done) {
    server.listen('8080', 'localhost', done);
  };

  this.stop = function (done) {
    server.close(done);
  }
};


module.exports = LdpServer;