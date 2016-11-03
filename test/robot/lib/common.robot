*** Settings ***
Documentation		Integration tests for Extension Service

Library				XML
Library				Collections
Library				XmppLibrary.py


*** Variables ***

*** Keywords ***
Common prepare service for tests
    Set Xmpp Host               ${mock}
    Flush captured

Connect to XMPP ${server} on ${port}
    Create client to domain     ${domain}
    Connect to server           ${server}       ${port}

Authenticate user ${username} on domain ${domain} on resource ${resource} using password ${password}
    Authenticate                ${username}     ${password}     ${resource}

Send a message to '${to}' with body '${body}'
    Send message                ${to}   ${body}

Send a ping to '${to}' with id '${id}'
    Send iq                     get     ping    urn:xmpp:ping   ${to}           ${id}

Message to '${to}' with body '${body}' was received
    ${stanzas}=                     Capture sent stanzas
    ${stanza1_dic}=                 Get from list               ${stanzas}      0
    ${stanza1_str}=                 Get from dictionary         ${stanza1_dic}  xml
    ${stanza}=                      ParseXML                    ${stanza1_str}
    Should be equal                 ${stanza.tag}               message
    Element attribute should be     ${stanza}                   to                  ${to}
    ${body elem}=                   Get element                 ${stanza}           body
    Element text should be          ${body elem}                ${body}

Verify '${iqType}' IQ with id '${id}' was received
    @{stanzas}=                     Capture sent stanzas

    :FOR   ${stanza_dic}    IN          @{stanzas}
    \   ${stanza_str}=                  Get from dictionary         ${stanza_dic}  xml
    \   ${stanza}=                      ParseXML                    ${stanza_str}
    \   ${iqMatch}=                     Evaluate                    '${stanza.tag}'=='iq'
    \   ${stanzaId}=                    Get Element Attribute       ${stanza}   id
    \   ${idMatch}=                     Evaluate                    '${stanzaId}'=='${id}'
    \   ${stanzaType}=                  Get Element Attribute       ${stanza}   type
    \   ${typeMatch}=                   Evaluate                    '${stanzaType}'=='${iqType}'
    \   Pass Execution If               ${iqMatch} & ${idMatch}     Stanza found
    Fail    Stanza not found!
