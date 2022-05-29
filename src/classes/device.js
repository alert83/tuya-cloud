"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Device = void 0;
const lodash_1 = require("lodash");
class Device {
    constructor(gateway, node, config) {
        console.log('new node');
        this.node = node;
        this.node.gateway = gateway;
        this.node.name = config.name;
        this.node.model = null;
        this.pulsarOnline = false;
        this.error = undefined;
        this.node.deviceDetails = undefined;
        this.node.deviceStatus = undefined;
        this.node.deviceOnline = false;
        if (this.node.gateway) {
            this.node.gateway.on('event', (message) => this._onEvent(message));
            this.node.gateway.on('pulsarReady', () => this._onPulsarReady());
            this.node.gateway.on('pulsarClosed', () => this._onPulsarClosed());
            this.node.on('input', (msg) => this._onInput(msg));
            this.node.on('close', () => this._onClose());
            if (!lodash_1.isEmpty(this.node.credentials.deviceId)) {
                void this._getDetails()
                    .catch((err) => this.error = err);
            }
            this._updateNodeStatus();
        }
        else {
            this.node.status({ fill: 'red', shape: 'ring', text: 'No gateway configured' });
        }
    }
    async _getDetails() {
        const resp = await this.node.gateway.sendCommand({ url: `v1.0/devices/${this.node.credentials.deviceId}` });
        const { result } = resp;
        this.node.deviceDetails = result;
        this.node.deviceStatus = result.status;
        this.node.deviceOnline = result.online;
        this._updateNodeStatus();
    }
    _onInput(msg) {
        this._updateNodeStatus();
    }
    _onClose() {
        this._updateNodeStatus();
    }
    _onPulsarReady() {
        console.log('node: _onPulsarReady');
        this.pulsarOnline = true;
        this._updateNodeStatus();
    }
    _onPulsarClosed() {
        console.log('node: _onPulsarClosed');
        this.pulsarOnline = false;
        this._updateNodeStatus();
    }
    _onEvent(message) {
        let msg = Object.assign({}, message);
        let payload = msg.payload;
        let data = msg.payload.data;
        let status = msg.payload.data.status;
        const deviceId = this.node.credentials.deviceId;
        console.log('node:', msg);
        if (lodash_1.isEmpty(deviceId)) {
            this.node.send({ payload });
        }
        else if (data.devId === deviceId) {
            this._updateDeviceStatus(status);
            this.node.send({ payload });
        }
        this._updateNodeStatus();
    }
    _updateDeviceStatus(status) {
        (status !== null && status !== void 0 ? status : []).forEach(s => {
            const sIdx = this.node.deviceStatus.findIndex(ds => ds.code === s.code);
            if (sIdx >= 0) {
                this.node.deviceStatus[sIdx] = s;
            }
            else {
                this.node.deviceStatus = [...this.node.deviceStatus, s];
            }
        });
    }
    _updateNodeStatus() {
        var _a, _b;
        let text = [
            (_a = this.node.deviceDetails) === null || _a === void 0 ? void 0 : _a.name,
            ...((_b = this.node.deviceStatus) !== null && _b !== void 0 ? _b : []).map(s => s.code + ': ' + s.value)
        ];
        this.node.status({
            fill: this.pulsarOnline ? 'green' : 'grey',
            shape: this.pulsarOnline ? 'dot' : 'ring',
            text: text.join(', '),
        });
    }
}
exports.Device = Device;
