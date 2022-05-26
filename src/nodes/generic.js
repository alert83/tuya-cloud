module.exports = (RED) => {
    function GenericNode(config) {
        RED.nodes.createNode(this, config);
        this.name = config.name;
        this.deviceId = config.deviceId;
        const node = this;
        const gateway = RED.nodes.getNode(config.config);
        node.gateway = gateway;
        if (node.gateway) {
            node.gateway.on('event', (input) => _onEvent(node, input));
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
    }
    function _onPulsarClosed(node) {
    }
    function _onEvent(node, input) {
        let msg = Object.assign({}, input);
        let payload = msg.payload;
        let data = msg.payload.data;
        node.log(123);
        if (!node.deviceId) {
            node.send({ payload });
        }
        else if (data.devId === node.deviceId) {
            node.send({ payload });
        }
    }
};
