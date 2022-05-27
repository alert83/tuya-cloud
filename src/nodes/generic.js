"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
module.exports = (RED) => {
    function GenericNode(config) {
        const gateway = RED.nodes.getNode(config.config);
        RED.nodes.createNode(this, config);
        this.name = config.name;
        this.deviceId = config.deviceId;
        this.gateway = gateway;
        const node = this;
        node.status('');
        if (node.gateway) {
            node.gateway.on('event', (message) => _onEvent(node, message));
            node.gateway.on('pulsarReady', () => _onPulsarReady(node));
            node.gateway.on('pulsarClosed', () => _onPulsarClosed(node));
            node.on('input', (msg) => _onInput(node, msg));
            node.on('close', () => _onClose(node));
        }
        else {
            node.status({ fill: 'red', shape: 'ring', text: 'No gateway configured' });
        }
    }
    RED.nodes.registerType('tuya-cloud-api-generic', GenericNode);
    function _onInput(node, msg) {
    }
    function _onClose(node) {
    }
    function _onPulsarReady(node) {
        node.status({ fill: 'green', shape: 'dot', text: 'online' });
    }
    function _onPulsarClosed(node) {
        node.status({ fill: 'red', shape: 'ring', text: 'offline' });
    }
    function _onEvent(node, message) {
        let msg = Object.assign({}, message);
        let payload = msg.payload;
        let data = msg.payload.data;
        console.log('node:', msg);
        if (lodash_1.isEmpty(node.deviceId)) {
            node.send({ payload });
        }
        else if (data.devId === node.deviceId) {
            node.send({ payload });
        }
    }
};
