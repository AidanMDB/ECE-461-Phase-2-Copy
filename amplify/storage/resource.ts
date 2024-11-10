import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
    name: 'packageStorage',
    access: (allow) => ({
        'package/*': [
            allow.guest.to(['write'])
        ],
    })
});