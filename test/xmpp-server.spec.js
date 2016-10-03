'use strict'

const assert = require('assert')
const Server = require('../src/xmpp-server')

const serverOptions = {
  port: '5333',
  domain: 'localhost'
}

describe('the server', function () {
  const server = new Server(serverOptions)
  const password = 'invalid.token'

  it('any password is allowed by default', (done) => {
    assert.ok(!server.isPasswordDisallowed(password))
    done()
  })

  it('can configure auth to disable a password', (done) => {
    server.configAuth({ 'password': password, 'auth': 'fail' })
    assert.ok(server.isPasswordDisallowed(password))
    done()
  })
})

