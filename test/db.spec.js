'use strict'

const assert = require('assert')
const Database = require('../src/db')
const xml = require('ltx')

const stanza = xml.parse('<message type="chat" from="some.user.001@test.domain" to="nagios.fitnesse700.2214@test.domain" id="nb0xq" xmlns:stream="http://etherx.jabber.org/streams"><body>hello world</body></message>')
const iq = xml.parse('<iq id="WVQmI-10" type="get" xmlns:stream="http://etherx.jabber.org/streams" from="test100@io4t.devucid.ch/21672"><query xmlns="jabber:iq:private"><storage xmlns="storage:bookmarks"/></query></iq>')
const presence = xml.parse('<presence id="Th8U2-8" xmlns:stream="http://etherx.jabber.org/streams" from="test100@io4t.devucid.ch/21672"><status>Online</status><priority>1</priority></presence>')

describe('the database', function () {
  const db = new Database()

  afterEach(function () {
    db.flush()
  })

  it('saves and gets items correctly', (done) => {
    db.insert(stanza, (err, newdoc) => {
      if (err) return done(err)

      db.findAll((err, docs) => {
        if (err) return done(err)

        assert.equal(1, docs.length)
        assert.equal(stanza, docs[0].xml)
        assert.equal('message', docs[0].type)
        done()
      })
    })
  })

  it('save iq', (done) => {
    db.insert(iq, (err, newdoc) => {
      if (err) return done(err)

      db.findAll((err, docs) => {
        if (err) return done(err)

        assert.equal(1, docs.length)
        assert.equal(iq, docs[0].xml)
        assert.equal('iq', docs[0].type)
        done()
      })
    })
  })

  it('save presence', (done) => {
    db.insert(presence, (err, newdoc) => {
      if (err) return done(err)

      db.findAll((err, docs) => {
        if (err) return done(err)

        assert.equal(1, docs.length)
        assert.equal(presence, docs[0].xml)
        assert.equal('presence', docs[0].type)
        done()
      })
    })
  })

  it('saves things ordered', (done) => {
    db.insert(iq, (err, newdoc) => {
      if (err) return done(err)

      db.insert(presence, (err, newdoc) => {
        if (err) return done(err)

        db.findAll((err, docs) => {
          if (err) return done(err)

          assert.equal(2, docs.length)
          assert.equal(presence, docs[0].xml)
          assert.equal('presence', docs[0].type)
          assert.equal(iq, docs[1].xml)
          assert.equal('iq', docs[1].type)
          done()
        })
      })
    })
  }
  )
})
