// Excel export utility using SheetJS (xlsx)
// This script is loaded in the popup, so SheetJS can be loaded via CDN

// Dynamically load SheetJS if not already loaded
if (typeof XLSX === 'undefined') {
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
  script.onload = () => { window.exportJobsToExcel = exportJobsToExcel; };
  document.head.appendChild(script);
} else {
  window.exportJobsToExcel = exportJobsToExcel;
}

function exportJobsToExcel(jobs) {
  if (typeof XLSX === 'undefined') {
    alert('Excel export library not loaded yet. Please try again in a moment.');
    return;
  }
  if (!jobs || !jobs.length) {
    alert('No jobs to export!');
    return;
  }
  // Prepare worksheet data
  const wsData = [
    ['Title', 'Company', 'Location', 'Description', 'URL', 'Fresher Friendly']
  ];
  jobs.forEach(job => {
    wsData.push([
      job.title,
      job.company,
      job.location,
      job.description,
      job.url,
      job.isFresher ? 'Yes' : 'No'
    ]);
  });
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Jobs');
  // Generate and trigger download
  XLSX.writeFile(wb, 'fresher_jobs.xlsx');
} 