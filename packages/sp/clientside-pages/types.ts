import { invokableFactory, body, headers, IQueryable } from "@pnp/odata";
import { ITypedHash, assign, getGUID, hOP, stringIsNullOrEmpty, objectDefinedNotNull, combine, isUrlAbsolute } from "@pnp/common";
import { IFile } from "../files/types";
import { Item, IItem } from "../items/types";
import { SharePointQueryable, _SharePointQueryable, ISharePointQueryable } from "../sharepointqueryable";
import { metadata } from "../utils/metadata";
import { List } from "../lists/types";
import { odataUrlFrom } from "../odata";
import { Web, IWeb } from "../webs/types";
import { extractWebUrl } from "../utils/extractweburl";
import { Site } from "../sites/types";
import { spPost } from "../operations";
import { getNextOrder, reindex } from "./funcs";
import "../files/web";
import "../comments/item";
import { tag } from "../telemetry";

/**
 * Page promotion state
 */
export const enum PromotedState {
    /**
     * Regular client side page
     */
    NotPromoted = 0,
    /**
     * Page that will be promoted as news article after publishing
     */
    PromoteOnPublish = 1,
    /**
     * Page that is promoted as news article
     */
    Promoted = 2,
}

/**
 * Type describing the available page layout types for client side "modern" pages
 */
export type ClientsidePageLayoutType = "Article" | "Home" | "SingleWebPartAppPage" | "RepostPage";

/**
 * Column size factor. Max value is 12 (= one column), other options are 8,6,4 or 0
 */
export type CanvasColumnFactor = 0 | 2 | 4 | 6 | 8 | 12;

function initFrom(o: ISharePointQueryable, url: string): IClientsidePage {
    return ClientsidePage(extractWebUrl(o.toUrl()), url).configureFrom(o);
}

/** 
 * Represents the data and methods associated with client side "modern" pages
 */
export class _ClientsidePage extends _SharePointQueryable implements IClientsidePage {

    private _pageSettings: IClientsidePageSettingsSlice;
    private _layoutPart: ILayoutPartsContent;
    private _bannerImageDirty: boolean;

    /**
     * PLEASE DON'T USE THIS CONSTRUCTOR DIRECTLY, thank you 🐇
     */
    constructor(
        baseUrl: string | ISharePointQueryable,
        path?: string,
        protected json?: Partial<IPageData>,
        noInit = false,
        public sections: CanvasSection[] = [],
        public commentsDisabled = false) {

        super(baseUrl, path);

        this._bannerImageDirty = false;

        // ensure we have a good url to build on for the pages api
        if (typeof baseUrl === "string") {
            this.data.parentUrl = "";
            this.data.url = combine(extractWebUrl(baseUrl), path);
        } else {
            this.assign(initFrom(baseUrl, null), path);
        }

        // set a default page settings slice
        this._pageSettings = { controlType: 0, pageSettingsSlice: { isDefaultDescription: true, isDefaultThumbnail: true } };

        // set a default layout part
        this._layoutPart = _ClientsidePage.getDefaultLayoutPart();

        if (typeof json !== "undefined" && !noInit) {
            this.fromJSON(json);
        }
    }

    private static getDefaultLayoutPart(): ILayoutPartsContent {
        return {
            dataVersion: "1.4",
            description: "Title Region Description",
            id: "cbe7b0a9-3504-44dd-a3a3-0e5cacd07788",
            instanceId: "cbe7b0a9-3504-44dd-a3a3-0e5cacd07788",
            properties: {
                authors: [],
                layoutType: "FullWidthImage",
                showPublishDate: false,
                showTopicHeader: false,
                textAlignment: "Left",
                title: "",
                topicHeader: "",
            },
            serverProcessedContent: { htmlStrings: {}, searchablePlainTexts: {}, imageSources: {}, links: {} },
            title: "Title area",
        };
    }

    public get pageLayout(): ClientsidePageLayoutType {
        return this.json.PageLayoutType;
    }

    public set pageLayout(value: ClientsidePageLayoutType) {
        this.json.PageLayoutType = value;
    }

    public get bannerImageUrl(): string {
        return this.json.BannerImageUrl;
    }

    public set bannerImageUrl(value: string) {
        this.json.BannerImageUrl = value;
        this._bannerImageDirty = true;
    }

    public get topicHeader(): string {
        return objectDefinedNotNull(this.json.TopicHeader) ? this.json.TopicHeader : "";
    }

    public set topicHeader(value: string) {
        this.json.TopicHeader = value;
        this._layoutPart.properties.topicHeader = value;
        if (stringIsNullOrEmpty(value)) {
            this.showTopicHeader = false;
        }
    }

    public get title(): string {
        return this._layoutPart.properties.title;
    }

    public set title(value: string) {
        this.json.Title = value;
        this._layoutPart.properties.title = value;
    }

