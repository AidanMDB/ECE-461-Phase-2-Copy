import { defineFunction } from '@aws-amplify/backend';

export const myApiFunction = defineFunction({ 
    name: 'api-package-id',
    runtime: 20,
});