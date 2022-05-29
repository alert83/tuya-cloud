import {isEmpty} from "lodash";

export class Device {
    private node: any;
    private pulsarOnline: boolean;
    private error: any;

    constructor(gateway, node, config) {
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
            this.pulsarOnline = this.node.gateway.pulsarReady;

            this.node.gateway.on('event', (message) => this._onEvent(message));
            this.node.gateway.on('pulsarReady', () => this._onPulsarReady());
            this.node.gateway.on('pulsarClosed', () => this._onPulsarClosed());

            this.node.on('input', (msg) => this._onInput(msg));
            this.node.on('close', () => this._onClose());

            if (!isEmpty(this.node.credentials.deviceId)) {
                void this._getDetails()
                    .catch((err) => this.error = err);
            }

            //set node status
            this._updateNodeStatus();
        } else {
            this.node.status({fill: 'red', shape: 'ring', text: 'No gateway configured'});
        }
    }

    async _getDetails() {
        const resp = await this.node.gateway.sendCommand({url: `v1.0/devices/${this.node.credentials.deviceId}`});
        const {result} = resp;
        this.node.deviceDetails = result;
        this.node.deviceStatus = result.status;
        this.node.deviceOnline = result.online;

        this._updateNodeStatus();
    }

    _onInput(msg) {
        // msg.payload = await node.gateway.sendCommand(msg.payload);
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

        // console.log('node:', msg);

        if (isEmpty(deviceId)) {
            this.node.send({payload});
        } else if (data.devId === deviceId) {
            this._updateDeviceStatus(status);
            this.node.send({payload});
        }

        this._updateNodeStatus();
    }

    _updateDeviceStatus(status: any[]) {
        (status ?? []).forEach(s => {
            const sIdx = (this.node.deviceStatus as any[]).findIndex(ds => ds.code === s.code);

            if (sIdx >= 0) {
                this.node.deviceStatus[sIdx] = s;
            } else {
                this.node.deviceStatus = [...this.node.deviceStatus, s];
            }
        });
    }

    _updateNodeStatus() {
        //set node status

        let text = [
            this.node.deviceDetails?.name,
            ...(this.node.deviceStatus ?? []).map(s => s.code + ': ' + s.value)
        ];

        this.node.status({
            fill: this.pulsarOnline ? 'green' : 'grey',
            shape: this.pulsarOnline ? 'dot' : 'ring',
            text: text.join(', '),
        });
    }
}
