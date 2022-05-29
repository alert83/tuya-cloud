"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.factory = void 0;
const device_1 = require("./device");
function factory(RED, node, config) {
    const gateway = RED.nodes.getNode(config.config);
    return new device_1.Device(gateway, node, config);
}
exports.factory = factory;
