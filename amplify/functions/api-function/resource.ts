import { defineFunction } from '@aws-amplify/backend';

export const myApiFunction = defineFunction({
    name: 'api-function',
    timeoutSeconds: 301,
    memoryMB: 512,
    runtime: 20,
    bundling: {
        minify: true,
    },
    environment: {
        TMP_PATH: '/tmp',
    }
});