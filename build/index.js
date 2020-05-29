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
        node.on('input', async (msg) => {
            const { url, data } = msg.payload;
            try {
                const client = class_1.TuyaApi.getInstance({
                    clientId: conf.clientId,
                    secret: conf.secret,
                    schema: conf.schema,
                    region: conf.region,
                    handleToken: true,
                });
                if (lodash_1.isEmpty(data)) {
                    msg.payload = await client.get(url)
                        .catch((e) => {
                        node.error(`Error Get Requesting: ${JSON.stringify([e.code, e.message])}`);
                    });
                }
                else {
                    msg.payload = await client.post(url, data)
                        .catch((e) => {
                        node.error(`Error Post Requesting: ${JSON.stringify([e.code, e.message])}`);
                    });
                }
            }
            catch (e) {
                node.error(`Error Requesting: ${JSON.stringify([e.code, e.message])}`);
            }
            return node.send(msg);
        });
    }
    RED.nodes.registerType('tuya-cloud-api-request', request);
    function token(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        const conf = RED.nodes.getNode(config.config);
        node.on('input', async (msg) => {
            const { url, data } = msg.payload;
            try {
                const client = class_1.TuyaApi.getInstance({
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
            }
            catch (e) {
                node.error(`Error Requesting: ${JSON.stringify([e.code, e.message])}`);
            }
            return node.send(msg);
        });
    }
    RED.nodes.registerType('tuya-cloud-api-token', token);
};