    public get layoutType(): LayoutType {
        return this._layoutPart.properties.layoutType;
    }

    public set layoutType(value: LayoutType) {
        this._layoutPart.properties.layoutType = value;
    }

    public get headerTextAlignment(): TextAlignment {
        return this._layoutPart.properties.textAlignment;
    }

    public set headerTextAlignment(value: TextAlignment) {
        this._layoutPart.properties.textAlignment = value;
    }

    public get showTopicHeader(): boolean {
        return this._layoutPart.properties.showTopicHeader;
    }

    public set showTopicHeader(value: boolean) {
        this._layoutPart.properties.showTopicHeader = value;
    }

    public get showPublishDate(): boolean {
        return this._layoutPart.properties.showPublishDate;
    }

    public set showPublishDate(value: boolean) {
        this._layoutPart.properties.showPublishDate = value;
    }

    public get hasVerticalSection(): boolean {
        return this.sections.findIndex(s => s.layoutIndex === 2) > -1;
    }

    public get verticalSection(): CanvasSection | null {
        if (this.hasVerticalSection) {
            return this.addVerticalSection();
        }
        return null;
    }

    /**
     * Add a section to this page
     */
    public addSection(): CanvasSection {
        const section = new CanvasSection(this, getNextOrder(this.sections), 1);
        this.sections.push(section);
        return section;
    }

    /**
     * Add a section to this page
     */
    public addVerticalSection(): CanvasSection {

        // we can only have one vertical section so we find it if it exists
        const sectionIndex = this.sections.findIndex(s => s.layoutIndex === 2);
        if (sectionIndex > -1) {
            return this.sections[sectionIndex];
        }

        const section = new CanvasSection(this, getNextOrder(this.sections), 2);
        this.sections.push(section);
        return section;
    }

    /**
     * Loads this instance from the appropriate JSON data
     * 
     * @param pageData JSON data to load (replaces any existing data)
     */
    public fromJSON(pageData: Partial<IPageData>): this {

        this.json = pageData;

        const canvasControls: IClientsideControlBaseData[] = JSON.parse(pageData.CanvasContent1);

        const layouts = <ILayoutPartsContent[]>JSON.parse(pageData.LayoutWebpartsContent);
        if (layouts && layouts.length > 0) {
            this._layoutPart = layouts[0];
        }

        this.setControls(canvasControls);

        return this;
    }

    /**
     * Loads this page's content from the server
     */
    @tag("csp.load")
    public async load(): Promise<IClientsidePage> {

        const item = await this.getItem<{ Id: number, CommentsDisabled: boolean }>("Id", "CommentsDisabled");
        const pageData = await SharePointQueryable(this, `_api/sitepages/pages(${item.Id})`)<IPageData>();
        this.commentsDisabled = item.CommentsDisabled;
        return this.fromJSON(pageData);
    }

