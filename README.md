# LinkedIn Fresher Job Detector (FreshrLy)

A Chrome extension that helps fresh graduates and junior professionals efficiently find and manage entry-level job opportunities on LinkedIn, powered by AI.

---

## Features

### 1. **Automated LinkedIn Job Analysis**
- **Real-time Scanning:** Automatically scans LinkedIn job descriptions for fresher/intern/entry-level suitability.
- **AI-Powered Classification:** Uses Groq's Llama-3 model (or local fallback) to classify jobs as "Fresher", "Intern", "Likely", or "Other".
- **Visual Badges:** Injects colored badges (green/yellow/red) directly into the LinkedIn job page header to indicate suitability.

### 2. **Popup UI for Job Management**
- **Quick Actions:** Add new jobs manually, view saved jobs, and export jobs to Excel directly from the popup.
- **Recent Activity:** Displays the two most recent jobs added or saved.
- **Saved Jobs:** View, open, or delete saved jobs. See a summary by job type.
- **Excel Export:** Download all saved jobs as a CSV file for offline use.

### 3. **Settings & Customization**
- **AI Model Selection:** Choose between Groq's Llama-3 model (requires API key) or a local, hardcoded classifier.
- **API Key Management:** Securely store and manage your Groq API key in extension settings.
- **Dark Mode:** Toggle dark/light mode for the popup UI.
- **Custom Keywords & Experience Threshold:** (Background logic) Customize keywords and experience thresholds for fresher detection.

### 4. **Error Handling & User Guidance**
- **Missing API Key Warning:** If the Groq API key is not set, a warning appears in the popup and auto-dismisses after 3 seconds.
- **LinkedIn Page Detection:** If the extension cannot detect a LinkedIn job page, the popup prompts the user to refresh the page.
- **AI Limit Handling:** If Groq API limits are reached, the extension automatically switches to the local classifier and notifies the user.
- **Duplicate Job Prevention:** Prevents saving the same job multiple times by URL.

### 5. **Data Storage & Sync**
- **Persistent Storage:** All jobs and settings are stored using Chrome's local and sync storage.
- **Cross-Tab Updates:** Changes in one tab (e.g., adding or deleting a job) are reflected in all open popups.

---

## Project Structure

```
fresh_jobs/
  ├── assets/                # Extension icons and images
  ├── background.js          # Background script for data management and messaging
  ├── content/
  │   └── contentScript.js   # Injected into LinkedIn pages for detection and UI
  ├── manifest.json          # Chrome extension manifest
  ├── options/
  │   ├── options.html       # (Optional) Options page
  │   ├── options.js
  │   └── options.css
  ├── popup/
  │   ├── popup.html         # Main popup UI
  │   ├── popup.js           # Popup logic and event handling
  │   └── popup.css
  ├── utils/
  │   ├── excelExport.js     # CSV/Excel export logic
  │   └── storage.js         # Storage helpers
  └── README.md
```

---

## Getting Started

1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd fresh_jobs
   ```

2. **Load the extension in Chrome:**
   - Go to `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `fresh_jobs` directory

3. **Configure your settings:**
   - Open the extension popup
   - Go to Settings (gear icon)
   - Enter your Groq API key (or use local mode)
   - Choose your preferred AI model

4. **Start browsing LinkedIn jobs!**
   - Open any LinkedIn job page
   - Use the popup to scan, save, and manage jobs

---

## Usage Tips

- **Scan Job:** Click "Scan Current Job Description" in the popup to analyze the current LinkedIn job page.
- **Add Job Manually:** Use "Add New Job" to save jobs from any source.
- **Saved Jobs:** Access all your saved jobs, open them in new tabs, or delete them as needed.
- **Export:** Download your job list as a CSV for offline tracking or sharing.
- **Settings:** Switch between AI models and manage your API key at any time.

---

## Target Users

- Fresh graduates, students, and junior professionals seeking entry-level or internship positions on LinkedIn.

---

## License

MIT 