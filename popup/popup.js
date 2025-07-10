// Remove hardcoded jobs. Use persistent storage or background script for jobs.
let jobs = [];

function formatTimeAgo(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} day${Math.floor(diff / 86400) > 1 ? 's' : ''} ago`;
}

function updateSavedCount() {
  const savedCount = document.getElementById('saved-count');
  if (savedCount) savedCount.textContent = jobs.length;
}

function renderRecentActivity() {
  const activityList = document.getElementById('activity-list');
  if (!activityList) return;
  activityList.innerHTML = '';
  if (jobs.length === 0) {
    activityList.innerHTML = '<div class="empty-state">No recent activity</div>';
    return;
  }
  const sortedJobs = [...jobs].sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
  sortedJobs.slice(0, 2).forEach(job => {
    const card = document.createElement('div');
    card.className = 'activity-card';
    const badgeClass = job.addedManually ? 'added' : 'saved';
    const badgeText = job.addedManually ? 'Job<br>added' : 'Job<br>saved';
    card.innerHTML = `
      <div class="activity-badge ${badgeClass}">${badgeText}</div>
      <div class="activity-content">
        <div class="activity-title">${job.title} - ${job.company}</div>
        <div class="activity-time">${formatTimeAgo(job.savedAt)}</div>
      </div>
      <div class="activity-dot"></div>
    `;
    if (job.url) {
      card.style.cursor = 'pointer';
      card.title = 'Open job page';
      card.addEventListener('click', () => {
        window.open(job.url, '_blank');
      });
    }
    activityList.appendChild(card);
  });
}

let lastDetectedJob = null;

function showAddJobModal(prefill) {
  const modal = document.getElementById('add-job-modal');
  const titleInput = document.getElementById('modal-job-title');
  const companyInput = document.getElementById('modal-job-company');
  const linkInput = document.getElementById('modal-job-link');
  const typeInput = document.getElementById('modal-job-type');
  const locationInput = document.getElementById('modal-job-location');
  if (!modal || !titleInput || !companyInput || !linkInput || !typeInput || !locationInput) return;
  titleInput.value = prefill && prefill.title ? prefill.title : '';
  companyInput.value = prefill && prefill.company ? prefill.company : '';
  linkInput.value = prefill && prefill.url ? prefill.url : '';
  typeInput.value = prefill && prefill.jobType ? prefill.jobType : '';
  locationInput.value = prefill && prefill.location ? prefill.location : '';
  modal.style.display = 'flex';
  titleInput.focus();
}

function hideAddJobModal() {
  const modal = document.getElementById('add-job-modal');
  if (modal) modal.style.display = 'none';
}

function addNewJobFromModal() {
  const titleInput = document.getElementById('modal-job-title');
  const companyInput = document.getElementById('modal-job-company');
  const linkInput = document.getElementById('modal-job-link');
  const typeInput = document.getElementById('modal-job-type');
  const locationInput = document.getElementById('modal-job-location');
  const title = titleInput.value.trim();
  const company = companyInput.value.trim();
  const url = linkInput.value.trim();
  const jobType = typeInput.value.trim();
  const location = locationInput.value.trim();
  if (!title || !company || !url) {
    showFeedback('Please enter job title, company, and link.', 'error');
    return;
  }
  const newJob = {
    id: Date.now(),
    title,
    company,
    location,
    jobType,
    url,
    savedAt: new Date().toISOString(),
    isFresher: true,
    addedManually: true
  };
  chrome.runtime.sendMessage({ type: 'saveJob', job: newJob }, () => {
    fetchJobsAndUpdateUI();
    showFeedback('Job added successfully!', 'success');
    hideAddJobModal();
  });
}

function autofillFromDetectedJob(job) {
  lastDetectedJob = job;
  showAddJobModal(job);
}

function viewSavedJobs() {
  renderSavedJobsPage();
}

function renderSavedJobsPage() {
  // Inline SVGs for icons
  const trashSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24"><path fill="#dc2626" d="M9 3a3 3 0 0 1 6 0h5a1 1 0 1 1 0 2h-1v15a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V5H4a1 1 0 1 1 0-2h5Zm8 2H7v15a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V5Zm-5 3a1 1 0 0 1 2 0v8a1 1 0 1 1-2 0V8Zm-3 1a1 1 0 0 1 2 0v7a1 1 0 1 1-2 0V9Z"/></svg>`;
  const openSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24"><path fill="#2563eb" d="M14 3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v6a1 1 0 1 1-2 0V5.41l-9.29 9.3a1 1 0 0 1-1.42-1.42L17.59 4H15a1 1 0 0 1-1-1ZM5 5a1 1 0 0 1 1-1h6a1 1 0 1 1 0 2H7v12h12v-5a1 1 0 1 1 2 0v6a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5Z"/></svg>`;

  // Hide main popup, show saved jobs page
  document.querySelector('.popup-container').style.display = 'none';
  const savedPage = document.getElementById('saved-jobs-page');
  if (!savedPage) return;
  savedPage.style.display = 'block';

  // Render summary
  const summaryDiv = document.getElementById('saved-summary');
  if (summaryDiv) {
    // Category-wise count
    const counts = {};
    let total = 0;
    jobs.forEach(job => {
      const cat = (job.jobType || 'Other').trim();
      counts[cat] = (counts[cat] || 0) + 1;
      total++;
    });
    let summaryHtml = `<div class='summary-total'><b>Total Jobs:</b> ${total}</div>`;
    summaryHtml += `<div class='summary-categories'>`;
    Object.entries(counts).forEach(([cat, count]) => {
      summaryHtml += `<span class='summary-cat'><b>${cat}:</b> ${count}</span> `;
    });
    summaryHtml += `</div>`;
    summaryDiv.innerHTML = summaryHtml;
  }

  // Render job cards
  const listDiv = document.getElementById('saved-list');
  if (listDiv) {
    listDiv.innerHTML = '';
    if (jobs.length === 0) {
      listDiv.innerHTML = '<div class="empty-state">No saved jobs yet!</div>';
    } else {
      const sortedJobs = [...jobs].sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
      sortedJobs.forEach(job => {
        const card = document.createElement('div');
        card.className = 'saved-job-card';
        // Company initials/logo
        let initials = '';
        if (job.company) {
          const words = job.company.split(' ');
          initials = words.length > 1 ? (words[0][0] + words[1][0]) : job.company.substring(0, 2);
        }
        card.innerHTML = `
          <div class='company-logo' title='${job.company || ''}'>${initials.toUpperCase()}</div>
          <div class='saved-job-main'>
            <div class='saved-job-content'>
              <div class='saved-job-title'>${job.title}</div>
              <div class='saved-job-company'>${job.company}</div>
              <div class='saved-job-meta'>
                ${job.jobType ? `<span class='job-type-tag'>${job.jobType}</span>` : ''}
                ${job.location ? `<span>${job.location}</span>` : ''}
              </div>
            </div>
            <div class='saved-job-actions'>
              <button class='saved-job-action-btn open-btn' aria-label='Open job'><span class='action-text-tag'>Open</span></button>
              <button class='saved-job-action-btn delete-btn' aria-label='Delete job'><span class='action-text-tag'>Delete</span></button>
            </div>
          </div>
        `;
        // Open job link
        card.querySelector('.open-btn').onclick = () => {
          if (job.url) {
            window.open(job.url, '_blank');
            showSavedFeedback('Job link opened!', 'success');
          }
        };
        // Delete job
        card.querySelector('.delete-btn').onclick = () => {
          jobs = jobs.filter(j => j.id !== job.id);
          chrome.storage.local.set({ jobs }, () => {
            showSavedFeedback('Job deleted!', 'success');
            renderSavedJobsPage();
            updateSavedCount();
          });
        };
        listDiv.appendChild(card);
      });
    }
  }

  // Back button
  const backBtn = document.getElementById('back-to-main');
  if (backBtn) {
    backBtn.onclick = () => {
      savedPage.style.display = 'none';
      document.querySelector('.popup-container').style.display = 'block';
    };
  }
}

