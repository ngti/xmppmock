'use strict'

const express = require('express')
const EventEmitter = require('events')
const ewait = require('ewait')
const Xmpp = require('./xmpp')
const XmppServer = require('./xmpp-server')
const Database = require('./db')
const bodyParser = require('body-parser')
const path = require('path')
const xml = require('ltx')

const stanzaIdPlaceholder = 'STANZA_ID'

const COMPONENT_PORT = process.env.COMPONENT_PORT ? process.env.COMPONENT_PORT : 6666
const COMPONENT_PASS = process.env.COMPONENT_PASS ? process.env.COMPONENT_PASS : 'password'

const SERVER_HOST = process.env.SERVER_HOST ? process.env.SERVER_HOST : 'localhost'
const SERVER_PORT = process.env.SERVER_PORT ? process.env.SERVER_PORT : 5222

const SERVER_HOST_SSL = process.env.SERVER_HOST_SSL ? process.env.SERVER_HOST_SSL : 'example.com'
const SERVER_PORT_SSL = process.env.SERVER_PORT_SSL ? process.env.SERVER_PORT_SSL : 443

const USE_SSL = process.env.USE_SSL === 'true'

const xmpp = new Xmpp(COMPONENT_PORT, COMPONENT_PASS)
const stanzaMatcher = new StanzaMatcher()

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

console.log('Starting with SSL enabled=' + USE_SSL)

const xmppServer = USE_SSL ? new XmppServer(serverOptionsTls) : new XmppServer(serverOptions)

class Eventer extends EventEmitter {
}

const emitter = new Eventer()

const db = new Database()

// Indicates if something received through XMPP
var dirty = false

var expectations = []
var expectationsv2 = []

xmpp.addStanzaHandler((stanza) => {
  db.insert(stanza, (err, newdoc) => {
    if (err) {
      console.error(`error inserting document: ${err}`)
      return
    }
    emitter.emit('inserted')
    dirty = true
  })
})

xmppServer.addStanzaHandler((stanza) => {
  db.insert(stanza, (err, newdoc) => {
    if (err) {
      console.error(`error inserting document: ${err}`)
      return
    }
    emitter.emit('inserted')
    dirty = true
  })
  var receivedId = stanza.attrs.id
  stanza.attrs.id = stanzaIdPlaceholder
  stanza.remove('thread')
  var recv = JSON.stringify(stanza)

  // Find matching expectations, send results
  for (var i = 0; i < expectations.length; i++) {
    var expectation = expectations[i]
    var exp = JSON.stringify(expectation.expected)

    if (exp === recv) {
      // copy id from request to result
      var result = expectations[i].result
      result.attrs.id = receivedId

      console.log(`match found, sending result ${JSON.stringify(result)}`)

      xmppServer.send(result)
    }
  }

  for (var i = 0; i < expectationsv2.length; i++) {
    var matcher = expectationsv2[i].matches

    if (stanzaMatcher.matching(matcher, stanza)) {
      var replacements = stanzaMatcher.getReplacements(matcher, stanza)
      // console.log(`match found, sending result ${JSON.stringify(result)}`)

      // var result = expectations[i].result
      // result.attrs.id = receivedId
      var actions = expectationsv2[i].actions
      var sendResults = actions.sendResults;
      if(sendResults){
        if(sendResults.mdnReceived === 'true') {
          sendMdnReceived(stanza, replacements)
        }
        if(sendResults.mdnSent === 'true') {
          sendMdnSent(stanza, replacements)
        }
        if(sendResults.stanzas){
          sendStanzas(sendResults.stanzas, replacements)
        }
      }


      // xmppServer.send(result)
    }

  }
})

const app = express()
app.use(bodyParser.urlencoded({extended: false}))
app.use(require('morgan')('dev'))
app.use((err, req, res, next) => {
  console.error(err.stack)
  next(err)
})

app.get('/', (req, res) => {
  res.json({status: 'ok'}).end()
})

app.get('/v1/stanzas', (req, res) => {
  function findAndRespond () {
    db.findAll((err, docs) => {
      if (err) {
        res.status(500).send(err).end()
        return
      }
      res.json(docs).end()
    })
  }

  if (dirty) {
    findAndRespond()
  } else {
    ewait.waitForAll([emitter], (err) => {
      if (err) {
        console.log('Timeout waiting for stanzas')
      }
      findAndRespond()
    }, 10000, 'inserted')
  }
})

