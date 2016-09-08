'use strict'
const Datastore = require('nedb')
const xml = require('xml2js')

class Database {
  constructor () {
    this.db = new Datastore()
  }

  insert (stanza, callback) {
    var that = this
    xml.parseString(stanza, function (err, result) {
      var type = Database.getStanzaType(result)

      that.db.insert({xml: `${stanza}`, type: type, ts: Date.now()}, callback)
    })
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

  static getStanzaType (jsonStanza) {
    return Object.keys(jsonStanza)[0]
  }

}

module.exports = Database
