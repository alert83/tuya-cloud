"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TuyaApi = void 0;
const got_1 = __importDefault(require("got"));
const crypto_1 = __importDefault(require("crypto"));
class TuyaApi {
    constructor(options) {
        var _a, _b;
        this._clientId = options.clientId;
        this._secret = options.secret;
        this._schema = options.schema;
        this.region = (_a = options.region) !== null && _a !== void 0 ? _a : 'eu';
        this.handleToken = (_b = options.handleToken) !== null && _b !== void 0 ? _b : false;
        this.tokenAccess = '';
        this.tokenRefresh = '';
        this.tokenExpiresAt = new Date();
        this.buildClient();
    }
    buildClient() {
        this._client = got_1.default.extend({
            responseType: 'json',
            prefixUrl: `https://openapi.tuya${this.region}.com/v1.0/`,
            headers: {
                client_id: this._clientId,
                sign_method: 'HMAC-SHA256',
            },
            hooks: {
                beforeRequest: [async (options) => {
                        const isTokenUrl = options.url.toString().includes('token');
                        if (!isTokenUrl && this.tokenAccess === '' && this.handleToken) {
                            await this.getToken();
                        }
                        if (!isTokenUrl && this.isTokenExpired()) {
                            await this.refreshToken();
                        }
                        const now = new Date().getTime();
                        options.headers.t = now.toString();
                        let sign = '';
                        if (isTokenUrl) {
                            sign = crypto_1.default
                                .createHmac('sha256', this._secret)
                                .update(this._clientId + now.toString())
                                .digest('hex')
                                .toUpperCase();
                        }
                        else {
                            sign = crypto_1.default
                                .createHmac('sha256', this._secret)
                                .update(`${this._clientId}${this.tokenAccess}${now}`)
                                .digest('hex')
                                .toUpperCase();
                            options.headers.access_token = this.tokenAccess;
                        }
                        options.headers.sign = sign;
                    }],
                afterResponse: [response => {
                        const body = response.body;
                        if (!body.success) {
                            throw new Error(body.msg);
                        }
                        return response;
                    }]
            }
        });
    }
    isTokenExpired() {
        return new Date().getTime() > this.tokenExpiresAt.getTime();
    }
    setTokenObject(tokenAccess, tokenRefresh, tokenExpiresAt) {
        this.tokenAccess = tokenAccess;
        this.tokenRefresh = tokenRefresh;
        this.tokenExpiresAt = new Date(tokenExpiresAt);
    }
    getTokenObject() {
        return {
            tokenAccess: this.tokenAccess,
            tokenRefresh: this.tokenRefresh,
            tokenExpiresAt: this.tokenExpiresAt.toISOString(),
        };
    }
    async getToken() {
        const { result: { access_token, refresh_token, expire_time } } = await this._client
            .get('token?grant_type=1')
            .json();
        this.tokenAccess = access_token;
        this.tokenRefresh = refresh_token;
        this.tokenExpiresAt = new Date(new Date().getTime() + expire_time * 1000);
    }
    async refreshToken() {
        const { result: { access_token, refresh_token, expire_time } } = await this._client
            .get(`token/${this.tokenRefresh}`)
            .json();
        this.tokenAccess = access_token;
        this.tokenRefresh = refresh_token;
        this.tokenExpiresAt = new Date(new Date().getTime() + expire_time * 1000);
    }
    async get(uri) {
        return this._client.get(uri).json();
    }
    async post(uri, data) {
        return this._client.post(uri, { json: data }).json();
    }
    async getDeviceStatus(deviceId) {
        return this._client.get(`devices/${deviceId}/status`).json();
    }
    async getDevice(deviceId) {
        return this._client.get(`devices/${deviceId}`).json();
    }
    async getDeviceSpec(deviceId) {
        return this._client.get(`devices/${deviceId}/specifications`).json();
    }
    async sendDeviceCommands(deviceId, commands) {
        return this._client.post(`devices/${deviceId}/commands`, { json: { commands } }).json();
    }
}
exports.TuyaApi = TuyaApi;
class HandleTokenError extends Error {
    constructor() {
        super('Token acquisition is automatically handled.');
    }
}
