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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TuyaApi = void 0;
const got_1 = __importDefault(require("got"));
const crypto_1 = require("crypto");
const lodash_1 = require("lodash");
const locks_1 = require("locks");
let TuyaApi = (() => {
    var _clientId, _secret, _schema, _client;
    class TuyaApi {
        constructor(options) {
            var _a, _b;
            _clientId.set(this, void 0);
            _secret.set(this, void 0);
            _schema.set(this, void 0);
            _client.set(this, void 0);
            this.rwLock = locks_1.createReadWriteLock();
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
            var _a;
            if (!this.instance) {
                this.instance = new TuyaApi(options);
            }
            else {
                const newCred = JSON.stringify({
                    clientId: options.clientId,
                    secret: options.secret,
                    schema: options.schema,
                    region: (_a = options.region) !== null && _a !== void 0 ? _a : 'eu',
                });
                const oldCred = this.instance.getCredsHash();
                if (newCred !== oldCred)
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
                                console.log(body);
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
                await new Promise((resolve, reject) => {
                    this.rwLock.readLock(() => {
                        console.log('Read Lock');
                        setTimeout(() => {
                            (async () => {
                                options.headers.access_token = this.tokenAccess;
                                resolve();
                            })()
                                .catch(reject)
                                .finally(() => this.rwLock.unlock());
                        }, 0);
                    });
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
        async getToken() {
            console.log('getToken');
            return new Promise((resolve, reject) => {
                if (this.rwLock.isLocked === 'W')
                    return resolve();
                this.rwLock.writeLock(() => {
                    console.log('Write Lock');
                    __classPrivateFieldGet(this, _client).get('token?grant_type=1')
                        .json()
                        .then((resp) => {
                        this.setTokenData(resp);
                        resolve(resp);
                    })
                        .catch(reject)
                        .finally(() => this.rwLock.unlock());
                });
            });
        }
        async refreshToken() {
            console.log('refreshToken');
            return new Promise((resolve, reject) => {
                if (this.rwLock.isLocked === 'W')
                    return resolve();
                this.rwLock.writeLock(() => {
                    console.log('Write Lock');
                    __classPrivateFieldGet(this, _client).get(`token/${this.tokenRefresh}`)
                        .json()
                        .then((resp) => {
                        this.setTokenData(resp);
                        resolve(resp);
                    })
                        .catch(reject)
                        .finally(() => this.rwLock.unlock());
                });
            });
        }
        async getAndRefreshToken() {
            console.log('getAndRefreshToken');
            if (this.rwLock.isLocked === 'W')
                return;
            return new Promise((resolve, reject) => {
                this.rwLock.writeLock(() => {
                    console.log('Write Lock', this.rwLock.isLocked);
                    setTimeout(() => {
                        (async () => {
                            let resp = await __classPrivateFieldGet(this, _client).get('token?grant_type=1').json();
                            this.setTokenData(resp);
                            if (this.isTokenExpired()) {
                                resp = await __classPrivateFieldGet(this, _client).get(`token/${this.tokenRefresh}`).json();
                                this.setTokenData(resp);
                            }
                            resolve(resp);
                        })()
                            .catch(reject)
                            .finally(() => this.rwLock.unlock());
                    }, 0);
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
    _clientId = new WeakMap(), _secret = new WeakMap(), _schema = new WeakMap(), _client = new WeakMap();
    TuyaApi.rwStaticLock = locks_1.createReadWriteLock();
    return TuyaApi;
})();
exports.TuyaApi = TuyaApi;
class TuyaApiError extends Error {
    constructor(code, message, timestamp) {
        super(message);
        this.code = code;
        this.timestamp = timestamp;
    }
}
