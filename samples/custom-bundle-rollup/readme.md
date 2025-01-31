# Sample: Custom PnPjs bundle with rollup

This project is an example for starting a custom bundle project using rollup.

## Steps

1. Create a new project using `npm init` and add a blank index.ts file.
2. Install the following packages: `npm install rollup rollup-plugin-typescript rollup-plugin-commonjs rollup-plugin-node-resolve typescript tslib @pnp/sp@beta --save`  
    - you could add other packages and create a rollup of all your third party code in a single place   
3. Create a rollup.config.js file in the project root and copy this content:
    ```JavaScript
    import typescript from "rollup-plugin-typescript";
    import resolve from "rollup-plugin-node-resolve";
    import commonJS from "rollup-plugin-commonjs";

    export default {
    input: './index.ts',
    output: {
        name: "pnpjs",
        format: "umd",
        globals: "pnp",
        file: 'dist/pnpjs-bundle.js',
        sourcemap: true,
    },
    plugins: [
        typescript(),
        resolve(),
        commonJS({
        extensions: [".js", ".ts"],
        include: "node_modules/**"
        })    
    ]
    }
    ```
1. Add the following to the index.ts file. This will control what is exported from your custom library and is where you would make changes to include exactly what you need for your project.
    ```TypeScript
    // ** import the ambient augmentation
    import "@pnp/sp/src/webs";
    import "@pnp/sp/src/lists/web";
    import "@pnp/sp/src/items/list";

    export {
        IWeb,
        Web,
        IWebs,
        Webs,
    } from "@pnp/sp/src/webs";

    export {
        ILists,
        List,
        IList,
        Lists,
    } from "@pnp/sp/src/lists";

    export {
        IItems,
        IItem,
        Item,
        Items,
    } from "@pnp/sp/src/items";

    // export only a subset of the sp lib root
    export {
        sp,
        spGet,
        spPost,
        extractWebUrl,
    } from "@pnp/sp";
    ```
2. Add a tsconfig.json file in the root of the project, this will control the behavior of the rollup plugin. You should edit it as needed to support your needs, but thsi is a good basic starter file.
    ```JSON
    {
        "compilerOptions": {
            "module": "esnext",
            "target": "es5",
            "moduleResolution": "node",
            "declaration": true,
            "outDir": "dist"
        },
        "files": [
            "./index.ts"
        ]
    }
    ```
3. Add a .gitignore file
    ```
    node_modules/
    dist/
    ```
4. Modify the package.json so the script section looks like the below
    ```JSON
    "scripts": {
        "bundle": "rollup -c --environment INCLUDE_DEPS,BUILD:production"
   },
   ```
5. Execute a build/bundle with `npm run bundle`
