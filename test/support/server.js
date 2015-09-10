var http = require('http')
var rdf = require('rdf-ext')()
var Ldp = require('../../ldp')

function LdpServer () {
  var store = new rdf.InMemoryStore()
  var ldp = new Ldp(rdf, store/*, {log:console.log}*/)
  var server = http.createServer(ldp.middleware)

  this.start = function (done) {
    server.listen('8080', 'localhost', done)
  }

  this.stop = function (done) {
    server.close(done)
  }
}

module.exports = LdpServer
