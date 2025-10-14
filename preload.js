const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('env', {
  SUPABASE_OAUTH_CLIENT_ID: process.env.SUPABASE_OAUTH_CLIENT_ID || null,
  SUPABASE_OAUTH_CLIENT_SECRET: process.env.SUPABASE_OAUTH_CLIENT_SECRET || null
});
