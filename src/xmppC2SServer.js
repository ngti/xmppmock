'use strict'

const xmpp = require('node-xmpp-server')

const xml = require('ltx')
var authConfig = {}

const XmppServer = function (serverOptions) {
  this.stanzaHandlers = [
    (stanza) => {
      console.log(`[R] ${stanza.root().toString()}`)
    }
  ]

  this.server = new xmpp.C2SServer(serverOptions)

  const self = this

  this.server.on('connection', function (client) {
    this.client = client

    client.on('register', function (opts, cb) {
      console.log('REGISTER')
      cb(true)
    })

    client.on('authenticate', function (opts, cb) {
      console.log('server:', opts.username, opts.password, 'AUTHENTICATING')

      if (self.isPasswordDisallowed(opts.password)) {
        console.log('server:', opts.username, 'AUTH FAIL')
        cb(false)
      } else {
        console.log('server:', opts.username, 'AUTH OK')
        cb(null, opts)
      }
    })

    client.on('online', () => console.log('server:', client.jid.local, 'ONLINE'))

    client.on('stanza', (stanza) => {
      for (const handler of self.stanzaHandlers) {
        handler(stanza)
      }
    })

    client.on('disconnect', () => console.log('server:', client.jid, 'DISCONNECT'))
  })
}

XmppServer.prototype.addStanzaHandler = function (handler) {
  this.stanzaHandlers.push(handler)
}

XmppServer.prototype.start = function (done) {
  const doneFunc = done ||
      function () {
        console.log('XmppServer initialization done, happy hacking')
      }
  this.server.on('listening', doneFunc)
}

XmppServer.prototype.send = function (stanzaString) {
  if (!this.server.client) {
    console.error('client is not connected, cannot send!')
  } else {
    var stanza = xml.parse(stanzaString)

    // add delay element
    var d = new Date()
    var date = d.toISOString()

    if (stanza.name === 'iq' && stanza.children[0]) {
      stanza.children[0].remove('delay')
      stanza.children[0].c('delay', {xmlns: 'urn:xmpp:delay', stamp: date})
    } else if (stanza.name === 'message' || stanza.name === 'iq') {
      stanza.remove('delay')
      stanza.c('delay', {xmlns: 'urn:xmpp:delay', stamp: date})
    }

    console.log(`[S] ${stanza}`)
    this.server.client.send(stanza)
  }
}

XmppServer.prototype.configAuth = function (config) {
  authConfig[config.password] = config.auth
}

XmppServer.prototype.deleteAuthConfig = function () {
  authConfig = {}
}

XmppServer.prototype.getAuthConfig = function () {
  return authConfig
}

XmppServer.prototype.isPasswordDisallowed = function (password) {
  console.log('authconfig for ' + password + ' : ' + authConfig[password])
  return authConfig[password] === 'fail' || password === ''
}

XmppServer.prototype.disconnect = function () {
  this.server.endSessions()
}

XmppServer.prototype.stop = function () {
  this.server.end()
}

XmppServer.prototype.getStatus = function () {
  return this.server.client.isConnected()
}

module.exports = XmppServer
