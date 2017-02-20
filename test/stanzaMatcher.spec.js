'use strict'
const assert = require('assert')
const xml = require('ltx')
const stanzaMatcher = require('../src/stanzaMatcher')

const stanza = xml.parse('<message type="chat" from="some.user.001@test.domain/someresource" to="nagios.fitnesse700.2214@test.domain" id="nb0xq" xmlns:stream="http://etherx.jabber.org/streams"><body>hello world</body></message>')
const stanza2 = xml.parse('<message type="chat" from="some.user.001@test.domain" to="nagios.fitnesse700.2214@test.domain" id="nb0xq" xmlns:stream="http://etherx.jabber.org/streams"><body>hello world</body></message>')
const stanza3 = xml.parse('<message type="chat" from="groupchat.test.domain" to="nagios.fitnesse700.2214@test.domain" id="nb0xq" xmlns:stream="http://etherx.jabber.org/streams"><body>hello world</body></message>')
const iqSetGroupchatTitle = xml.parse('<iq type="set" to="groupchat.io4t.ch" id="1478621898.443142_981" xmlns:stream="http://etherx.jabber.org/streams" from="user1@io4t.ch/ios_75_8579"><create xmlns="ucid:groupchat"><title>Groupchat</title></create></iq>')
const osoIq = xml.parse('<iq to="groupchat.io4t.ch" from="user1@io4t.ch/76" id="150In-10" type="set" xmlns:stream="http://etherx.jabber.org/streams"><create xmlns="ucid:groupchat"><title>Hello World!</title></create></iq>')
const osoGroupchatIq = xml.parse('<iq to="groupchat.io4t.ch" from="user1@io4t.ch/76" id="_3864bafa-e021-4738-a6be-2f16a8f08dd5" type="set" xmlns:stream="http://etherx.jabber.org/streams"><query xmlns="jabber:iq:search"><x xmlns="jabber:x:data" type="submit"><field var="FORM_TYPE" type="hidden"><value>jabber:iq:search</value></field><field var="public" type="boolean"><value>1</value></field><field var="participant" type="boolean"><value>0</value></field></x><set xmlns="http://jabber.org/protocol/rsm"><max>3</max></set></query></iq>')

const deepMatcher =
  JSON.parse('{"name":"iq","attrs":{"type":"set","from":"%%FROM_USER%%","id":"%%ID%%","to":"groupchat.io4t.ch"},"children":[{"name":"query","attrs":{"xmlns":"jabber:iq:search"},"children":[{"name":"x","attrs":{"xmlns":"jabber:x:data"},"children":[{"name":"field","attrs":{"var":"FORM_TYPE","type":"hidden"}},{"name":"field","attrs":{"var":"public","type":"boolean"}},{"name":"field","attrs":{"var":"participant","type":"boolean"}}]},{"name":"set","attrs":{"xmlns":"http://jabber.org/protocol/rsm"},"children":[{"name":"max","text":"2"},{"name":"after","absent":true}]}]}]}')