    /**
     * Persists the content changes (sections, columns, and controls) [does not work with batching]
     * 
     * @param publish If true the page is published, if false the changes are persisted to SharePoint but not published [Default: true]
     */
    @tag("csp.save")
    public async save(publish = true): Promise<boolean> {

        if (this.json.Id === null) {
            throw Error("The id for this page is null. If you want to create a new page, please use ClientSidePage.Create");
        }

        if (this._bannerImageDirty) {

            // we have to do these gymnastics to set the banner image url
            let origImgUrl = this.json.BannerImageUrl;

            if (isUrlAbsolute(origImgUrl)) {
                // do our best to make this a server relative url by removing the x.sharepoint.com part
                origImgUrl = origImgUrl.replace(/^https?:\/\/[a-z0-9\.]*?\.[a-z]{2,3}\//i, "/");
            }

            const site = Site(extractWebUrl(this.toUrl()));
            const web = Web(extractWebUrl(this.toUrl()));
            const imgFile = web.getFileByServerRelativePath(origImgUrl);

            let siteId = "";
            let webId = "";
            let imgId = "";
            let listId = "";
            let webUrl = "";

            const batch = web.createBatch();

            site.select("Id", "Url").inBatch(batch)().then((r1: { Id: string }) => siteId = r1.Id);
            web.select("Id", "Url").inBatch(batch)().then((r2: { Id: string, Url: string }) => { webId = r2.Id; webUrl = r2.Url; });
            imgFile.listItemAllFields.select("UniqueId", "ParentList/Id").expand("ParentList").inBatch(batch)()
                .then((r3: { UniqueId: string, ParentList: { Id: string } }) => { imgId = r3.UniqueId; listId = r3.ParentList.Id; });

            // we know the .then calls above will run before execute resolves, ensuring the vars are set
            await batch.execute();

            const f = SharePointQueryable(webUrl, "_layouts/15/getpreview.ashx");
            f.query.set("guidSite", `${siteId}`);
            f.query.set("guidWeb", `${webId}`);
            f.query.set("guidFile", `${imgId}`);
            this.bannerImageUrl = f.toUrlAndQuery();

            if (!objectDefinedNotNull(this._layoutPart.serverProcessedContent)) {
                this._layoutPart.serverProcessedContent = <any>{};
            }

            this._layoutPart.serverProcessedContent.imageSources = { imageSource: origImgUrl };

            if (!objectDefinedNotNull(this._layoutPart.serverProcessedContent.customMetadata)) {
                this._layoutPart.serverProcessedContent.customMetadata = <any>{};
            }

            this._layoutPart.serverProcessedContent.customMetadata.imageSource = {
                listId,
                siteId,
                uniqueId: imgId,
                webId,
            };
            this._layoutPart.properties.webId = webId;
            this._layoutPart.properties.siteId = siteId;
            this._layoutPart.properties.listId = listId;
            this._layoutPart.properties.uniqueId = imgId;
        }

        // we try and check out the page for the user
        if (!this.json.IsPageCheckedOutToCurrentUser) {
            await spPost(initFrom(this, `_api/sitepages/pages(${this.json.Id})/checkoutpage`));
        }

        const saveBody = Object.assign(metadata("SP.Publishing.SitePage"), {
            AuthorByline: this.json.AuthorByline || [],
            BannerImageUrl: this.bannerImageUrl,
            CanvasContent1: this.getCanvasContent1(),
            LayoutWebpartsContent: this.getLayoutWebpartsContent(),
            Title: this.title,
            TopicHeader: this.topicHeader,
        });

        const updater = initFrom(this, `_api/sitepages/pages(${this.json.Id})/savepage`);
        await spPost<boolean>(updater, headers({ "if-match": "*" }, body(saveBody)));

        let r = true;

        if (publish) {
            r = await spPost(initFrom(this, `_api/sitepages/pages(${this.json.Id})/publish`));
            if (r) {
                this.json.IsPageCheckedOutToCurrentUser = false;
            }
        }

        this._bannerImageDirty = false;

        return r;
    }

    /**
     * Discards the checkout of this page
     */
    @tag("csp.discardPageCheckout")
    public async discardPageCheckout(): Promise<void> {

        if (this.json.Id === null) {
            throw Error("The id for this page is null. If you want to create a new page, please use ClientSidePage.Create");
        }

        const d = await spPost(initFrom(this, `_api/sitepages/pages(${this.json.Id})/discardPage`), body(metadata("SP.Publishing.SitePage")));

        this.fromJSON(d);
    }

    /**
     * Promotes this page as a news item
     */
    @tag("csp.promoteToNews")
    public async promoteToNews(): Promise<boolean> {
        return this.promoteNewsImpl("promoteToNews");
    }

    // API is currently broken on server side
    // public async demoteFromNews(): Promise<boolean> {
    //     return this.promoteNewsImpl("demoteFromNews");
    // }

    /**
     * Finds a control by the specified instance id
     *
     * @param id Instance id of the control to find
     */
    public findControlById<T extends ColumnControl<any> = ColumnControl<any>>(id: string): T {
        return this.findControl((c) => c.id === id);
    }

    /**
     * Finds a control within this page's control tree using the supplied predicate
     *
     * @param predicate Takes a control and returns true or false, if true that control is returned by findControl
     */
    public findControl<T extends ColumnControl<any> = ColumnControl<any>>(predicate: (c: ColumnControl<any>) => boolean): T {
        // check all sections
        for (let i = 0; i < this.sections.length; i++) {
            // check all columns
            for (let j = 0; j < this.sections[i].columns.length; j++) {
                // check all controls
                for (let k = 0; k < this.sections[i].columns[j].controls.length; k++) {
                    // check to see if the predicate likes this control
                    if (predicate(this.sections[i].columns[j].controls[k])) {
                        return <T>this.sections[i].columns[j].controls[k];
                    }
                }
            }
        }

        // we found nothing so give nothing back
        return null;
    }

    /**
     * Creates a copy of this page
     * 
     * @param web The web where we will create the copy
     * @param pageName The file name of the new page
     * @param title The title of the new page
     * @param publish If true the page will be published
     */
    @tag("csp.copy")
    public async copy(web: IWeb, pageName: string, title: string, publish = true): Promise<IClientsidePage> {

        const page = await CreateClientsidePage(web, pageName, title, this.pageLayout);

        // we know the method is on the class - but it is protected so not part of the interface
        (<any>page).setControls(this.getControls());

        await page.save(publish);

        return page;
    }

    /**
     * Sets the modern page banner image
     * 
     * @param url Url of the image to display
     * @param altText Alt text to describe the image
     * @param bannerProps Additional properties to control display of the banner
     */
    public setBannerImage(url: string, props?: {
        altText?: string;
        imageSourceType?: number;
        translateX?: number;
        translateY?: number;
    }): void {

        this.bannerImageUrl = url;
        this._layoutPart.properties.imageSourceType = 2; // this seems to always be true, so default?

        if (objectDefinedNotNull(props)) {
            if (hOP(props, "translateX")) {
                this._layoutPart.properties.translateX = props.translateX;
            }
            if (hOP(props, "translateY")) {
                this._layoutPart.properties.translateY = props.translateY;
            }
            if (hOP(props, "imageSourceType")) {
                this._layoutPart.properties.imageSourceType = props.imageSourceType;
            }
            if (hOP(props, "altText")) {
                this._layoutPart.properties.altText = props.altText;
            }
        }
    }

    /**
     * Gets the list item associated with this clientside page
     * 
     * @param selects Specific set of fields to include when getting the item
     */
    @tag("csp.getItem")
    public async getItem<T>(...selects: string[]): Promise<IItem & T> {

        const initer = initFrom(this, "/_api/lists/EnsureClientRenderedSitePagesLibrary").select("EnableModeration", "EnableMinorVersions", "Id");
        const listData = await spPost<{ Id: string, "odata.id": string }>(initer);
        const item = (List(listData["odata.id"])).configureFrom(this).items.getById(this.json.Id);
        const itemData: T = await item.select.apply(item, selects)();
        return assign((Item(odataUrlFrom(itemData))).configureFrom(this), itemData);
    }

    /**
     * Extends this queryable from the provided parent 
     * 
     * @param parent Parent queryable from which we will derive a base url
     * @param path Additional path
     */
    protected assign(parent: IQueryable<any>, path?: string) {
        this.data.parentUrl = parent.data.url;
        this.data.url = combine(this.data.parentUrl, path || "");
        this.configureFrom(parent);
    }

    protected getCanvasContent1(): string {
        return JSON.stringify(this.getControls());
    }

    protected getLayoutWebpartsContent(): string {
        if (this._layoutPart) {
            return JSON.stringify([this._layoutPart]);
        } else {
            return JSON.stringify(null);
        }
    }

    protected setControls(controls: IClientsideControlBaseData[]): void {

        if (controls && controls.length) {

            for (let i = 0; i < controls.length; i++) {

                // if no control type is present this is a column which we give type 0 to let us process it
                const controlType = hOP(controls[i], "controlType") ? controls[i].controlType : 0;

                switch (controlType) {

                    case 0:
                        // empty canvas column or page settings
                        if (hOP(controls[i], "pageSettingsSlice")) {
                            this._pageSettings = <IClientsidePageSettingsSlice>controls[i];
                        } else {
                            // we have an empty column
                            this.mergeColumnToTree(new CanvasColumn(<IClientsidePageColumnData>controls[i]));
                        }
                        break;
                    case 3:
                        const part = new ClientsideWebpart(<IClientsideWebPartData>controls[i]);
                        this.mergePartToTree(part, part.data.position);
                        break;
                    case 4:
                        const textData = <IClientsideTextData>controls[i];
                        const text = new ClientsideText(textData.innerHTML, textData);
                        this.mergePartToTree(text, text.data.position);
                        break;
                }
            }

            reindex(this.sections);
        }
    }

    protected getControls(): IClientsideControlBaseData[] {

        // reindex things
        reindex(this.sections);

        // rollup the control changes
        const canvasData: any[] = [];

        this.sections.forEach(section => {
            section.columns.forEach(column => {
                if (column.controls.length < 1) {
                    // empty column
                    canvasData.push({
                        displayMode: column.data.displayMode,
                        emphasis: this.getEmphasisObj(section.emphasis),
                        position: column.data.position,
                    });
                } else {
                    column.controls.forEach(control => {
                        control.data.emphasis = this.getEmphasisObj(section.emphasis);
                        canvasData.push(control.data);
                    });
                }
            });
        });

        canvasData.push(this._pageSettings);

        return canvasData;
    }

    private getEmphasisObj(value: 0 | 1 | 2 | 3): IClientControlEmphasis {
        if (value < 1 || value > 3) {
            return {};
        }

        return { zoneEmphasis: value };
    }

    private async promoteNewsImpl(method: string): Promise<boolean> {

        if (this.json.Id === null) {
            throw Error("The id for this page is null.");
        }

        // per bug #858 if we promote before we have ever published the last published date will
        // forever not be updated correctly in the modern news webpart. Because this will affect very
        // few folks we just go ahead and publish for them here as that is likely what they intended.
        if (stringIsNullOrEmpty(this.json.VersionInfo.LastVersionCreatedBy)) {
            const lastPubData = new Date(this.json.VersionInfo.LastVersionCreated);
            // no modern page should reasonable be published before the year 2000 :)
            if (lastPubData.getFullYear() < 2000) {
                await this.save(true);
            }
        }

        return await spPost(initFrom(this, `_api/sitepages/pages(${this.json.Id})/${method}`), body(metadata("SP.Publishing.SitePage")));
    }

    /**
     * Merges the control into the tree of sections and columns for this page
     * 
     * @param control The control to merge
     */
    private mergePartToTree(control: any, positionData: IPosition): void {

        let column: CanvasColumn = null;
        let sectionFactor: CanvasColumnFactor = 12;
        let sectionIndex = 0;
        let zoneIndex = 0;
        let layoutIndex = 1;

        // handle case where we don't have position data (shouldn't happen?)
        if (positionData) {
            if (hOP(positionData, "zoneIndex")) {
                zoneIndex = positionData.zoneIndex;
            }
            if (hOP(positionData, "sectionIndex")) {
                sectionIndex = positionData.sectionIndex;
            }
            if (hOP(positionData, "sectionFactor")) {
                sectionFactor = positionData.sectionFactor;
            }
            if (hOP(positionData, "layoutIndex")) {
                layoutIndex = positionData.layoutIndex;
            }
        }

        const section = this.getOrCreateSection(zoneIndex, layoutIndex, control.data.emphasis.zoneEmphasis || 0);

        const columns = section.columns.filter(c => c.order === sectionIndex);
        if (columns.length < 1) {
            column = section.addColumn(sectionFactor, layoutIndex);
        } else {
            column = columns[0];
        }

        control.column = column;
        column.addControl(control);
    }

    /**
     * Merges the supplied column into the tree
     * 
     * @param column Column to merge
     * @param position The position data for the column
     */
    private mergeColumnToTree(column: CanvasColumn): void {

        const order = hOP(column.data, "position") && hOP(column.data.position, "zoneIndex") ? column.data.position.zoneIndex : 0;
        const layoutIndex = hOP(column.data, "position") && hOP(column.data.position, "layoutIndex") ? column.data.position.layoutIndex : 1;
        const section = this.getOrCreateSection(order, layoutIndex, column.data.emphasis.zoneEmphasis || 0);
        column.section = section;
        section.columns.push(column);
    }

    /**
     * Handle the logic to get or create a section based on the supplied order and layoutIndex
     * 
     * @param order Section order
     * @param layoutIndex Layout Index (1 === normal, 2 === vertical section)
     * @param emphasis The section emphasis
     */
    private getOrCreateSection(order: number, layoutIndex: number, emphasis: 0 | 1 | 2 | 3): CanvasSection {

        let section: CanvasSection = null;
        const sections = this.sections.filter(s => s.order === order && s.layoutIndex === layoutIndex);

        if (sections.length < 1) {
            section = layoutIndex === 2 ? this.addVerticalSection() : this.addSection();
            section.order = order;
            section.emphasis = emphasis;
        } else {
            section = sections[0];
        }

        return section;
    }
}
export interface IClientsidePage extends _ClientsidePage { }

/**
 * Invokable factory for IClientSidePage instances
 */
const ClientsidePage = (
    baseUrl: string | ISharePointQueryable,
    path?: string,
    json?: Partial<IPageData>,
    noInit = false,
    sections: CanvasSection[] = [],
    commentsDisabled = false): IClientsidePage => {

    return invokableFactory<IClientsidePage>(_ClientsidePage)(baseUrl, path, json, noInit, sections, commentsDisabled);
};

/**
 * Loads a client side page from the supplied IFile instance
 * 
 * @param file Source IFile instance
 */
export const ClientsidePageFromFile = async (file: IFile): Promise<IClientsidePage> => {

    const item = await file.getItem<{ Id: number }>();
    const page = ClientsidePage(extractWebUrl(file.toUrl()), "", { Id: item.Id }, true);
    return page.configureFrom(file).load();
};

/**
 * Creates a new client side page
 * 
 * @param web The web or list
 * @param pageName The name of the page (filename)
 * @param title The page's title
 * @param PageLayoutType Layout to use when creating the page
 */
export const CreateClientsidePage = async (web: IWeb, pageName: string, title: string, PageLayoutType: ClientsidePageLayoutType = "Article"): Promise<IClientsidePage> => {

    // patched because previously we used the full page name with the .aspx at the end
    // this allows folk's existing code to work after the re-write to the new API
    pageName = pageName.replace(/\.aspx$/i, "");

    // initialize the page, at this point a checked-out page with a junk filename will be created.
    const pageInitData: IPageData = await spPost(initFrom(web, "_api/sitepages/pages"), body(Object.assign(metadata("SP.Publishing.SitePage"), { PageLayoutType })));

    // now we can init our page with the save data
    const newPage = ClientsidePage(web, "", pageInitData);
    newPage.title = pageName;
    await newPage.save(false);
    newPage.title = title;
    return newPage;
};

export class CanvasSection {

