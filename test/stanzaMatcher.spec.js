'use strict'
const assert = require('assert')
const xml = require('ltx')
const StanzaMatcher = require('../src/stanzaMatcher')

const stanza = xml.parse('<message type="chat" from="some.user.001@test.domain/someresource" to="nagios.fitnesse700.2214@test.domain" id="nb0xq" xmlns:stream="http://etherx.jabber.org/streams"><body>hello world</body></message>')
const stanza2 = xml.parse('<message type="chat" from="some.user.001@test.domain" to="nagios.fitnesse700.2214@test.domain" id="nb0xq" xmlns:stream="http://etherx.jabber.org/streams"><body>hello world</body></message>')
const stanza3 = xml.parse('<message type="chat" from="groupchat.test.domain" to="nagios.fitnesse700.2214@test.domain" id="nb0xq" xmlns:stream="http://etherx.jabber.org/streams"><body>hello world</body></message>')
const iq = xml.parse('<iq id="WVQmI-10" type="get" xmlns:stream="http://etherx.jabber.org/streams" from="test100@io4t.devucid.ch/21672"><query xmlns="jabber:iq:private"><storage xmlns="storage:bookmarks"/></query></iq>')
const presence = xml.parse('<presence id="Th8U2-8" xmlns:stream="http://etherx.jabber.org/streams" from="test100@io4t.devucid.ch/21672"><status>Online</status><priority>1</priority></presence>')

describe('the stanza matcher', function () {
  const stanzaMatcher = new StanzaMatcher()

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
        {name: "body"}
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
          name: "body",
          text: "hello world"
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
          name: "body",
          text: "%%BODY%%"
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
          name: "body",
          text: "hello %%USER%%"
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
          name: "body",
          text: "hello there"
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
        name: "something"
      }
    }
    assert(!stanzaMatcher.matching(matcher, stanza).matches)

    done()
  })

  it('matches by an attribute value', (done) => {
    var matcher = {
      attrs: {
        from: "some.user.001@test.domain/someresource"
      }
    }
    assert(stanzaMatcher.matching(matcher, stanza).matches)

    done()
  })

  it('matches a jid without a resource', (done) => {
    var matcher = {
      attrs: {
        from: "%%USER%%@test.domain"
      }
    }
    assert(stanzaMatcher.matching(matcher, stanza2).matches)

    done()
  })


  it('matches a domain-only jid', (done) => {
    var matcher = {
      attrs: {
        from: "%%DOMAIN%%"
      }
    }
    var result = stanzaMatcher.matching(matcher, stanza3);
    assert(result.matches)
    assert.equal(result.replacements["%%DOMAIN%%"], 'groupchat.test.domain')
    done()
  })


  it('matches a jid with a placeholder', (done) => {
    var matcher = {
      attrs: {
        from: "some.user.001@test.domain/%%RESOURCE%%"
      }
    }
    var result = stanzaMatcher.matching(matcher, stanza);
    assert(result.matches)
    assert.equal(result.replacements["%%RESOURCE%%"], 'someresource')
    done()
  })

  it('matches a jid with two placeholders', (done) => {
    var matcher = {
      attrs: {
        from: "some.user.001@%%DOMAIN%%/%%RESOURCE%%"
      }
    }
    var result = stanzaMatcher.matching(matcher, stanza);
    assert(result.matches)
    assert.equal(result.replacements["%%RESOURCE%%"], 'someresource')
    done()
  })

  it('does not match a different jid with some placeholders', (done) => {
    var matcher = {
      attrs: {
        from: "some.user@%%DOMAIN%%/%%RESOURCE%%"
      }
    }
    var result = stanzaMatcher.matching(matcher, stanza);
    assert(!result.matches)

    done()
  })


})