interface ITuyaApiOptions {
    clientId: string;
    secret: string;
    schema: string;
    region?: string;
    handleToken?: boolean;
}
export declare class TuyaApi {
    #private;
    region: string;
    handleToken: boolean;
    tokenAccess: string;
    tokenRefresh: string;
    tokenExpiresAt: Date;
    private static instance;
    static rwStaticLock: any;
    private rwLock;
    protected constructor(options: ITuyaApiOptions);
    static getInstance(options: ITuyaApiOptions): TuyaApi;
    getCredsHash(): string;
    private buildClient;
    private buildHeaders;
    isTokenExpired(): boolean;
    setTokenObject(tokenAccess: any, tokenRefresh: any, tokenExpiresAt: any): void;
    getTokenObject(): {
        tokenAccess: string;
        tokenRefresh: string;
        tokenExpiresAt: string;
    };
    getToken(): Promise<unknown>;
    refreshToken(): Promise<unknown>;
    getAndRefreshToken(): Promise<unknown>;
    private setTokenData;
    get(uri: any): Promise<unknown>;
    post(uri: any, data: any): Promise<unknown>;
}
export {};