    /**
     * Used to track this object inside the collection at runtime
     */
    private _memId: string;

    private _order: number;
    private _layoutIndex: number;

    constructor(protected page: IClientsidePage, order: number, layoutIndex: number, public columns: CanvasColumn[] = [], private _emphasis: 0 | 1 | 2 | 3 = 0) {
        this._memId = getGUID();
        this._order = order;
        this._layoutIndex = layoutIndex;
    }

    public get order(): number {
        return this._order;
    }

    public set order(value: number) {
        this._order = value;
        for (let i = 0; i < this.columns.length; i++) {
            this.columns[i].data.position.zoneIndex = value;
        }
    }

    public get layoutIndex(): number {
        return this._layoutIndex;
    }

    public set layoutIndex(value: number) {
        this._layoutIndex = value;
        for (let i = 0; i < this.columns.length; i++) {
            this.columns[i].data.position.layoutIndex = value;
        }
    }

    /**
     * Default column (this.columns[0]) for this section
     */
    public get defaultColumn(): CanvasColumn {

        if (this.columns.length < 1) {
            this.addColumn(12);
        }

        return this.columns[0];
    }

    /**
     * Adds a new column to this section
     */
    public addColumn(factor: CanvasColumnFactor, layoutIndex = 1): CanvasColumn {
        const column = new CanvasColumn();
        column.section = this;
        column.data.position.zoneIndex = this.order;
        column.data.position.layoutIndex = layoutIndex;
        column.data.position.sectionFactor = factor;
        column.order = getNextOrder(this.columns);
        this.columns.push(column);
        return column;
    }

