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
Connect to the mock and send a messsage
    Connect to the mock and send presence
    Send a message to 'robot2@localhost/1' with body 'Проверка связи 2'
    Message to 'robot2@localhost/1' with body 'Проверка связи 2' was received

Send a ping IQ should receive the ping result
    Connect to the mock and send presence
    Send a ping to 'robot2@localhost/1' with id 'abc123'
    Verify 'result' IQ with id 'abc123' was received

Set expectation
    Connect to the mock and send presence
    ${statusCode}=      Set expectation
    Should be equal as numbers     ${statusCode}       200
    Send a message to 'robot2@localhost/1' with id 'message1' and body 'Проверка связи 2'
    Receipt received was received with id 'message1'
