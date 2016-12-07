'use strict'
const Datastore = require('lokijs')

class Database {
  constructor () {
    this.db = new Datastore()
    this.coll = this.db.addCollection('stanzas')

    this.seq = 0
  }

  insert (stanza, callback) {
    var type = stanza.name

    this.coll.insert({ xml: `${stanza}`, id: this.seq++, type: type, ts: new Date().valueOf() })
    callback(null, stanza)
  }

  findAll (callback) {
    var data = this.coll.chain().find({}).simplesort('id', true).data()
    callback(null, data)
  }

  flush () {
    this.coll.removeWhere({})
  }

  find (type, callback) {
    var data = this.coll.chain().find({ 'type': type }).simplesort('id', true).data()
    callback(null, data)
  }

}

module.exports = Database
