import { defineFunction } from '@aws-amplify/backend';

export const myApiFunction = defineFunction({ 
    name: 'api-package-id-cost',
    runtime: 20,
});