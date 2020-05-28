"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const class_1 = require("./class");
const lodash_1 = require("lodash");
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
    function request(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        const conf = RED.nodes.getNode(config.config);
        node.status({ fill: 'yellow', shape: 'dot', text: 'connecting' });
        let api;
        try {
            api = new class_1.TuyaApi({
                clientId: conf.clientId,
                secret: conf.secret,
                schema: conf.schema,
                region: conf.region,
                handleToken: true,
            });
            node.status({ fill: 'green', shape: 'dot', text: 'connected' });
        }
        catch (e) {
            node.status({ fill: 'red', shape: 'ring', text: e.message });
            throw e;
        }
        node.on('input', async (msg) => {
            const { url, data } = msg.payload;
            try {
                if (lodash_1.isEmpty(data)) {
                    msg.payload = await api.get(url).catch((e) => {
                        node.error(`Error Get Requesting: ${JSON.stringify(e)}`);
                    });
                }
                else {
                    msg.payload = await api.post(url, data).catch((e) => {
                        node.error(`Error Post Requesting: ${JSON.stringify(e)}`);
                    });
                }
            }
            catch (e) {
                node.error(`Error Requesting: ${JSON.stringify(e)}`);
            }
            return node.send(msg);
        });
    }
    RED.nodes.registerType('tuya-cloud-api-request', request);
};
