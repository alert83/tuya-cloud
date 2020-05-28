"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const class_1 = require("./class");
const lodash_1 = require("lodash");
const uuid_1 = require("uuid");
module.exports = (RED) => {
    function configuration(config) {
        RED.nodes.createNode(this, config);
        this.name = config.name;
        this.clientId = config.clientId;
        this.secret = config.secret;
        this.region = config.region;
        this.schema = config.schema;
        this.storeKey = config.storeKey;
    }
    RED.nodes.registerType('tuya-cloud-api-configuration', configuration);
    function request(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        const conf = RED.nodes.getNode(config.config);
        const globalContext = this.context().global;
        const storeKey = uuid_1.v4();
        node.status({ fill: 'yellow', shape: 'dot', text: 'connecting' });
        (async () => {
            let client = globalContext.get(storeKey, 'memoryOnly');
            if (!client) {
                client = new class_1.TuyaApi({
                    clientId: conf.clientId,
                    secret: conf.secret,
                    schema: conf.schema,
                    region: conf.region,
                    handleToken: true,
                });
                await client.getToken();
                globalContext.set(storeKey, client, 'memoryOnly');
            }
        })()
            .then(() => node.status({ fill: 'green', shape: 'dot', text: 'connected' }))
            .catch(e => node.status({ fill: 'red', shape: 'ring', text: e.message }));
        node.on('input', async (msg) => {
            const { url, data } = msg.payload;
            try {
                const client = globalContext.get(storeKey, 'memoryOnly');
                if (lodash_1.isEmpty(data)) {
                    msg.payload = await client.get(url).catch((e) => {
                        node.error(`Error Get Requesting: ${JSON.stringify(e.message)}`);
                    });
                }
                else {
                    msg.payload = await client.post(url, data).catch((e) => {
                        node.error(`Error Post Requesting: ${JSON.stringify(e.message)}`);
                    });
                }
            }
            catch (e) {
                node.error(`Error Requesting: ${JSON.stringify(e.message)}`);
            }
            return node.send(msg);
        });
    }
    RED.nodes.registerType('tuya-cloud-api-request', request);
};
