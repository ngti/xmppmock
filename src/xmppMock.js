'use strict'

const xml = require('ltx')
const Database = require('./db')
const path = require('path')
const XmppComponentServer = require('./xmppComponentServer')
const XmppC2SServer = require('./xmppC2SServer')
const stanzaMatcher = require('./stanzaMatcher')
const stanzaBuilder = require('./stanzaBuilder')

const COMPONENT_PORT = process.env.COMPONENT_PORT ? process.env.COMPONENT_PORT : 6666
const COMPONENT_PASS = process.env.COMPONENT_PASS ? process.env.COMPONENT_PASS : 'password'

const SERVER_HOST = process.env.SERVER_HOST ? process.env.SERVER_HOST : 'localhost'
const SERVER_PORT = process.env.SERVER_PORT ? process.env.SERVER_PORT : 5222

const SERVER_HOST_SSL = process.env.SERVER_HOST_SSL ? process.env.SERVER_HOST_SSL : 'example.com'
const SERVER_PORT_SSL = process.env.SERVER_PORT_SSL ? process.env.SERVER_PORT_SSL : 443

const USE_SSL = process.env.USE_SSL === 'true'

const serverOptions = {
  port: SERVER_PORT,
  domain: SERVER_HOST
}

const serverOptionsTls = {
  port: SERVER_PORT_SSL,
  domain: SERVER_HOST_SSL,
  tls: {
    direct: true,
    keyPath: path.join('certs/' + SERVER_HOST_SSL + '.key'),
    certPath: path.join('certs/' + SERVER_HOST_SSL + '.crt')
  }
}

const activeOptions = USE_SSL ? serverOptionsTls : serverOptions

const stanzaIdPlaceholder = 'STANZA_ID'

console.log('Starting C2S server with options=' + JSON.stringify(activeOptions))

var xmppC2sServer
var xmppComponentServer

const db = new Database()

// Indicates if something received through XMPP
var dirty = false

var expectations = []
var expectationsv2 = []

/**
 * Exports
 */
function start (emitter) {
  xmppC2sServer = USE_SSL ? new XmppC2SServer(serverOptionsTls) : new XmppC2SServer(serverOptions)
  xmppComponentServer = new XmppComponentServer(COMPONENT_PORT, COMPONENT_PASS)

  xmppC2sServer.start()
  xmppComponentServer.start()

  xmppComponentServer.addStanzaHandler((stanza) => {
    addToDb(stanza, emitter)
  })

  xmppC2sServer.addStanzaHandler((stanza) => {
    addToDb(stanza, emitter)
    receivedStanzaFromClient(stanza)
  })
}

function receivedStanzaFromClient (stanza) {
  // Remove 'thread' element automatically added by libs
  stanza.remove('thread')

  answerToPing(stanza)

  matchExpectationsV2(stanza)
  matchExpectationsV1(stanza)
}

function addToDb (stanza, emitter) {
  db.insert(stanza, (err, newdoc) => {
    if (err) {
      console.error(`error inserting document: ${err}`)
      return
    }
    emitter.emit('inserted')

    dirty = true
  })
}

function clearExpectations () {
  expectations = []
  expectationsv2 = []
}

function addExpectationV1 (expected, result) {
  // Replace stanza ids, if present, by a placeholder
  expected.attrs.id = stanzaIdPlaceholder
  expected.remove('thread')
  result.attrs.id = stanzaIdPlaceholder

  expectations.push({ expected: expected, result: result })
}

function addExpectationV2 (matches, actions) {
  expectationsv2.push({ matches: matches, actions: actions })
}

function sendToClient (stanza) {
  xmppC2sServer.send(stanza)
}

function sendToComponent (stanza) {
  xmppComponentServer.send(stanza)
}

function setDirty (val) {
  dirty = val
}

function isDirty () {
  return dirty
}

function setAuth (val) {
  xmppC2sServer.configAuth(val)
}

function resetAuth () {
  xmppC2sServer.deleteAuthConfig()
}

function getAuthConfig () {
  return xmppC2sServer.getAuthConfig()
}

function matchExpectationsV1 (stanza) {
  var receivedId = stanza.attrs.id
  stanza.attrs.id = stanzaIdPlaceholder

  // Find matching expectations, send results
  for (var i = 0; i < expectations.length; i++) {
    var expectation = expectations[ i ]
    var exp = JSON.stringify(expectation.expected)
    var recv = JSON.stringify(stanza)

    if (exp === recv) {
      // copy id from request to result
      var result = expectations[ i ].result
      result.attrs.id = receivedId

      console.log(`Match found, sending result ${JSON.stringify(result)}`)

      xmppC2sServer.send(result)
    }
  }
}

function matchExpectationsV2 (stanza) {
  for (var i = 0; i < expectationsv2.length; i++) {
    var matcher = expectationsv2[ i ].matches

    var match = stanzaMatcher.matching(matcher, stanza)
    if (match.matches) {
      console.log(`Match found, replacements: ${JSON.stringify(match.replacements)}`)

      var actions = expectationsv2[ i ].actions

      for (var action of actions) {
        for (var curActionType in action) {
          if (action.hasOwnProperty(curActionType)) {
            console.log(`Performing action: ${curActionType}`)

            if (curActionType === 'sendResults') {
              for (var r of action.sendResults) {
                if (r === 'mdnSent') {
                  sendStanzas([ stanzaBuilder.buildMdnSent(stanza) ], match.replacements)
                } else if (r === 'mdnReceived') {
                  sendStanzas([ stanzaBuilder.buildMdnReceived(stanza) ], match.replacements)
                } else {
                  console.log(`Unknown result set in actions ${r}`)
                }
              }
            } else if (curActionType === 'sendStanzas') {
              sendStanzas(action.sendStanzas, match.replacements)
            } else {
              console.log(`Unknown result set ${curActionType}`)
            }
          }
        }
      }
    }
  }
}

function sendStanzas (stanzas, replacements) {
  for (var i = 0; i < stanzas.length; i++) {
    var stanza = xml.parse(stanzas[ i ])
    console.log(`Replace input: ${stanza}`)
    stanzaBuilder.replace(stanza, replacements)
    console.log(`Replace output: ${stanza}`)
    xmppC2sServer.send(stanza)
  }
}

function answerToPing (stanza) {
  var ping = false
  for (var j in stanza.children) {
    if (stanza.children[ j ].name === 'ping') {
      ping = true
    }
  }
  if (ping) {
    sendStanzas(stanzaBuilder.buildPing(stanza))
  }
}

function getAllReceived (callback) {
  db.findAll(callback)
}

function getReceived (type, callback) {
  db.find(type, callback)
}

function flushReceived () {
  db.flush()
}

function killConnections () {
  xmppC2sServer.disconnect()
}

function stop () {
  xmppC2sServer.stop()
  xmppComponentServer.stop()
}

function getStatus () {
  return xmppC2sServer.getStatus()
}

module.exports = {
  start,
  clearExpectations,
  addExpectationV1,
  addExpectationV2,
  sendToClient,
  sendToComponent,
  setDirty,
  isDirty,
  setAuth,
  resetAuth,
  getAuthConfig,
  getReceived,
  getAllReceived,
  flushReceived,
  receivedStanzaFromClient,
  killConnections,
  stop,
  getStatus
}
