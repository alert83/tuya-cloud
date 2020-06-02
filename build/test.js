"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const class_1 = require("./class");
const dotenv_1 = require("dotenv");
dotenv_1.config();
(async () => {
    var _a, _b;
    const client = class_1.TuyaApi.getInstance({
        clientId: (_a = process.env.CLIENT_ID) !== null && _a !== void 0 ? _a : '',
        secret: (_b = process.env.SECRET) !== null && _b !== void 0 ? _b : '',
        schema: 'alert83',
        region: 'eu',
        handleToken: true,
    });
    await Promise.all([
        client.get(`devices/20100800bcddc2aed93b/status`),
        client.getAndRefreshToken(),
        client.get(`devices/20100800bcddc2aed93b/status`),
        client.get(`devices/20100800bcddc2aed93b/status`),
        client.post(`devices/20100800bcddc2aed93b/commands`, {}),
    ]);
})().catch(console.error);
