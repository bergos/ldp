var
  assert = require('assert'),
  fs = require('fs'),
  rdf = require('rdf-interfaces'),
  request  = require('superagent');

require('rdf-ext')(rdf);

var utils = require('rdf-test-utils')(rdf);


//TODO: earl reports (jsonld projects contains one)

describe('ldp', function() {
  var server = null;

  before(function(done) {
    server = new (require(__dirname + '/support/server'));
    server.start(done);
  });

  after(function(done) {
    server.stop(done);
  });

  describe('Turtle format', function() {
    var
      card = null,
      card2 = null,
      cardGraph = null,
      card2Graph = null,
      card2FullGraph = null;

    before(function(done) {
      card = fs.readFileSync(__dirname + '/support/card.ttl').toString();
      card2 = fs.readFileSync(__dirname + '/support/card2.ttl').toString();

      utils.p.parseTurtle(card)
        .then(function(graph) { cardGraph = graph; })
        .then(function() { return utils.p.parseTurtle(card2); })
        .then(function(graph) { card2Graph = graph; })
        .then(function() {
          card2FullGraph = cardGraph.merge(card2Graph);

          done();
      });
    });

    it('should add a graph using PUT method', function(done) {
      var clearRequest = request
        .del('http://localhost:8080/turtle/card1');

      var putRequest = request
        .put('http://localhost:8080/turtle/card1')
        .send(card)
        .set('Content-Type', 'text/turtle');

      var getRequest = request
        .get('http://localhost:8080/turtle/card1')
        .set('Accept', 'text/turtle')
        .buffer();

      utils.p.request(clearRequest)
        .then(function(res) { return utils.p.assertStatusSuccess(res); })
        .then(function() { return utils.p.request(putRequest); })
        .then(function(res) { return utils.p.assertStatusSuccess(res); })
        .then(function() { return utils.p.request(getRequest); })
        .then(function(res) { return utils.p.assertStatusSuccess(res); })
        .then(function(res) { return utils.p.parseTurtle(res.text); })
        .then(function(graph) { return utils.p.assertGraphEqual(graph, cardGraph); })
        .then(function() { done(); });
      });

    it('should clear a graph using DELETE method', function(done) {
      var clearRequest = request
        .del('http://localhost:8080/turtle/card2');

      var putRequest = request
        .put('http://localhost:8080/turtle/card2')
        .send(card)
        .set('Content-Type', 'text/turtle');

      var deleteRequest = request
        .del('http://localhost:8080/turtle/card2');

      var getRequest = request
        .get('http://localhost:8080/turtle/card2')
        .set('Accept', 'text/turtle')
        .buffer();

      utils.p.request(clearRequest)
        .then(function(res) { return utils.p.assertStatusSuccess(res); })
        .then(function() { return utils.p.request(putRequest); })
        .then(function(res) { return utils.p.assertStatusSuccess(res); })
        .then(function() { return utils.p.request(deleteRequest); })
        .then(function(res) { return utils.p.assertStatusSuccess(res); })
        .then(function() { return utils.p.request(getRequest); })
        .then(function(res) { return (res.statusType == 4 ? null : utils.p.parseTurtle(res.text)); })
        .then(function(graph) { return utils.p.assertGraphEmpty(graph); })
        .then(function() { done(); });
    });

    it('should add triples to a graph using PATCH method', function(done) {
      var clearRequest = request
        .del('http://localhost:8080/turtle/card3');

      var putRequest = request
        .put('http://localhost:8080/turtle/card3')
        .send(card)
        .set('Content-Type', 'text/turtle');

      var patchRequest = request
        .patch('http://localhost:8080/turtle/card3')
        .send(card2)
        .set('Content-Type', 'text/turtle');

      var getRequest = request
        .get('http://localhost:8080/turtle/card3')
        .set('Accept', 'text/turtle')
        .buffer();

      utils.p.request(clearRequest)
        .then(function(res) { return utils.p.assertStatusSuccess(res); })
        .then(function() { return utils.p.request(putRequest); })
        .then(function(res) { return utils.p.assertStatusSuccess(res); })
        .then(function() { return utils.p.request(patchRequest); })
        .then(function(res) { return utils.p.assertStatusSuccess(res); })
        .then(function() { return utils.p.request(getRequest); })
        .then(function(res) { return utils.p.assertStatusSuccess(res); })
        .then(function(res) { return utils.p.parseTurtle(res.text); })
        .then(function(graph) { return utils.p.assertGraphEqual(graph, card2FullGraph); })
        .then(function() { done(); });
      });
    });

  describe('JSON-LD format', function() {
    var
      card = null,
      card2 = null,
      cardGraph = null,
      card2Graph = null,
      card2FullGraph = null;

    before(function(done) {
      card = fs.readFileSync(__dirname + '/support/card.json').toString();
      card2 = fs.readFileSync(__dirname + '/support/card2.json').toString();

      utils.p.parseJsonLd(card)
        .then(function(graph) { cardGraph = graph; })
        .then(function() { return utils.p.parseJsonLd(card2); })
        .then(function(graph) { card2Graph = graph; })
        .then(function() {
          card2FullGraph = cardGraph.merge(card2Graph);

          done();
      });
    });

    it('should add a graph using PUT method', function(done) {
      var clearRequest = request
        .del('http://localhost:8080/jsonld/card1');

      var putRequest = request
        .put('http://localhost:8080/jsonld/card1')
        .send(card)
        .set('Content-Type', 'application/ld+json');

      var getRequest = request
        .get('http://localhost:8080/jsonld/card1')
        .set('Accept', 'application/ld+json')
        .buffer();

      utils.p.request(clearRequest)
        .then(function(res) { return utils.p.assertStatusSuccess(res); })
        .then(function() { return utils.p.request(putRequest); })
        .then(function(res) { return utils.p.assertStatusSuccess(res); })
        .then(function() { return utils.p.request(getRequest); })
        .then(function(res) { return utils.p.assertStatusSuccess(res); })
        .then(function(res) { return utils.p.parseJsonLd(res.text); })
        .then(function(graph) { return utils.p.assertGraphEqual(graph, cardGraph); })
        .then(function() { done(); });
    });

    it('should clear a graph using DELETE method', function(done) {
      var clearRequest = request
        .del('http://localhost:8080/jsonld/card2');

      var putRequest = request
        .put('http://localhost:8080/jsonld/card2')
        .send(card)
        .set('Content-Type', 'application/ld+json');

      var deleteRequest = request
        .del('http://localhost:8080/jsonld/card2');

      var getRequest = request
        .get('http://localhost:8080/jsonld/card2')
        .set('Accept', 'application/ld+json')
        .buffer();

      utils.p.request(clearRequest)
        .then(function(res) { return utils.p.assertStatusSuccess(res); })
        .then(function() { return utils.p.request(putRequest); })
        .then(function(res) { return utils.p.assertStatusSuccess(res); })
        .then(function() { return utils.p.request(deleteRequest); })
        .then(function(res) { return utils.p.assertStatusSuccess(res); })
        .then(function() { return utils.p.request(getRequest); })
        .then(function(res) { return (res.statusType == 4 ? null : utils.p.parseJsonLd(res.text)); })
        .then(function(graph) { return utils.p.assertGraphEmpty(graph); })
        .then(function() { done(); });
    });

    it('should add triples to a graph using PATCH method', function(done) {
      var clearRequest = request
        .del('http://localhost:8080/jsonld/card3');

      var putRequest = request
        .put('http://localhost:8080/jsonld/card3')
        .send(card)
        .set('Content-Type', 'application/ld+json');

      var patchRequest = request
        .patch('http://localhost:8080/jsonld/card3')
        .send(card2)
        .set('Content-Type', 'application/ld+json');

      var getRequest = request
        .get('http://localhost:8080/jsonld/card3')
        .set('Accept', 'application/ld+json')
        .buffer();

      utils.p.request(clearRequest)
        .then(function(res) { return utils.p.assertStatusSuccess(res); })
        .then(function() { return utils.p.request(putRequest); })
        .then(function(res) { return utils.p.assertStatusSuccess(res); })
        .then(function() { return utils.p.request(patchRequest); })
        .then(function(res) { return utils.p.assertStatusSuccess(res); })
        .then(function() { return utils.p.request(getRequest); })
        .then(function(res) { return utils.p.assertStatusSuccess(res); })
        .then(function(res) { return utils.p.parseJsonLd(res.text); })
        .then(function(graph) { return utils.p.assertGraphEqual(graph, card2FullGraph); })
        .then(function() { done(); });
    });
  });
});
