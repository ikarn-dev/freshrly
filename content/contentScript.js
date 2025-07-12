// LinkedIn Fresher Job Detector - Content Script (Core Functionality)

// Utility: Get user settings (keywords, experience threshold, model, apiKey) from chrome.storage.sync
function getUserSettings(callback) {
  chrome.storage.sync.get({
    keywords: 'fresher,entry level,graduate,0-1 years',
    expThreshold: 1,
    model: 'llama-3.3-70b-versatile',
    apiKey: ''
  }, callback);
}

// Inject visual badge into the job header
function injectFlag(isFresherOrIntern, classification) {
  // Remove existing badge if present
  const oldBadge = document.getElementById('fresher-job-badge');
  if (oldBadge) oldBadge.remove();
  // Find job title header
  const header = document.querySelector('h1');
  if (!header) return;
  // Create badge
  const badge = document.createElement('span');
  badge.id = 'fresher-job-badge';
  if (classification === 'Likely') {
    badge.textContent = 'Likely: No Experience Mentioned';
    badge.style.background = '#fbbf24'; // Amber/Yellow
    badge.style.color = '#1e293b'; // Dark text
  } else if (isFresherOrIntern) {
    badge.textContent = (classification === 'Fresher' || classification === 'Intern') ? classification + ' Position' : 'Fresher/Intern Position';
    badge.style.background = '#28a745';
    badge.style.color = '#fff';
  } else {
    badge.textContent = 'Not Fresher/Intern Friendly';
    badge.style.background = '#dc3545';
    badge.style.color = '#fff';
  }
  badge.style.marginLeft = '12px';
  badge.style.padding = '4px 12px';
  badge.style.borderRadius = '16px';
  badge.style.fontSize = '13px';
  badge.style.fontWeight = '600';
  badge.style.verticalAlign = 'middle';
  badge.style.boxShadow = '0 1px 4px rgba(0,0,0,0.10)';
  badge.style.display = 'inline-block';
  badge.style.letterSpacing = '0.2px';
  // Insert badge after the job title
  header.parentNode.insertBefore(badge, header.nextSibling);
}

// Inject a warning message if local model is used or fallback is triggered
function injectModelWarning(message) {
  let warn = document.getElementById('fresher-model-warning');
  if (!warn) {
    warn = document.createElement('div');
    warn.id = 'fresher-model-warning';
    warn.style.background = '#fbbf24';
    warn.style.color = '#1e293b';
    warn.style.padding = '8px 16px';
    warn.style.borderRadius = '8px';
    warn.style.fontSize = '13px';
    warn.style.fontWeight = '600';
    warn.style.margin = '12px 0';
    warn.style.boxShadow = '0 1px 4px rgba(0,0,0,0.10)';
    warn.style.display = 'block';
    warn.style.letterSpacing = '0.2px';
    // Insert at top of main content
    const main = document.querySelector('main') || document.body;
    main.insertBefore(warn, main.firstChild);
  }
  warn.textContent = message;
}

// Extract job data from the page
function extractJobData() {
  const title = document.querySelector('h1')?.innerText || '';
  const company = document.querySelector('.topcard__org-name-link, .topcard__flavor')?.innerText || '';
  const location = document.querySelector('.topcard__flavor--bullet')?.innerText || '';
  const jobDescElem = document.querySelector('.description__text, .jobs-description-content__text');
  const description = jobDescElem?.innerText || '';
  return { title, company, location, description, url: window.location.href };
}

// Main detection and flagging logic
async function detectAndFlagJob() {
  getUserSettings(async settings => {
    const { keywords, expThreshold, model } = settings;
    const job = extractJobData();
    if (!job.description) return; // No job description found
    let classification;
    let usedLocal = false;
    let limitReached = false;
    if (model === 'local') {
      classification = classifyJDHardcoded(job.description);
      usedLocal = true;
    } else {
      classification = await classifyJobWithGroq(job.description, model, (fallbackUsed, fallbackReason) => {
        usedLocal = fallbackUsed;
        if (fallbackReason === 'limit') limitReached = true;
      });
    }
    const isFresherOrIntern = (classification === 'Fresher' || classification === 'Intern');
    injectFlag(isFresherOrIntern, classification);
    if (limitReached) {
      injectModelWarning('AI limit reached. Switched to local model.');
      chrome.runtime.sendMessage({ type: 'aiLimitReached' });
    } else if (usedLocal) {
      injectModelWarning('Local Only mode active. Using local (hardcoded) classifier.');
    } else {
      const warn = document.getElementById('fresher-model-warning');
      if (warn) warn.remove();
    }
    // Send job data to background for storage
    chrome.runtime.sendMessage({ type: 'saveJob', job: { ...job, isFresher: isFresherOrIntern, classification } });
  });
}

// MutationObserver to handle LinkedIn's dynamic navigation
let lastUrl = location.href;
const observer = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    setTimeout(detectAndFlagJob, 1000); // Wait for DOM to update
  }
});
observer.observe(document.body, { childList: true, subtree: true });

