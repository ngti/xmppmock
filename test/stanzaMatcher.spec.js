'use strict'
const assert = require('assert')
const xml = require('ltx')
const stanzaMatcher = require('../src/stanzaMatcher')

const stanza = xml.parse('<message type="chat" from="some.user.001@test.domain/someresource" to="nagios.fitnesse700.2214@test.domain" id="nb0xq" xmlns:stream="http://etherx.jabber.org/streams"><body>hello world</body></message>')
const stanza2 = xml.parse('<message type="chat" from="some.user.001@test.domain" to="nagios.fitnesse700.2214@test.domain" id="nb0xq" xmlns:stream="http://etherx.jabber.org/streams"><body>hello world</body></message>')
const stanza3 = xml.parse('<message type="chat" from="groupchat.test.domain" to="nagios.fitnesse700.2214@test.domain" id="nb0xq" xmlns:stream="http://etherx.jabber.org/streams"><body>hello world</body></message>')
const iqSetGroupchatTitle = xml.parse('<iq type="set" to="groupchat.io4t.ch" id="1478621898.443142_981" xmlns:stream="http://etherx.jabber.org/streams" from="user1@io4t.ch/ios_75_8579"><create xmlns="ucid:groupchat"><title>Groupchat</title></create></iq>')

describe('the stanza matcher', function () {
  it('matches by exact stanza name', (done) => {
    var matcher = {
      name: 'message'
    }
    assert(stanzaMatcher.matching(matcher, stanza).matches)

    done()
  })

  it('matches by children name', (done) => {
    var matcher = {
      name: 'message',
      children: [
        { name: 'body' }
      ]
    }
    assert(stanzaMatcher.matching(matcher, stanza).matches)

    done()
  })

  it('matches by children text', (done) => {
    var matcher = {
      name: 'message',
      children: [
        {
          name: 'body',
          text: 'hello world'
        }
      ]
    }
    assert(stanzaMatcher.matching(matcher, stanza).matches)

    done()
  })

  it('matches by children text with full match placeholder', (done) => {
    var matcher = {
      name: 'message',
      children: [
        {
          name: 'body',
          text: '%%BODY%%'
        }
      ]
    }
    assert(stanzaMatcher.matching(matcher, stanza).matches)

    done()
  })

  it('matches by children text with some placeholder', (done) => {
    var matcher = {
      name: 'message',
      children: [
        {
          name: 'body',
          text: 'hello %%USER%%'
        }
      ]
    }
    assert(stanzaMatcher.matching(matcher, stanza).matches)

    done()
  })

  it('does not match on different child text', (done) => {
    var matcher = {
      name: 'message',
      children: [
        {
          name: 'body',
          text: 'hello there'
        }
      ]
    }
    assert(!stanzaMatcher.matching(matcher, stanza).matches)

    done()
  })

  it('does not match a different name', (done) => {
    var matcher = {
      name: 'iq'
    }
    assert(!stanzaMatcher.matching(matcher, stanza).matches)

    done()
  })

  it('matches when no specific name is required', (done) => {
    var matcher = {}
    assert(stanzaMatcher.matching(matcher, stanza).matches)

    done()
  })

  it('does not match when an expected attribute is not present', (done) => {
    var matcher = {
      attrs: {
        name: 'something'
      }
    }
    assert(!stanzaMatcher.matching(matcher, stanza).matches)

    done()
  })

  it('matches by an attribute value', (done) => {
    var matcher = {
      attrs: {
        from: 'some.user.001@test.domain/someresource'
      }
    }
    assert(stanzaMatcher.matching(matcher, stanza).matches)

    done()
  })

  it('matches a jid without a resource', (done) => {
    var matcher = {
      attrs: {
        from: '%%USER%%@test.domain'
      }
    }
    assert(stanzaMatcher.matching(matcher, stanza2).matches)

    done()
  })

  it('matches a domain-only jid', (done) => {
    var matcher = {
      attrs: {
        from: '%%DOMAIN%%'
      }
    }
    var result = stanzaMatcher.matching(matcher, stanza3)
    assert(result.matches)
    assert.equal(result.replacements[ '%%DOMAIN%%' ], 'groupchat.test.domain')
    done()
  })

  it('matches a jid with a placeholder', (done) => {
    var matcher = {
      attrs: {
        from: 'some.user.001@test.domain/%%RESOURCE%%'
      }
    }
    var result = stanzaMatcher.matching(matcher, stanza)
    assert(result.matches)
    assert.equal(result.replacements[ '%%RESOURCE%%' ], 'someresource')
    done()
  })

  it('matches a jid with two placeholders', (done) => {
    var matcher = {
      attrs: {
        from: 'some.user.001@%%DOMAIN%%/%%RESOURCE%%'
      }
    }
    var result = stanzaMatcher.matching(matcher, stanza)
    assert(result.matches)
    assert.equal(result.replacements[ '%%RESOURCE%%' ], 'someresource')
    done()
  })

  it('does not match a different jid with some placeholders', (done) => {
    var matcher = {
      attrs: {
        from: 'some.user@%%DOMAIN%%/%%RESOURCE%%'
      }
    }
    var result = stanzaMatcher.matching(matcher, stanza)
    assert(!result.matches)

    done()
  })

  it('matches joris request', (done) => {
    var matcher = {
      'name': 'iq',
      'attrs': {
        'type': 'set',
        'from': 'user1@io4t.ch/ios_75_%%RANDOM%%',
        'to': 'groupchat.io4t.ch'
      }
    }

    var result = stanzaMatcher.matching(matcher, iqSetGroupchatTitle)
    assert(result.matches)
    done()
  })
})
