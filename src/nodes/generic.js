"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const factory_1 = require("../classes/factory");
module.exports = (RED) => {
    function GenericNode(config) {
        RED.nodes.createNode(this, config);
        factory_1.factory(RED, this, config);
    }
    RED.nodes.registerType('tuya-cloud-api-generic', GenericNode, {
        credentials: {
            deviceId: { type: "text" },
        }
    });
};
