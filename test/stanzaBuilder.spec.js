'use strict'

const assert = require('assert')

const stanzaBuilder = require('../src/stanzaBuilder')

const replacements = { '%%RANDOM%%': '8579' }
const stanza = '<iq from="groupchat.io4t.ch" to="user1@io4t.ch/ios_75_%%RANDOM%%" id="stuff" type="result"><create xmlns="ucid:groupchat"><name>67f4daa9528890b73ff307cdd0</name></create></iq>'

describe('the stanza builder', function () {
  it('replaces the partial resource', (done) => {
    stanzaBuilder.replace(stanza, replacements)

    console.log(JSON.stringify(stanza))

    assert(stanza.to === 'user1@io4t.ch/ios_75_8579')

    done()
  })
})
