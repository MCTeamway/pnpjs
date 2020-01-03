# @pnp/sp/site-scripts

[![](https://img.shields.io/badge/Selective%20Imports-informational.svg)](../concepts/selective-imports.md)

|Scenario|Import Statement|
|--|--|
|Selective 1|import { sp } from "@pnp/sp";<br />import "@pnp/sp/site-scripts";|
|Preset: All|import { sp } from "@pnp/sp/presets/all";|

## Create a new site script

```TypeScript
import { sp } from "@pnp/sp";
import "@pnp/sp/site-designs";

const sitescriptContent = {
    "$schema": "schema.json",
    "actions": [
        {
            "themeName": "Theme Name 123",
            "verb": "applyTheme",
        },
    ],
    "bindata": {},
    "version": 1,
};

const siteScript = await sp.siteScripts.createSiteScript("Title", "description", sitescriptContent);
    
console.log(siteScript.Title);
```

## Retrieval

```TypeScript
import { sp } from "@pnp/sp";
import "@pnp/sp/site-designs";

// Retrieving all site scripts
const allSiteScripts = await sp.siteScripts.getSiteScripts();
console.log(allSiteScripts.length > 0 ? allSiteScripts[0].Title : "");

// Retrieving a single site script by Id
const siteScript = await sp.siteScripts.getSiteScriptMetadata("884ed56b-1aab-4653-95cf-4be0bfa5ef0a");
console.log(siteScript.Title);
```

## Update and delete

```TypeScript
import { sp } from "@pnp/sp";
import "@pnp/sp/site-designs";

// Update
const updatedSiteScript = await sp.siteScripts.updateSiteScript({ Id: "884ed56b-1aab-4653-95cf-4be0bfa5ef0a", Title: "New Title" });
console.log(updatedSiteScript.Title);

// Delete
await sp.siteScripts.deleteSiteScript("884ed56b-1aab-4653-95cf-4be0bfa5ef0a");
```

## Get site script from a list

```TypeScript
import { sp } from "@pnp/sp";
import "@pnp/sp/site-designs";

// Using the absolute URL of the list
const ss = await sp.siteScripts.getSiteScriptFromList("https://TENANT.sharepoint.com/Lists/mylist");

// Using the PnPjs web object to fetch the site script from a specific list
const ss2 = await sp.web.lists.getByTitle("mylist").getSiteScript();
```

## Get site script from a web
```TypeScript
import { sp } from "@pnp/sp";
import "@pnp/sp/site-designs";

const extractInfo = {
    IncludeBranding: true,
    IncludeLinksToExportedItems: true,
    IncludeRegionalSettings: true,
    IncludeSiteExternalSharingCapability: true,
    IncludeTheme: true,
    IncludedLists: ["Lists/MyList"]
};

const ss = await sp.siteScripts.getSiteScriptFromWeb("https://TENANT.sharepoint.com/sites/mysite", extractInfo);

// Using the PnPjs web object to fetch the site script from a specific web
const ss2 = await sp.web.getSiteScript(extractInfo);
```