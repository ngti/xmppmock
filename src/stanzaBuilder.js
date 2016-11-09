'use strict'
const xml = require('ltx')

function makeid () {
  var text = ''
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

  for (var i = 0; i < 5; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  }

  return text
}

function buildPing (stanza) {
  return new xml.Element('iq', {
    id: stanza.id,
    from: stanza.to,
    to: stanza.from,
    type: 'result'
  })
}

function buildMdnReceived (stanza, replacements) {
  var mdn = new xml.Element('message', {
    id: makeid(),
    from: stanza.to,
    to: stanza.from
  })
  mdn.c('received', { id: stanza.id, xmlns: 'urn:xmpp:receipts' })

  return replace(mdn, replacements)
}

function buildMdnSent (stanza, replacements) {
  var mdn = new xml.Element('message', {
    id: makeid(),
    from: stanza.to,
    to: stanza.from
  })
  mdn.c('sent', { id: stanza.id, xmlns: 'urn:xmpp:receipts' })

  return replace(mdn, replacements)
}

function replace (stanza, replacements) {
  // assert(typeof stanza !== 'string')
  console.log(`replacements: ${JSON.stringify(replacements)}`)
  console.log(`replace input: ${stanza}`)

  for (var replacementKey in replacements) {
    if (replacements.hasOwnProperty(replacementKey)) {
      // iterate through stanza.attrs
      // Replace in attributes
      for (var key in stanza.attrs) {
        if (stanza.attrs.hasOwnProperty(key)) {
          var val = stanza.attrs[ key ]
          stanza.attrs[key] = val.replace(replacementKey, replacements[ replacementKey ])
        }
      }
      // Replace in children, text
      if (stanza.children) {
        for (var i = 0; i < stanza.children.length; i++) {
          var child = stanza.children[ i ]
          if (typeof child === 'string') {
            stanza.children[ i ] = stanza.children[ i ].replace(replacementKey, replacements[ replacementKey ])
          } else {
            replace(child, replacements)
          }
        }
      }
    }
  }
}

module.exports = {
  buildPing,
  buildMdnReceived,
  buildMdnSent,
  replace
}
