var path = require('path')
var url = require('url')

function BlobStore (store, options) {
  options = options || {}

  this.store = store
  this.path = options.path || '.'

  this.buildPath = options.buildPath || function (p) {
    return p.pathname.split('/').slice(1).join('_')
  }
}

BlobStore.prototype.iriToPath = function (iri) {
  var parsed = url.parse(iri);
  return path.join(this.path, this.buildPath(parsed))
}

BlobStore.prototype.exists = function (iri) {
  var self = this

  return new Promise(function (resolve, reject) {
    self.store.exists({key: self.iriToPath(iri)}, function (error, exists) {
      if (error) {
        reject(error)
      } else {
        resolve(exists)
      }
    })
  })
}

BlobStore.prototype.createReadStream = function (iri) {
  var self = this

  try {
    return self.store.createReadStream({key: self.iriToPath(iri)});
  } catch(error) { console.error(error.stack);
    return null;
  }
}

BlobStore.prototype.createWriteStream = function (iri) {
  var self = this

  return self.store.createWriteStream({key: self.iriToPath(iri)})
}

BlobStore.prototype.remove = function (iri) {
  var self = this

  return new Promise(function (resolve, reject) {
    self.store.remove({key: self.iriToPath(iri)}, function (error) {
      if (error) {
        reject(error)
      } else {
        resolve()
      }
    })
  })
}

module.exports = BlobStore