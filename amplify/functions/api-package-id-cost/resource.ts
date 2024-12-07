import { defineFunction } from '@aws-amplify/backend';

export const myApiFunction = defineFunction({ 
    name: 'api-package-id-cost',
    timeoutSeconds: 120,
    memoryMB: 512,
});