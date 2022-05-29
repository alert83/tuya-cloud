import got, {Got, NormalizedOptions} from "got";
import {createHmac} from "crypto";
import {isEmpty} from "lodash";
import {Lock} from "./lock";

interface ITuyaApiOptions {
    clientId: string,
    secret: string,
    uid: string,
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
    #uid: string;
    #region: string;

    handleToken: boolean;

    tokenAccess: string;
    tokenRefresh: string;
    tokenExpiresAt: Date;

    #client: Got;

    private static instance: TuyaApi | undefined;

    // static rwStaticLock = createReadWriteLock();
    // private requestLock = createReadWriteLock();
    private tokenLock = new Lock();

    protected constructor(options: ITuyaApiOptions) {
        this.#clientId = options.clientId;
        this.#secret = options.secret;
        this.#uid = options.uid;
        this.#region = options.region ?? 'eu';

        this.handleToken = options.handleToken ?? true;

        this.tokenAccess = '';
        this.tokenRefresh = '';
        this.tokenExpiresAt = new Date();

        this.buildClient();
    }

    static getInstance(options: ITuyaApiOptions) {
        if (!this.instance) {
            this.instance = new TuyaApi(options);
        }
        return this.instance;
    }

    private buildClient() {
        this.#client = got.extend({
            responseType: 'json',
            prefixUrl: `https://openapi.tuya${this.#region}.com/`,
            headers: {
                client_id: this.#clientId,
                sign_method: 'HMAC-SHA256',
            },
            hooks: {
                beforeRequest: [async options => {
                    // console.log('beforeRequest:', options.url.toString());

                    const isTokenUrl = options?.url?.toString().includes('token');

                    if (!isTokenUrl && this.handleToken) {
                        if (isEmpty(this.tokenAccess) || this.isTokenExpired()) {
                            await this.getAndRefreshToken();
                        }
                    }

                    await this.buildHeaders(options);
                }],

                afterResponse: [async (response, retryWithMergedOptions) => {
                    // console.log('afterResponse', response.request.options.url.toString());

                    const isTokenUrl = response.request.options?.url?.toString().includes('token');

                    const body = response.body as ITuyaApiResponse;
                    if (!body.success) {
                        if (!isTokenUrl && body.code === 1010) {
                            this.tokenExpiresAt = new Date();
                            // Make a new retry
                            return retryWithMergedOptions(this.#client.defaults.options);
                        }

                        throw new TuyaApiError(body.code, body.msg, body.t);
                    }
                    return response;
                }],

                beforeRetry: [async (options, error, retryCount) => {
                    console.log('beforeRetry', error?.code);
                }]
            }
        });
    }

    private async buildHeaders(options: NormalizedOptions) {
        const timestamp = new Date().getTime();
        options.headers.t = timestamp.toString();

        const isGetTokenUrl = options?.url?.toString().includes('token');
        if (isGetTokenUrl) {
            // Calculate signature
            options.headers.sign = createHmac('sha256', this.#secret)
                .update(`${this.#clientId}${timestamp}`)
                .digest('hex')
                .toUpperCase();
        } else {
            await this.tokenLock.readLock(async () => {
                options.headers.access_token = this.tokenAccess;
            });

            // Calculate signature
            options.headers.sign = createHmac('sha256', this.#secret)
                .update(`${this.#clientId}${this.tokenAccess}${timestamp}`)
                .digest('hex')
                .toUpperCase();
        }
    }

    private isTokenExpired() {
        const _5min = 5 * 60 * 1000;
        return (new Date().getTime() + _5min) > this.tokenExpiresAt.getTime();
    }

    async getAndRefreshToken() {
        if (this.tokenLock.lock.isLocked === 'W') return;

        // console.log('getAndRefreshToken');

        return this.tokenLock.writeLock(async () => {
            console.log('refresh token');

            let resp = await this.#client.get('v1.0/token?grant_type=1').json<ITuyaApiResponse>();
            this.setTokenData(resp);

            if (this.isTokenExpired()) {
                resp = await this.#client.get(`v1.0/token/${this.tokenRefresh}`).json<ITuyaApiResponse>();
                this.setTokenData(resp);
            }
        });
    }


    private setTokenData(response: ITuyaApiResponse) {
        const {result: {access_token, refresh_token, expire_time}} = response;
        this.tokenAccess = access_token;
        this.tokenRefresh = refresh_token;
        this.tokenExpiresAt = new Date(new Date().getTime() + expire_time * 1000);
    }

    async get(uri) {
        // `devices/${deviceId}/status`
        return this.#client.get(uri).json();
    }

    async post(uri, data) {
        return this.#client.post(uri, {json: data}).json();
    }
}

class TuyaApiError extends Error {
    constructor(public code, message, public timestamp) {
        super(message);
    }
}
