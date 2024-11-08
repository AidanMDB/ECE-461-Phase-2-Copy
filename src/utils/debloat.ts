// src/utils/debloat.ts

import { exec } from 'child_process';


/**
 * @function debloatPackage
 * @description
 * This function performs the debloating process on a given package by running Webpack
 * with the production configuration. It uses tree shaking and minification to remove
 * unnecessary code and reduce the package size.
 *
 * @param {string} packagePath - The path to the package that needs to be debloated.
 * @returns {Promise<void>} - A promise that resolves when the debloating process is complete.
 */
export async function debloatPackage(packagePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        exec(`npx webpack --config webpack.config.js --mode production`, { cwd: packagePath }, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error during debloat: ${stderr}`);
                reject(error);
            } else {
                console.log(`Debloat successful: ${stdout}`);
                resolve();
            }
        });
    });
}

