import {isEmpty} from "lodash";

module.exports = (RED) => {

    function GenericNode(config) {
        const gateway = RED.nodes.getNode(config.config);

        RED.nodes.createNode(this, config);
        this.name = config.name;
        this.deviceId = config.deviceId;
        this.gateway = gateway;

        const node = this;

        if (node.gateway) {
            node.gateway.on('event', (message) => _onEvent(node, message));
            node.gateway.on('pulsarReady', () => _onPulsarReady(node));
            node.gateway.on('pulsarClosed', () => _onPulsarClosed(node));

            node.on('input', (msg) => _onInput(node, msg));
            node.on('close', () => _onClose(node));
        } else {
            node.status({fill: 'red', shape: 'ring', text: 'No gateway configured'});
        }

        //set node status
        // _updateNodeStatus();
    }

    RED.nodes.registerType('tuya-cloud-api-generic', GenericNode);

    function _onInput (node, msg) {
        // let payload = {
        //     cmd: 'write',
        //     sid: this.node.sid,
        //     data: msg.payload
        // };
        //
        // if (this.options._onInput) {
        //     this.options._onInput(this, payload);
        // }
        //
        // this.node.gateway.sendCommand(payload);
    }

    function _onClose (node) {
    }

    function _onPulsarReady (node) {
        // let cmd = {'cmd': 'read', 'sid': this.node.sid};
        // let gateway = this.node.gateway;
        //
        // //initialize
        // gateway.sendCommand(cmd);
        //
        // //ask for status update
        // this.timer = setInterval(() => {
        //     gateway.sendCommand(cmd);
        // }, this.readAskInterval);
    }

    function _onPulsarClosed (node) {

    }

    function _onEvent (node, message) {
        let msg = Object.assign({}, message);
        let payload = msg.payload;
        let data = msg.payload.data;

        console.log('node:', msg);

        if (isEmpty(node.deviceId)) {
            node.send({payload});
        } else if (data.devId === node.deviceId) {
            node.send({payload});
        }
    }
};
