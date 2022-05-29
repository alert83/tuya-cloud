import {isEmpty} from "lodash";
import TuyaMessageSubscribeWebsocket from "../classes/pulsar-events";
import {TuyaApi} from "../classes/tuya-api";

module.exports = (RED) => {
    function ConfigurationNode(config) {
        RED.nodes.createNode(this, config);
        this.name = config.name;
        this.pulsarEnv = config.pulsarEnv;
        this.pulsarClient = null;
        this.pulsarReady = false;

        const clientId = this.credentials.clientId;
        const secret = this.credentials.secret;
        const uid = this.credentials.uid;
        const region = this.credentials.region;

        const node = this;

        //initialize connection
        const httpClient = TuyaApi.getInstance({
            clientId: clientId,
            secret: secret,
            uid: uid,
            region: region,
            handleToken: true,
        });
        node.httpClient = httpClient;

        const pulsarClient = new TuyaMessageSubscribeWebsocket({
            accessId: clientId,
            accessKey: secret,
            url: TuyaMessageSubscribeWebsocket.URL[region],
            env: node.pulsarEnv,
            maxRetryTimes: 100,
        });
        node.pulsarClient = pulsarClient;

        //

        node.sendCommand = async (payload) => {
            const {url, data} = payload;
            if (isEmpty(data)) {
                return await node.httpClient.get(url);
            } else {
                return await node.httpClient.post(url, data);
            }
        };

        pulsarClient.open(() => {
            // console.log('open');

            if (false === node.pulsarReady) {
                node.emit('pulsarReady');
                node.pulsarReady = true;
            }

            node.status({fill: "green", shape: "dot", text: 'open'});
        });

        pulsarClient.message((ws, message) => {
            pulsarClient.ackMessage(message.messageId);
            // console.log('message');
            // console.dir(message, {depth: 10});

            node.emit('event', message);

            node.status({fill: "blue", shape: "dot", text: 'message'});
        });

        pulsarClient.reconnect(() => {
            // console.log('reconnect');
            node.status({fill: "green", shape: "dot", text: 'reconnect'});
        });

        pulsarClient.ping(() => {
            // console.log('ping');
            node.status({fill: "blue", shape: "dot", text: 'ping'});
        });

        pulsarClient.pong(() => {
            // console.log('pong');
            node.status({fill: "blue", shape: "dot", text: 'pong'});
        });

        pulsarClient.close((ws, ...args) => {
            console.log('close', ...args);

            node.emit('pulsarClosed');
            node.pulsarReady = false;

            node.log('tuya pulsar socket closed');
            node.status({fill: "red", shape: "ring", text: 'close'});
        });

        pulsarClient.error((ws, error) => {
            console.log('error', error);

            node.emit('error', error);
            node.error(error);
            node.status({fill: "red", shape: "ring", text: 'error: ' + error});
        });

        pulsarClient.start();
        node.status({fill: "gray", shape: "dot", text: 'start...'});

        node.on('close', () => {
            try {
                node.pulsarClient.stop();
                node.status({fill: "gray", shape: "ring", text: 'stop...'});
            } catch (e) {
                node.emit('error', e);
                node.error(e);
                node.status({fill: "red", shape: "ring", text: 'error: ' + e.message});
            }
        });
    }

    RED.nodes.registerType('tuya-cloud-api-config', ConfigurationNode, {
        credentials: {
            clientId: {type: "text"},
            secret: {type: "password"},
            uid: {type: "text"},
            region: {type: "text"},
        }
    });
};
