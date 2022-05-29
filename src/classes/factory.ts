import {Device} from "./device";

export function factory(RED, node, config) {
    const gateway = RED.nodes.getNode(config.config);

    return new Device(gateway, node, config);
}
