export declare class TuyaApi {
    tokenAccess: string;
    tokenRefresh: string;
    tokenExpiresAt: Date;
    private _clientId;
    private _secret;
    private _schema;
    private _client;
    region: string;
    handleToken: boolean;
    private static _instance;
    protected constructor(options: {
        clientId: string;
        secret: string;
        schema: string;
        region?: string;
        handleToken?: boolean;
    });
    static getInstance(options: {
        clientId: string;
        secret: string;
        schema: string;
        region?: string;
        handleToken?: boolean;
    }): TuyaApi;
    private buildClient;
    isTokenExpired(): boolean;
    setTokenObject(tokenAccess: any, tokenRefresh: any, tokenExpiresAt: any): void;
    getTokenObject(): {
        tokenAccess: string;
        tokenRefresh: string;
        tokenExpiresAt: string;
    };
    getToken(): Promise<void>;
    refreshToken(): Promise<void>;
    get(uri: any): Promise<unknown>;
    post(uri: any, data: any): Promise<unknown>;
    getDeviceStatus(deviceId: any): Promise<unknown>;
    getDevice(deviceId: any): Promise<unknown>;
    getDeviceSpec(deviceId: any): Promise<unknown>;
    sendDeviceCommands(deviceId: any, commands: any[]): Promise<unknown>;
}
