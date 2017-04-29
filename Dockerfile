FROM node:6.3

# Check out node-xmpp with SSL/TLS support into /usr/src/node-xmpp and build it
RUN mkdir -p /usr/src
WORKDIR /usr/src
RUN git clone -b directSslTls https://github.com/stela/node-xmpp.git
WORKDIR /usr/src/node-xmpp
CMD [ "npm", "deploy" ]

# Copy xmppmock into /usr/src/xmppmock
RUN mkdir -p /usr/src/xmppmock
WORKDIR /usr/src/xmppmock

COPY package.json /usr/src/xmppmock/
RUN npm install
COPY . /usr/src/xmppmock

# docker healthcheck, port 3000 runs the HTTP REST interface so is easy to test, "GET /" should return {"status":"ok"}.
HEALTHCHECK --interval=5s --timeout=3s CMD curl --fail http://localhost:3000/ || exit 1

# Start xmppmock
# XMPP components
EXPOSE 6666
# HTTP REST API
EXPOSE 3000
# client-to-server
EXPOSE 5222
# client-to-server TLS
EXPOSE 443

ENV SERVER_HOST_SSL=example.com
ENV SERVER_PORT_SSL=443
CMD [ "npm", "start" ]
