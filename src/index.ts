import {TuyaApi} from "./class";
import {isEmpty} from "lodash";

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
        // const globalContext = this.context().global;

        // console.dir({ conf: Object.keys(conf) }, {color: true});
        // node.status({fill: 'yellow', shape: 'dot', text: 'connecting'});
        //
        // (async () => {})()
        //     .then(() => node.status({fill: 'green', shape: 'dot', text: 'connected'}))
        //     .catch(e => node.status({fill: 'red', shape: 'ring', text: e.message}));

        node.on('input', async (msg) => {
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
                    msg.payload = await client.get(url)
                        .catch((e) => {
                            node.error(`Error Get Requesting: ${JSON.stringify([e.code, e.message])}`);
                        });
                } else {
                    msg.payload = await client.post(url, data)
                        .catch((e) => {
                            node.error(`Error Post Requesting: ${JSON.stringify([e.code, e.message])}`);
                        });
                }
            } catch (e) {
                node.error(`Error Requesting: ${JSON.stringify([e.code, e.message])}`);
            }

            return node.send(msg);
        });

    }

    RED.nodes.registerType('tuya-cloud-api-request', request);

    //

    function token(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        const conf = RED.nodes.getNode(config.config);

        node.on('input', async (msg) => {
            const {url, data} = msg.payload;

            try {
                const client = TuyaApi.getInstance({
                    clientId: conf.clientId,
                    secret: conf.secret,
                    schema: conf.schema,
                    region: conf.region,
                    handleToken: true,
                });

                msg.payload = await client.getToken()
                    .then(() => client.refreshToken())
                    .catch((e) => {
                        node.error(`Error Token Requesting: ${JSON.stringify([e.code, e.message])}`);
                    });

            } catch (e) {
                node.error(`Error Requesting: ${JSON.stringify([e.code, e.message])}`);
            }

            return node.send(msg);
        });

    }

    RED.nodes.registerType('tuya-cloud-api-token', token);
};
