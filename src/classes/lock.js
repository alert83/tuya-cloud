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
var _lock;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Lock = void 0;
const locks_1 = require("locks");
class Lock {
    constructor() {
        _lock.set(this, void 0);
        __classPrivateFieldSet(this, _lock, locks_1.createReadWriteLock());
    }
    get lock() {
        return __classPrivateFieldGet(this, _lock);
    }
    async readLock(fn) {
        return new Promise((resolve, reject) => {
            __classPrivateFieldGet(this, _lock).readLock(() => {
                fn()
                    .then((res) => resolve(res))
                    .catch(reject)
                    .finally(() => __classPrivateFieldGet(this, _lock).unlock());
            });
        });
    }
    async writeLock(fn) {
        return new Promise((resolve, reject) => {
            __classPrivateFieldGet(this, _lock).writeLock(() => {
                fn()
                    .then((res) => resolve(res))
                    .catch(reject)
                    .finally(() => __classPrivateFieldGet(this, _lock).unlock());
            });
        });
    }
}
exports.Lock = Lock;
_lock = new WeakMap();