    /**
     * Adds a control to the default column for this section
     *
     * @param control Control to add to the default column
     */
    public addControl(control: ColumnControl<any>): this {
        this.defaultColumn.addControl(control);
        return this;
    }

    public get emphasis(): 0 | 1 | 2 | 3 {
        return this._emphasis;
    }

    public set emphasis(value: 0 | 1 | 2 | 3) {
        this._emphasis = value;
    }

    /**
     * Removes this section and all contained columns and controls from the collection
     */
    public remove(): void {
        this.page.sections = this.page.sections.filter(section => section._memId !== this._memId);
        reindex(this.page.sections);
    }
}

export class CanvasColumn {

    public static Default: IClientsidePageColumnData = {
        controlType: 0,
        displayMode: 2,
        emphasis: {},
        position: {
            layoutIndex: 1,
            sectionFactor: 12,
            sectionIndex: 1,
            zoneIndex: 1,
        },
    };

    private _section: CanvasSection | null;
    private _memId: string;

    constructor(protected json: IClientsidePageColumnData = JSON.parse(JSON.stringify(CanvasColumn.Default)), public controls: ColumnControl<any>[] = []) {
        this._section = null;
        this._memId = getGUID();
    }

    public get data(): IClientsidePageColumnData {
        return this.json;
    }

