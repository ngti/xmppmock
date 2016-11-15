XMPP Mock
=========
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/) [![Build Status](https://travis-ci.org/jsantiagoh/xmppmock.svg?branch=master)](https://travis-ci.org/jsantiagoh/xmppmock) [![Code Climate](https://codeclimate.com/github/jsantiagoh/xmppmock/badges/gpa.svg)](https://codeclimate.com/github/jsantiagoh/xmppmock) [![bitHound Overall Score](https://www.bithound.io/github/jsantiagoh/xmppmock/badges/score.svg)](https://www.bithound.io/github/jsantiagoh/xmppmock)

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
    image: jsantiagoh/xmppmock
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
named `certs/SERVER_HOST_SSL.key` and `certs/SERVER_HOST_SSL.key` 


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
        name: "test"
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
a JSON object with these supported actions:

```
{
    sendResults: {
        mdnReceived: 'true',
        mdnSent: 'true',
        iqResult: 'true',         
        stanzas : [
            "<iq type="result'></iq>",
            "<message from='%%FROM_USER%% to='user2@hotmail.com' id='id_123'><receipt type='sent' id='%%STANZA_ID%%'></message>"
        ]
    }
    
}
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
{"sendResults": {"stanzas":["<message from='other@hotmail.com' to='%%FROM_USER%%' id='id_123'><body>%%BODY%%</body></message>"]}}
```

####Send sent and received receipts for all messages

matches:
```
{"name": "message", "attrs": { "from": "%%FROM_USER%%", "to": "%%TO_USER%%"}}
```
actions:
```
{"sendResults": {"mdnReceived": "true", "mdnSent": "true"}}
```

####Match IQ by 'to', child attribute, send result

matches:
```
{"name": "iq","attrs": {"type": "get", "from": "%%FROM_USER%%", "to": "groupchat_name@io4t.devucid.ch"},"children": [{"name": "info", "attrs": {"xmlns": "ucid:groupchat" }}]}
```

actions:
```
{"sendResults": {"stanzas":["<iq from='other@hotmail.com' to='%%FROM_USER%%' id='%%ID%%' type='result'></iq>"]}}
```