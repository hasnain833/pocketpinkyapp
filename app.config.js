require('dotenv').config();

const appJson = require('./app.json');
const expoConfig = appJson.expo;

module.exports = {
  ...expoConfig,
  extra: {
    ...expoConfig.extra,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  },
};
