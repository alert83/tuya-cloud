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
const locks_1 = require("locks");
class TuyaApi {
    constructor(options) {
        var _a, _b;
        _clientId.set(this, void 0);
        _secret.set(this, void 0);
        _schema.set(this, void 0);
        _client.set(this, void 0);
        this.tokenLock = locks_1.createReadWriteLock();
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
                        console.log('beforeRequest:', options.url.toString());
                        const isTokenUrl = options.url.toString().includes('token');
                        if (!isTokenUrl && this.handleToken) {
                            if (lodash_1.isEmpty(this.tokenAccess) || this.isTokenExpired()) {
                                await this.getAndRefreshToken();
                            }
                        }
                        await this.buildHeaders(options);
                    }],
                afterResponse: [async (response, retryWithMergedOptions) => {
                        console.log('afterResponse', response.request.options.url.toString());
                        const isTokenUrl = response.request.options.url.toString().includes('token');
                        const body = response.body;
                        if (!body.success) {
                            if (!isTokenUrl && body.code === 1010) {
                                await this.getAndRefreshToken();
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
        const isTokenUrl = options.url.toString().includes('token');
        if (!isTokenUrl) {
            await this.readLock(this.tokenLock, async () => {
                options.headers.access_token = this.tokenAccess + 1;
            });
        }
        const timestamp = new Date().getTime();
        options.headers.t = timestamp.toString();
        options.headers.sign = crypto_1.createHmac('sha256', __classPrivateFieldGet(this, _secret))
            .update(`${__classPrivateFieldGet(this, _clientId)}${(isTokenUrl ? '' : this.tokenAccess)}${timestamp}`)
            .digest('hex')
            .toUpperCase();
    }
    isTokenExpired() {
        const _5min = 5 * 60 * 1000;
        return (new Date().getTime() + _5min) > this.tokenExpiresAt.getTime();
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
    async getAndRefreshToken() {
        if (this.tokenLock.isLocked === 'W')
            return;
        console.log('getAndRefreshToken');
        return this.writeLock(this.tokenLock, async () => {
            let resp = await __classPrivateFieldGet(this, _client).get('token?grant_type=1').json();
            this.setTokenData(resp);
            if (this.isTokenExpired()) {
                resp = await __classPrivateFieldGet(this, _client).get(`token/${this.tokenRefresh}`).json();
                this.setTokenData(resp);
            }
        });
    }
    async readLock(lock, fn) {
        return new Promise((resolve, reject) => {
            lock.readLock(() => {
                console.log('Read Lock', lock.isLocked);
                fn()
                    .then((res) => resolve(res))
                    .catch(reject)
                    .finally(() => lock.unlock());
            });
        });
    }
    async writeLock(lock, fn) {
        return new Promise((resolve, reject) => {
            lock.writeLock(() => {
                console.log('Write Lock', lock.isLocked);
                fn()
                    .then((res) => resolve(res))
                    .catch(reject)
                    .finally(() => lock.unlock());
            });
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
_clientId = new WeakMap(), _secret = new WeakMap(), _schema = new WeakMap(), _client = new WeakMap();
class TuyaApiError extends Error {
    constructor(code, message, timestamp) {
        super(message);
        this.code = code;
        this.timestamp = timestamp;
    }
}
