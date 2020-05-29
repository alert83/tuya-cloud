import {TuyaApi} from "./class";
import {config} from "dotenv";

config();

(async () => {
    const client = TuyaApi.getInstance({
        clientId: process.env.CLIENT_ID ?? '',
        secret: process.env.SECRET ?? '',
        schema: 'alert83',
        region: 'eu',
        handleToken: true,
    });

    console.log(await client.get(`devices/20100800bcddc2aed93b/status`));
})().catch(console.error);
