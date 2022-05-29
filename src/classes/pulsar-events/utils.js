"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encrypt = exports.decrypt = exports.buildPassword = exports.buildQuery = exports.getTopicUrl = void 0;
const crypto_js_1 = require("crypto-js");
function getTopicUrl(websocketUrl, accessId, env, query) {
    return `${websocketUrl}ws/v2/consumer/persistent/${accessId}/out/${env}/${accessId}-sub${query}`;
}
exports.getTopicUrl = getTopicUrl;
function buildQuery(query) {
    return Object.keys(query)
        .map((key) => `${key}=${encodeURIComponent(query[key])}`)
        .join('&');
}
exports.buildQuery = buildQuery;
function buildPassword(accessId, accessKey) {
    const key = crypto_js_1.MD5(accessKey).toString();
    return crypto_js_1.MD5(`${accessId}${key}`).toString().substr(8, 16);
}
exports.buildPassword = buildPassword;
function decrypt(data, accessKey) {
    try {
        const realKey = crypto_js_1.enc.Utf8.parse(accessKey.substring(8, 24));
        const json = crypto_js_1.AES.decrypt(data, realKey, {
            mode: crypto_js_1.mode.ECB,
            padding: crypto_js_1.pad.Pkcs7,
        });
        const dataStr = crypto_js_1.enc.Utf8.stringify(json).toString();
        return JSON.parse(dataStr);
    }
    catch (e) {
        return '';
    }
}
exports.decrypt = decrypt;
function encrypt(data, accessKey) {
    try {
        const realKey = crypto_js_1.enc.Utf8.parse(accessKey.substring(8, 24));
        const realData = JSON.stringify(data);
        const retData = crypto_js_1.AES.encrypt(realData, realKey, {
            mode: crypto_js_1.mode.ECB,
            padding: crypto_js_1.pad.Pkcs7,
        }).toString();
        return retData;
    }
    catch (e) {
        return '';
    }
}
exports.encrypt = encrypt;
