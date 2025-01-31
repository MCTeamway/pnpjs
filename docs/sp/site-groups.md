# @pnp/sp/site-groups

The site groups module provides methods to manage groups for a sharepoint site.

## ISiteGroups

[![](https://img.shields.io/badge/Invokable-informational.svg)](../concepts/invokable.md) [![](https://img.shields.io/badge/Selective%20Imports-informational.svg)](../concepts/selective-imports.md)

|Scenario|Import Statement|
|--|--|
|Selective 2|import { sp } from "@pnp/sp";<br />import "@pnp/sp/webs";<br />import "@pnp/sp/site-groups";|
|Selective 3|import { sp } from "@pnp/sp";<br />import "@pnp/sp/webs";<br />import "@pnp/sp/site-groups/web";|
|Preset: All|import {sp, SiteGroups } from "@pnp/sp/presets/all";|


### Get all site groups
```TypeScript
import { sp } from "@pnp/sp";
import "@pnp/sp/webs";
import "@pnp/sp/site-groups/web";

// gets all site groups of the web
const groups = await sp.web.siteGroups();
```

### Get the associated groups of a web

You can get the associated Owner, Member and Visitor groups of a web

```TypeScript
import { sp } from "@pnp/sp";
import "@pnp/sp/webs";
import "@pnp/sp/site-groups/web";

// Gets the associated visitors group of a web
const visitorGroup = await sp.web.associatedVisitorGroup();

// Gets the associated members group of a web
const memberGroup = await sp.web.associatedMemberGroup();

// Gets the associated owners group of a web
const ownerGroup = await sp.web.associatedOwnerGroup();

```

### Create the default associated groups for a web

```TypeScript
import { sp } from "@pnp/sp";
import "@pnp/sp/webs";
import "@pnp/sp/site-groups/web";

// Breaks permission inheritance and creates the default associated groups for the web

// Login name of the owner
const owner1 = "owner@example.onmicrosoft.com";

// Specify true, the permissions should be copied from the current parent scope, else false
const copyRoleAssignments = false;

// Specify true to make all child securable objects inherit role assignments from the current object
const clearSubScopes = true;

await sp.web.createDefaultAssociatedGroups("PnP Site", owner1, copyRoleAssignments, clearSubScopes);
```

### Create a new site group
```TypeScript
import { sp } from "@pnp/sp";
import "@pnp/sp/webs";
import "@pnp/sp/site-groups/web";

// Creates a new site group with the specified title
await sp.web.siteGroups.add({"Title":"new group name"});
```
## ISiteGroup

[![](https://img.shields.io/badge/Invokable-informational.svg)](../concepts/invokable.md) [![](https://img.shields.io/badge/Selective%20Imports-informational.svg)](../concepts/selective-imports.md)

|Scenario|Import Statement|
|--|--|
|Selective 2|import { sp } from "@pnp/sp";<br />import "@pnp/sp/webs";<br />import "@pnp/sp/site-groups";|
|Selective 3|import { sp } from "@pnp/sp";<br />import "@pnp/sp/webs";<br />import "@pnp/sp/site-groups/web";|
|Preset: All|import {sp, SiteGroups, SiteGroup } from "@pnp/sp/presets/all";|

### Getting and updating the groups of a sharepoint web

```TypeScript
import { sp } from "@pnp/sp";
import "@pnp/sp/webs";
import "@pnp/sp/site-groups";

// get the group using a group id
const groupID = 33;
let grp = await sp.web.siteGroups.getById(groupID)();

// get the group using the group's name
const groupName = "ClassicTeam Visitors";
grp = await sp.web.siteGroups.getByName(groupName)();

// update a group
await sp.web.siteGroups.getById(groupID).update({"Title": "New Group Title"});
    
// delete a group from the site using group id
await sp.web.siteGroups.removeById(groupID);

// delete a group from the site using group name
await sp.web.siteGroups.removeByLoginName(groupName);
```

### Getting all users of a group

```TypeScript
import { sp } from "@pnp/sp";
import "@pnp/sp/webs";
import "@pnp/sp/site-groups";

// get all users of group
const groupID = 7;
const users = await sp.web.siteGroups.getById(groupID).users();
```

### Updating the owner of a site group

Unfortunately for now setting the owner of a group as another or same SharePoint group is currently unsupported in REST. Setting the owner as a user is supported.

```TypeScript
import { sp } from "@pnp/sp";
import "@pnp/sp/webs";
import "@pnp/sp/site-groups";

// Update the owner with a user id
await sp.web.siteGroups.getById(7).setUserAsOwner(4);
```