window.addEventListener('DOMContentLoaded', () => {
  const cid = window.env?.SUPABASE_OAUTH_CLIENT_ID || 'NOT_SET';
  document.getElementById('clientId').innerText = cid;
  const log = document.getElementById('log');

  document.getElementById('testBtn').addEventListener('click', () => {
    log.innerText += 'Test button clicked\n';
    log.innerText += 'SUPABASE_OAUTH_CLIENT_ID: ' + (window.env.SUPABASE_OAUTH_CLIENT_ID || 'null') + '\n';
  });
});
