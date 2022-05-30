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
var _clientId, _secret, _region, _client;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TuyaApi = void 0;
const got_1 = __importDefault(require("got"));
const crypto_1 = require("crypto");
const lodash_1 = require("lodash");
const lock_1 = require("./lock");
class TuyaApi {
    constructor(options) {
        var _a, _b;
        _clientId.set(this, void 0);
        _secret.set(this, void 0);
        _region.set(this, void 0);
        _client.set(this, void 0);
        this.tokenLock = new lock_1.Lock();
        __classPrivateFieldSet(this, _clientId, options.clientId);
        __classPrivateFieldSet(this, _secret, options.secret);
        __classPrivateFieldSet(this, _region, (_a = options.region) !== null && _a !== void 0 ? _a : 'eu');
        this.handleToken = (_b = options.handleToken) !== null && _b !== void 0 ? _b : true;
        this.tokenAccess = '';
        this.tokenRefresh = '';
        this.tokenExpiresAt = new Date();
        this.buildClient();
    }
    static getInstance(options) {
        if (!this.instance) {
            this.instance = new TuyaApi(options);
        }
        return this.instance;
    }
    buildClient() {
        __classPrivateFieldSet(this, _client, got_1.default.extend({
            responseType: 'json',
            prefixUrl: `https://openapi.tuya${__classPrivateFieldGet(this, _region)}.com/`,
            headers: {
                client_id: __classPrivateFieldGet(this, _clientId),
                sign_method: 'HMAC-SHA256',
            },
            hooks: {
                beforeRequest: [async (options) => {
                        var _a;
                        const isTokenUrl = (_a = options === null || options === void 0 ? void 0 : options.url) === null || _a === void 0 ? void 0 : _a.toString().includes('token');
                        if (!isTokenUrl && this.handleToken) {
                            if (lodash_1.isEmpty(this.tokenAccess) || this.isTokenExpired()) {
                                await this.getAndRefreshToken();
                            }
                        }
                        await this.buildHeaders(options);
                    }],
                afterResponse: [async (response, retryWithMergedOptions) => {
                        var _a, _b;
                        const isTokenUrl = (_b = (_a = response.request.options) === null || _a === void 0 ? void 0 : _a.url) === null || _b === void 0 ? void 0 : _b.toString().includes('token');
                        const body = response.body;
                        if (!body.success) {
                            if (!isTokenUrl && body.code === 1010) {
                                this.tokenExpiresAt = new Date();
                                return retryWithMergedOptions(__classPrivateFieldGet(this, _client).defaults.options);
                            }
                            throw new TuyaApiError(body.code, body.msg, body.t);
                        }
                        return response;
                    }],
                beforeRetry: [async (options, error, retryCount) => {
                        console.log('beforeRetry', error === null || error === void 0 ? void 0 : error.code);
                    }]
            }
        }));
    }
    async buildHeaders(options) {
        var _a;
        const timestamp = new Date().getTime();
        options.headers.t = timestamp.toString();
        const isGetTokenUrl = (_a = options === null || options === void 0 ? void 0 : options.url) === null || _a === void 0 ? void 0 : _a.toString().includes('token');
        if (isGetTokenUrl) {
            options.headers.sign = crypto_1.createHmac('sha256', __classPrivateFieldGet(this, _secret))
                .update(`${__classPrivateFieldGet(this, _clientId)}${timestamp}`)
                .digest('hex')
                .toUpperCase();
        }
        else {
            await this.tokenLock.readLock(async () => {
                options.headers.access_token = this.tokenAccess;
            });
            options.headers.sign = crypto_1.createHmac('sha256', __classPrivateFieldGet(this, _secret))
                .update(`${__classPrivateFieldGet(this, _clientId)}${this.tokenAccess}${timestamp}`)
                .digest('hex')
                .toUpperCase();
        }
    }
    isTokenExpired() {
        const _5min = 5 * 60 * 1000;
        return (new Date().getTime() + _5min) > this.tokenExpiresAt.getTime();
    }
    async getAndRefreshToken() {
        if (this.tokenLock.lock.isLocked === 'W')
            return;
        return this.tokenLock.writeLock(async () => {
            console.log('refresh token');
            let resp = await __classPrivateFieldGet(this, _client).get('v1.0/token?grant_type=1').json();
            this.setTokenData(resp);
            if (this.isTokenExpired()) {
                resp = await __classPrivateFieldGet(this, _client).get(`v1.0/token/${this.tokenRefresh}`).json();
                this.setTokenData(resp);
            }
        });
    }
    setTokenData(response) {
        const { result: { access_token, refresh_token, expire_time } } = response;
        this.tokenAccess = access_token;
        this.tokenRefresh = refresh_token;
        this.tokenExpiresAt = new Date(new Date().getTime() + expire_time * 1000);
    }
    async get(uri) {
        return __classPrivateFieldGet(this, _client).get(uri).json();
    }
    async post(uri, data) {
        return __classPrivateFieldGet(this, _client).post(uri, { json: data }).json();
    }
}
exports.TuyaApi = TuyaApi;
_clientId = new WeakMap(), _secret = new WeakMap(), _region = new WeakMap(), _client = new WeakMap();
class TuyaApiError extends Error {
    constructor(code, message, timestamp) {
        super(message);
        this.code = code;
        this.timestamp = timestamp;
    }
}