// Initial run
window.addEventListener('load', () => setTimeout(detectAndFlagJob, 1000));

function getJobDescriptionText() {
  // Try the specific id used in the user's example
  let elem = document.getElementById('job-details');
  if (elem && elem.innerText && elem.innerText.trim().length > 50) return elem.innerText;

  // Try common selectors
  elem = document.querySelector('.description__text, .jobs-description-content__text, [data-test-description-section], .jobs-description__container, .jobs-description');
  if (elem && elem.innerText && elem.innerText.trim().length > 50) return elem.innerText;

  // Fallback: find the largest text block in main content
  let main = document.querySelector('main') || document.body;
  let maxText = '';
  main.querySelectorAll('section, div').forEach(el => {
    const text = el.innerText || '';
    if (text.length > maxText.length && text.length > 50) maxText = text;
  });
  return maxText;
}

// Groq API call to classify job description
async function classifyJobWithGroq(description, model, setFallbackUsed) {
  // Get API key from storage
  const settings = await new Promise(resolve => getUserSettings(resolve));
  const apiKey = settings.apiKey;
  if (!apiKey) {
    setFallbackUsed && setFallbackUsed(true, 'noapikey');
    return classifyJDHardcoded(description);
  }
  const prompt = `Classify the following job description as one of: Fresher, Intern, Likely, or Other. \nIf the job description mentions any required experience greater than 0 years, classify as 'Other' (unless it is explicitly an internship or apprenticeship and the word 'intern', 'internship', 'apprentice', or 'apprenticeship' is present).\nIf the job is for an intern or apprentice, and the word 'intern', 'internship', 'apprentice', or 'apprenticeship' is present, classify as 'Intern'.\nIf the job is for a fresher or entry-level candidate with 0 years required, classify as 'Fresher'.\nIf neither experience value nor intern/apprentice/fresher terms are found in the job description, classify as 'Likely'.\nAlways respond with one word: 'Fresher', 'Intern', 'Likely', or 'Other'.\nJD: ${description}`;
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || 'llama-3.3-70b-versatile',
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: 10,
        temperature: 0.6,
        top_p: 1,
        stream: false,
        stop: null
      })
    });
    if (response.status === 429) {
      setFallbackUsed && setFallbackUsed(true, 'limit');
      return classifyJDHardcoded(description);
    }
    if (!response.ok) {
      setFallbackUsed && setFallbackUsed(true, 'other');
      return 'Other';
    }
    const data = await response.json();
    let content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return 'Other';
    content = content.toLowerCase().split(/\W+/)[0]; // Take only the first word
    // Updated experience regex
    const expPattern = /(\d+)\s*(?:\+)?\s*(?:-|to)?\s*(\d*)\s*(?:\+)?\s*(years?|yrs?)/ig;
    let expMatch;
    let minExp = null;
    let maxExp = null;
    while ((expMatch = expPattern.exec(description)) !== null) {
      const min = parseInt(expMatch[1], 10);
      const max = expMatch[2] ? parseInt(expMatch[2], 10) : min;
      if (!isNaN(min)) {
        minExp = min;
        maxExp = max;
        break;
      }
    }
    const internLike = /(intern(ship)?|apprentice(ship)?)/i;
    const fresherLike = /(fresher|entry level|graduate|trainee|student|beginner|new grad|recent graduate|early career|no experience|starter|rookie)/i;
    const zeroExp = /0\s*years?|no experience/i;
    const seniorLike = /(seasoned|experienced professional|complete knowledge|senior|wide range of issues|expert|specialist|advanced|proven track record|leadership)/i;
    // OVERRIDE: If senior terms present, always return Other
    if (seniorLike.test(description) && !fresherLike.test(description) && !zeroExp.test(description)) {
      return 'Other';
    }
    // If either minExp or maxExp > 0, always return Other
    if ((minExp !== null && minExp > 0) || (maxExp !== null && maxExp > 0)) {
      return 'Other';
    }
    if (minExp === 0) {
      return 'Fresher';
    }
    if (content.includes('intern')) return 'Intern';
    if ((content.includes('fresher') || content.includes('entry')) && (minExp === null || minExp === 0)) return 'Fresher';
    if (minExp === null && !internLike.test(description) && !fresherLike.test(description) && !zeroExp.test(description)) {
      return 'Likely';
    }
    if (content === 'likely' || content === 'uncertain') return 'Likely';
    setFallbackUsed && setFallbackUsed(false);
    return 'Other';
  } catch (err) {
    setFallbackUsed && setFallbackUsed(true, 'other');
    return classifyJDHardcoded(description);
  }
}

