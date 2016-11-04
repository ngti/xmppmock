import json
import requests
import xml.etree.ElementTree as ET
from xmpp import *


def presenceHandler(conn, presence_node):
    """ Handler for playing a sound when particular contact became online """
    targetJID = 'node@domain.org'
    if presence_node.getFrom().bareMatch(targetJID):
        # play a sound
        pass


def iqHandler(conn, iq_node):
    """ Handler for processing some "get" query from custom namespace"""
    reply = iq_node.buildReply('result')
    # ... put some content into reply node
    conn.send(reply)
    raise NodeProcessed  # This stanza is fully processed


def messageHandler(conn, mess_node): pass


class XmppLibrary(object):
    def __init__(self):
        self._xmpp_host = ''
        self._client = None

    def set_xmpp_host(self, host):
        self._xmpp_host = host

    def flush_captured(self):
        """Deletes all stanzas received in the XMPP mock and prepares it to collect again.
        """
        requests.delete('%s/v1/stanzas' % self._xmpp_host)

    def flush_expectations(self):
        """Deletes all set expectations
        """
        requests.delete('%s/v1/mock' % self._xmpp_host)

    def capture_sent_stanzas(self):
        """Gets all stanzas captured by the XMPP Mock by a REST call.
        """
        r = requests.get('%s/v1/stanzas' % self._xmpp_host)
        return r.json()

    def send_stanza(self, stanza):
        """Send a stanza to the component
        """
        r = requests.post('%s/v1/stanzas' % self._xmpp_host, data={"stanza": stanza})
        return r.status_code

    def set_expectation(self):
        """Send a stanza to the component
        """
        matches = {"name": "message"}
        actions = {"sendResults": {"mdnReceived": "true"}}

        data = {'matches': json.dumps(matches), 'actions': json.dumps(actions)}
        r = requests.post('%s/v1/mock/when' % self._xmpp_host, data=data)
        return r.status_code

    def create_client_to_domain(self, domain):
        self._client = Client(domain)

    def connect_to_server(self, server, port):
        if not self._client.connect(server=(server, port)):
            raise IOError('Can not connect to server.')
        self._client.RegisterHandler('presence', presenceHandler)
        self._client.RegisterHandler('iq', iqHandler)
        self._client.RegisterHandler('message', messageHandler)

    def authenticate(self, user, password, resource):
        if not self._client.auth(user, password, resource):
            raise IOError('Can not auth with server.')

    def send_presence(self):
        self._client.sendInitPresence()

    def send_message(self, to, body, id=None):
        self._client.send(Message(to, body, attrs={'id': id}))

    def send_iq(self, type, elementName, namespace, to, id):
        self._client.send(Protocol('iq', to, type, attrs={'id': id}, payload=[Node(elementName, {'xmlns': namespace})]))

    def find_stanza(self, stanzas, receiptType=None, id=None):
        for stanza in stanzas:
            st = ET.fromstring(stanza['xml'].encode('utf-8'))
            if st.tag != 'message':
                continue
            receiptEl = st.find(receiptType)
            if receiptEl.id == id:
                return
        raise Error("Stanza not found")
