module.exports = Ldp;

var mimeparse = require('mimeparse');

function Ldp (rdf, store, options) {
  var self = this;

  if (options == null) {
    options = {};
  }

  self.error = {};
  self.error.forbidden = function (req, res, next) {
    var err = new Error('Forbidden');
    err.status = err.statusCode = 403;
    next(err);
  };

  self.error.notFound = function (req, res, next) {
    var err = new Error('Not Found');
    err.status = err.statusCode = 404;
    next(err);
  };

  self.error.methodNotAllowed = function (req, res, next) {
    var err = new Error('Method Not Allowed');
    err.status = err.statusCode = 405;
    next(err);
  };

  self.error.notAcceptable = function (req, res, next) {
    var err = new Error('Not Acceptable');
    err.status = err.statusCode = 406;
    next(err);
  };

  self.log = 'log' in options ? options.log : function () {};
  self.defaultAgent = 'defaultAgent' in options ? options.defaultAgent : null;
  self.parsers = {};
  self.parsers['application/ld+json'] = rdf.parseJsonLd;
  self.parsers['text/turtle'] = rdf.parseTurtle;

  self.serializers = {};
  self.serializers['text/turtle'] = rdf.serializeNTriples;
  self.serializers['application/ld+json'] = function (g, c) {
    rdf.serializeJsonLd(g,
      function (j) {
        c((JSON.stringify(j)));
      });
  };

  self.serializers.find = function (field) {
    var mimetype = mimeparse.bestMatch(Object.keys(self.serializers), field);

    if (mimetype === '') {
      return null;
    }

    return mimetype;
  };

  self.parsers.find = function (field) {
    var mimetype = mimeparse.bestMatch(Object.keys(self.parsers), field);

    if (mimetype === '') {
      return null;
    }

    return mimetype;
  };

  self.requestIri = function (req) {
    return 'http://localhost' + req.url; // TODO
  };

  self.middleware = function (req, res, next) {
    var iri = self.requestIri(req);
    var agent = self.defaultAgent;
    var application = null;

    if (next == null) {
      next = function defaultNext (err) {

        if (err) {
          res.writeHead(err.status || err.statusCode);
          return res.end(err.message || '');
        }

        if (!res.statusCode) {
          return self.error.notFound(req, res, defaultNext);
        }
      };
    }

    if (('session' in req) && ('agent' in req.session) && (req.session.agent != null)) {
      agent = req.session.agent;
    }

    if (typeof req.headers.origin !== 'undefined') {
      application = req.headers.origin;
    }

    self.log((new Date()).toISOString() + ' ' + req.method + ': ' + iri + ' ' + agent + ' ' + application);

    if (req.method === 'GET') {
      self.get(req, res, next, iri, {agent: agent, application: application});
    } else if (req.method === 'HEAD') {
      self.get(req, res, next, iri, {agent: agent, application: application, skipBody: true});
    } else if (req.method === 'PATCH') {
      self.patch(req, res, next, iri, {agent: agent, application: application});
    } else if (req.method === 'PUT') {
      self.put(req, res, next, iri, {agent: agent, application: application});
    } else if (req.method === 'DELETE') {
      self.del(req, res, next, iri, {agent: agent, application: application});
    } else {
      self.error.methodNotAllowed(req, res, next);
    }
  };

  self.get = function (req, res, next, iri, options) {
    var mimeType = self.serializers.find(req.headers.accept);

    if (mimeType == null) {
      return self.error.notAcceptable(req, res, next);
    }

    store.graph(iri, function (graph) {
      if (graph == null) {
        return self.error.notFound(req, res, next);
      }

      self.serializers[mimeType](graph, function (data) {
        res.statusCode = 200; // OK
        res.setHeader('Content-Type', mimeType);

        if (options == null || !('skipBody' in options) || !options.skipBody) {
          res.write(data);
        }
        res.end();
        next();
      }, iri);
    }, options);
  };

  self.patch = function (req, res, next, iri, options) {
    var mimeType = self.parsers.find(req.headers['content-type']);

    if (mimeType == null) {
      return self.error.notAcceptable(req, res, next);
    }

    var content = '';

    req.on('data', function (data) {
      content += data.toString();
    }).on('end', function () {
      self.parsers[mimeType](content, function (graph) {
        if (graph == null) {
          return self.error.notAcceptable(req, res, next);
        }

        store.merge(iri, graph, function (merged) {
          if (merged == null) {
            return self.error.forbidden(req, res, next);
          }

          res.statusCode = 204; // No Content
          res.end();
          next();
        }, options);
      }, iri);
    });
  };

  self.put = function (req, res, next, iri, options) {
    var mimeType = self.parsers.find(req.headers['content-type']);

    if (mimeType == null) {
      return self.error.notAcceptable(req, res, next);
    }

    var content = '';

    req.on('data', function (data) {
      content += data.toString();
    }).on('end', function () {
      self.parsers[mimeType](content, function (graph) {
        if (graph == null) {
          return self.error.notAcceptable(req, res, next);
        }

        store.add(iri, graph, function (added) {
          if (added == null) {
            return self.error.forbidden(req, res, next);
          }

          res.statusCode = 201; // No Content
          res.end();
          next();
        }, options);
      }, iri);
    });
  };

  self.del = function (req, res, next, iri, options) {
    store.delete(iri, function (success) {
      if (!success) {
        return self.error.forbidden(req, res, next);
      }

      res.statusCode = 204; // No Content
      res.end();
      next();
    }, options);
  };
}
