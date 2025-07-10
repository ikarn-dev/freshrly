// Load settings from chrome.storage.sync
chrome.storage.sync.get({ keywords: '', expThreshold: 1, model: 'llama-3.3-70b-versatile' }, (result) => {
  document.getElementById('keywords').value = result.keywords;
  document.getElementById('exp-threshold').value = result.expThreshold;
  document.getElementById('model-select').value = result.model || 'llama-3.3-70b-versatile';
});

document.getElementById('save-btn').addEventListener('click', () => {
  const keywords = document.getElementById('keywords').value;
  const expThreshold = parseInt(document.getElementById('exp-threshold').value, 10);
  const model = document.getElementById('model-select').value;
  chrome.storage.sync.set({ keywords, expThreshold, model }, () => {
    const msg = document.getElementById('save-msg');
    if (msg) {
      msg.textContent = 'Settings saved!';
      setTimeout(() => { msg.textContent = ''; }, 2000);
    }
  });
}); 