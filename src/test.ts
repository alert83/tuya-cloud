import {TuyaApi} from "./class";
import {config} from "dotenv";

config();

(async () => {
    const client = new TuyaApi({
        clientId: process.env.CLIENT_ID ?? '',
        secret: process.env.SECRET ?? '',
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
    ])
})().catch(console.error);
