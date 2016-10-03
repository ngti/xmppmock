'use strict'
const Datastore = require('nedb')

class Database {
  constructor () {
    this.db = new Datastore()
  }

  insert (stanza, callback) {
    var type = stanza.name

    this.db.insert({xml: `${stanza}`, type: type, ts: Date.now()}, callback)
  }

  findAll (callback) {
    this.db.find({}).sort({ts: -1}).exec(callback)
  }

  flush () {
    this.db.remove({}, {multi: true}, (err, numRemoved) => {
      if (err) {
        console.error(`error flushing database: ${err}`)
      } else {
        console.log(`flushed ${numRemoved} stanzas from the db`)
      }
    })
  }

  find (type, callback) {
    this.db.find({'type': type}).sort({ts: -1}).exec(callback)
  }

}

module.exports = Database
