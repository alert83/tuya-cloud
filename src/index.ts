import {isEmpty} from "lodash";
import {TuyaApi} from "./class";
import TuyaMessageSubscribeWebsocket from "./events";

module.exports = (RED) => {
    function configuration(config) {
        RED.nodes.createNode(this, config);
        this.name = config.name;
        this.clientId = config.clientId;
        this.secret = config.secret;
        this.region = config.region;
        this.schema = config.schema;
    }

    RED.nodes.registerType('tuya-cloud-api-configuration', configuration);

    //

    function request(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        const conf = RED.nodes.getNode(config.config);
        const nodeContext = this.context();
        // const globalContext = this.context().global;

        // console.dir({ conf: Object.keys(conf) }, {color: true});
        // node.status({fill: 'yellow', shape: 'dot', text: 'connecting'});
        //
        // (async () => {})()
        //     .then(() => node.status({fill: 'green', shape: 'dot', text: 'connected'}))
        //     .catch(e => node.status({fill: 'red', shape: 'ring', text: e.message}));

        node.on('input', async (msg, send, done) => {
            const {url, data} = msg.payload;

            try {
                const client = TuyaApi.getInstance({
                    clientId: conf.clientId,
                    secret: conf.secret,
                    schema: conf.schema,
                    region: conf.region,
                    handleToken: true,
                });

                if (isEmpty(data)) {
                    msg.payload = await client.get(url);
                } else {
                    msg.payload = await client.post(url, data);
                }

                // tslint:disable-next-line:only-arrow-functions
                send = send || function () {
                    node.send.apply(node, arguments);
                };
                send(msg);

                if (done) done();
            } catch (e) {
                const err = `Error Requesting: ${JSON.stringify([e.code, e.message])}`;
                if (done) {
                    // Node-RED 1.0 compatible
                    done(err);
                } else {
                    // Node-RED 0.x compatible
                    node.error(err, msg);
                }
            }
        });

    }

    RED.nodes.registerType('tuya-cloud-api-request', request);

    //

    function token(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        const conf = RED.nodes.getNode(config.config);
        const nodeContext = this.context();

        node.on('input', async (msg, send, done) => {
            const {url, data} = msg.payload;

            try {
                const client = TuyaApi.getInstance({
                    clientId: conf.clientId,
                    secret: conf.secret,
                    schema: conf.schema,
                    region: conf.region,
                    handleToken: true,
                });

                msg.payload = await client.getAndRefreshToken();

                // tslint:disable-next-line:only-arrow-functions
                send = send || function () {
                    node.send.apply(node, arguments);
                };
                send(msg);

                if (done) done();
            } catch (e) {
                const err = `Error Requesting: ${JSON.stringify([e.code, e.message])}`

                if (done) {
                    // Node-RED 1.0 compatible
                    done(err);
                } else {
                    // Node-RED 0.x compatible
                    node.error(err, msg);
                }
            }
        });

    }

    RED.nodes.registerType('tuya-cloud-api-token', token);

    //

    function events(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        const conf = RED.nodes.getNode(config.config);
        // const nodeContext = this.context();

        const client = new TuyaMessageSubscribeWebsocket({
            accessId: conf.clientId,
            accessKey: conf.secret,
            url: TuyaMessageSubscribeWebsocket.URL.EU,
            env: TuyaMessageSubscribeWebsocket.env.TEST,
            maxRetryTimes: 100,
        });

        client.open(() => {
            console.log('open');
            node.status({fill: "green", shape: "dot", text: 'open'});
        });

        client.message((ws, message) => {
            client.ackMessage(message.messageId);
            // console.log('message');
            // console.dir(message, {depth: 10});

            node.send({payload: message.payload});

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
            // console.log('close', ...args);
            node.status({fill: "red", shape: "ring", text: 'close'});
        });

        client.error((ws, error) => {
            // console.log('error', error);
            node.status({fill: "red", shape: "ring", text: 'error: ' + error});
        });

        node.tuyaWsClient = client;

        node.on('input', async (msg) => {
            node.tuyaWsClient.start();
            node.status({fill: "gray", shape: "dot", text: 'start...'});
        });

        node.on('close', function (done) {
            node.tuyaWsClient.stop();
            node.status({fill: "gray", shape: "ring", text: 'stop...'});
            done();
        });
    }

    RED.nodes.registerType('tuya-cloud-events', events);
};
