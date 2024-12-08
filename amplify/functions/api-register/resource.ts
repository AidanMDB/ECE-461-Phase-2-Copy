import { defineFunction } from '@aws-amplify/backend';

export const myApiFunctionRegister = defineFunction({ 
    name: 'api-package-register',   
    runtime: 20,
});