'use strict'
const assert = require('assert')
const xml = require('ltx')
const StanzaMatcher = require('../src/stanzaMatcher')

const stanza = xml.parse('<message type="chat" from="some.user.001@test.domain/someresource" to="nagios.fitnesse700.2214@test.domain" id="nb0xq" xmlns:stream="http://etherx.jabber.org/streams"><body>hello world</body></message>')
const iq = xml.parse('<iq id="WVQmI-10" type="get" xmlns:stream="http://etherx.jabber.org/streams" from="test100@io4t.devucid.ch/21672"><query xmlns="jabber:iq:private"><storage xmlns="storage:bookmarks"/></query></iq>')
const presence = xml.parse('<presence id="Th8U2-8" xmlns:stream="http://etherx.jabber.org/streams" from="test100@io4t.devucid.ch/21672"><status>Online</status><priority>1</priority></presence>')

describe('the stanza matcher', function () {
  const stanzaMatcher = new StanzaMatcher()

  it('matches by exact stanza name', (done) => {
    var matcher = {
      name: 'message'
    }
    assert(stanzaMatcher.matching(matcher, stanza))

    done()
  })

  it('does not match a different name', (done) => {
    var matcher = {
      name: 'iq'
    }
    assert(!stanzaMatcher.matching(matcher, stanza))

    done()
  })

  it('matches when no specific name is required', (done) => {
    var matcher = {
    }
    assert(stanzaMatcher.matching(matcher, stanza))

    done()
  })


  it('matches by an attribute value', (done) => {
    var matcher = {
      attrs: {
        from: "some.user.001@test.domain/someresource"
      }
    }
    assert(stanzaMatcher.matching(matcher, stanza))

    done()
  })

  it('matches by an attribute value with a placeholder', (done) => {
    var matcher = {
      attrs: {
        from: "some.user.001@test.domain/%%RESOURCE%%"
      }
    }
    assert(stanzaMatcher.matching(matcher, stanza))

    done()
  })

  it('matches by an attribute value with two placeholders', (done) => {
    var matcher = {
      attrs: {
        from: "some.user.001@%%DOMAIN%%/%%RESOURCE%%"
      }
    }
    assert(stanzaMatcher.matching(matcher, stanza))

    done()
  })

  it('does not match a different string with some placeholders', (done) => {
    var matcher = {
      attrs: {
        from: "some.user@%%DOMAIN%%/%%RESOURCE%%"
      }
    }
    assert(!stanzaMatcher.matching(matcher, stanza))

    done()
  })

})