import TuyaMessageSubscribeWebsocket from "../classes/events";

module.exports = (RED) => {
    function ConfigurationNode(config) {
        RED.nodes.createNode(this, config);
        this.name = config.name;
        this.clientId = config.clientId;
        this.secret = config.secret;
        this.region = config.region;
        this.schema = config.schema;
        this.pulsarEnv = config.pulsarEnv;

        this.currentToken = null;
        this.tokenReady = false;

        this.pulsarClient = null;
        this.pulsarReady = false;

        const node = this;

        //initialize connection
        const client = new TuyaMessageSubscribeWebsocket({
            accessId: node.clientId,
            accessKey: node.secret,
            url: TuyaMessageSubscribeWebsocket.URL[node.region],
            env: node.pulsarEnv,
            maxRetryTimes: 100,
        });

        node.pulsarClient = client;

        client.open(() => {
            // console.log('open');

            if (false === node.pulsarReady) {
                node.emit('pulsarReady');
                node.pulsarReady = true;
            }

            node.status({fill: "green", shape: "dot", text: 'open'});
        });

        client.message((ws, message) => {
            client.ackMessage(message.messageId);
            // console.log('message');
            // console.dir(message, {depth: 10});

            node.emit('event', message);

            node.status({fill: "blue", shape: "dot", text: 'message'});
        });

        client.reconnect(() => {
            // console.log('reconnect');
            node.status({fill: "green", shape: "dot", text: 'reconnect'});
        });

        client.ping(() => {
            // console.log('ping');
            node.status({fill: "blue", shape: "dot", text: 'ping'});
        });

        client.pong(() => {
            // console.log('pong');
            node.status({fill: "blue", shape: "dot", text: 'pong'});
        });

        client.close((ws, ...args) => {
            console.log('close', ...args);
            node.status({fill: "red", shape: "ring", text: 'close'});
        });

        client.error((ws, error) => {
            console.log('error', error);
            node.status({fill: "red", shape: "ring", text: 'error: ' + error});
            node.error(error);
        });

        client.start();
        node.status({fill: "gray", shape: "dot", text: 'start...'});

        //listen for node close onMessage and free socket
        node.on('close', function () {
            try {
                node.pulsarClient.stop();

                node.emit('pulsarClosed');
                node.pulsarReady = false;
                node.pulsarClient = null;

                node.log('tuya pulsar socket closed');
                node.status({fill: "gray", shape: "ring", text: 'stop...'});
            } catch (err) {
            }
        });
    }


    RED.nodes.registerType('tuya-cloud-api-config', ConfigurationNode);
};
