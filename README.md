# XMPP Mock

[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/) [![Build Status](https://travis-ci.org/ngti/xmppmock.svg?branch=master)](https://travis-ci.org/ngti/xmppmock) [![Code Climate](https://codeclimate.com/github/ngti/xmppmock/badges/gpa.svg)](https://codeclimate.com/github/ngti/xmppmock) [![bitHound Overall Score](https://www.bithound.io/github/ngti/xmppmock/badges/score.svg)](https://www.bithound.io/github/ngti/xmppmock)

The purpose of this project is to provide an XMPP endpoint for integration tests of services that require a [XEP-0114](http://www.xmpp.org/extensions/xep-0114.html) connection.

## Table of contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Requirements](#requirements)
  - [Development Requirements](#development-requirements)
- [Usage](#usage)
  - [Running as Docker container](#running-as-docker-container)
  - [Running xmppmock standalone](#running-xmppmock-standalone)
- [Stop/start the server](#stopstart-the-server)
- [Retrieving received stanzas](#retrieving-received-stanzas)
- [Mocking request/responses](#mocking-requestresponses)
  - [Matching stanzas](#matching-stanzas)
  - [Placeholders](#placeholders)
  - [Setting actions](#setting-actions)
- [Examples](#examples)
  - [Respond with the 'from' and 'body' from the received message](#respond-with-the-from-and-body-from-the-received-message)
  - [Send sent and received receipts for all messages](#send-sent-and-received-receipts-for-all-messages)
  - [Match IQ by 'to', child attribute, send result](#match-iq-by-to-child-attribute-send-result)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Requirements

### Development Requirements

- [Node.js](https://nodejs.org/en/) 5.7.1
- [NPM](https://nodejs.org/)
- [Standard](http://standardjs.com/)
- [Mocha](https://mochajs.org/)
- [Docker](https://www.docker.com/)
- [node-xmpp with SSL/TLS support](https://github.com/stela/node-xmpp/tree/directSslTls)

## Usage

### Running as Docker container

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

| NAME            |     Default | Description                    |
| --------------- | ----------: | ------------------------------ |
| COMPONENT_PORT  |        6666 | XMPP component port            |
| COMPONENT_PASS  |    password | XMPP component password        |
| SERVER_HOST     |   localhost | XMPP domain                    |
| SERVER_PORT     |        5222 | XMPP client port               |
| SERVER_HOST_SSL | example.com | XMPP domain when using SSL/TLS |
| SERVER_PORT_SSL |         443 | XMPP client port for SSL/TLS   |
| USE_SSL         |             | `true` to use SSL              |

The provided Dockerfile exposes these container ports, your docker-compose file should match them:

| TCP Port | What                         |
| -------: | ---------------------------- |
|     6666 | XMPP component               |
|     3000 | REST/HTTP API port           |
|     5222 | XMPP client port             |
|      443 | XMPP client port for SSL/TLS |

### Running xmppmock standalone

Install npm and node-js, e.g. using [Homebrew](https://brew.sh).

```sh
brew update
brew install node npm
```

Then you can download required modules using npm and start up node-js with this application:

```sh
npm install
node .
```

## Stop/start the server

- `POST /v1/disconnect` will disconnect current sessions.  
- `POST /v1/stop` will disconnect current sessions and not accept any more attempts to connect.  
- `POST /v1/start` will restart the server, allowing new connections.

## Retrieving received stanzas

All stanzas sent to the mock are recorded and can be retrieved using the following methods:

- `GET /v1/stanzas` for all stanzas.
- `GET /v1/iq`
- `GET /v1/messages`
- `GET /v1/presence`

To filter by IQ type call /v1/iq with a 'child' query parameter, i.e.: 
`http://localhost:3000/v1/iq?child=test`

If filtering by xml namespace is required, just add a 'xmlns' parameter, i.e.:
`http://localhost:3000/v1/iq?child=test&xmlns=ucid:history#timeline`

To filter by IQ type call /v1/iq with a 'child' query parameter, i.e.: `GET /v1/iq?child=test`

## Mocking request/responses

To mock some actions to be taken when a matching stanza is sent, a `POST` can be issued to `/v1/mock/when`. The request
should issue `application/x-www-form-urlencoded` as its Content-Type. This call takes two form fields:

- `matches` indicates properties the stanza should match.
- `actions` indicates the actions to take when a stanza is matched.

### Matching stanzas

The `matches` form field should contain a JSON object.

Here, the `name` will match an XML tag name, `attrs` indicate values for the tag attributes, and `children` indicates the
presence of children elements. Each child tag is matched by the same rules, and they can be nested.
By default each rule will match once and then be removed. To increase the number of times you want the
rule to match, use the 'times' field, indicating either the number of times to match or the string 'inf', if you
want it to match indefinitely.

```json
{
  "name": "iq",
  "attrs": {
    "from": "%%FROM_USER%%@domain.com/%%RESOURCE%%",
    "to": "user2@%%DOMAIN%%",
    "id": "id_123",
    "type": "result",
    "ts": "%%TIMESTAMP%%"
  },
  "children": [
    {
      "name": "add",
      "attrs": {
        "xmlns": "ucid:groupchat"
      },
      "children": [
        {
          "name": "test",
          "absent": true
        }
      ]
    },
    {
      "name": "body",
      "text": "Hello, %%NAME%%"
    }
  ],
  "times": 2
}
```

This will match the following stanza:

```xml
<iq from="user1@domain.com/123" to="user2@example.com" id="id_123" type="result" ts="2017-05-11T11:13:55.335Z">
  <add xmlns="ucid:groupchat" />
  <body>"Hello, World"</body>
</iq>
```

- The matching strategy is non-strict by default, if the stanza has additional elements/attributes it WILL match.
- If a placeholder matches two different values, the stanza will NOT match.
- Duplicate elements with different texts are seen as one element with two children. Example: `<ucid>user1</ucid><ucid>user2</ucid>` is matched by `{"name":"ucid","children":[["userA","userB"]]}`

### Placeholders

Placeholders work as wildcards, they will match the value of an attribute or body in the received stanza. Their actual value can be used to make replacements in the results.

Placeholders are matched by the `%%\w+%%` regexp, which means `a-z A-Z 0-9` and the underscore `_` can be used for placeholder names. Elements are matched exact, no placeholders are allowed.

### Setting actions

When a stanza is matched, several actions can be set. The 'actions' form field should contain
a JSON array with these supported actions:

```json
[
  {
    "sendResults": [
      "mdnReceived"
    ]
  },
  {
    "sendStanzas": [
      "<iq type='result'></iq>",
      "<message from='%%FROM_USER%% to='user2@hotmail.com' id='id_123'><receipt type='sent' id='%%STANZA_ID%%'></message>"
    ]
  },
  {
    "sendResults": [
      "mdnSent"
    ]
  }
]
```

The `sendResults` fields can take `mdnSent` and `mdnReceived` values, and will send back a receipt of the given type, based on the incoming stanza.

Many combinations can be used to set actions, the order by which the results are sent will match the order in the array:

```json
[{"sendResults": ["mdnSent", "mdnReceived"]},{"sendStanzas": ["<message><body>testo</body></message>"]}]

[{"sendResults": ["mdnSent", "mdnReceived"], "sendStanzas": ["<message><body>testo</body></message>"]}]

[{"sendResults": ["mdnSent"], "sendStanzas": ["<message><body>testo</body></message>"]}, {"sendResults": [ "mdnReceived"]}]
```

## Examples

### Respond with the 'from' and 'body' from the received message

```json
Matches:
{"name": "message", "attrs": { "from": "%%FROM_USER%%"},"children": [{"name": "body", "text": "%%BODY%%"}]}

Actions:
[{"sendStanzas":["<message from='other@hotmail.com' to='%%FROM_USER%%' id='id_123'><body>%%BODY%%</body></message>"]}]
```

### Send sent and received receipts for all messages

```json
Matches:
{"name": "message", "attrs": { "from": "%%FROM_USER%%", "to": "%%TO_USER%%"}}

Actions:
[{"sendResults": ["mdnReceived", "mdnSent"]}]
```

### Match IQ by 'to', child attribute, send result

```json
Matches:
{"name": "iq","attrs": {"type": "get", "from": "%%FROM_USER%%", "to": "groupchat_name@io4t.devucid.ch"},"children": [{"name": "info", "attrs":
   {"xmlns": "ucid:groupchat" }}]}

Actions:
[{"sendStanzas":["<iq from='other@hotmail.com' to='%%FROM_USER%%' id='%%ID%%' type='result'></iq>"]}]
```