function showSavedFeedback(msg, type) {
  const feedback = document.getElementById('saved-feedback');
  if (!feedback) return;
  feedback.textContent = msg;
  feedback.className = 'saved-feedback ' + (type || '');
  feedback.style.display = 'block';
  setTimeout(() => { feedback.style.display = 'none'; }, 2000);
}

function exportToExcel() {
  if (jobs.length === 0) {
    showFeedback('No jobs to export!', 'error');
    return;
  }
  const csvContent = [
    'Title,Company,Location,Job Type,Job Link,Saved Date,Type',
    ...jobs.map(job => `"${job.title}","${job.company}","${job.location || ''}","${job.jobType || ''}","${job.url || ''}","${job.savedAt}","${job.addedManually ? 'Added' : 'Saved'}"`)
  ].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'freshjobs_export.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function showFeedback(msg, type) {
  const feedback = document.getElementById('feedback');
  if (!feedback) return;
  let cardClass = 'feedback-card';
  let colorClass = '';
  if (type === 'success') colorClass = 'feedback-success';
  if (type === 'error') colorClass = 'feedback-error';
  if (type === 'likely') colorClass = 'feedback-likely';
  feedback.innerHTML = `<div class="${cardClass} ${colorClass}" style="font-size:13px;line-height:1.4;">${msg}</div>`;
  feedback.style.display = 'block';
  feedback.style.textAlign = 'center';
  feedback.style.justifyContent = 'center';
  feedback.style.alignItems = 'center';
  // Always auto-dismiss after 2.5s
  setTimeout(() => { feedback.style.display = 'none'; }, 2500);
}
function hideFeedback() {
  const feedback = document.getElementById('feedback');
  if (!feedback) return;
  feedback.style.display = 'none';
}

