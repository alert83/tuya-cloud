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
        node.on('input', async (msg, send, done) => {
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
    RED.nodes.registerType('tuya-cloud-api-request', request);
    function token(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        const conf = RED.nodes.getNode(config.config);
        node.on('input', async (msg, send, done) => {
            const { url, data } = msg.payload;
            try {
                const client = class_1.TuyaApi.getInstance({
                    clientId: conf.clientId,
                    secret: conf.secret,
                    schema: conf.schema,
                    region: conf.region,
                    handleToken: true,
                });
                msg.payload = await client.getToken().then(() => client.refreshToken());
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
    RED.nodes.registerType('tuya-cloud-api-token', token);
};
