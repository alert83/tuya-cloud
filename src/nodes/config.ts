import {isEmpty} from "lodash";
import {Subject} from "rxjs";
import TuyaMessageSubscribeWebsocket from "../classes/pulsar-events";
import {TuyaApi} from "../classes/tuya-api";

module.exports = (RED) => {
    function ConfigurationNode(config) {
        RED.nodes.createNode(this, config);
        this.name = config.name;
        this.pulsarEnv = config.pulsarEnv;

        this.pulsarClient = null;
        this.pulsarReady = false;

        const $event$ = new Subject<{e?,v?}>();
        this.$event$ = $event$;

        const clientId = this.credentials.clientId;
        const secret = this.credentials.secret;
        const region = this.credentials.region;
        // const uid = this.credentials.uid;

        const node = this;

        //initialize connection
        const httpClient = TuyaApi.getInstance({
            clientId: clientId,
            secret: secret,
            region: region,
            // uid: uid,
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

        node.getDevices = async () => {
            // 'https://openapi.tuyaeu.com/v1.0/iot-01/associated-users/devices?size=100'
            const {result} = await node.httpClient.get('v1.0/iot-01/associated-users/devices?size=100');
            const devices = result.devices ?? [];

            return devices.map(d => ({
                category: d.category,
                id: d.id,
                name: d.name,
            }));
        }

        pulsarClient.open(() => {
            console.log('open');

            if (true !== node.pulsarReady) {
                node.pulsarReady = true;
                $event$.next({e: 'pulsarReady'});
                node.emit('pulsarReady');
            }

            node.status({fill: "green", shape: "dot", text: 'open'});
        });

        pulsarClient.message((ws, message) => {
            pulsarClient.ackMessage(message.messageId);
            console.log('message');
            // console.dir(message, {depth: 10});

            $event$.next({e: 'event', v: message});
            node.emit('event', message);

            node.status({fill: "blue", shape: "dot", text: 'message'});
        });

        pulsarClient.reconnect(() => {
            console.log('reconnect');
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

            node.pulsarReady = false;
            $event$.next({e: 'pulsarClosed'});
            node.emit('pulsarClosed');

            node.log('tuya pulsar socket closed');
            node.status({fill: "red", shape: "ring", text: 'close'});
        });

        pulsarClient.error((ws, error) => {
            console.log('error', error);

            node.error(error);
            $event$.next({e: 'error', v: error});
            node.emit('error', error);
            node.status({fill: "red", shape: "ring", text: 'error: ' + error});
        });

        pulsarClient.start();
        node.status({fill: "gray", shape: "dot", text: 'start...'});

        // void node.getDevices().then(data => node.devices = data);

        node.on('close', () => {
            try {
                node.pulsarClient.stop();
                node.status({fill: "gray", shape: "ring", text: 'stop...'});
            } catch (e) {
                node.error(e);
                $event$.next({e: 'error', v: e});
                node.emit('error', e);
                node.status({fill: "red", shape: "ring", text: 'error: ' + e.message});
            }
        });
    }

    RED.nodes.registerType('tuya-cloud-api-config', ConfigurationNode, {
        credentials: {
            clientId: {type: "text"},
            secret: {type: "password"},
            region: {type: "text"},
            // uid: {type: "text"},
        }
    });
};