    public get section(): CanvasSection {
        return this._section;
    }

    public set section(section: CanvasSection) {
        this._section = section;
    }

    public get order(): number {
        return this.data.position.sectionIndex;
    }

    public set order(value: number) {
        this.data.position.sectionIndex = value;
        for (let i = 0; i < this.controls.length; i++) {
            this.controls[i].data.position.zoneIndex = this.data.position.zoneIndex;
            this.controls[i].data.position.layoutIndex = this.data.position.layoutIndex;
            this.controls[i].data.position.sectionIndex = value;
        }
    }

    public get factor(): CanvasColumnFactor {
        return this.data.position.sectionFactor;
    }

    public set factor(value: CanvasColumnFactor) {
        this.data.position.sectionFactor = value;
    }

    public addControl(control: ColumnControl<any>): this {
        control.column = this;
        this.controls.push(control);
        return this;
    }

    public getControl<T extends ColumnControl<any>>(index: number): T {
        return <T>this.controls[index];
    }

    public remove(): void {
        this.section.columns = this.section.columns.filter(column => column._memId !== this._memId);
        reindex(this.section.columns);
    }
}

export abstract class ColumnControl<T extends ICanvasControlBaseData> {

    private _column: CanvasColumn | null;

    constructor(protected json: T) { }

    public abstract get order(): number;
    public abstract set order(value: number);

    public get id(): string {
        return this.json.id;
    }

    public get data(): T {
        return this.json;
    }

    public get column(): CanvasColumn | null {
        return this._column;
    }

    public set column(value: CanvasColumn) {
        this._column = value;
        this.onColumnChange(this._column);
    }

    public remove(): void {
        this.column.controls = this.column.controls.filter(control => control.id !== this.id);
        reindex(this.column.controls);
    }

    protected setData(data: T) {
        this.json = data;
    }

    protected abstract onColumnChange(col: CanvasColumn): void;
}

export class ClientsideText extends ColumnControl<IClientsideTextData> {

    public static Default: IClientsideTextData = {
        addedFromPersistedData: false,
        anchorComponentId: "",
        controlType: 4,
        displayMode: 2,
        editorType: "CKEditor",
        emphasis: {},
        id: "",
        innerHTML: "",
        position: {
            controlIndex: 1,
            layoutIndex: 1,
            sectionFactor: 12,
            sectionIndex: 1,
            zoneIndex: 1,
        },
    };