// Hardcoded fallback logic for JD classification
function classifyJDHardcoded(description) {
  const descLower = description.toLowerCase();
  // Expanded and prioritized senior/experienced detection
  const seniorLike = /(seasoned|experienced professional|complete knowledge|senior|wide range of issues|expert|specialist|advanced|proven track record|leadership|extensive experience|mid-level|midlevel|principal|manager|lead|consultant|advisor|mentor|proficiency|proficient|authority|guru|veteran|master|accomplished|distinguished|highly skilled|well-versed|adept|in-depth knowledge|comprehensive knowledge|subject matter expert|SME)/i;
  const fresherLike = /(fresher|entry level|graduate|trainee|student|beginner|new grad|recent graduate|early career|no experience|starter|rookie)/i;
  const zeroExp = /0\s*years?|no experience|0-1\s*years?/i;
  
  // Check for entry-level positions in title (strong indicator)
  const title = document.querySelector('h1')?.innerText || '';
  const titleLower = title.toLowerCase();
  if (titleLower.includes('entry level') || titleLower.includes('graduate')) {
    return 'Fresher';
  }
  
  if (seniorLike.test(description) && !fresherLike.test(description) && !zeroExp.test(description)) {
    return 'Other';
  }
  // Robust intern detection
  if (descLower.includes('intern') || descLower.includes('internship') || descLower.includes('apprentice')) {
    return 'Intern';
  }
  // Updated experience regex - improved to catch "0-1 years"
  const expPattern = /(\d+)\s*(?:\+)?\s*(?:-|to)?\s*(\d*)\s*(?:\+)?\s*(years?|yrs?)/ig;
  let expMatch;
  let minExp = null;
  let maxExp = null;
  while ((expMatch = expPattern.exec(description)) !== null) {
    const min = parseInt(expMatch[1], 10);
    const max = expMatch[2] ? parseInt(expMatch[2], 10) : min;
    if (!isNaN(min)) {
      minExp = min;
      maxExp = max;
      break;
    }
  }
  if (minExp === 0) {
    return 'Fresher';
  }
  if (fresherLike.test(description) || zeroExp.test(description)) return 'Fresher';
  if (minExp === null && !fresherLike.test(description) && !zeroExp.test(description)) {
    return 'Likely';
  }
  return 'Other';
}

// Listen for messages from popup to extract JD and job meta
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[ContentScript] Received message:', request); // Debug log
  if (request.type === 'getJD') {
    const jd = getJobDescriptionText();
    sendResponse({ jd });
    return true;
  }
  if (request.type === 'getJobMeta') {
    // Try to extract job title and company
    let title = document.querySelector('h1')?.innerText || '';
    if (!title) {
      title = document.querySelector('.topcard__title')?.innerText
        || document.querySelector('.job-details-jobs-unified-top-card__job-title')?.innerText
        || '';
    }
    if (!title) {
      // Fallback: find the largest heading in main content
      let main = document.querySelector('main') || document.body;
      let maxText = '';
      main.querySelectorAll('h1, h2, h3, .job-title, .job-details-title').forEach(el => {
        const text = el.innerText || '';
        if (text.length > maxText.length && text.length > 5) maxText = text;
      });
      title = maxText;
    }
    let company = document.querySelector('.topcard__org-name-link, .topcard__flavor')?.innerText || '';
    if (!company) {
      // Try new LinkedIn structure
      company = document.querySelector('.job-details-jobs-unified-top-card__company-name a')?.innerText
        || document.querySelector('.job-details-jobs-unified-top-card__company-name')?.innerText
        || '';
    }
    // Extract job location and job type from .job-details-fit-level-preferences
    let location = '';
    let jobType = '';
    const prefButtons = document.querySelectorAll('.job-details-fit-level-preferences button');
    const knownJobTypes = [
      'full-time', 'internship', 'part-time', 'contract', 'temporary', 'apprenticeship', 'volunteer', 'freelance', 'seasonal', 'co-op'
    ];
    
    // Helper function to clean LinkedIn preference text
    function cleanPreferenceText(text) {
      if (!text) return '';
      // Remove "Matches your job preferences" and everything after it
      return text.replace(/Matches your job preferences.*$/i, '').trim();
    }
    
    if (prefButtons.length > 1) {
      location = cleanPreferenceText(prefButtons[0]?.innerText) || '';
      jobType = cleanPreferenceText(prefButtons[1]?.innerText) || '';
    } else if (prefButtons.length === 1) {
      const btnText = cleanPreferenceText(prefButtons[0].innerText);
      if (knownJobTypes.some(type => btnText.toLowerCase().includes(type))) {
        jobType = btnText;
      } else {
        location = btnText;
      }
    } else {
      // Fallback: try previous selectors or leave blank
      const locElem = document.querySelector('.job-details-jobs-unified-top-card__primary-description-container .t-black--light.mt2 .tvm__text--low-emphasis');
      if (locElem) {
        location = cleanPreferenceText(locElem.innerText);
      }
    }
    sendResponse({ title, company, jobType, location });
    return true;
  }
  // NEW: Handle AI classification request from popup
  if (request.type === 'classifyJDWithAI') {
    const jd = request.jd;
    classifyJobWithGroq(jd).then(classification => {
      sendResponse({ classification });
    });
    return true; // Indicates async response
  }
}); 