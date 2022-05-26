"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTuyaEnvConfig = exports.TuyaEnvConfig = exports.TUYA_PULSAR_ENV = exports.TuyaRegionConfigEnum = void 0;
var TuyaRegionConfigEnum;
(function (TuyaRegionConfigEnum) {
    TuyaRegionConfigEnum["CN"] = "wss://mqe.tuyacn.com:8285/";
    TuyaRegionConfigEnum["US"] = "wss://mqe.tuyaus.com:8285/";
    TuyaRegionConfigEnum["EU"] = "wss://mqe.tuyaeu.com:8285/";
    TuyaRegionConfigEnum["IN"] = "wss://mqe.tuyain.com:8285/";
})(TuyaRegionConfigEnum = exports.TuyaRegionConfigEnum || (exports.TuyaRegionConfigEnum = {}));
var TUYA_PULSAR_ENV;
(function (TUYA_PULSAR_ENV) {
    TUYA_PULSAR_ENV["PROD"] = "prod";
    TUYA_PULSAR_ENV["TEST"] = "test";
})(TUYA_PULSAR_ENV = exports.TUYA_PULSAR_ENV || (exports.TUYA_PULSAR_ENV = {}));
exports.TuyaEnvConfig = Object.freeze({
    [TUYA_PULSAR_ENV.PROD]: {
        name: TUYA_PULSAR_ENV.PROD,
        value: 'event',
        desc: 'online environment',
    },
    [TUYA_PULSAR_ENV.TEST]: {
        name: TUYA_PULSAR_ENV.TEST,
        value: 'event-test',
        desc: 'test environment',
    },
});
function getTuyaEnvConfig(env) {
    return exports.TuyaEnvConfig[env];
}
exports.getTuyaEnvConfig = getTuyaEnvConfig;