    constructor(text: string, json: IClientsideTextData = JSON.parse(JSON.stringify(ClientsideText.Default))) {
        if (stringIsNullOrEmpty(json.id)) {
            json.id = getGUID();
            json.anchorComponentId = json.id;
        }
        super(json);

        this.text = text;
    }

    public get text(): string {
        return this.data.innerHTML;
    }

    public set text(value: string) {
        if (!value.startsWith("<p>")) {
            value = `<p>${value}</p>`;
        }
        this.data.innerHTML = value;
    }

    public get order(): number {
        return this.data.position.controlIndex;
    }

    public set order(value: number) {
        this.data.position.controlIndex = value;
    }

    protected onColumnChange(col: CanvasColumn): void {
        this.data.position.sectionFactor = col.factor;
        this.data.position.controlIndex = getNextOrder(col.controls);
        this.data.position.zoneIndex = col.data.position.zoneIndex;
        this.data.position.sectionIndex = col.order;
        this.data.position.layoutIndex = col.data.position.layoutIndex;
    }
}

export class ClientsideWebpart extends ColumnControl<IClientsideWebPartData> {

    public static Default: IClientsideWebPartData = {
        addedFromPersistedData: false,
        controlType: 3,
        displayMode: 2,
        emphasis: {},
        id: null,
        position: {
            controlIndex: 1,
            layoutIndex: 1,
            sectionFactor: 12,
            sectionIndex: 1,
            zoneIndex: 1,
        },
        reservedHeight: 500,
        reservedWidth: 500,
        webPartData: null,
        webPartId: null,
    };

    constructor(json: IClientsideWebPartData = JSON.parse(JSON.stringify(ClientsideWebpart.Default))) {
        super(json);
    }

    public static fromComponentDef(definition: IClientsidePageComponent): ClientsideWebpart {
        const part = new ClientsideWebpart();
        part.import(definition);
        return part;
    }

    public get title(): string {
        return this.data.webPartData.title;
    }

    public set title(value: string) {
        this.data.webPartData.title = value;
    }

    public get description(): string {
        return this.data.webPartData.description;
    }

    public set description(value: string) {
        this.data.webPartData.description = value;
    }

    public get order(): number {
        return this.data.position.controlIndex;
    }

    public set order(value: number) {
        this.data.position.controlIndex = value;
    }

    public get height(): number {
        return this.data.reservedHeight;
    }

    public set height(value: number) {
        this.data.reservedHeight = value;
    }

    public get width(): number {
        return this.data.reservedWidth;
    }

    public set width(value: number) {
        this.data.reservedWidth = value;
    }

    public get dataVersion(): string {
        return this.data.webPartData.dataVersion;
    }

    public set dataVersion(value: string) {
        this.data.webPartData.dataVersion = value;
    }

    public setProperties<T = any>(properties: T): this {
        this.data.webPartData.properties = assign(this.data.webPartData.properties, properties);
        return this;
    }

    public getProperties<T = any>(): T {
        return <T>this.data.webPartData.properties;
    }

    protected onColumnChange(col: CanvasColumn): void {
        this.data.position.sectionFactor = col.factor;
        this.data.position.controlIndex = getNextOrder(col.controls);
        this.data.position.zoneIndex = col.data.position.zoneIndex;
        this.data.position.sectionIndex = col.data.position.sectionIndex;
        this.data.position.layoutIndex = col.data.position.layoutIndex;
    }

