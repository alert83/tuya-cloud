import {isEmpty} from "lodash";
import {TuyaApi} from "../classes/class";

module.exports = (RED) => {

    function RequestNode(config) {
        const gateway = RED.nodes.getNode(config.config);

        RED.nodes.createNode(this, config);
        this.gateway = gateway;

        const node = this;

        //const nodeContext = this.context();
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
                    clientId: gateway.clientId,
                    secret: gateway.secret,
                    schema: gateway.schema,
                    region: gateway.region,
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

    RED.nodes.registerType('tuya-cloud-api-request', RequestNode);
};
