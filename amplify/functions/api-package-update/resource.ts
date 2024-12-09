import { defineFunction } from '@aws-amplify/backend';

export const myApiFunction = defineFunction({ 
    name: 'api-package-update',
    timeoutSeconds: 300,
    runtime: 20,

});