    protected import(component: IClientsidePageComponent): void {

        const id = getGUID();
        const componendId = component.Id.replace(/^\{|\}$/g, "").toLowerCase();
        const manifest: IClientSidePageComponentManifest = JSON.parse(component.Manifest);
        const preconfiguredEntries = manifest.preconfiguredEntries[0];

        this.setData(Object.assign({}, this.data, <IClientsideWebPartData>{
            id,
            webPartData: {
                dataVersion: "1.0",
                description: preconfiguredEntries.description.default,
                id: componendId,
                instanceId: id,
                properties: preconfiguredEntries.properties,
                title: preconfiguredEntries.title.default,
            },
            webPartId: componendId,
        }));
    }
}

export interface IPageData {
    readonly "odata.metadata": string;
    readonly "odata.type": "SP.Publishing.SitePage";
    readonly "odata.id": string;
    readonly "odata.editLink": string;
    AbsoluteUrl: string;
    AuthorByline: string[] | null;
    BannerImageUrl: string;
    ContentTypeId: null | string;
    Description: string;
    DoesUserHaveEditPermission: boolean;
    FileName: string;
    readonly FirstPublished: string;
    readonly Id: number;
    IsPageCheckedOutToCurrentUser: boolean;
    IsWebWelcomePage: boolean;
    readonly Modified: string;
    PageLayoutType: ClientsidePageLayoutType;
    Path: {
        DecodedUrl: string;
    };
    PromotedState: number;
    Title: string;
    TopicHeader: null | string;
    readonly UniqueId: string;
    Url: string;
    readonly Version: string;
    readonly VersionInfo: {
        readonly LastVersionCreated: string;
        readonly LastVersionCreatedBy: string;
    };
    AlternativeUrlMap: string;
    CanvasContent1: string;
    LayoutWebpartsContent: string;
}

/**
 * Client side webpart object (retrieved via the _api/web/GetClientSideWebParts REST call)
 */
export interface IClientsidePageComponent {
    /**
     * Component type for client side webpart object
     */
    ComponentType: number;
    /**
     * Id for client side webpart object
     */
    Id: string;
    /**
     * Manifest for client side webpart object
     */
    Manifest: string;
    /**
     * Manifest type for client side webpart object
     */
    ManifestType: number;
    /**
     * Name for client side webpart object
     */
    Name: string;
    /**
     * Status for client side webpart object
     */
    Status: number;
}

interface IClientSidePageComponentManifest {
    alias: string;
    componentType: "WebPart" | "" | null;
    disabledOnClassicSharepoint: boolean;
    hiddenFromToolbox: boolean;
    id: string;
    imageLinkPropertyNames: any;
    isInternal: boolean;
    linkPropertyNames: boolean;
    loaderConfig: any;
    manifestVersion: number;
    preconfiguredEntries: {
        description: { default: string };
        group: { default: string };
        groupId: string;
        iconImageUrl: string;
        officeFabricIconFontName: string;
        properties: ITypedHash<any>;
        title: { default: string };

    }[];
    preloadComponents: any | null;
    requiredCapabilities: any | null;
    searchablePropertyNames: any | null;
    supportsFullBleed: boolean;
    version: string;
}

export interface IClientsideControlBaseData {
    controlType: number;
}

export interface ICanvasControlBaseData extends IClientsideControlBaseData {
    id: string;
    emphasis: IClientControlEmphasis;
    displayMode: number;
}

export interface IClientsidePageSettingsSlice extends IClientsideControlBaseData {
    pageSettingsSlice: {
        "isDefaultDescription": boolean;
        "isDefaultThumbnail": boolean;
    };
}

export interface IClientsidePageColumnData extends IClientsideControlBaseData {
    controlType: 0;
    displayMode: number;
    emphasis: IClientControlEmphasis;
    position: IPosition;
}

interface IPosition {
    zoneIndex: number;
    sectionIndex: number;
    controlIndex?: number;
    sectionFactor?: CanvasColumnFactor;
    layoutIndex: number;
}

export interface IClientsideTextData extends ICanvasControlBaseData {
    controlType: 4;
    position: IPosition;
    anchorComponentId: string;
    editorType: "CKEditor";
    addedFromPersistedData: boolean;
    innerHTML: string;
}

export interface IClientsideWebPartData<PropertiesType = any> extends ICanvasControlBaseData {
    controlType: 3;
    position: IPosition;
    webPartId: string;
    reservedHeight: number;
    reservedWidth: number;
    addedFromPersistedData: boolean;
    webPartData: {
        id: string;
        instanceId: string;
        title: string;
        description: string;
        serverProcessedContent?: {
            "htmlStrings": ITypedHash<string>;
            "searchablePlainTexts": ITypedHash<string>;
            "imageSources": ITypedHash<string>;
            "links": ITypedHash<string>;
        };
        dataVersion: string;
        properties: PropertiesType;
    };
}

export interface IClientControlEmphasis {
    zoneEmphasis?: 0 | 1 | 2 | 3;
}

export type LayoutType = "FullWidthImage" | "NoImage" | "ColorBlock" | "CutInShape";
export type TextAlignment = "Left" | "Center";

interface ILayoutPartsContent {
    id: string;
    instanceId: string;
    title: string;
    description: string;
    serverProcessedContent: {
        htmlStrings: ITypedHash<string>;
        searchablePlainTexts: ITypedHash<string>;
        imageSources: ITypedHash<string>;
        links: ITypedHash<string>;
        customMetadata?: {
            imageSource?: {
                siteId: string;
                webId: string;
                listId: string;
                uniqueId: string;
            },
        }
    };
    dataVersion: string;
    properties: {
        title: string;
        imageSourceType?: number;
        layoutType: LayoutType;
        textAlignment: TextAlignment;
        showTopicHeader: boolean;
        showPublishDate: boolean;
        topicHeader: string;
        authors: {
            id: string,
            email: string;
            upn: string;
            name: string;
            role: string;
        }[];
        webId?: string;
        siteId?: string;
        listId?: string;
        uniqueId?: string;
        translateX?: number;
        translateY?: number;
        altText?: string;
    };
}
