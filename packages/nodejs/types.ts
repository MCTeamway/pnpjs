export const SharePointServicePrincipal = "00000003-0000-0ff1-ce00-000000000000";

export interface AADToken {
    accessToken: string;
    expiresIn: number;
    expiresOn: string | Date;
    isMRRT?: boolean;
    resource: string;
    tokenType: string;
}

export enum SPOAuthEnv {
    SPO,
    China,
    Germany,
    USDef,
    USGov,
}

export interface AuthToken {
    token_type: string;
    expires_in: string;
    not_before: string;
    expires_on: string;
    resource: string;
    access_token: string;
}

export interface ProviderHostedConfigurationOptions {
    headers: {
        Authorization: string;
    };
}

export interface ITokenCacheManager {
    getAccessToken(realm: string, cacheKey: string): AuthToken;
    setAccessToken(realm: string, cacheKey: string, token: AuthToken): void;
}