function updateUI() {
  updateSavedCount();
  renderRecentActivity();
}

function fetchJobsAndUpdateUI() {
  chrome.runtime.sendMessage({ type: 'getJobs' }, (response) => {
    jobs = response && response.jobs ? response.jobs : [];
    updateUI();
  });
}

// Add loader CSS
const style = document.createElement('style');
style.innerHTML = `
.loader {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid #2563eb;
  border-top: 2px solid #e2e8f0;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  margin-right: 7px;
  vertical-align: middle;
}
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}`;
document.head.appendChild(style);

// Ensure dark mode toggle works on every popup open
window.addEventListener('DOMContentLoaded', function() {
  const darkToggle = document.getElementById('dark-mode-toggle');
  if (darkToggle) {
    function setDarkMode(enabled) {
      document.body.classList.toggle('dark', enabled);
      localStorage.setItem('fj_dark_mode', enabled ? '1' : '0');
      darkToggle.innerHTML = enabled ? '☀️' : '🌙';
      darkToggle.title = enabled ? 'Switch to light mode' : 'Switch to dark mode';
    }
    // Load preference
    const darkPref = localStorage.getItem('fj_dark_mode');
    setDarkMode(darkPref === '1');
    darkToggle.addEventListener('click', function () {
      setDarkMode(!document.body.classList.contains('dark'));
    });
  }
});

