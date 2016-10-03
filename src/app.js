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
const isEqual = require('lodash.isequal')

const COMPONENT_PORT = process.env.COMPONENT_PORT ? process.env.COMPONENT_PORT : 6666
const COMPONENT_PASS = process.env.COMPONENT_PASS ? process.env.COMPONENT_PASS : 'password'

const SERVER_HOST = process.env.SERVER_HOST ? process.env.SERVER_HOST : 'localhost'
const SERVER_PORT = process.env.SERVER_PORT ? process.env.SERVER_PORT : 5222

const SERVER_HOST_SSL = process.env.SERVER_HOST_SSL ? process.env.SERVER_HOST_SSL : 'example.com'
const SERVER_PORT_SSL = process.env.SERVER_PORT_SSL ? process.env.SERVER_PORT_SSL : 443

const USE_SSL = process.env.USE_SSL === 'true'

const xmpp = new Xmpp(COMPONENT_PORT, COMPONENT_PASS)

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
  var found = false

  var recv = JSON.stringify(stanza)
  console.log(`received type: ${recv}`)

  for (var i = 0; i < expectations.length; i++) {
    var expectation = expectations[i]
    var exp = JSON.stringify(expectation.expected)

    console.log(`expected: ${exp}`)

// / match objects excluding ID???
    if (isEqual(expectation.expected, stanza)) {
      console.log(`match found for ${stanza.name}`)

        // copy id from request to result
      xmppServer.send(expectations[i].result)
      found = true
    }
  }
  if (!found) {
    console.log('match not found')
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
app.post('/v1/when/equals', (req, res) => {
  console.log(req.body)
  expectations.push({expected: xml.parse(req.body.expected), result: xml.parse(req.body.result)})
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

