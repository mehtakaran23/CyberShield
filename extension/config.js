// TODO: If you deploy the backend to Render, update this URL to your deployed Render URL.
// Example: const API_BASE_URL = 'https://cybershield-backend-mrr3.onrender.com';
var API_BASE_URL = 'https://cybershield-backend-mrr3.onrender.com';

async function getUserId() {
  const data = await chrome.storage.local.get('userId');
  if (data.userId) return data.userId;
  const newId = 'usr_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
  await chrome.storage.local.set({ userId: newId });
  return newId;
}
