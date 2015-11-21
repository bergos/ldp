var fsBlogstore = require('fs-blob-store')
var http = require('http')
var rdf = require('rdf-ext')
var Ldp = require('../../ldp')
var InMemoryStore = require('rdf-store-inmemory')

function LdpServer () {
  var ldp = new Ldp(rdf, {
    blobStore: fsBlogstore('.'),
    blobStoreOptions: {path: 'files'},
    graphStore: new InMemoryStore()
  })
  var server = http.createServer(ldp.middleware)

  this.start = function (done) {
    server.listen('8080', 'localhost', done)
  }

  this.stop = function (done) {
    server.close(done)
  }
}

module.exports = LdpServer
