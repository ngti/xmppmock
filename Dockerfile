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

# Start xmppmock
EXPOSE 6666
EXPOSE 3000
EXPOSE 5222
EXPOSE 443

ENV SERVER_HOST_SSL=example.com
ENV SERVER_PORT_SSL=443
CMD [ "npm", "start" ]
