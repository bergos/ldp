/* global after, before, describe, it */

var assert = require('assert')
var fs = require('fs-extended')
var rdf = require('rdf-ext')
var request = require('superagent')
var JsonLdParser = require('rdf-parser-jsonld')
var Promise = require('bluebird')
var N3Parser = require('rdf-parser-n3')

function requestPromise (request) {
  return new Promise(function (resolve, reject) {
    request.end(function (error, result) {
      if (!error) {
        resolve(result)
      } else {
        reject(error)
      }
    })
  })
}

describe('ldp', function () {
  var server = null

  before(function (done) {
    fs.emptyDirSync('files')

    server = new (require(__dirname + '/support/server'))
    server.start(done)
  })

  after(function (done) {
    server.stop(done)
  })

  it('should return method not allowed for unknown method', function (done) {
    var connectRequest = request
      .get('http://localhost:8080/turtle/card1')

    connectRequest.method = 'TRACE'

    requestPromise(connectRequest).then(function (res) {
      assert.equal(res.status, 405)

      done()
    }).catch(function (error) {
      done(error)
    })
  })

  describe('Turtle format', function () {
    var card = null
    var card2 = null
    var cardGraph = null
    var card2Graph = null
    var card2FullGraph = null

    before(function (done) {
      card = fs.readFileSync(__dirname + '/support/card.ttl').toString()
      card2 = fs.readFileSync(__dirname + '/support/card2.ttl').toString()

      Promise.resolve().then(function () {
        return N3Parser.parse(card)
      }).then(function (graph) {
        cardGraph = graph

        return N3Parser.parse(card2)
      }).then(function (graph) {
        card2Graph = graph
        card2FullGraph = cardGraph.merge(card2Graph)
      }).asCallback(done)
    })

    it('should support HEAD method', function (done) {
      var iri = 'http://localhost:8080/turtle/head'

      var putRequest = request
        .put(iri)
        .send(card)
        .set('Content-Type', 'text/turtle')

      var headRequest = request
        .head(iri)
        .set('Accept', 'text/turtle')
        .buffer()

      requestPromise(putRequest).then(function (res) {
        assert.equal(res.statusType, 2)

        return requestPromise(headRequest)
      }).then(function (res) {
        assert.equal(res.statusType, 2)
      }).asCallback(done)
    })

    it('should add a graph using PUT method', function (done) {
      var iri = 'http://localhost:8080/turtle/put'

      var putRequest = request
        .put(iri)
        .send(card)
        .set('Content-Type', 'text/turtle')

      var getRequest = request
        .get(iri)
        .set('Accept', 'text/turtle')
        .buffer()

      requestPromise(putRequest).then(function (res) {
        assert.equal(res.statusType, 2)

        return requestPromise(getRequest)
      }).then(function (res) {
        assert.equal(res.statusType, 2)

        return N3Parser.parse(res.text)
      }).then(function (graph) {
        assert(cardGraph.equals(graph))
      }).asCallback(done)
    })

    it('should clear a graph using DELETE method', function (done) {
      var iri = 'http://localhost:8080/turtle/delete'

      var putRequest = request
        .put(iri)
        .send(card)
        .set('Content-Type', 'text/turtle')

      var deleteRequest = request
        .del(iri)

      var getRequest = request
        .get(iri)
        .set('Accept', 'text/turtle')
        .buffer()

      requestPromise(putRequest).then(function (res) {
        assert.equal(res.statusType, 2)

        return requestPromise(deleteRequest)
      }).then(function (res) {
        assert.equal(res.statusType, 2)

        return requestPromise(getRequest)
      }).then(function (res) {
        assert.equal(res.statusType, 4)
      }).asCallback(done)
    })

    it('should add triples to a graph using PATCH method', function (done) {
      var iri = 'http://localhost:8080/turtle/patch'

      var putRequest = request
        .put(iri)
        .send(card)
        .set('Content-Type', 'text/turtle')

      var patchRequest = request
        .patch(iri)
        .send(card2)
        .set('Content-Type', 'text/turtle')

      var getRequest = request
        .get(iri)
        .set('Accept', 'text/turtle')
        .buffer()

      requestPromise(putRequest).then(function (res) {
        assert.equal(res.statusType, 2)

        return requestPromise(patchRequest)
      }).then(function (res) {
        assert.equal(res.statusType, 2)

        return requestPromise(getRequest)
      }).then(function (res) {
        assert.equal(res.statusType, 2)

        return N3Parser.parse(res.text)
      }).then(function (graph) {
        assert(card2FullGraph.equals(graph))
      }).asCallback(done)
    })

    it('should support Accept header with q value', function (done) {
      var iri = 'http://localhost:8080/turtle/q-value'

      var putRequest = request
        .put(iri)
        .send(card)
        .set('Content-Type', 'text/turtle')

      var getRequest = request
        .get(iri)
        .set('Accept', 'text/html;q=0.3, application/ld+json;q=0.5, text/turtle;q=0.7')
        .buffer()

      requestPromise(putRequest).then(function (res) {
        assert.equal(res.statusType, 2)

        return requestPromise(getRequest)
      }).then(function (res) {
        assert.equal(res.statusType, 2)

        return N3Parser.parse(res.text)
      }).then(function (graph) {
        assert(cardGraph.equals(graph))
      }).asCallback(done)
    })

    it('should return not acceptable for unknown mimetype in Accept header', function (done) {
      var iri = 'http://localhost:8080/turtle/card1'

      var putRequest = request
        .put('http://localhost:8080/turtle/card1')
        .send(card)
        .set('Content-Type', 'text/turtle')

      var getRequest = request
        .get('http://localhost:8080/turtle/card1')
        .set('Accept', 'image/jpeg')
        .buffer()

      requestPromise(putRequest).then(function (res) {
        assert.equal(res.statusType, 2)

        return requestPromise(getRequest)
      }).then(function (res) {
        assert.equal(res.status, 406)
      }).asCallback(done)
    })
  })

  describe('JSON-LD format', function () {
    var card = null
    var card2 = null
    var cardGraph = null
    var card2Graph = null
    var card2FullGraph = null

    before(function (done) {
      card = fs.readFileSync(__dirname + '/support/card.json').toString()
      card2 = fs.readFileSync(__dirname + '/support/card2.json').toString()

      Promise.resolve().then(function () {
        return JsonLdParser.parse(card)
      }).then(function (graph) {
        cardGraph = graph

        return JsonLdParser.parse(card2)
      }).then(function (graph) {
        card2Graph = graph
        card2FullGraph = cardGraph.merge(card2Graph)
      }).asCallback(done)
    })

    it('should add a graph using PUT method', function (done) {
      var iri = 'http://localhost:8080/jsonld/put'

      var putRequest = request
        .put(iri)
        .send(card)
        .set('Content-Type', 'application/ld+json')

      var getRequest = request
        .get(iri)
        .set('Accept', 'application/ld+json')
        .buffer()

      requestPromise(putRequest).then(function (res) {
        assert.equal(res.statusType, 2)

        return requestPromise(getRequest)
      }).then(function (res) {
        assert.equal(res.statusType, 2)

        return JsonLdParser.parse(res.text)
      }).then(function (graph) {
        assert(cardGraph.equals(graph))
      }).asCallback(done)
    })

    it('should clear a graph using DELETE method', function (done) {
      var iri = 'http://localhost:8080/jsonld/delete'

      var putRequest = request
        .put('http://localhost:8080/jsonld/card2')
        .send(card)
        .set('Content-Type', 'application/ld+json')

      var deleteRequest = request
        .del('http://localhost:8080/jsonld/card2')

      var getRequest = request
        .get('http://localhost:8080/jsonld/card2')
        .set('Accept', 'application/ld+json')
        .buffer()

      requestPromise(putRequest).then(function (res) {
        assert.equal(res.statusType, 2)

        return requestPromise(deleteRequest)
      }).then(function (res) {
        assert.equal(res.statusType, 2)

        return requestPromise(getRequest)
      }).then(function (res) {
        assert.equal(res.statusType, 4)
      }).asCallback(done)
    })

    it('should add triples to a graph using PATCH method', function (done) {
      var iri = 'http://localhost:8080/jsonld/patch'

      var putRequest = request
        .put('http://localhost:8080/jsonld/card3')
        .send(card)
        .set('Content-Type', 'application/ld+json')

      var patchRequest = request
        .patch('http://localhost:8080/jsonld/card3')
        .send(card2)
        .set('Content-Type', 'application/ld+json')

      var getRequest = request
        .get('http://localhost:8080/jsonld/card3')
        .set('Accept', 'application/ld+json')
        .buffer()

      requestPromise(putRequest).then(function (res) {
        assert.equal(res.statusType, 2)

        return requestPromise(patchRequest)
      }).then(function (res) {
        assert.equal(res.statusType, 2)

        return requestPromise(getRequest)
      }).then(function (res) {
        assert.equal(res.statusType, 2)

        return JsonLdParser.parse(res.text)
      }).then(function (graph) {
        assert(card2FullGraph.equals(graph))
      }).asCallback(done)
    })

    it('should support Accept header with q value', function (done) {
      var iri = 'http://localhost:8080/jsonld/q-value'

      var putRequest = request
        .put(iri)
        .send(card)
        .set('Content-Type', 'application/ld+json')

      var getRequest = request
        .get(iri)
        .set('Accept', 'text/html;q=0.3, application/ld+json;q=0.7, text/turtle;q=0.5')
        .buffer()

      requestPromise(putRequest).then(function (res) {
        assert.equal(res.statusType, 2)

        return requestPromise(getRequest)
      }).then(function (res) {
        assert.equal(res.statusType, 2)

        return JsonLdParser.parse(res.text)
      }).then(function (graph) {
        assert(cardGraph.equals(graph))
      }).asCallback(done)
    })
  })

  describe('BlobStore', function () {
    it('should add a blob using PUT method', function (done) {
      var putRequest = request
        .put('http://localhost:8080/blob/string1')
        .send('test')
        .set('Content-Type', 'text/plain')

      requestPromise(putRequest).then(function (res) {
        assert.equal(res.statusCode, 201)
      }).asCallback(done)
    })

    it('should fetch a blob using GET method', function (done) {
      var putRequest = request
        .put('http://localhost:8080/blob/string4')
        .send('test')
        .set('Content-Type', 'text/plain')

      var getRequest = request
        .get('http://localhost:8080/blob/string4')
        .set('Accept', 'text/plain')
        .buffer()

      requestPromise(putRequest).then(function (res) {
        assert.equal(res.statusCode, 201)
      }).then(function () {
        return requestPromise(getRequest)
      }).then(function (res) {
        assert.equal(res.statusCode, 200)
        assert.equal(res.text, 'test')
      }).asCallback(done)
    })

    it('should fail with 404 fetching blob that doesn\'t exist using GET method', function (done) {
      var getRequest = request
        .get('http://localhost:8080/blob/string3')
        .set('Accept', 'text/plain')
        .buffer()

      requestPromise(getRequest).then(function (res) {
        assert.equal(res.statusCode, 404)
      }).asCallback(done)
    })

    it('should delete a blob using the DELETE method', function (done) {
      var putRequest = request
        .put('http://localhost:8080/blob/string4')
        .send('test')
        .set('Content-Type', 'text/plain')

      var clearRequest = request
        .del('http://localhost:8080/blob/string4')

      var getRequest = request
        .get('http://localhost:8080/blob/string4')
        .set('Accept', 'text/plain')
        .buffer()

      requestPromise(putRequest).then(function (res) {
        assert.equal(res.statusCode, 201)
      }).then(function () {
        return requestPromise(clearRequest)
      }).then(function (res) {
        assert.equal(res.statusCode, 204)
      }).then(function () {
        return requestPromise(getRequest)
      }).then(function (res) {
        assert.equal(res.statusCode, 404)
      }).asCallback(done)
    })
  })
})
