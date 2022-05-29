"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = __importDefault(require("events"));
const ws_1 = __importDefault(require("ws"));
const config_1 = require("./config");
const utils_1 = require("./utils");
const lodash_1 = require("lodash");
class TuyaMessageSubscribeWebsocket {
    constructor(config) {
        this.config = Object.assign({
            ackTimeoutMillis: 3000,
            subscriptionType: 'Failover',
            retryTimeout: 1000,
            maxRetryTimes: 100,
            timeout: 30000,
            logger: lodash_1.noop,
        }, config);
        this.event = new events_1.default();
        this.retryTimes = 0;
    }
    start() {
        this.server = this._connect();
    }
    stop() {
        var _a;
        (_a = this.server) === null || _a === void 0 ? void 0 : _a.terminate();
    }
    open(cb) {
        this.event.on(TuyaMessageSubscribeWebsocket.open, cb);
    }
    message(cb) {
        this.event.on(TuyaMessageSubscribeWebsocket.data, cb);
    }
    ping(cb) {
        this.event.on(TuyaMessageSubscribeWebsocket.ping, cb);
    }
    pong(cb) {
        this.event.on(TuyaMessageSubscribeWebsocket.pong, cb);
    }
    reconnect(cb) {
        this.event.on(TuyaMessageSubscribeWebsocket.reconnect, cb);
    }
    ackMessage(messageId) {
        this.server && this.server.send(JSON.stringify({ messageId }));
    }
    error(cb) {
        this.event.on(TuyaMessageSubscribeWebsocket.error, cb);
    }
    close(cb) {
        this.event.on(TuyaMessageSubscribeWebsocket.close, cb);
    }
    _reconnect() {
        if (this.config.maxRetryTimes && this.retryTimes < this.config.maxRetryTimes) {
            const timer = setTimeout(() => {
                clearTimeout(timer);
                this.retryTimes++;
                this._connect(false);
            }, this.config.retryTimeout);
        }
    }
    _connect(isInit = true) {
        const { accessId, accessKey, env, url } = this.config;
        const topicUrl = utils_1.getTopicUrl(url, accessId, config_1.getTuyaEnvConfig(env).value, `?${utils_1.buildQuery({ subscriptionType: 'Failover', ackTimeoutMillis: 30000 })}`);
        const password = utils_1.buildPassword(accessId, accessKey);
        this.server = new ws_1.default(topicUrl, {
            rejectUnauthorized: false,
            headers: { username: accessId, password },
        });
        this.subOpen(this.server, isInit);
        this.subMessage(this.server);
        this.subPing(this.server);
        this.subPong(this.server);
        this.subError(this.server);
        this.subClose(this.server);
        return this.server;
    }
    subOpen(server, isInit = true) {
        server.on('open', () => {
            if (server.readyState === server.OPEN) {
                this.retryTimes = 0;
            }
            this.keepAlive(server);
            this.event.emit(isInit ? TuyaMessageSubscribeWebsocket.open : TuyaMessageSubscribeWebsocket.reconnect, this.server);
        });
    }
    subPing(server) {
        server.on('ping', () => {
            this.event.emit(TuyaMessageSubscribeWebsocket.ping, this.server);
            this.keepAlive(server);
            server.pong(this.config.accessId);
        });
    }
    subPong(server) {
        server.on('pong', () => {
            this.keepAlive(server);
            this.event.emit(TuyaMessageSubscribeWebsocket.pong, this.server);
        });
    }
    subMessage(server) {
        server.on('message', (data) => {
            try {
                this.keepAlive(server);
                const start = Date.now();
                this.logger('INFO', `receive msg, jsonMessage=${data}`);
                const obj = this.handleMessage(data);
                this.logger('INFO', 'the real message data:', obj);
                this.event.emit(TuyaMessageSubscribeWebsocket.data, this.server, obj);
                const end = Date.now();
                this.logger('INFO', `business processing cost=${end - start}`);
            }
            catch (e) {
                this.logger('ERROR', e);
                this.event.emit(TuyaMessageSubscribeWebsocket.error, e);
            }
        });
    }
    subClose(server) {
        server.on('close', (...data) => {
            this._reconnect();
            this.clearKeepAlive();
            this.event.emit(TuyaMessageSubscribeWebsocket.close, ...data);
        });
    }
    subError(server) {
        server.on('error', (e) => {
            this.event.emit(TuyaMessageSubscribeWebsocket.error, this.server, e);
        });
    }
    clearKeepAlive() {
        clearTimeout(this.timer);
    }
    keepAlive(server) {
        this.clearKeepAlive();
        this.timer = setTimeout(() => {
            server.ping(this.config.accessId);
        }, this.config.timeout);
    }
    handleMessage(data) {
        const _a = JSON.parse(data), { payload } = _a, others = __rest(_a, ["payload"]);
        const pStr = Buffer.from(payload, 'base64').toString('utf-8');
        const pJson = JSON.parse(pStr);
        pJson.data = utils_1.decrypt(pJson.data, this.config.accessKey);
        return Object.assign({ payload: pJson }, others);
    }
    logger(level, ...info) {
        const realInfo = `${Date.now()} `;
        this.config.logger && this.config.logger(level, realInfo, ...info);
    }
}
TuyaMessageSubscribeWebsocket.URL = config_1.TuyaRegionConfigEnum;
TuyaMessageSubscribeWebsocket.env = config_1.TUYA_PULSAR_ENV;
TuyaMessageSubscribeWebsocket.data = 'TUTA_DATA';
TuyaMessageSubscribeWebsocket.error = 'TUYA_ERROR';
TuyaMessageSubscribeWebsocket.open = 'TUYA_OPEN';
TuyaMessageSubscribeWebsocket.close = 'TUYA_CLOSE';
TuyaMessageSubscribeWebsocket.reconnect = 'TUYA_RECONNECT';
TuyaMessageSubscribeWebsocket.ping = 'TUYA_PING';
TuyaMessageSubscribeWebsocket.pong = 'TUYA_PONG';
exports.default = TuyaMessageSubscribeWebsocket;
