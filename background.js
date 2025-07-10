// LinkedIn Fresher Job Detector - Background Script (Core Functionality)

// Utility: Get user settings (keywords, experience threshold) from chrome.storage.sync
function getUserSettings(callback) {
  chrome.storage.sync.get({
    keywords: 'fresher,entry level,graduate,0-1 years',
    expThreshold: 1
  }, callback);
}

// Utility: Analyze job description for fresher-friendliness
function isFresherFriendly(description, keywords, expThreshold) {
  if (!description || typeof description !== 'string') return false;
  const desc = description.toLowerCase();
  // Check for keywords
  const keywordList = keywords.split(',').map(k => k.trim().toLowerCase());
  const keywordMatch = keywordList.some(kw => desc.includes(kw));
  // Check for experience threshold (e.g., "0-1 years", "1 year")
  const expMatch = new RegExp(`([0-9]+)\s*-?\s*([0-9]*)\s*years?`, 'gi');
  let expOk = false;
  let match;
  while ((match = expMatch.exec(desc)) !== null) {
    const minExp = parseInt(match[1], 10);
    const maxExp = match[2] ? parseInt(match[2], 10) : minExp;
    if (minExp <= expThreshold) expOk = true;
  }
  // If no explicit experience found, rely on keywords
  return keywordMatch || expOk;
}

// Prevent duplicate job entries (by URL)
function saveJob(job, sendResponse) {
  chrome.storage.local.get({ jobs: [] }, (result) => {
    const jobs = result.jobs;
    // Check for duplicate by URL
    if (jobs.some(j => j.url === job.url)) {
      sendResponse && sendResponse({ status: 'duplicate' });
      return;
    }
    jobs.push(job);
    chrome.storage.local.set({ jobs }, () => {
      // Notify all popups/tabs about the update
      chrome.runtime.sendMessage({ type: 'jobsUpdated', jobs });
      sendResponse && sendResponse({ status: 'success' });
    });
  });
}

// Listen for messages from content and popup scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'saveJob') {
    // Optionally re-analyze job using latest settings
    getUserSettings(settings => {
      const { keywords, expThreshold } = settings;
      const isFresher = isFresherFriendly(request.job.description, keywords, expThreshold);
      const job = { ...request.job, isFresher };
      saveJob(job, sendResponse);
    });
    return true; // async response
  }
  if (request.type === 'getJobs') {
    chrome.storage.local.get({ jobs: [] }, (result) => {
      sendResponse({ jobs: result.jobs });
    });
    return true;
  }
  if (request.type === 'clearJobs') {
    chrome.storage.local.set({ jobs: [] }, () => {
      chrome.runtime.sendMessage({ type: 'jobsUpdated', jobs: [] });
      sendResponse({ status: 'cleared' });
    });
    return true;
  }
  if (request.type === 'exportJobs') {
    // Placeholder: Actual Excel export logic should be handled in popup or utils
    sendResponse({ status: 'export_started' });
  }
}); 