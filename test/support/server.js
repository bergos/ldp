var http = require('http');
var Ldp = require('ldp');
//var rdf = require('rdf-interfaces');
var rdf = new (require('rdf_js_interface')).RDFEnvironment();
require('rdf-ext')(rdf, {replaceMerge:true});


var LdpServer = function() {
	var store = new rdf.InMemoryStore();
	var ldp = new Ldp(rdf, store/*, {log:console.log}*/);
	var server = http.createServer(ldp.middleware);

	this.start = function(done) {
		server.listen('8080', 'localhost', done);
	};

	this.stop = function(done) {
		server.close(done);
	}
};


module.exports = LdpServer;
