module.exports = (RED) => {
    function configuration(config) {
        RED.nodes.createNode(this, config);
        this.name = config.name;
        this.key = config.key;
        this.secret = config.secret;
        this.region = config.region;
        this.schema = config.schema;
    }
    function request(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        const conf = RED.nodes.getNode(config.config);
        node.status({ fill: 'yellow', shape: 'dot', text: 'connecting' });
        try {
            node.status({ fill: 'green', shape: 'dot', text: 'connected' });
        }
        catch (e) {
            node.status({ fill: 'red', shape: 'ring', text: e.message });
            throw e;
        }
        node.on('input', async (msg) => {
            const { action, group: gid, requireSID, data } = msg.payload;
            return node.send(msg);
        });
    }
    RED.nodes.registerType('tuya-cloud-api-request', request);
    RED.nodes.registerType('tuya-cloud-api-configuration', configuration);
};
