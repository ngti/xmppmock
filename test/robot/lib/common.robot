*** Settings ***
Documentation		Integration tests for Extension Service

Library				XML
Library				Collections
Library				XmppLibrary.py


*** Variables ***

*** Keywords ***
Common prepare service for tests
    Set Xmpp Host               ${mock}

Connect to XMPP ${server} on ${port}
    Create client to domain     ${domain}
    Connect to server           ${server}       ${port}

Authenticate user ${username} on domain ${domain} on resource ${resource} using password ${password}
    Authenticate                ${username}     ${password}     ${resource}

Send a message to '${to}' with body '${body}'
    Send message                ${to}   ${body}

Message to '${to}' with body '${body}' was received
    ${stanzas}=                 Capture sent stanzas
    ${stanza1_dic}=             Get from list               ${stanzas}          0
    ${stanza1_str}=             Get from dictionary         ${stanza1_dic}      xml
    Verify message ${stanza1_str} to ${to} with body ${body}

Verify message ${stanza1_str} to ${to jid} with body ${body}
    ${stanza}=                      ParseXML                    ${stanza1_str}
    Should be equal                 ${stanza.tag}               message
    Element attribute should be     ${stanza}                   to                  ${to jid}
    ${body elem}=                   Get element                 ${stanza}           body
    Element text should be          ${body elem}                ${body}
