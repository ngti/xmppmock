'use strict'

const express = require('express')
const ewait = require('ewait')
const bodyParser = require('body-parser')
const xml = require('ltx')
const xmppMock = require('./xmppMock')
const EventEmitter = require('events')

class Eventer extends EventEmitter {
}

const emitter = new Eventer()

const app = express()
app.use(bodyParser.urlencoded({ extended: false }))
app.use(require('morgan')('dev'))
app.use((err, req, res, next) => {
  console.error(err.stack)
  next(err)
})

app.get('/', (req, res) => {
  res.json({ status: 'ok' }).end()
})

app.get('/v1/stanzas', (req, res) => {
  function findAndRespond () {
    xmppMock.getAllReceived((err, docs) => {
      if (err) {
        res.status(500).send(err).end()
        return
      }
      res.json(docs).end()
    })
  }

  if (xmppMock.isDirty()) {
    findAndRespond()
  } else {
    ewait.waitForAll([ emitter ], (err) => {
      if (err) {
        console.log('Timeout waiting for stanzas')
      }
      findAndRespond()
    }, 10000, 'inserted')
  }
})

app.get('/v1/messages', (req, res) => {
  function findAndRespond () {
    xmppMock.getReceived('message', (err, docs) => {
      if (err) {
        res.status(500).send(err).end()
        return
      }
      res.json(docs).end()
    })
  }

  if (xmppMock.isDirty()) {
    findAndRespond()
  } else {
    ewait.waitForAll([ emitter ], (err) => {
      if (err) {
        console.log('Timeout waiting for stanzas')
      }
      findAndRespond()
    }, 10000, 'inserted')
  }
})

app.get('/v1/iq/', (req, res) => {
  function findAndRespond (childToFilter, childXmlns) {
    xmppMock.getReceived('iq', (err, docs) => {
      if (err) {
        res.status(500).send(err).end()
        return
      }

      if (childToFilter) {
        var filtered = []
        for (var doc of docs) {
          let stanza = doc.xml

          console.log(stanza)
          var xmlst = xml.parse(stanza)
          console.log(xmlst)

          let found = xmlst.children.find(function (child) {
              return (!childXmlns || child.attrs[ 'xmlns' ] === childXmlns) && child.name === childToFilter
            }
          )
          console.log('found: ' + found)

          if (found) {
            filtered.push(doc)
          }
        }
        res.json(filtered).end()
      } else {
        res.json(docs).end()
      }
    })
  }

  if (xmppMock.isDirty()) {
    var child = req.query.child
    var childXmlns = req.query.xmlns
    findAndRespond(child, childXmlns)
  } else {
    ewait.waitForAll([ emitter ], (err) => {
      if (err) {
        console.log('Timeout waiting for stanzas')
      }
      findAndRespond()
    }, 10000, 'inserted')
  }
})

app.get('/v1/presence', (req, res) => {
  function findAndRespond () {
    xmppMock.getReceived('presence', (err, docs) => {
      if (err) {
        res.status(500).send(err).end()
        return
      }
      res.json(docs).end()
    })
  }

  if (xmppMock.isDirty()) {
    findAndRespond()
  } else {
    ewait.waitForAll([ emitter ], (err) => {
      if (err) {
        console.log('Timeout waiting for stanzas')
      }
      findAndRespond()
    }, 10000, 'inserted')
  }
})

app.post('/v1/stanzas', (req, res) => {
  console.log(req.body)
  xmppMock.sendToComponent(req.body.stanza)
  res.status(200).end()
})

app.delete('/v1/stanzas', (req, res) => {
  xmppMock.flushReceived()
  xmppMock.setDirty(false)
  res.status(200).end()
})

// { 'password': 'invalidToken', 'auth': 'fail' }
app.post('/v1/auth', (req, res) => {
  console.log('Configuring auth: ' + JSON.stringify(req.body))
  xmppMock.setAuth(req.body)
  res.status(200).end()
})

app.delete('/v1/auth', (req, res) => {
  console.log('Deleting auth config')
  xmppMock.resetAuth()
  res.status(200).end()
})

app.get('/v1/auth', (req, res) => {
  res.json(xmppMock.getAuthConfig()).end()
})

/*
 Takes an expected stanza and a result to be sent when that stanza is received.
 The stanza should match fully, excluding the stanza id. The stanza id from the actual
 received stanza will be replaced in the result.
 */
app.post('/v1/mock/when/equals', (req, res) => {
  var expected = xml.parse(req.body.expected)
  var result = xml.parse(req.body.result)
  console.log(`Mocking xmpp stanza(ignoring stanza id):\n${JSON.stringify(expected)}\nresult will be\n${JSON.stringify(result)}\n`)

  xmppMock.addExpectationV1(expected, result)

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
    console.log("Invalid request, doesn't contain matches and actions")
    return
  }
  let matches = JSON.parse(req.body.matches)
  if (matches.times && matches.times !== 'inf' && !isNumber(matches.times)) {
    res.status(400).end()
    console.log("Invalid request, 'times' can only be a number of the string 'inf'")
    return
  }

  let actions = JSON.parse(req.body.actions)
  if (Object.prototype.toString.call(actions) !== '[object Array]') {
    res.status(400).send("'actions' is expected to be an array!").end()
    return
  }

  console.log(`Mocking xmpp stanza(ignoring stanza id):\n${JSON.stringify(matches)}\nresult will be:\n${JSON.stringify(actions)}\n`)

  // Set default matching times
  if (!matches.times) {
    matches.times = 1
  }
  console.log(`This match will happen ${matches.times} times`)
  xmppMock.addExpectationV2(matches, actions)

  res.status(200).end()
})

function isNumber (n) {
  return !isNaN(parseFloat(n)) && isFinite(n)
}
/*
 Clear all expectations
 */
app.delete('/v1/mock', (req, res) => {
  console.log('Clearing all expectations in mock')
  xmppMock.clearExpectations()
  res.status(200).end()
})

app.post('/server/v1/stanzas', (req, res) => {
  console.log(req.body)
  xmppMock.sendToClient(req.body.stanza)
  res.status(200).end()
})

app.post('/v1/disconnect', (req, res) => {
  console.log('Disconnect')
  xmppMock.killConnections()
  res.status(200).end()
})

app.post('/v1/stop', (req, res) => {
  console.log('Stopping...')
  xmppMock.stop()
  res.status(200).end()
})

app.post('/v1/start', (req, res) => {
  console.log('Starting...')
  xmppMock.start(emitter)
  res.status(200).end()
})

app.post('/v1/status', (req, res) => {
  xmppMock.getStatus()
  res.status(200).end()
})

app.listen(3000, () => {
  console.log('XMPP Mock listening on port 3000!')
})

xmppMock.start(emitter)
