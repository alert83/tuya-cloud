// tslint:disable:max-classes-per-file
import got, {Got} from "got";
import crypto from "crypto";

export class TuyaApi {
    tokenAccess: string;
    tokenRefresh: string;
    tokenExpiresAt: Date;

    private _clientId: string;
    private _secret: string;
    private _schema: string;

    private _client: Got;

    region: string;
    handleToken: boolean;

    constructor(options: {
        clientId: string,
        secret: string,
        schema: string,
        region?: string,
        handleToken?: boolean,
    }) {
        this._clientId = options.clientId;
        this._secret = options.secret;
        this._schema = options.schema;

        this.region = options.region ?? 'eu';
        this.handleToken = options.handleToken ?? false;

        this.tokenAccess = '';
        this.tokenRefresh = '';
        this.tokenExpiresAt = new Date();

        this.buildClient();
    }

    private buildClient() {
        this._client = got.extend({
            responseType: 'json',
            prefixUrl: `https://openapi.tuya${this.region}.com/v1.0/`,
            headers: {
                client_id: this._clientId,
                sign_method: 'HMAC-SHA256',
            },
            hooks: {
                beforeRequest: [async options => {
                    const isTokenUrl = options.url.toString().includes('token');

                    if (!isTokenUrl && this.tokenAccess === '' && this.handleToken) {
                        await this.getToken();
                    }

                    if (!isTokenUrl && this.isTokenExpired()) {
                        await this.refreshToken();
                    }

                    const now = new Date().getTime();
                    options.headers.t = now.toString();

                    // Caculate signature
                    let sign = '';
                    if (isTokenUrl) {
                        sign = crypto
                            .createHmac('sha256', this._secret)
                            .update(this._clientId + now.toString())
                            .digest('hex')
                            .toUpperCase();
                    } else {
                        sign = crypto
                            .createHmac('sha256', this._secret)
                            .update(`${this._clientId}${this.tokenAccess}${now}`)
                            .digest('hex')
                            .toUpperCase();
                        options.headers.access_token = this.tokenAccess;
                    }
                    options.headers.sign = sign;
                }],

                afterResponse: [response => {
                    const body = response.body as any;
                    if (!body.success) {
                        throw new Error(body.msg);
                    }
                    return response;
                }]
            }
        });
    }


    isTokenExpired() {
        return new Date().getTime() > this.tokenExpiresAt.getTime();
    }

    async getToken() {
        // if (this.handleToken) {
        //     throw new HandleTokenError();
        // }
        const {result: {access_token, refresh_token, expire_time}} = await this._client
            .get('token?grant_type=1')
            .json<{ result: any }>();
        this.tokenAccess = access_token;
        this.tokenRefresh = refresh_token;
        this.tokenExpiresAt = new Date(new Date().getTime() + expire_time * 1000);
    }

    async refreshToken() {
        const {result: {access_token, refresh_token, expire_time}} = await this._client
            .get(`token/${this.tokenRefresh}`)
            .json<{ result: any }>();
        this.tokenAccess = access_token;
        this.tokenRefresh = refresh_token;
        this.tokenExpiresAt = new Date(new Date().getTime() + expire_time * 1000);
    }

    async get(uri) {
        return this._client.get(uri).json();
    }

    async post(uri, data) {
        return this._client.post(uri, {json: data}).json();
    }

    async getDeviceStatus(deviceId) {
        return this._client.get(`devices/${deviceId}/status`).json();
    }

    async getDevice(deviceId) {
        return this._client.get(`devices/${deviceId}`).json();
    }

    async getDeviceSpec(deviceId) {
        return this._client.get(`devices/${deviceId}/specifications`).json();
    }

    async sendDeviceCommands(deviceId, commands: any[]) {
        return this._client.post(`devices/${deviceId}/commands`, {json: {commands}}).json();
    }
}

class HandleTokenError extends Error {
    constructor() {
        super('Token acquisition is automatically handled.');
    }
}
