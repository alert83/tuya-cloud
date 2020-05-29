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
    protected constructor(options: ITuyaApiOptions);
    static getInstance(options: ITuyaApiOptions): TuyaApi;
    getCredsHash(): string;
    private buildClient;
    private checkRespAndUpdateToken;
    private buildHeaders;
    isTokenExpired(): boolean;
    setTokenObject(tokenAccess: any, tokenRefresh: any, tokenExpiresAt: any): void;
    getTokenObject(): {
        tokenAccess: string;
        tokenRefresh: string;
        tokenExpiresAt: string;
    };
    getToken(): Promise<{
        result: any;
    }>;
    refreshToken(): Promise<{
        result: any;
    }>;
    get(uri: any): Promise<unknown>;
    post(uri: any, data: any): Promise<unknown>;
    getDeviceStatus(deviceId: any): Promise<unknown>;
    getDevice(deviceId: any): Promise<unknown>;
    getDeviceSpec(deviceId: any): Promise<unknown>;
    sendDeviceCommands(deviceId: any, commands: any[]): Promise<unknown>;
}
export {};
