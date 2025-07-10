# LinkedIn Fresher Job Detector

## Purpose
The LinkedIn Fresher Job Detector is a Chrome extension designed to automatically identify and flag entry-level job opportunities on LinkedIn, helping fresh graduates and junior professionals efficiently find relevant positions.

## Key Features
- **Automated Job Analysis:** Real-time scanning of LinkedIn job descriptions
- **Visual Flagging System:** Green/Red indicators for fresher-friendly positions
- **Data Extraction:** Comprehensive job information collection
- **Local Storage:** Browser-based job database
- **Excel Export:** Downloadable job listings in .xlsx format
- **Customizable Settings:** User-defined keywords and experience thresholds

## Target Users
Fresh graduates seeking entry-level positions

## Project Structure
```
/manifest.json
/background.js
/content/
  contentScript.js
/popup/
  popup.html
  popup.js
  popup.css
/options/
  options.html
  options.js
  options.css
/utils/
  storage.js
  excelExport.js
/assets/
  icon.png
```

## Getting Started
1. Clone the repository.
2. Load the extension in Chrome via `chrome://extensions` > Load unpacked.
3. Configure your settings and start browsing LinkedIn jobs!

## License
MIT 