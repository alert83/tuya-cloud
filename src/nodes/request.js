"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const class_1 = require("../classes/class");
module.exports = (RED) => {
    function RequestNode(config) {
        const gateway = RED.nodes.getNode(config.config);
        RED.nodes.createNode(this, config);
        this.gateway = gateway;
        const node = this;
        node.on('input', async (msg, send, done) => {
            const { url, data } = msg.payload;
            try {
                const client = class_1.TuyaApi.getInstance({
                    clientId: gateway.clientId,
                    secret: gateway.secret,
                    schema: gateway.schema,
                    region: gateway.region,
                    handleToken: true,
                });
                if (lodash_1.isEmpty(data)) {
                    msg.payload = await client.get(url);
                }
                else {
                    msg.payload = await client.post(url, data);
                }
                send = send || function () {
                    node.send.apply(node, arguments);
                };
                send(msg);
                if (done)
                    done();
            }
            catch (e) {
                const err = `Error Requesting: ${JSON.stringify([e.code, e.message])}`;
                if (done) {
                    done(err);
                }
                else {
                    node.error(err, msg);
                }
            }
        });
    }
    RED.nodes.registerType('tuya-cloud-api-request', RequestNode);
};