app.get('/v1/messages', (req, res) => {
  function findAndRespond () {
    db.find('message', (err, docs) => {
      if (err) {
        res.status(500).send(err).end()
        return
      }
      res.json(docs).end()
    })
  }

  if (dirty) {
    findAndRespond()
  } else {
    ewait.waitForAll([emitter], (err) => {
      if (err) {
        console.log('Timeout waiting for stanzas')
      }
      findAndRespond()
    }, 10000, 'inserted')
  }
})

app.get('/v1/iq', (req, res) => {
  function findAndRespond () {
    db.find('iq', (err, docs) => {
      if (err) {
        res.status(500).send(err).end()
        return
      }
      res.json(docs).end()
    })
  }

  if (dirty) {
    findAndRespond()
  } else {
    ewait.waitForAll([emitter], (err) => {
      if (err) {
        console.log('Timeout waiting for stanzas')
      }
      findAndRespond()
    }, 10000, 'inserted')
  }
})

app.get('/v1/presence', (req, res) => {
  function findAndRespond () {
    db.find('presence', (err, docs) => {
      if (err) {
        res.status(500).send(err).end()
        return
      }
      res.json(docs).end()
    })
  }

  if (dirty) {
    findAndRespond()
  } else {
    ewait.waitForAll([emitter], (err) => {
      if (err) {
        console.log('Timeout waiting for stanzas')
      }
      findAndRespond()
    }, 10000, 'inserted')
  }
})

app.post('/v1/stanzas', (req, res) => {
  console.log(req.body)
  xmpp.send(req.body.stanza)
  res.status(200).end()
})

app.delete('/v1/stanzas', (req, res) => {
  db.flush()
  dirty = false
  res.status(200).end()
})

// { 'password': 'invalidToken', 'auth': 'fail' }
app.post('/v1/auth', (req, res) => {
  console.log('Configuring auth: ' + JSON.stringify(req.body))
  xmppServer.configAuth(req.body)
  res.status(200).end()
})

app.delete('/v1/auth', (req, res) => {
  console.log('Deleting auth config')
  xmppServer.deleteAuthConfig()
  res.status(200).end()
})

app.get('/v1/auth', (req, res) => {
  res.json(xmppServer.getAuthConfig()).end()
})

/*
 Takes an expected stanza and a result to be sent when that stanza is received.
 The stanza should match fully, excluding the stanza id. The stanza id from the actual
 received stanza will be replaced in the result.
 */
app.post('/v1/mock/when/equals', (req, res) => {
  var expected = xml.parse(req.body.expected)
  var result = xml.parse(req.body.result)
  console.log(`Mocking xmpp stanza(ignoring stanza id):\n${expected}\nresult will be\n${result}\n`)
  // Replace stanza ids, if present, by a placeholder
  expected.attrs.id = stanzaIdPlaceholder
  expected.remove('thread')
  result.attrs.id = stanzaIdPlaceholder

  expectations.push({expected: expected, result: result})
  res.status(200).end()
})

/*
 Takes an expected stanza and a result to be sent when that stanza is received.
 The stanza should match fully, excluding the stanza id. The stanza id from the actual
 received stanza will be replaced in the result.
 */
app.post('/v1/mock/when', (req, res) => {
  if (!req.body.matches || !req.body.actions) {
    res.status(400).end()
    return
  }
  var matches = req.body.matches
  var actions = req.body.actions

  console.log(`Mocking xmpp stanza(ignoring stanza id):\n${match}\nresult will be\n${actions}\n`)

  expectationsv2.push({matches: matches, actions: actions})
  res.status(200).end()
})

/*
 Clear all expectations
 */
app.delete('/v1/mock', (req, res) => {
  console.log('Clearing all expectations in mock')
  expectations = []
  expectationsv2 = []
  res.status(200).end()
})

app.post('/server/v1/stanzas', (req, res) => {
  console.log(req.body)
  xmppServer.send(req.body.stanza)
  res.status(200).end()
})

app.listen(3000, () => {
  console.log('XMPP Mock listening on port 3000!')
})

xmpp.start()
xmppServer.start()

