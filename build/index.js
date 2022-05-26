"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const class_1 = require("./class");
const events_1 = __importDefault(require("./events"));
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
        const nodeContext = this.context();
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
        const nodeContext = this.context();
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
                msg.payload = await client.getAndRefreshToken();
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
    function events(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        const conf = RED.nodes.getNode(config.config);
        const client = new events_1.default({
            accessId: conf.clientId,
            accessKey: conf.secret,
            url: events_1.default.URL.EU,
            env: events_1.default.env.TEST,
            maxRetryTimes: 100,
        });
        node.on('input', async (msg) => {
            client.open(() => {
                console.log('open');
                node.status({ fill: "green", shape: "dot", text: 'open' });
            });
            client.message((ws, message) => {
                client.ackMessage(message.messageId);
                msg.payload = message;
                node.send(msg);
                node.status({ fill: "blue", shape: "dot", text: 'message' });
            });
            client.reconnect(() => {
                console.log('reconnect');
                node.status({ fill: "green", shape: "dot", text: 'reconnect' });
            });
            client.ping(() => {
                console.log('ping');
                node.status({ fill: "blue", shape: "dot", text: 'ping' });
            });
            client.pong(() => {
                console.log('pong');
                node.status({ fill: "blue", shape: "dot", text: 'pong' });
            });
            client.close((ws, ...args) => {
                console.log('close', ...args);
                node.status({ fill: "red", shape: "dot", text: 'close' });
            });
            client.error((ws, error) => {
                console.log('error', error);
                node.status({ fill: "red", shape: "dot", text: 'error: ' + error });
            });
            client.start();
            node.status({ fill: "gray", shape: "dot", text: 'start' });
        });
    }
    RED.nodes.registerType('tuya-cloud-events', events);
};
