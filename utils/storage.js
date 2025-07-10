// Utility for Chrome storage
export function saveJob(job) {
  chrome.storage.local.get({ jobs: [] }, (result) => {
    const jobs = result.jobs;
    jobs.push(job);
    chrome.storage.local.set({ jobs });
  });
}

export function getJobs(callback) {
  chrome.storage.local.get({ jobs: [] }, (result) => {
    callback(result.jobs);
  });
}

export function saveSettings(settings) {
  chrome.storage.local.set(settings);
}

export function getSettings(callback) {
  chrome.storage.local.get(['keywords', 'expThreshold'], (result) => {
    callback(result);
  });
} 