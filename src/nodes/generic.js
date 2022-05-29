"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
module.exports = (RED) => {
    function GenericNode(config) {
        RED.nodes.createNode(this, config);
        this.gateway = RED.nodes.getNode(config.config);
        this.name = config.name;
        this.pulsarOnline = false;
        const deviceId = this.credentials.deviceId;
        const node = this;
        node.status({});
        if (node.gateway) {
            node.gateway.on('event', (message) => _onEvent(node, message));
            node.gateway.on('pulsarReady', () => _onPulsarReady(node));
            node.gateway.on('pulsarClosed', () => _onPulsarClosed(node));
            node.on('input', (msg) => _onInput(node, msg));
            node.on('close', () => _onClose(node));
            if (!lodash_1.isEmpty(deviceId)) {
                node.status({ fill: 'gray', shape: 'ring', text: 'connecting...' });
                void node.gateway.sendCommand({ url: `devices/${deviceId}` })
                    .then((resp) => {
                    const { result } = resp;
                    node.status({ fill: 'blue', shape: 'dot', text: `${result === null || result === void 0 ? void 0 : result.name}` });
                })
                    .catch((err) => {
                    node.status({ fill: 'red', shape: 'ring', text: err.message });
                });
            }
        }
        else {
            node.status({ fill: 'red', shape: 'ring', text: 'No gateway configured' });
        }
    }
    async function _onInput(node, msg) {
    }
    function _onClose(node) {
    }
    function _onPulsarReady(node) {
        node.pulsarOnline = true;
    }
    function _onPulsarClosed(node) {
        node.pulsarOnline = false;
    }
    function _onEvent(node, message) {
        let msg = Object.assign({}, message);
        let payload = msg.payload;
        let data = msg.payload.data;
        const deviceId = node.credentials.deviceId;
        console.log('node:', msg);
        if (lodash_1.isEmpty(deviceId)) {
            node.send({ payload });
        }
        else if (data.devId === deviceId) {
            node.send({ payload });
        }
    }
    RED.nodes.registerType('tuya-cloud-api-generic', GenericNode, {
        credentials: {
            deviceId: { type: "text" },
        }
    });
};
