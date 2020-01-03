# @pnp/sp/clientside-pages

The clientside pages module allows you to created, edit, and delete modern SharePoint pages. There are methods to update the page settings and add/remove client-side webparts.

[![](https://img.shields.io/badge/Selective%20Imports-informational.svg)](../concepts/selective-imports.md)

| Scenario    | Import Statement                                                                                                                                                                                                |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Selective 1 | import { sp } from "@pnp/sp";<br />import { ClientsidePageFromFile, ClientsideText, ClientsideWebpartPropertyTypes, CreateClientsidePage, ClientsideWebpart, IClientsidePage } from "@pnp/sp/clientside-pages"; |
| Selective 2 | import { sp } from "@pnp/sp";<br />import "@pnp/sp/clientside-pages";                                                                                                                                           |
| Preset: All | import { sp, ClientsidePageFromFile, ClientsideText, ClientsideWebpartPropertyTypes, CreateClientsidePage, ClientsideWebpart, IClientsidePage } from "@pnp/sp/presents/all";                                    |

## Create a new Page

You can create a new clientside page in several ways, all are equivalent.

### Create using IWeb.addClientSidePage

```TypeScript
import { sp } from "@pnp/sp";
import "@pnp/sp/webs";
import "@pnp/sp/clientside-pages/web";

const page = await sp.web.addClientsidePage("mypage1");

// ... other operations on the page as outlined below

// the page is initially not published, you must publish it so it appears for others users
await page.save();

// include title and page layout
const page2 = await sp.web.addClientsidePage("mypage", "My Page Title", "Article");

// you must publish the new page
await page2.save();
```

### Create using CreateClientsidePage method

```TypeScript
import { sp } from "@pnp/sp";
import "@pnp/sp/webs";
import { Web } from "@pnp/sp/webs";
import { CreateClientsidePage } from "@pnp/sp/clientside-pages";

const page1 = await CreateClientsidePage(sp.web, "mypage2", "My Page Title");

// you must publish the new page
await page1.save(true);

// specify the page layout type parameter
const page2 = await CreateClientsidePage(sp.web, "mypage3", "My Page Title", "Article");

// you must publish the new page
await page2.save();

// use the web factory to create a page in a specific web
const page3 = await CreateClientsidePage(Web("https://{absolute web url}"), "mypage4", "My Page Title");

// you must publish the new page
await page3.save();
```

## Load Pages

There a a few ways to load pages, each of which results in an IClientSidePage instance being returned.

### Load using IWeb.loadClientSidePage

This method takes a _server relative_ path to the page to load.

```TypeScript
import { sp } from "@pnp/sp";
import "@pnp/sp/webs";
import { Web } from "@pnp/sp/webs";
import "@pnp/sp/clientside-pages/web";

// use from the sp.web fluent chain
const page = await sp.web.loadClientsidePage("/sites/dev/sitepages/mypage3.aspx");

// use the web factory to target a specific web

const page2 = await Web("https://{absolute web url}").loadClientsidePage("/sites/dev/sitepages/mypage3.aspx");
```

### Load using ClientsidePageFromFile

This method takes an IFile instance and loads an IClientsidePage instance.

```TypeScript
import { sp } from "@pnp/sp";
import { ClientsidePageFromFile } from "@pnp/sp/clientside-pages";
import "@pnp/sp/webs";
import "@pnp/sp/files/web";

const page = await ClientsidePageFromFile(sp.web.getFileByServerRelativePath("/sites/dev/sitepages/mypage3.aspx"));
```

## Edit Sections and Columns

Clientside pages are made up of sections, columns, and controls. Sections contain columns which contain controls. There are methods to operate on these within the page, in addition to the standard array methods available in JavaScript. These samples use a variable `page` that is understood to be an IClientsidePage instance which is either created or loaded as outlined in previous sections.

```TypeScript
// our page instance
const page: IClientsidePage;

// add two columns with factor 6 - this is a two column layout as the total factor in a section should add up to 12
const section1 = page.addSection();
section1.addColumn(6);
section1.addColumn(6);

// create a three column layout in a new section
const section2 = page.addSection();
section2.addColumn(4);
section2.addColumn(4);
section2.addColumn(4);

// publish our changes
await page.save();
```

### Manipulate Sections and Columns

```TypeScript
// our page instance
const page: IClientsidePage;

// drop all the columns in this section
// this will also DELETE all controls contained in the columns
page.sections[1].columns.length = 0;

// create a new column layout
page.sections[1].addColumn(4);
page.sections[1].addColumn(8);

// publish our changes
await page.save();
```

### Vertical Section

The vertical section, if on the page is stored within the sections array, but you can access it slightly differently to make things easier.

```TypeScript
// our page instance
const page: IClientsidePage;

// add or get a vertical section (handles case where section already exists)
const vertSection = page.addVerticalSection();

// if you know or want to test if a vertical section is present:
if (page.hasVerticalSection) {

    // access the vertical section (this method will NOT create the section if it does not exist)
    page.verticalSection.addControl(new ClientsideText("hello"));
} else {
    
    const vertSection = page.addVerticalSection();
    section.addControl(new ClientsideText("hello"));
}
```

### Reorder Sections

```TypeScript
// our page instance
const page: IClientsidePage;

// swap the order of two sections
// this will preserve the controls within the columns
page.sections = [page.sections[1], page.sections[0]];

// publish our changes
await page.save();
```

### Reorder Columns

The sections and columns are arrays, so normal array operations work as expected

```TypeScript
// our page instance
const page: IClientsidePage;

// swap the order of two columns
// this will preserve the controls within the columns
page.sections[1].columns = [page.sections[1].columns[1], page.sections[1].columns[0]];

// publish our changes
await page.save();
```

## Clientside Controls

Once you have your sections and columns defined you will want to add/edit controls within those columns.

### Add Text Content

```TypeScript
import { ClientsideText } from "@pnp/sp/clientside-pages";

// our page instance
const page: IClientsidePage;

page.addSection().addControl(new ClientsideText("@pnp/sp is a great library!"));

await page.save();
```

### Add Controls

Adding controls involves loading the available clientside part definitions from the server or creating a text part.

```TypeScript
import { sp } from "@pnp/sp";
import "@pnp/sp/webs";
import "@pnp/sp/clientside-pages/web";
import { ClientsideWebpart } from "@pnp/sp/clientside-pages";

// this will be a ClientSidePageComponent array
// this can be cached on the client in production scenarios
const partDefs = await sp.web.getClientsideWebParts();

// find the definition we want, here by id
const partDef = partDefs.filter(c => c.Id === "490d7c76-1824-45b2-9de3-676421c997fa");

// optionally ensure you found the def
if (partDef.length < 1) {
    // we didn't find it so we throw an error
    throw new Error("Could not find the web part");
}

// create a ClientWebPart instance from the definition
const part = ClientsideWebpart.fromComponentDef(partDef[0]);

// set the properties on the web part. Here for the embed web part we only have to supply an embedCode - in this case a youtube video.
// the structure of the properties varies for each webpart and each version of a webpart, so you will need to ensure you are setting
// the properties correctly
part.setProperties<{ embedCode: string }>({
    embedCode: "https://www.youtube.com/watch?v=IWQFZ7Lx-rg",
});

// we add that part to a new section
page.addSection().addControl(part);

await page.save();
```

## Page Operations

There are other operation you can perform on a page in addition to manipulating the content.

### pageLayout

You can get and set the page layout. Changing the layout after page creating may have side effects and should be done cautiously.

```TypeScript
// our page instance
const page: IClientsidePage;

// get the current value
const value = page.pageLayout;

// set the value
page.pageLayout = "Article";
await page.save();
```

### bannerImageUrl

```TypeScript
// our page instance
const page: IClientsidePage;

// get the current value
const value = page.bannerImageUrl;

// set the value
page.bannerImageUrl = "https://absolute/path/to/your/image/in/your/web/image.png";
await page.save();
```

### topicHeader

```TypeScript
// our page instance
const page: IClientsidePage;

// get the current value
const value = page.topicHeader;

// set the value
page.topicHeader = "My cool header!";
await page.save();

// clear the topic header and hide it
page.topicHeader = "";
await page.save();
```

### title

```TypeScript
// our page instance
const page: IClientsidePage;

// get the current value
const value = page.title;

// set the value
page.title = "My page title";
await page.save();
```

### layoutType

Sets the page layout type. The valid values are: "FullWidthImage", "NoImage", "ColorBlock", "CutInShape"

```TypeScript
// our page instance
const page: IClientsidePage;

// get the current value
const value = page.layoutType;

// set the value
page.layoutType = "ColorBlock";
await page.save();
```

### headerTextAlignment

Sets the header text alignment to one of "Left" or "Center"

```TypeScript
// our page instance
const page: IClientsidePage;

// get the current value
const value = page.headerTextAlignment;

// set the value
page.headerTextAlignment = "Center";
await page.save();
```

### showTopicHeader

Sets if the topic header is displayed on a page.

```TypeScript
// our page instance
const page: IClientsidePage;

// get the current value
const value = page.showTopicHeader;

// show the header
page.showTopicHeader = true;
await page.save();

// hide the header
page.showTopicHeader = false;
await page.save();
```

### showPublishDate

Sets if the publish date is displayed on a page.

```TypeScript
// our page instance
const page: IClientsidePage;

// get the current value
const value = page.showPublishDate;

// show the date
page.showPublishDate = true;
await page.save();

// hide the date
page.showPublishDate = false;
await page.save();
```

### load

Loads the page from the server, will overwrite any local unsaved changes.

```TypeScript
// our page instance
const page: IClientsidePage;

await page.load();
```

### save

Saves any changes to the page, optionally keeping them in draft state

```TypeScript
// our page instance
const page: IClientsidePage;

// changes are published
await page.save();

// changes remain in draft
await page.save(false);
```

### discardPageCheckout

Discards any current checkout of the page by the current user.

```TypeScript
// our page instance
const page: IClientsidePage;

await page.discardPageCheckout();
```
    
### promoteToNews

Promotes the page as a news article

```TypeScript
// our page instance
const page: IClientsidePage;

await page.promoteToNews();
```

### enableComments & disableComments

Used to control the availability of comments on a page

```TypeScript
// our page instance
const page: IClientsidePage;

// turn on comments
await page.enableComments();

// turn off comments
await page.disableComments();
```

### findControlById

Finds a control within the page by id.

```TypeScript
import { ClientsideText } from "@pnp/sp/clientside-pages";

// our page instance
const page: IClientsidePage;

const control = page.findControlById("06d4cdf6-bce6-4200-8b93-667a1b0a6c9d");

// you can also type the control
const control = page.findControlById<ClientsideText>("06d4cdf6-bce6-4200-8b93-667a1b0a6c9d");
```

### findControl

Finds a control within the page using the supplied delegate. Can also be used to iterate all controls in the page.

```TypeScript
// our page instance
const page: IClientsidePage;

// find the first control whose order is 9
const control = page.findControl((c) => c.order === 9);

// iterate all the controls and output the id to the console
page.findControl((c) => {
    console.log(c.id);
    return false;
});
```

### like & unlike

Updates the page's like value for the current user.

```TypeScript
// our page instance
const page: IClientsidePage;

// like this page
await page.like();

// unlike this page
await page.unlike();
```

### getLikedByInformation

Gets the likes information for this page.

```TypeScript
// our page instance
const page: IClientsidePage;

const info = await page.getLikedByInformation();
```

### copy

Creates a copy of the page, including all controls.

```TypeScript
import { sp } from "@pnp/sp";
import "@pnp/sp/webs";

// our page instance
const page: IClientsidePage;

// creates a published copy of the page
const pageCopy = await page.copy(sp.web, "newpagename", "New Page Title");

// creates a draft (unpublished) copy of the page
const pageCopy2 = await page.copy(sp.web, "newpagename", "New Page Title", false);

// edits to pageCopy2

// publish the page
pageCopy2.save();
```

### setBannerImage

Sets the banner image url and optionally additional properties. Similar to setting the bannerImageUrl property, however allows you to set additional properties if needed. If you do not need to set the additional properties they are equivelent.

```TypeScript
// our page instance
const page: IClientsidePage;

page.setBannerImage("https://absolute/path/to/image.png");

// save the changes
page.save();

// set additional props
page.setBannerImage("https://absolute/path/to/image.png", {
    altText: "Image description",
    imageSourceType: 2,
    translateX: 30,
    translateY: 1234,
});

// save the changes
page.save();
```
