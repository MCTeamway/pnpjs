# @pnp/sp/views

Views define the columns, ordering, and other details we see when we look at a list. You can have multiple views for a list, including private views - and one default view.

## IViews

[![](https://img.shields.io/badge/Invokable-informational.svg)](../concepts/invokable.md) [![](https://img.shields.io/badge/Selective%20Imports-informational.svg)](../concepts/selective-imports.md)

|Scenario|Import Statement|
|--|--|
|Selective 1|import { sp } from "@pnp/sp";<br />import { Views, IViews } from "@pnp/sp/views";|
|Selective 2|import { sp } from "@pnp/sp";<br />import "@pnp/sp/views";|
|Preset: All|import { sp, Views, IViews } from "@pnp/sp/presents/all";|

### Get views in a list

```TypeScript
import { sp } from "@pnp/sp";
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/views";

const list = sp.web.lists.getByTitle("My List");

// get all the views and their properties
const views1 = await list.views();

// you can use odata select operations to get just a set a fields
const views2 = await list.views.select("Id", "Title")();

// get the top three views
const views3 = await list.views.top(3)();
```

### Add a View

```TypeScript
import { sp } from "@pnp/sp";
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/views";

const list = sp.web.lists.getByTitle("My List");

// create a new view with default fields and properties
const result = await list.views.add("My New View");

// create a new view with specific properties
const result2 = await list.views.add("My New View 2", false, {
    RowLimit: 10,
    ViewQuery: "<OrderBy><FieldRef Name='Modified' Ascending='False' /></OrderBy>",
});

// manipulate the view's fields
await result2.view.fields.removeAll();

await Promise.all([
    result2.view.fields.add("Title"),
    result2.view.fields.add("Modified"),
]);
```

## IView

### Get a View's Information

```TypeScript
import { sp } from "@pnp/sp";
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/views";

const list = sp.web.lists.getByTitle("My List");

const result = await list.views.getById("{GUID view id}")();

const result2 = await list.views.getByTitle("My View")();

const result3 = await list.views.getByTitle("My View").select("Id", "Title")();

const result4 = await list.defaultView();

const result5 = await list.getView("{GUID view id}")();
```

### fields

```TypeScript
import { sp } from "@pnp/sp";
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/views";

const list = sp.web.lists.getByTitle("My List");

const result = await list.views.getById("{GUID view id}").fields();
```

### update

```TypeScript
import { sp } from "@pnp/sp";
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/views";

const list = sp.web.lists.getByTitle("My List");

const result = await list.views.getById("{GUID view id}").update({
    RowLimit: 20,
});
```

### renderAsHtml

```TypeScript
import { sp } from "@pnp/sp";
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/views";

const result = await sp.web.lists.getByTitle("My List").views.getById("{GUID view id}").renderAsHtml();
```

### setViewXml

```TypeScript
import { sp } from "@pnp/sp";
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/views";

const viewXml = "...";

await sp.web.lists.getByTitle("My List").views.getById("{GUID view id}").setViewXml(viewXml);
```

### delete

```TypeScript
import { sp } from "@pnp/sp";
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/views";

const viewXml = "...";

await sp.web.lists.getByTitle("My List").views.getById("{GUID view id}").delete();
```

## ViewFields

### getSchemaXml

```TypeScript
import { sp } from "@pnp/sp";
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/views";

const xml = await sp.web.lists.getByTitle("My List").defaultView.fields.getSchemaXml();
```

### add

```TypeScript
import { sp } from "@pnp/sp";
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/views";

await sp.web.lists.getByTitle("My List").defaultView.fields.add("Created");
```

### move

```TypeScript
import { sp } from "@pnp/sp";
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/views";

await sp.web.lists.getByTitle("My List").defaultView.fields.move("Created", 0);
```

### remove

```TypeScript
import { sp } from "@pnp/sp";
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/views";

await sp.web.lists.getByTitle("My List").defaultView.fields.remove("Created");
```

### remove

```TypeScript
import { sp } from "@pnp/sp";
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/views";

await sp.web.lists.getByTitle("My List").defaultView.fields.removeAll();
```
