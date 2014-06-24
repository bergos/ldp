var Ldp = function(rdf, store, options) {
	var self = this;

	if(options == null) options = {};

	self.error = {};
	self.error.forbidden = function(req, res) { res.writeHead(403); res.end('<h1>Forbidden</h1>'); };
	self.error.notFound = function(req, res) { res.writeHead(404); res.end('<h1>Not Found</h1>'); };
	self.error.methodNotAllowed = function(req, res) { res.writeHead(405); res.end('<h1>Method Not Allowed</h1>'); };
	self.error.notAcceptable = function(req, res) { res.writeHead(406); res.end('<h1>Not Acceptable</h1>'); };

	self.log = 'log' in options ? options.log : function() {};
	self.defaultAgent = 'defaultAgent' in options ? options.defaultAgent : null;
	self.parsers = {};
	self.parsers['application/ld+json'] = rdf.parseJsonLd;
	self.parsers['text/turtle'] = rdf.parseTurtle;

	self.serializers = {};
	self.serializers['text/turtle'] = rdf.serializeNTriples;
	self.serializers['application/ld+json'] = function(g,c){rdf.serializeJsonLd(g,function(j){c((JSON.stringify(j)));})};

	self.serializers.find = function(field) {
		var keys = Object.keys(self.serializers);

		for(var i=0; i<keys.length; i++) {
			if(field.indexOf(keys[i]) >= 0)
				return keys[i];
		};

		return null;
	};

	self.parsers.find = function(field) {
		var keys = Object.keys(self.parsers);

		for(var i=0; i<keys.length; i++) {
			if(field.indexOf(keys[i]) >= 0)
				return keys[i];
		};

		return null;
	};

	self.requestIri = function(req) {
		return 'http://localhost' + req.url; //TODO
	};

	self.middleware = function(req, res, next) {
		var iri = self.requestIri(req);
		var agent = self.defaultAgent;
		var application = null;

		if(('session' in req) &&  ('agent' in req.session) && (req.session.agent != null))
			agent = req.session.agent;

		if(typeof req.headers.origin !== 'undefined')
			application = req.headers.origin;

		self.log((new Date()).toISOString() + ' ' + req.method + ': ' + iri + ' ' + agent + ' ' + application);

		if(req.method == 'GET') {
			self.get(req, res, next, iri, agent, application);
		} else if(req.method == 'PATCH') {
			self.patch(req, res, next, iri, agent, application);
		} else if(req.method == 'PUT') {
			self.put(req, res, next, iri, agent, application);
		} else if(req.method == 'DELETE') {
			self.del(req, res, next, iri, agent, application);
		} else {
			self.error.methodNotAllowed(req, res, next);
		}
	};

	self.get = function(req, res, next, iri, agent, application) {
		var mimeType = self.serializers.find(req.headers.accept);

		if(mimeType == null)
			return self.error.notAcceptable(req, res, next);

		store.graph(iri, function(graph) {
			if(graph == null)
				return self.error.notFound(req, res, next);

			self.serializers[mimeType](graph, function(data) {
				res.statusCode = 200; // OK
				res.setHeader('Content-Type', mimeType);
				res.write(data);
				res.end();
			}, iri);
		}, agent, application);
	};

	self.patch = function(req, res, next, iri, agent, application) {
		var mimeType = self.parsers.find(req.headers['content-type']);

		if(mimeType == null)
			return self.error.notAcceptable(req, res, next);

		var content = '';

		req.on('data', function(data) {
			content += data.toString();
		}).on('end', function() {
			self.parsers[mimeType](content, function(graph) {
				if(graph == null)
					return self.error.notAcceptable(req, res, next);

				store.merge(iri, graph, function(merged) {
					if(merged == null)
						return self.error.forbidden(req, res, next);

					res.statusCode = 204; // No Content
					res.end();
				}, agent, application);
			}, iri);
		});
	};

	self.put = function(req, res, next, iri, agent, application) {
		var mimeType = self.parsers.find(req.headers['content-type']);

		if(mimeType == null)
			return next();

		var content = '';

		req.on('data', function(data) {
			content += data.toString();
		}).on('end', function() {
			self.parsers[mimeType](content, function(graph) {
				if(graph == null)
					return self.error.notAcceptable(req, res);

				store.add(iri, graph, function(added) {
					if(added == null)
						return self.error.forbidden(req, res, next);

					res.statusCode = 204; // No Content
					res.end();
				}, agent, application);
			}, iri);
		});
	};

	self.del = function(req, res, next, iri, agent, application) {
		store.delete(iri, function(success) {
			if(!success)
				return self.error.forbidden(req, res, next);

			res.statusCode = 204; // No Content
			res.end();
		}, agent, application);
	};
};


module.exports = Ldp;