XMPP Mock
=========
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/) [![Build Status](https://travis-ci.org/ngti/xmppmock.svg?branch=master)](https://travis-ci.org/ngti/xmppmock) [![Code Climate](https://codeclimate.com/github/ngti/xmppmock/badges/gpa.svg)](https://codeclimate.com/github/ngti/xmppmock) [![bitHound Overall Score](https://www.bithound.io/github/ngti/xmppmock/badges/score.svg)](https://www.bithound.io/github/ngti/xmppmock)

The purpose of this project is to provide an XMPP endpoint for integration tests of services that require a [XEP-0114](http://www.xmpp.org/extensions/xep-0114.html) connection.

Requirements
============

Development Requirements
------------------------
- Node.js 5.7.1
- [NPM](https://nodejs.org/)
- [Standard](http://standardjs.com/)
- [Mocha](https://mochajs.org/)
- [Docker](https://www.docker.com/)
- [node-xmpp with SSL/TLS support](https://github.com/stela/node-xmpp/tree/directSslTls)

Usage
=====

I recommend using this alongside [Docker compose](https://docs.docker.com/compose/) to test some service connecting to _XMPP Mock_.

For example, below is a sample `docker-compose.yml` that builds and starts a service named _myservice_ connecting to an instance of _xmppmock_.

```yaml
version: "2"
services:
  myservice:
    build: .
    links:
      - xmppmock:xmppmock.local
    ports:
      - 80:80

  xmppmock:
    image: your.local.docker.registry/xmppmock
    environment:
      - COMPONENT_PORT=11221
      - COMPONENT_PASS=pass11221
      - SERVER_HOST = xmppmock.local
      - SERVER_PORT=5222
    ports:
      - 3000:3000
```

In order to use SSL/TLS, instead of `SERVER_HOST` and `SERVER_PORT`, specify `SERVER_HOST_SSL` and `SERVER_PORT_SSL`
and put the certificate and private key files in the `certs` subdirectory,
named `certs/SERVER_HOST_SSL.crt` and `certs/SERVER_HOST_SSL.key`

These environment settings define which ports are bound to by the container (may be different than the host):

| NAME | Default | Description |
| ---- | ------: | ----------- |
| COMPONENT_PORT | 6666 | XMPP component port |
| COMPONENT_PASS | password | XMPP component password |
| SERVER_HOST | localhost | XMPP domain |
| SERVER_PORT | 5222 | XMPP client port |
| SERVER_HOST_SSL | example.com | XMPP domain when using SSL/TLS |
| SERVER_PORT_SSL | 443 | XMPP client port for SSL/TLS |
| USE_SSL |  | `true` to use SSL. See instructions above for .crt and .key file locations |

The provided Dockerfile exposes these container ports, your docker-compose file should match them:

| TCP Port | What |
| -------: | ---- |
| 6666 | XMPP component |
| 3000 | REST/HTTP API port |
| 5222 | XMPP client port |
| 443  | XMPP client port for SSL/TLS |


Running xmppmock standalone
---------------------------
Install npm and node-js, e.g. using homebrew:
```sh
brew update && brew install node npm
```
Then you can download required modules using npm and start up node-js with this application:
```sh
npm install
node .
```

Stop/start the server
===========
POSTing to /v1/disconnect will disconnect current sessions.  
POSTing to /v1/stop will disconnect current sessions and not accept any more attempts to connect.  
POSTing to /v1/start will restart the server, allowing new connections.  

Retrieve received stanzas
===========
All stanzas sent to the mock are recorded and can be retrieved using the following methods:
- /v1/stanzas (all received stanzas)
- /v1/iq
- /v1/messages
- /v1/presence

To filter by IQ type call /v1/iq with a 'child' query parameter, i.e.: http://localhost:3000/v1/iq?child=test

Mocking request/responses
===========
To mock some actions to be taken when a matching stanza is sent, a POST can be issued to /v1/mock/when. The request
should issue 'application/x-www-form-urlencoded' as its Content-Type. This call takes two form fields:
- 'matches' indicates properties the stanza should match.
- 'actions' indicates the actions to take when a stanza is matched.

Matching stanzas
--------
The 'matches' form field should contain a JSON object.

Here, the 'name' will match an XML tag name, 'attrs' indicate values for the tag attributes, and 'children' indicates the
presence of children elements. Each child tag is matched by the same rules, and they can be nested in principle indefinitely.

```json
{
  name: "iq"/"message",
  attrs: {
    from: "%%FROM_USER%%@domain.com/%%RESOURCE%%",
    to: "user2@%%DOMAIN%%",
    id: "id_123",    
    type: "result",
    ts: "%%TIMESTAMP%%"
  },
  children: [
    { 
      name: "add", 
      attrs: {
          xmlns: "ucid:groupchat"
      },
      children: [
        { name: "test", absent: true}
      ]
    },
    {
      name: "body",
      text: "Hello, %%NAME%%"
    }
  ]
}
```

* Placeholders work as wildcards, they will match any string in the received stanza. Their actual value can be used to make replacements in the results.
* Placeholders are matched by the '%%\w+%%' regexp, which means a-z, A-Z, 0-9 and the underscore(_) can be used for placeholder names.
* The match on tag name is exact, no placeholders are allowed.
* If a placeholder matches two different values, the stanza will NOT match.
* The matching strategy is non-strict by default, if the stanza has additional elements/attributes it WILL match.

Setting actions
-------
When a stanza is matched, several actions can be set. The 'actions' form field should contain
a JSON array with these supported actions:

```
[
    {
        sendResults: [ "mdnReceived" ]
    },
    { 
        sendStanzas: [ 
            "<iq type='result'></iq>",
            "<message from='%%FROM_USER%% to='user2@hotmail.com' id='id_123'><receipt type='sent' id='%%STANZA_ID%%'></message>" 
            ]
    },
    { 
        sendResults: [ "mdnSent" ]
    }
]
```

The 'sendResults' fields can take 'mdnSent' and 'mdnReceived' values, and will send back a receipt of the given type, based
on the incoming stanza.

Many combinations can be used to set actions, the order by which the results are sent will match the order in the array:

```
[{"sendResults": ["mdnSent", "mdnReceived"]},{"sendStanzas": ["<message><body>testo</body></message>"]}]
```
```
[{"sendResults": ["mdnSent", "mdnReceived"], "sendStanzas": ["<message><body>testo</body></message>"]}]
```
```
[{"sendResults": ["mdnSent"], "sendStanzas": ["<message><body>testo</body></message>"]}, {"sendResults": [ "mdnReceived"]}]
```

- Any unknown placeholders will NOT be replaced.

Examples
=========

####Send a message back to the user, replacing 'from' and body from the original message:

matches:
```
{"name": "message", "attrs": { "from": "%%FROM_USER%%"},"children": [{"name": "body", "text": "%%BODY%%"}]}
```
actions:
```
[{"sendStanzas":["<message from='other@hotmail.com' to='%%FROM_USER%%' id='id_123'><body>%%BODY%%</body></message>"]}]
```

####Send sent and received receipts for all messages

matches:
```
{"name": "message", "attrs": { "from": "%%FROM_USER%%", "to": "%%TO_USER%%"}}
```
actions:
```
[{"sendResults": ["mdnReceived", "mdnSent"]}]
```

####Match IQ by 'to', child attribute, send result

matches:
```
{"name": "iq","attrs": {"type": "get", "from": "%%FROM_USER%%", "to": "groupchat_name@io4t.devucid.ch"},"children": [{"name": "info", "attrs": {"xmlns": "ucid:groupchat" }}]}
```

actions:
```
[{"sendStanzas":["<iq from='other@hotmail.com' to='%%FROM_USER%%' id='%%ID%%' type='result'></iq>"]}]
```
