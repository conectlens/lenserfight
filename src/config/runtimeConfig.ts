export const MODE = 'production';

export const DATA_SOURCE = 'supabase';

export const isMock = false;

export const FEATURES = {
    CHALLENGES_TAB: false,
    LENSER_ACTIVITY: false,
    NOTIFICATIONS: MODE !== 'production',
    NETWORK_LINKS: MODE !== 'production'
};