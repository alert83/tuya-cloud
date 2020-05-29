// tslint:disable:max-classes-per-file
import got, {Got} from "got";
import {createHmac} from "crypto";
import {isEmpty} from "lodash";
import {NormalizedOptions as RequestNormalizedOptions} from "got/dist/source/core";

interface ITuyaApiOptions {
    clientId: string,
    secret: string,
    schema: string,
    region?: string,
    handleToken?: boolean,
}

interface ITuyaApiResponse {
    result?: any;
    code?: number;
    msg?: string;
    success: boolean;
    t: number;
}

export class TuyaApi {
    #clientId: string;
    #secret: string;
    #schema: string;
    region: string;
    handleToken: boolean;

    tokenAccess: string;
    tokenRefresh: string;
    tokenExpiresAt: Date;

    #client: Got;

    private static instance: TuyaApi;

    protected constructor(options: ITuyaApiOptions) {
        this.#clientId = options.clientId;
        this.#secret = options.secret;
        this.#schema = options.schema;

        this.region = options.region ?? 'eu';
        this.handleToken = options.handleToken ?? true;

        this.tokenAccess = '';
        this.tokenRefresh = '';
        this.tokenExpiresAt = new Date();

        this.buildClient();
    }

    static getInstance(options: ITuyaApiOptions) {
        const newCred = JSON.stringify({
            clientId: options.clientId,
            secret: options.secret,
            schema: options.schema,
            region: options.region ?? 'eu',
        });

        const oldCred = JSON.stringify({
            clientId: this.instance.#clientId,
            secret: this.instance.#secret,
            schema: this.instance.#schema,
            region: this.instance.region,
        });

        if (!this.instance || newCred !== oldCred) {
            this.instance = new TuyaApi(options);
        }
        return this.instance;
    }

    private buildClient() {
        this.#client = got.extend({
            responseType: 'json',
            prefixUrl: `https://openapi.tuya${this.region}.com/v1.0/`,
            headers: {
                client_id: this.#clientId,
                sign_method: 'HMAC-SHA256',
            },
            hooks: {
                beforeRequest: [async options => {
                    // console.log('beforeRequest');

                    const isTokenUrl = options.url.toString().includes('token');

                    if (!isTokenUrl && this.handleToken) {
                        if (isEmpty(this.tokenAccess)) {
                            await this.getToken();
                        }

                        if (this.isTokenExpired()) {
                            await this.getToken();
                            await this.refreshToken();
                        }
                    }

                    this.buildHeaders(options);
                }],

                afterResponse: [async (response, retryWithMergedOptions) => {
                    // console.log('afterResponse');

                    const isTokenUrl = response.request.requestUrl.toString().includes('token');

                    const body = response.body as ITuyaApiResponse;
                    if (!body.success) {
                        // console.log(body);
                        throw new TuyaApiError(body.code, body.msg, body.t);
                    }
                    return response;
                }],

                beforeRetry: [async (options, error, retryCount) => {
                    // console.log('beforeRetry', error?.code);
                }]
            }
        });
    }

    private async checkRespAndUpdateToken(code: number) {
        switch (code) {
            case 1010: // token invalid
                if (isEmpty(this.tokenAccess)) {
                    await this.getToken();
                } else {
                    await this.getToken();
                    await this.refreshToken();
                }
                break;
        }
    }

    private buildHeaders(options: RequestNormalizedOptions) {
        const isTokenUrl = options.url.toString().includes('token');

        if (!isTokenUrl) {
            options.headers.access_token = this.tokenAccess;
        }

        const timestamp = new Date().getTime();
        options.headers.t = timestamp.toString();

        // Calculate signature
        options.headers.sign = createHmac('sha256', this.#secret)
            .update(`${this.#clientId}${(isTokenUrl ? '' : this.tokenAccess)}${timestamp}`)
            .digest('hex')
            .toUpperCase();
    }

    isTokenExpired() {
        return new Date().getTime() > this.tokenExpiresAt.getTime();
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
        }
    }

    async getToken() {
        // console.log('getToken');

        const resp = await this.#client
            .get('token?grant_type=1')
            .json<{ result: any }>();

        this.tokenAccess = resp.result.access_token;
        this.tokenRefresh = resp.result.refresh_token;
        this.tokenExpiresAt = new Date(new Date().getTime() + resp.result.expire_time * 1000);

        return resp;
    }

    async refreshToken() {
        // console.log('refreshToken');

        const resp = await this.#client
            .get(`token/${this.tokenRefresh}`)
            .json<{ result: any }>();

        this.tokenAccess = resp.result.access_token;
        this.tokenRefresh = resp.result.refresh_token;
        this.tokenExpiresAt = new Date(new Date().getTime() + resp.result.expire_time * 1000);

        return resp;
    }

    async get(uri) {
        return this.#client.get(uri).json();
    }

    async post(uri, data) {
        return this.#client.post(uri, {json: data}).json();
    }

    async getDeviceStatus(deviceId) {
        return this.#client.get(`devices/${deviceId}/status`).json();
    }

    async getDevice(deviceId) {
        return this.#client.get(`devices/${deviceId}`).json();
    }

    async getDeviceSpec(deviceId) {
        return this.#client.get(`devices/${deviceId}/specifications`).json();
    }

    async sendDeviceCommands(deviceId, commands: any[]) {
        return this.#client.post(`devices/${deviceId}/commands`, {json: {commands}}).json();
    }
}

class TuyaApiError extends Error {
    constructor(public code, message, public timestamp) {
        super(message);
    }
}
