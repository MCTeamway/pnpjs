import { ILibraryConfiguration, ITypedHash, RuntimeConfig, IHttpClientImpl } from "@pnp/common";
import { AdalClient } from "@pnp/adaljsclient";

export interface GraphConfigurationPart {
    graph?: {
        /**
         * Any headers to apply to all requests
         */
        headers?: ITypedHash<string>;

        /**
         * Defines a factory method used to create fetch clients
         */
        fetchClientFactory?: () => IHttpClientImpl;
    };
}

export interface GraphConfiguration extends ILibraryConfiguration, GraphConfigurationPart { }

export function setup(config: GraphConfiguration): void {
    RuntimeConfig.assign(config);
}

export class GraphRuntimeConfigImpl {

    public get headers(): ITypedHash<string> {

        const graphPart = RuntimeConfig.get("graph");
        if (graphPart !== undefined && graphPart !== null && graphPart.headers !== undefined) {
            return graphPart.headers;
        }

        return {};
    }

    public get fetchClientFactory(): () => IHttpClientImpl {

        const graphPart = RuntimeConfig.get("graph");
        // use a configured factory firt
        if (graphPart !== undefined && graphPart !== null && graphPart.fetchClientFactory !== undefined) {
            return graphPart.fetchClientFactory;
        }

        // then try and use spfx context if available
        if (RuntimeConfig.spfxContext !== undefined) {
            return () => AdalClient.fromSPFxContext(RuntimeConfig.spfxContext);
        }

        throw Error("There is no Graph Client available, either set one using configuraiton or provide a valid SPFx Context using setup.");
    }
}

export let GraphRuntimeConfig = new GraphRuntimeConfigImpl();
