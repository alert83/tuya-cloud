"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _TuyaApi_clientId, _TuyaApi_secret, _TuyaApi_schema, _TuyaApi_client;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TuyaApi = void 0;
const got_1 = __importDefault(require("got"));
const crypto_1 = require("crypto");
const lodash_1 = require("lodash");
const locks_1 = require("locks");
class TuyaApi {
    constructor(options) {
        var _a, _b;
        _TuyaApi_clientId.set(this, void 0);
        _TuyaApi_secret.set(this, void 0);
        _TuyaApi_schema.set(this, void 0);
        _TuyaApi_client.set(this, void 0);
        this.tokenLock = (0, locks_1.createReadWriteLock)();
        __classPrivateFieldSet(this, _TuyaApi_clientId, options.clientId, "f");
        __classPrivateFieldSet(this, _TuyaApi_secret, options.secret, "f");
        __classPrivateFieldSet(this, _TuyaApi_schema, options.schema, "f");
        this.region = (_a = options.region) !== null && _a !== void 0 ? _a : 'eu';
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
    isNewCreds(options) {
        var _a;
        const oldCred = JSON.stringify({
            clientId: __classPrivateFieldGet(this, _TuyaApi_clientId, "f"),
            secret: __classPrivateFieldGet(this, _TuyaApi_secret, "f"),
            schema: __classPrivateFieldGet(this, _TuyaApi_schema, "f"),
            region: this.region,
        });
        const newCred = JSON.stringify({
            clientId: options.clientId,
            secret: options.secret,
            schema: options.schema,
            region: (_a = options.region) !== null && _a !== void 0 ? _a : 'eu',
        });
        return newCred !== oldCred;
    }
    buildClient() {
        __classPrivateFieldSet(this, _TuyaApi_client, got_1.default.extend({
            responseType: 'json',
            prefixUrl: `https://openapi.tuya${this.region}.com/v1.0/`,
            headers: {
                client_id: __classPrivateFieldGet(this, _TuyaApi_clientId, "f"),
                sign_method: 'HMAC-SHA256',
            },
            hooks: {
                beforeRequest: [async (options) => {
                        var _a;
                        const isTokenUrl = (_a = options === null || options === void 0 ? void 0 : options.url) === null || _a === void 0 ? void 0 : _a.toString().includes('token');
                        if (!isTokenUrl && this.handleToken) {
                            if ((0, lodash_1.isEmpty)(this.tokenAccess) || this.isTokenExpired()) {
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
                                return retryWithMergedOptions(__classPrivateFieldGet(this, _TuyaApi_client, "f").defaults.options);
                            }
                            throw new TuyaApiError(body.code, body.msg, body.t);
                        }
                        return response;
                    }],
                beforeRetry: [async (error, retryCount) => {
                        console.log('beforeRetry', error === null || error === void 0 ? void 0 : error.code);
                    }]
            }
        }), "f");
    }
    async buildHeaders(options) {
        var _a;
        const isTokenUrl = (_a = options === null || options === void 0 ? void 0 : options.url) === null || _a === void 0 ? void 0 : _a.toString().includes('token');
        if (!isTokenUrl) {
            await this.readLock(this.tokenLock, async () => {
                options.headers.access_token = this.tokenAccess;
            });
        }
        const timestamp = new Date().getTime();
        options.headers.t = timestamp.toString();
        options.headers.sign = (0, crypto_1.createHmac)('sha256', __classPrivateFieldGet(this, _TuyaApi_secret, "f"))
            .update(`${__classPrivateFieldGet(this, _TuyaApi_clientId, "f")}${(isTokenUrl ? '' : this.tokenAccess)}${timestamp}`)
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
        return this.writeLock(this.tokenLock, async () => {
            console.log('refresh token');
            let resp = await __classPrivateFieldGet(this, _TuyaApi_client, "f").get('token?grant_type=1').json();
            this.setTokenData(resp);
            if (this.isTokenExpired()) {
                resp = await __classPrivateFieldGet(this, _TuyaApi_client, "f").get(`token/${this.tokenRefresh}`).json();
                this.setTokenData(resp);
            }
        });
    }
    async readLock(lock, fn) {
        return new Promise((resolve, reject) => {
            lock.readLock(() => {
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
        return __classPrivateFieldGet(this, _TuyaApi_client, "f").get(uri).json();
    }
    async post(uri, data) {
        return __classPrivateFieldGet(this, _TuyaApi_client, "f").post(uri, { json: data }).json();
    }
}
exports.TuyaApi = TuyaApi;
_TuyaApi_clientId = new WeakMap(), _TuyaApi_secret = new WeakMap(), _TuyaApi_schema = new WeakMap(), _TuyaApi_client = new WeakMap();
class TuyaApiError extends Error {
    constructor(code, message, timestamp) {
        super(message);
        this.code = code;
        this.timestamp = timestamp;
    }
}
