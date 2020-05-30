// tslint:disable:max-classes-per-file
import got, {Got} from "got";
import {createHmac} from "crypto";
import {isEmpty} from "lodash";
import {NormalizedOptions as RequestNormalizedOptions} from "got/dist/source/core";
import {createReadWriteLock} from "locks";

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

    private static instance: TuyaApi | undefined;

    static rwStaticLock = createReadWriteLock();
    private rwLock = createReadWriteLock();

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
        if (!this.instance) {
            this.instance = new TuyaApi(options);
        } else {
            const newCred = JSON.stringify({
                clientId: options.clientId,
                secret: options.secret,
                schema: options.schema,
                region: options.region ?? 'eu',
            });
            const oldCred = this.instance.getCredsHash();

            if (newCred !== oldCred)
                this.instance = new TuyaApi(options);
        }

        return this.instance;
    }

    getCredsHash() {
        return JSON.stringify({
            clientId: this.#clientId,
            secret: this.#secret,
            schema: this.#schema,
            region: this.region,
        });
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
                    console.log('beforeRequest:', options.url.toString());

                    const isTokenUrl = options.url.toString().includes('token');

                    if (!isTokenUrl && this.handleToken) {
                        if (isEmpty(this.tokenAccess) || this.isTokenExpired()) {
                            await this.getAndRefreshToken();
                        }
                    }

                    await this.buildHeaders(options);
                }],

                afterResponse: [async (response, retryWithMergedOptions) => {
                    console.log('afterResponse', response.request.options.url.toString());

                    const isTokenUrl = response.request.options.url.toString().includes('token');

                    const body = response.body as ITuyaApiResponse;
                    if (!body.success) {
                        console.log(body);
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

    private async buildHeaders(options: RequestNormalizedOptions) {
        const isTokenUrl = options.url.toString().includes('token');

        if (!isTokenUrl) {
            await new Promise((resolve, reject) => {
                this.rwLock.readLock(() => {
                    console.log('Read Lock');

                    setTimeout(() => {
                        (async () => {
                            options.headers.access_token = this.tokenAccess;
                            resolve();
                        })()
                            .catch(reject)
                            .finally(() => this.rwLock.unlock())
                        ;
                    }, 0);
                });
            });
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
        const _5min = 5 * 60 * 1000;
        return (new Date().getTime() + _5min) > this.tokenExpiresAt.getTime();
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
        console.log('getToken');

        return new Promise((resolve, reject) => {
            if (this.rwLock.isLocked === 'W')
                return resolve();

            this.rwLock.writeLock(() => {
                console.log('Write Lock');

                this.#client
                    .get('token?grant_type=1')
                    .json<ITuyaApiResponse>()
                    .then((resp) => {
                        this.setTokenData(resp);
                        resolve(resp);
                    })
                    .catch(reject)
                    .finally(() => this.rwLock.unlock())
                ;

            });
        });
    }

    async refreshToken() {
        console.log('refreshToken');

        return new Promise((resolve, reject) => {
            if (this.rwLock.isLocked === 'W')
                return resolve();

            this.rwLock.writeLock(() => {
                console.log('Write Lock');

                this.#client
                    .get(`token/${this.tokenRefresh}`)
                    .json<ITuyaApiResponse>()
                    .then((resp) => {
                        this.setTokenData(resp);
                        resolve(resp);
                    })
                    .catch(reject)
                    .finally(() => this.rwLock.unlock())
                ;
            });
        });
    }

    async getAndRefreshToken() {
        console.log('getAndRefreshToken');

        if (this.rwLock.isLocked === 'W') return;

        return new Promise((resolve, reject) => {
            this.rwLock.writeLock(() => {
                console.log('Write Lock', this.rwLock.isLocked);

                setTimeout(() => {
                    (async () => {
                        let resp = await this.#client.get('token?grant_type=1').json<ITuyaApiResponse>();
                        this.setTokenData(resp);

                        if (this.isTokenExpired()) {
                            resp = await this.#client.get(`token/${this.tokenRefresh}`).json<ITuyaApiResponse>();
                            this.setTokenData(resp);
                        }

                        resolve(resp);
                    })()
                        .catch(reject)
                        .finally(() => this.rwLock.unlock())
                    ;

                }, 0);
            });
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
