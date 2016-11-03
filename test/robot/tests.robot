*** Settings ***
Documentation		    Black box tests for Extension Service
Resource            lib/common.robot
Test setup          Common prepare service for tests

*** Variables ***
${server}           localhost
${port}             5222
${mock}             http://localhost:3000
${resource}         21672
${username}         robot
${password}         pass
${domain}           localhost

*** Test Cases ***
Connect to the mock and send presence
    Connect to XMPP ${server} on ${port}
    Authenticate user ${username} on domain ${domain} on resource ${resource} using password ${password}
    Send presence

Connect to the mock and send a messsage
    Connect to XMPP ${server} on ${port}
    Authenticate user ${username} on domain ${domain} on resource ${resource} using password ${password}
    Send presence
    Send a message to 'robot2@localhost/1' with body 'Проверка связи 2'
    Message to 'robot2@localhost/1' with body 'Проверка связи 2' was received