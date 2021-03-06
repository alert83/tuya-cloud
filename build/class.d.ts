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
    private tokenLock;
    protected constructor(options: ITuyaApiOptions);
    static getInstance(options: ITuyaApiOptions): TuyaApi;
    isNewCreds(options: ITuyaApiOptions): boolean;
    private buildClient;
    private buildHeaders;
    isTokenExpired(): boolean;
    setTokenObject(tokenAccess: any, tokenRefresh: any, tokenExpiresAt: any): void;
    getTokenObject(): {
        tokenAccess: string;
        tokenRefresh: string;
        tokenExpiresAt: string;
    };
    getAndRefreshToken(): Promise<unknown>;
    private readLock;
    private writeLock;
    private setTokenData;
    get(uri: any): Promise<unknown>;
    post(uri: any, data: any): Promise<unknown>;
}
export {};
