*** Settings ***
Documentation		Integration tests for Extension Service

Library				XML
Library				Collections
Library				XmppLibrary.py


*** Variables ***

*** Keywords ***
Common prepare service for tests
    Set Xmpp Host           ${mock}

Connect to XMPP ${server} on ${port}
    Create client to domain     ${domain}
    Connect to server           ${server}       ${port}

Authenticate user ${username} on domain ${domain} on resource ${resource} using password ${password}
    Authenticate                ${username}     ${password}     ${resource}