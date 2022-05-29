import {factory} from "../classes/factory";

module.exports = (RED) => {

    function GenericNode(config) {
        RED.nodes.createNode(this, config);

        //create the device
        factory(RED, this, config);
    }

    RED.nodes.registerType('tuya-cloud-api-generic', GenericNode, {
        credentials: {
            deviceId: {type: "text"},
        }
    });
};
