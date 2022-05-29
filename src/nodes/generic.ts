import {isEmpty} from "lodash";

module.exports = (RED) => {

    function GenericNode(config) {
        RED.nodes.createNode(this, config);
        this.gateway = RED.nodes.getNode(config.config);
        this.name = config.name;

        const node = this;

        node.status({});

        if (node.gateway) {
            node.gateway.on('event', (message) => _onEvent(node, message));
            node.gateway.on('pulsarReady', () => _onPulsarReady(node));
            node.gateway.on('pulsarClosed', () => _onPulsarClosed(node));

            node.on('input', (msg) => _onInput(node, msg));
            node.on('close', () => _onClose(node));
        } else {
            node.status({fill: 'red', shape: 'ring', text: 'No gateway configured'});
        }
    }

    function _onInput (node, msg) {
    }

    function _onClose (node) {
    }

    function _onPulsarReady (node) {
        node.status({fill: 'green', shape: 'dot', text: 'online'});
    }

    function _onPulsarClosed (node) {
        node.status({fill: 'red', shape: 'ring', text: 'offline'});
    }

    function _onEvent (node, message) {
        let msg = Object.assign({}, message);
        let payload = msg.payload;
        let data = msg.payload.data;

        const deviceId = node.credentials.deviceId;

        console.log('node:', msg);

        if (isEmpty(deviceId)) {
            node.send({payload});
        } else if (data.devId === deviceId) {
            node.send({payload});
        }
    }

    RED.nodes.registerType('tuya-cloud-api-generic', GenericNode, {
        credentials: {
            deviceId: {type: "text"},
        }
    });
};
