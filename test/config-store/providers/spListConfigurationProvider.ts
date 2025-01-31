import { expect } from "chai";
import { SPListConfigurationProvider } from "../../../packages/config-store";
import MockStorage from "../mock-storage";
// import { TypedHash }  from "@pnp/common";
import { Web, IWeb } from "@pnp/sp/presets/all";

declare var global: any;

describe("Configuration", () => {

    describe("SPListConfigurationProvider", () => {
        let web: IWeb;
        // let mockData: TypedHash<string>;
        // let calledUrl: string;

        beforeEach(() => {
            web = Web("https://fake.sharepoint.com/sites/test/subsite");
            // mockData = { "key1": "value1", "key2": "value2" };
            // calledUrl = "";
        });

        // function mockJQuery(): any {
        //     // Create a mock JQuery.ajax method, which will always return our testdata.
        //     let mock: any = {};
        //     mock.ajax = function(options: any) {
        //         calledUrl = options.url;
        //         let wrappedMockData: any[] = new Array();
        //         for (let key in mockData) {
        //             if (typeof key === "string") {
        //                 wrappedMockData.push({"Title": key, "Value": mockData[key]});
        //             }
        //         }
        //         return {
        //             "success": function(callback: (data: any) => void) {
        //                 callback({ d: { results: wrappedMockData } });
        //             },
        //         };
        //     };
        //     return mock;
        // }

        // it("Returns the webUrl passed in to the constructor", () => {
        //     let provider = new SPListConfigurationProvider(webUrl);
        //     expect(provider.getWebUrl()).to.equal(webUrl);
        // });

        // it("Uses 'config' as the default title for the list", () => {
        //     let provider = new SPListConfigurationProvider(webUrl);
        //     expect(provider.getListTitle()).to.equal("config");
        // });

        // it("Allows user to overwrite the default list title", () => {
        //     let listTitle = "testTitle";
        //     let provider = new SPListConfigurationProvider(webUrl, listTitle);
        //     expect(provider.getListTitle()).to.equal(listTitle);
        // });

        // it("Fetches configuration data from SharePoint using ajax", () => {
        //     // Mock JQuery
        //     (<any> global).jQuery = mockJQuery();

        //     let listTitle = "testTitle";
        //     let provider = new SPListConfigurationProvider(webUrl, listTitle);
        //     return provider.getConfiguration().then((values) => {
        //         // Verify url
        //         expect(calledUrl).to.equal(webUrl + "/_api/web/lists/getByTitle('" + listTitle + "')/items?$select=Title,Value");

        //         // Verify returned values
        //         for (let key in mockData) {
        //             if (typeof key === "string") {
        //                 expect(values[key]).to.equal(mockData[key]);
        //             }
        //         }

        //         // Remove JQuery mock
        //         delete (<any> global).jQuery;
        //     });
        // });

        it("Can wrap itself inside a caching configuration provider", () => {
            // Mock localStorage
            (<any>global).localStorage = new MockStorage();

            const provider = new SPListConfigurationProvider(web);
            const cached = provider.asCaching();
            const wrappedProvider = cached.getWrappedProvider();
            expect(wrappedProvider).to.equal(provider);

            // Remove localStorage mock
            delete (<any>global).localStorage;
        });
    });
});
