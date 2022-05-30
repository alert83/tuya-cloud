"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Device = void 0;
const lodash_1 = require("lodash");
class Device {
    constructor(gateway, node, config) {
        this._onInput = async (msg) => {
            const { url, data, deviceId } = msg === null || msg === void 0 ? void 0 : msg.payload;
            if (!lodash_1.isEmpty(deviceId)) {
                this.deviceId = deviceId;
                void this.getDetails().catch((err) => this.error = err);
            }
            if (!lodash_1.isEmpty(url)) {
                msg.payload = await this.node.gateway.sendCommand(msg.payload);
                this.node.send(msg);
            }
            this.updateNodeStatus();
        };
        this._onClose = () => {
            var _a;
            (_a = this.subscription) === null || _a === void 0 ? void 0 : _a.unsubscribe();
            this.updateNodeStatus();
        };
        this._onPulsarReady = () => {
            console.log('node: _onPulsarReady');
            this.pulsarOnline = true;
            this.updateNodeStatus();
        };
        this._onPulsarClosed = () => {
            console.log('node: _onPulsarClosed');
            this.pulsarOnline = false;
            this.updateNodeStatus();
        };
        this._onEvent = (message) => {
            let msg = Object.assign({}, message);
            let payload = msg.payload;
            let data = msg.payload.data;
            let status = msg.payload.data.status;
            const deviceId = this.deviceId;
            if (lodash_1.isEmpty(deviceId)) {
                this.node.send({ payload });
            }
            else if (data.devId === deviceId) {
                this.updateDeviceStatus(status);
                this.node.send({ payload });
            }
        };
        console.log('new node');
        this.node = node;
        this.node.gateway = gateway;
        this.node.name = config.name;
        this.node.model = null;
        this.deviceId = this.node.credentials.deviceId;
        this.pulsarOnline = false;
        this.error = undefined;
        this.node.deviceDetails = undefined;
        this.node.deviceStatus = undefined;
        this.node.deviceOnline = false;
        if (this.node.gateway) {
            this.pulsarOnline = this.node.gateway.pulsarReady;
            this.subscription = this.node.gateway.$event$
                .asObservable()
                .subscribe(({ e, v }) => {
                switch (e) {
                    case 'pulsarReady':
                        this._onPulsarReady();
                        break;
                    case 'pulsarClosed':
                        this._onPulsarClosed();
                        break;
                    case 'event':
                        this._onEvent(v);
                        break;
                    case 'error':
                        this.node.error(v);
                        break;
                }
            });
            this.node.on('input', this._onInput);
            this.node.on('close', this._onClose);
            void this.getDetails().catch((err) => this.error = err);
            this.updateNodeStatus();
        }
        else {
            this.node.status({ fill: 'red', shape: 'ring', text: 'No gateway configured' });
        }
    }
    async getDetails() {
        if (lodash_1.isEmpty(this.deviceId)) {
            this.node.deviceDetails = undefined;
            this.node.deviceStatus = undefined;
            this.node.deviceOnline = false;
        }
        else {
            const resp = await this.node.gateway.sendCommand({ url: `v1.0/devices/${this.deviceId}` });
            const { result } = resp;
            this.node.deviceDetails = result;
            this.node.deviceStatus = result.status;
            this.node.deviceOnline = result.online;
        }
        this.updateNodeStatus();
    }
    updateDeviceStatus(status) {
        (status !== null && status !== void 0 ? status : []).forEach(s => {
            const sIdx = this.node.deviceStatus.findIndex(ds => ds.code === s.code);
            if (sIdx >= 0) {
                this.node.deviceStatus[sIdx] = s;
            }
            else {
                this.node.deviceStatus = [...this.node.deviceStatus, s];
            }
        });
        this.updateNodeStatus();
    }
    updateNodeStatus() {
        var _a, _b;
        const text = [
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