const deepMatchStanzaFalse =
  xml.parse('<iq to="groupchat.io4t.ch" from="user1@io4t.ch/76" id="_3864bafa-e021-4738-a6be-2f16a8f08dd5" type="set" xmlns:stream="http://etherx.jabber.org/streams"><query xmlns="jabber:iq:search"><x xmlns="jabber:x:data" type="submit"><field var="FORM_TYPE" type="hidden"><value>jabber:iq:search</value></field><field var="public" type="boolean"><value>1</value></field><field var="participant" type="boolean"><value>0</value></field></x><set xmlns="http://jabber.org/protocol/rsm"><max>3</max></set></query></iq>')

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

  it('matches on partial jid', (done) => {
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
    console.log(result.replacements)
    assert(result.replacements[ '%%RANDOM%%' ] === '8579')
    done()
  })

  it('matches on the stanza id', (done) => {
    var matcher = {
      'name': 'iq',
      'attrs': { 'type': 'set', 'from': '%%FROM_USER%%', 'id': '%%ID%%', 'to': 'groupchat.io4t.ch' },
      'children': [ { 'name': 'create', 'attrs': { 'xmlns': 'ucid:groupchat' } } ]
    }

    var result = stanzaMatcher.matching(matcher, osoIq)
    assert(result.replacements[ '%%ID%%' ] === '150In-10')
    assert(result.matches)
    done()
  })

  it('matches a full string', (done) => {
    var result = { matches: true, replacements: {} }
    stanzaMatcher.compareText('%%FROM_USER%%', 'user1@io4t.ch/ios_75_8579', result)
    assert(result.matches)
    assert(result.replacements[ '%%FROM_USER%%' ] === 'user1@io4t.ch/ios_75_8579')
    done()
  })

  it('matches a partial placeholder at the end of the string', (done) => {
    var result = { matches: true, replacements: {} }
    stanzaMatcher.compareText('user1@io4t.ch/%%RESOURCE%%', 'user1@io4t.ch/ios_75_8579', result)
    assert(result.matches)
    assert(result.replacements[ '%%RESOURCE%%' ] === 'ios_75_8579')
    done()
  })

  it('matches a partial placeholder at the beginning of the string', (done) => {
    var result = { matches: true, replacements: {} }
    stanzaMatcher.compareText('%%user1%%@io4t.ch/ios_75_8579', 'user1@io4t.ch/ios_75_8579', result)
    assert(result.matches)
    assert(result.replacements[ '%%user1%%' ] === 'user1')
    done()
  })

  it('does not match a repeated placeholder with a different value', (done) => {
    var result = { matches: true, replacements: {} }
    stanzaMatcher.compareText('%%USER%%@%%USER%%/%%RESOURCE%%', 'user1@io4t.ch/ios_75_8579', result)
    assert(!result.matches)
    done()
  })

  it('matches multiple placeholders', (done) => {
    var result = { matches: true, replacements: {} }
    stanzaMatcher.compareText('%%USER%%@%%DOMAIN%%/%%RESOURCE%%', 'user1@io4t.ch/ios_75_8579', result)
    assert(result.matches)
    assert(result.replacements[ '%%USER%%' ] === 'user1')
    assert(result.replacements[ '%%DOMAIN%%' ] === 'io4t.ch')
    assert(result.replacements[ '%%RESOURCE%%' ] === 'ios_75_8579')
    done()
  })

  it('does not match on multiple placeholders with additional string after last placeholder', (done) => {
    var result = { matches: true, replacements: {} }
    stanzaMatcher.compareText('%%USER%%@%%DOMAIN%%/%%RESOURCE%%a', 'user1@io4t.ch/ios_75_8579', result)
    assert(!result.matches)
    done()
  })

  it('does not match on multiple placeholders with additional string before first placeholder', (done) => {
    var result = { matches: true, replacements: {} }
    stanzaMatcher.compareText('a%%USER%%@%%DOMAIN%%/%%RESOURCE%%', 'user1@io4t.ch/ios_75_8579', result)
    assert(!result.matches)
    done()
  })

  it('does not match on multiple placeholders with additional string between placeholders', (done) => {
    var result = { matches: true, replacements: {} }
    stanzaMatcher.compareText('%%USER%%@%%DOMAIN%%a/%%RESOURCE%%', 'user1@io4t.ch/ios_75_8579', result)
    assert(!result.matches)
    done()
  })

  it('does not match on additional string after the placeholder', (done) => {
    var result = { matches: true, replacements: {} }
    stanzaMatcher.compareText('user1@io4t.ch/%%RESOURCE%%abc', 'user1@io4t.ch/ios_75_8579', result)
    assert(!result.matches)
    done()
  })
  it('does not match a value deep in the matcher', (done) => {
    var result = stanzaMatcher.matching(deepMatcher, deepMatchStanzaFalse)
    assert(!result.matches)
    done()
  })
  it('matches some child deeper in the stanza', (done) => {
    var matcher = {
      'name': 'iq',
      'attrs': { 'type': 'set', 'from': '%%FROM_USER%%', 'id': '%%ID%%', 'to': 'groupchat.io4t.ch' },
      'children': [ {
        'name': 'query',
        'attrs': { 'xmlns': 'jabber:iq:search' },
        'children': [ {
          'name': 'x',
          'attrs': { 'xmlns': 'jabber:x:data' },
          'children': [
            { 'name': 'field', 'attrs': { 'var': 'FORM_TYPE', 'type': 'hidden' } },
            { 'name': 'field', 'attrs': { 'var': 'public', 'type': 'boolean' } },
            { 'name': 'field', 'attrs': { 'var': 'participant', 'type': 'boolean' } } ]
        }, {
          'name': 'set',
          'attrs': { 'xmlns': 'http://jabber.org/protocol/rsm' },
          'children': [ { 'name': 'max', 'text': '3' } ]
        } ]
      } ]
    }
    assert(stanzaMatcher.matching(matcher, osoGroupchatIq).matches)

    done()
  })
})
