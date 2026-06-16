// Custom overrides for the dark theme
// This script attaches a click handler to the "View All Entries" button
// to navigate to the full list of entries section via the existing navigation system.

document.addEventListener('DOMContentLoaded', function () {
  const nav = document.getElementById('navList');
  const viewAllBtn = document.getElementById('viewAllBtn');
  if (viewAllBtn && nav) {
    viewAllBtn.addEventListener('click', function () {
      const timeNav = nav.querySelector('li[data-target="timeEntriesSection"]');
      if (timeNav) {
        timeNav.click();
      }
    });
  }
});
