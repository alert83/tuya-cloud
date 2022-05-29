module.exports = (RED) => {
    function RequestNode(config) {
        RED.nodes.createNode(this, config);
        this.gateway = RED.nodes.getNode(config.config);
        const node = this;
        node.status({});
        if (node.gateway) {
            node.on('input', async (msg) => {
                try {
                    node.status({ fill: 'blue', shape: 'dot', text: 'send...' });
                    msg.payload = await node.gateway.sendCommand(msg.payload);
                    node.status({ fill: 'green', shape: 'dot', text: 'done' });
                    node.send(msg);
                }
                catch (e) {
                    const err = `Error Requesting: ${JSON.stringify([e.code, e.message])}`;
                    node.status({ fill: 'red', shape: 'ring', text: 'Error' });
                    node.error(err, msg);
                }
            });
        }
        else {
            node.status({ fill: 'red', shape: 'ring', text: 'No gateway configured' });
        }
    }
    RED.nodes.registerType('tuya-cloud-api-request', RequestNode);
};
