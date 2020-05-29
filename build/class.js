"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, privateMap, value) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to set private field on non-instance");
    }
    privateMap.set(receiver, value);
    return value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, privateMap) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _clientId, _secret, _schema, _client;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TuyaApi = void 0;
const got_1 = __importDefault(require("got"));
const crypto_1 = require("crypto");
const lodash_1 = require("lodash");
class TuyaApi {
    constructor(options) {
        var _a, _b;
        _clientId.set(this, void 0);
        _secret.set(this, void 0);
        _schema.set(this, void 0);
        _client.set(this, void 0);
        __classPrivateFieldSet(this, _clientId, options.clientId);
        __classPrivateFieldSet(this, _secret, options.secret);
        __classPrivateFieldSet(this, _schema, options.schema);
        this.region = (_a = options.region) !== null && _a !== void 0 ? _a : 'eu';
        this.handleToken = (_b = options.handleToken) !== null && _b !== void 0 ? _b : true;
        this.tokenAccess = '';
        this.tokenRefresh = '';
        this.tokenExpiresAt = new Date();
        this.buildClient();
    }
    static getInstance(options) {
        var _a, _b;
        const newCred = JSON.stringify({
            clientId: options.clientId,
            secret: options.secret,
            schema: options.schema,
            region: (_a = options.region) !== null && _a !== void 0 ? _a : 'eu',
        });
        const oldCred = (_b = this === null || this === void 0 ? void 0 : this.instance) === null || _b === void 0 ? void 0 : _b.getCredsHash();
        if (!this.instance || newCred !== oldCred) {
            this.instance = new TuyaApi(options);
        }
        return this.instance;
    }
    getCredsHash() {
        return JSON.stringify({
            clientId: __classPrivateFieldGet(this, _clientId),
            secret: __classPrivateFieldGet(this, _secret),
            schema: __classPrivateFieldGet(this, _schema),
            region: this.region,
        });
    }
    buildClient() {
        __classPrivateFieldSet(this, _client, got_1.default.extend({
            responseType: 'json',
            prefixUrl: `https://openapi.tuya${this.region}.com/v1.0/`,
            headers: {
                client_id: __classPrivateFieldGet(this, _clientId),
                sign_method: 'HMAC-SHA256',
            },
            hooks: {
                beforeRequest: [async (options) => {
                        const isTokenUrl = options.url.toString().includes('token');
                        if (!isTokenUrl && this.handleToken) {
                            if (lodash_1.isEmpty(this.tokenAccess)) {
                                await this.getToken();
                            }
                            if (this.isTokenExpired()) {
                                await this.getToken();
                                await this.refreshToken();
                            }
                        }
                        this.buildHeaders(options);
                    }],
                afterResponse: [async (response, retryWithMergedOptions) => {
                        const isTokenUrl = response.request.requestUrl.toString().includes('token');
                        const body = response.body;
                        if (!body.success) {
                            throw new TuyaApiError(body.code, body.msg, body.t);
                        }
                        return response;
                    }],
                beforeRetry: [async (options, error, retryCount) => {
                    }]
            }
        }));
    }
    async checkRespAndUpdateToken(code) {
        switch (code) {
            case 1010:
                if (lodash_1.isEmpty(this.tokenAccess)) {
                    await this.getToken();
                }
                else {
                    await this.getToken();
                    await this.refreshToken();
                }
                break;
        }
    }
    buildHeaders(options) {
        const isTokenUrl = options.url.toString().includes('token');
        if (!isTokenUrl) {
            options.headers.access_token = this.tokenAccess;
        }
        const timestamp = new Date().getTime();
        options.headers.t = timestamp.toString();
        options.headers.sign = crypto_1.createHmac('sha256', __classPrivateFieldGet(this, _secret))
            .update(`${__classPrivateFieldGet(this, _clientId)}${(isTokenUrl ? '' : this.tokenAccess)}${timestamp}`)
            .digest('hex')
            .toUpperCase();
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
        const resp = await __classPrivateFieldGet(this, _client).get('token?grant_type=1')
            .json();
        this.tokenAccess = resp.result.access_token;
        this.tokenRefresh = resp.result.refresh_token;
        this.tokenExpiresAt = new Date(new Date().getTime() + resp.result.expire_time * 1000);
        return resp;
    }
    async refreshToken() {
        const resp = await __classPrivateFieldGet(this, _client).get(`token/${this.tokenRefresh}`)
            .json();
        this.tokenAccess = resp.result.access_token;
        this.tokenRefresh = resp.result.refresh_token;
        this.tokenExpiresAt = new Date(new Date().getTime() + resp.result.expire_time * 1000);
        return resp;
    }
    async get(uri) {
        return __classPrivateFieldGet(this, _client).get(uri).json();
    }
    async post(uri, data) {
        return __classPrivateFieldGet(this, _client).post(uri, { json: data }).json();
    }
    async getDeviceStatus(deviceId) {
        return __classPrivateFieldGet(this, _client).get(`devices/${deviceId}/status`).json();
    }
    async getDevice(deviceId) {
        return __classPrivateFieldGet(this, _client).get(`devices/${deviceId}`).json();
    }
    async getDeviceSpec(deviceId) {
        return __classPrivateFieldGet(this, _client).get(`devices/${deviceId}/specifications`).json();
    }
    async sendDeviceCommands(deviceId, commands) {
        return __classPrivateFieldGet(this, _client).post(`devices/${deviceId}/commands`, { json: { commands } }).json();
    }
}
exports.TuyaApi = TuyaApi;
_clientId = new WeakMap(), _secret = new WeakMap(), _schema = new WeakMap(), _client = new WeakMap();
class TuyaApiError extends Error {
    constructor(code, message, timestamp) {
        super(message);
        this.code = code;
        this.timestamp = timestamp;
    }
}
