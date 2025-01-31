import { exec } from "child_process";
import { PublishSchema } from "../../config";
const colors = require("ansi-colors");
import * as path from "path";
import getSubDirNames from "../../lib/getSubDirectoryNames";
const log = require("fancy-log");

export function publishPackage(version: string, config: PublishSchema): Promise<any> {

    const promises: Promise<void>[] = [];

    const publishRoot = path.resolve(config.packageRoot);
    const packageFolders = getSubDirNames(publishRoot).filter(name => name !== "documentation");

    for (let i = 0; i < packageFolders.length; i++) {

        promises.push(new Promise((resolve, reject) => {

            const packagePath = path.resolve(publishRoot, packageFolders[i]);

            log(`${colors.bgBlue(" ")} Publishing ${packagePath}`);

            exec("npm publish --access public",
                {
                    cwd: path.resolve(publishRoot, packageFolders[i]),
                }, (error, _stdout, _stderr) => {

                    if (error === null) {
                        log(`${colors.bgGreen(" ")} Published ${packagePath}`);
                        resolve();
                    } else {
                        console.error(error);
                        reject(error);
                    }
                });
        }));
    }

    return Promise.all(promises);
}
