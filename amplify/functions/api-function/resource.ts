import { defineFunction } from '@aws-amplify/backend';

export const myApiFunction = defineFunction({ 
    name: 'api-function',
    timeoutSeconds: 300,
    memoryMB: 512,
});