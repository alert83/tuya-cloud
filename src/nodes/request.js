module.exports = (RED) => {
    function RequestNode(config) {
        RED.nodes.createNode(this, config);
        this.gateway = RED.nodes.getNode(config.config);
        const node = this;
        node.on('input', async (msg) => {
            try {
                msg.payload = await node.gateway.sendCommand(msg.payload);
                node.send(msg);
            }
            catch (e) {
                const err = `Error Requesting: ${JSON.stringify([e.code, e.message])}`;
                node.error(err, msg);
            }
        });
    }
    RED.nodes.registerType('tuya-cloud-api-request', RequestNode);
};
