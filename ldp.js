module.exports = Ldp;

var concatStream = require('concat-stream');
var mediaType = require('negotiator/lib/mediaType');
var mimeTypeUtil = require('rdf-mime-type-util');
var BlobStore = require('./blob-store');

function Ldp (rdf, options) {
  var self = this;

  options = options || {};

  this.graphStore = options.graphStore;
  this.blobStore = !!options.blobStore ? new BlobStore(options.blobStore, options.blobStoreOptions) : null;

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
  
  self.error.conflict = function (req, res, next) {
    var err = new Error('Conflict');
    err.status = err.statusCode = 409;
    next(err);
  };

  self.error.internalServerError = function (req, res, next) {
    var err = new Error('Internal Server Error');
    err.status = err.statusCode = 500;
    next(err);
  };

  self.log = 'log' in options ? options.log : function () {};
  self.defaultAgent = 'defaultAgent' in options ? options.defaultAgent : null;
  self.parsers = mimeTypeUtil.parsers;
  self.serializers = mimeTypeUtil.serializers;
  self.serializers.accepts = function (accepts) {
    contentType = mediaType(accepts).shift();

    return contentType in self.serializers ? contentType : null;
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

  var getGraph = function (req, res, next, iri, options, graph) {
    var mimeType = self.serializers.accepts(req.headers.accept);

    if (!mimeType) {
      self.error.notAcceptable(req, res, next);
    } else {
      self.serializers.serialize(mimeType, graph, null, iri).then(function (data) {
        res.statusCode = 200; // OK
        res.setHeader('Content-Type', mimeType);

        if (!options || !options.skipBody) {
          res.write(data);
        }

        res.end();
      });
    }
  };

  var getBlob = function (req, res, next, iri, options) {
    if (!self.blobStore) {
      return next()
    }

    var stream = self.blobStore.createReadStream(iri)

    if (!stream) {
      return next()
    }

    stream.on('error', function (error) {
      self.error.notFound(req, res, next);
    })

    if (!stream) {
      self.error.notFound(req, res, next)
    } else {
      stream.pipe(res)
    }
  }

  self.get = function (req, res, next, iri, options) {
    options = options || {}

    self.graphStore.graph(iri, null, options).then(function (graph) {
      if (graph) {
        getGraph(req, res, next, iri, options, graph)
      } else {
        getBlob(req, res, next, iri, options)
      }
    });
  };

  var patchGraph = function (req, res, next, iri, options, mimeType) {
    req.on('error', function (error) {
      self.error.internalServerError(req, res, next);
    });

    req.pipe(concatStream(function (data) {
      self.parsers.parse(mimeType, data.toString(), null, iri).then(function (graph) {
        if (graph == null) {
          return self.error.notAcceptable(req, res, next);
        }

        self.graphStore.merge(iri, graph, null, options).then(function (merged) {
          if (merged == null) {
            return self.error.forbidden(req, res, next);
          }

          res.statusCode = 204; // No Content
          res.end();
          next();
        });
      });
    }));
  };

  var patchBlob = function (req, res, next, iri, options) {
    self.error.notAcceptable(req, res, next);
  };

  self.patch = function (req, res, next, iri, options) {
    //var mimeType = self.parsers.accepts();
    var contentType = req.headers['content-type'];

    if (contentType in self.parsers) {
      patchGraph(req, res, next, iri, options, contentType);
    } else {
      patchBlob(req, res, next, iri, options)
    }
  };

  var putGraph = function (req, res, next, iri, options, mimeType) {
    req.on('error', function (error) {
      self.error.internalServerError(req, res, next);
    });

    req.pipe(concatStream(function (data) {
      self.parsers.parse(mimeType, data.toString(), null, iri).then(function (graph) {
        if (graph == null) {
          return self.error.notAcceptable(req, res, next);
        }

        self.graphStore.add(iri, graph, null, options).then(function (added) {
          if (added == null) {
            return self.error.conflict(req, res, next);
          }

          res.statusCode = 201; // Created
          res.end();
          next();
        });
      });
    }));
  };

  var putBlob = function (req, res, next, iri, options) {
    var stream = self.blobStore.createWriteStream(iri);

    stream.on('finish', function () {
      res.statusCode = 201; // Created
      res.end();
      next();
    });

    stream.on('error', function (error) {
      self.internalServerError(req, res, next);
    });

    req.pipe(stream);
  };

  self.put = function (req, res, next, iri, options) {
    var contentType = req.headers['content-type'];

    if (contentType in self.parsers) {
      putGraph(req, res, next, iri, options, contentType);
    } else {
      putBlob(req, res, next, iri, options);
    }
  };

  var deleteGraph = function (req, res, next, iri, options) {
    self.graphStore.delete(iri, null, options).then(function () {
      res.statusCode = 204; // No Content
      res.end();
      next();
    }).catch(function (error) {
      next(error);
    })
  };

  var deleteBlob = function (req, res, next, iri, options) {
    self.blobStore.remove(iri).then(function () {
      res.statusCode = 204; // No Content
      res.end();
      next();
    }).catch(function (error) {
      self.error.internalServerError(req, res, next);
    })
  };

  self.del = function (req, res, next, iri, options) {
    self.graphStore.graph(iri, null, options).then(function (graph) {
      if (graph) {
        deleteGraph(req, res, next, iri, options);
      } else {
        deleteBlob(req, res, next, iri, options);
      }
    });
  };
}
