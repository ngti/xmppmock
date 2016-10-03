'use strict'
const Datastore = require('nedb')

class Database {
  constructor () {
    this.db = new Datastore()
    this.seq = 0
  }

  insert (stanza, callback) {
    var type = stanza.name

    this.db.insert({xml: `${stanza}`, id: this.seq++, type: type, ts: new Date().valueOf()}, callback)
  }

  findAll (callback) {
    this.db.find({}).sort({id: -1}).exec(callback)
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
    this.db.find({'type': type}).sort({id: -1}).exec(callback)
  }

}

module.exports = Database