document.addEventListener('DOMContentLoaded', function() {
  fetchJobsAndUpdateUI();
  const addBtn = document.getElementById('add-job-btn');
  const savedBtn = document.getElementById('saved-jobs-btn');
  const exportBtn = document.getElementById('export-btn');
  const scanBtn = document.getElementById('scan-jd-btn');
  const settingsBtn = document.getElementById('settings-btn');
  const settingsPage = document.getElementById('settings-page');
  const popupContainer = document.querySelector('.popup-container');
  const backFromSettingsBtn = document.getElementById('back-to-main-from-settings');
  const popupModelSelect = document.getElementById('popup-model-select');
  const popupSaveSettingsBtn = document.getElementById('popup-save-settings-btn');
  const popupSaveMsg = document.getElementById('popup-save-msg');
  const modal = document.getElementById('add-job-modal');
  const saveModalBtn = document.getElementById('modal-save-btn');
  const cancelModalBtn = document.getElementById('modal-cancel-btn');
  const popupApiKeyInput = document.getElementById('popup-api-key');

  if (addBtn) addBtn.addEventListener('click', () => {
    // Try to get job meta from content script
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const tabUrl = tabs[0].url || '';
      chrome.tabs.sendMessage(tabs[0].id, { type: 'getJobMeta' }, function(response) {
        if (chrome.runtime.lastError || !response) {
          // Fallback: open modal with blank fields
          showAddJobModal();
        } else {
          // Prefill modal with detected job meta
          showAddJobModal({
            title: response.title || '',
            company: response.company || '',
            url: tabUrl, // Use the actual tab URL, not window.location.href
            jobType: response.jobType || '',
            location: response.location || ''
          });
        }
      });
    });
  });
  if (saveModalBtn) saveModalBtn.addEventListener('click', addNewJobFromModal);
  if (cancelModalBtn) cancelModalBtn.addEventListener('click', hideAddJobModal);
  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === modal) hideAddJobModal();
    });
  }
  if (savedBtn) savedBtn.addEventListener('click', viewSavedJobs);
  if (exportBtn) exportBtn.addEventListener('click', exportToExcel);
  if (scanBtn) {
    scanBtn.addEventListener('click', function() {
      hideFeedback();
      const originalText = scanBtn.textContent;
      // Add loader animation
      scanBtn.innerHTML = '<span class="loader"></span> Scanning...';
      scanBtn.disabled = true;
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'getJD' }, function(response) {
          if (chrome.runtime.lastError) {
            showFeedback('Please open a LinkedIn job page to use this feature.', 'error');
            scanBtn.textContent = originalText;
            scanBtn.disabled = false;
            return;
          }
          if (!response || !response.jd || response.jd.trim().length < 20) {
            scanBtn.textContent = 'No Job Description Found';
            scanBtn.disabled = true;
            setTimeout(() => {
              scanBtn.textContent = originalText;
              scanBtn.disabled = false;
            }, 2000);
            return;
          }
          chrome.tabs.sendMessage(tabs[0].id, { type: 'classifyJDWithAI', jd: response.jd }, function(aiResp) {
            if (chrome.runtime.lastError) {
              showFeedback('Please open a LinkedIn job page to use this feature.', 'error');
              scanBtn.textContent = originalText;
              scanBtn.disabled = false;
              return;
            }
            console.log('[Popup] AI response:', aiResp); // Debug log
            let msg = '';
            let type = 'error';
            if (aiResp && aiResp.classification) {
              if (aiResp.classification === 'Fresher' || aiResp.classification === 'Intern') {
                msg = '🎉 This is a <b>Fresher/Intern Position</b>!';
                type = 'success';
              } else if (aiResp.classification === 'Likely') {
                msg = '🤔 <b>Likely Suitable for Freshers</b><br><span style="font-size:12px;">No experience mentioned, but check details.</span>';
                type = 'likely';
              } else {
                msg = '❌ <b>Not Fresher/Intern Friendly</b><br><span style="font-size:12px;">Experience required or not suitable for entry-level.</span>';
                type = 'error';
              }
            } else {
              msg = 'Could not classify this job. Please try again.';
            }
            showFeedback(msg, type);
            scanBtn.textContent = originalText;
            scanBtn.disabled = false;
          });
        });
      });
    });
  }
  if (settingsBtn) {
    settingsBtn.addEventListener('click', function() {
      if (settingsPage && popupContainer) {
        popupContainer.style.display = 'none';
        settingsPage.style.display = 'block';
        // Load current model and API key from storage
        chrome.storage.sync.get({ model: 'llama-3.3-70b-versatile', apiKey: '' }, (result) => {
          popupModelSelect.value = result.model || 'llama-3.3-70b-versatile';
          popupApiKeyInput.value = result.apiKey || '';
          // Hide API key input if local model is selected
          if (popupModelSelect.value === 'local') {
            popupApiKeyInput.parentElement.style.display = 'none';
          } else {
            popupApiKeyInput.parentElement.style.display = '';
          }
        });
        popupSaveMsg.textContent = '';
      }
    });
  }
  // Hide/show API key input on model change
  if (popupModelSelect) {
    popupModelSelect.addEventListener('change', function() {
      if (popupModelSelect.value === 'local') {
        popupApiKeyInput.parentElement.style.display = 'none';
      } else {
        popupApiKeyInput.parentElement.style.display = '';
      }
    });
  }
  if (backFromSettingsBtn) {
    backFromSettingsBtn.addEventListener('click', function() {
      if (settingsPage && popupContainer) {
        settingsPage.style.display = 'none';
        popupContainer.style.display = 'block';
      }
    });
  }
  if (popupSaveSettingsBtn) {
    popupSaveSettingsBtn.addEventListener('click', function() {
      const model = popupModelSelect.value;
      const apiKey = popupApiKeyInput.value;
      if (model !== 'local' && !apiKey) {
        popupSaveMsg.textContent = 'Please enter your Groq API key to use AI model.';
        popupSaveMsg.style.color = '#EF4444'; // error color
        popupApiKeyInput.focus();
        return;
      }
      popupSaveMsg.style.color = '';
      chrome.storage.sync.set({ model, apiKey }, () => {
        popupSaveMsg.textContent = 'Settings saved!';
        // Save button feedback animation
        popupSaveSettingsBtn.classList.add('saved-feedback-anim');
        setTimeout(() => {
          popupSaveMsg.textContent = '';
          popupSaveSettingsBtn.classList.remove('saved-feedback-anim');
        }, 1200);
      });
    });
  }

  // Listen for job updates from background (e.g., from other tabs)
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'jobsUpdated') {
      fetchJobsAndUpdateUI();
    }
  });
  // Listen for AI limit reached message from content script
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'aiLimitReached') {
      showFeedback('AI limit reached. Switched to local model.', 'error');
    }
    if (msg.type === 'jobsUpdated') {
      fetchJobsAndUpdateUI();
    }
  });
}); 