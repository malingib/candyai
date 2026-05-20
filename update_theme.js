const fs = require('fs');
let content = fs.readFileSync('public/widget.js', 'utf8');

const oldApplyTheme = `  function applyTheme() {
    document.documentElement.style.setProperty("--mw-primary", theme.primary);
    if (panel) panel.style.backgroundColor = "#ffffff";
  }`;

const newApplyTheme = `  function hexToRgb(hex) {
    var result = /^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})$/i.exec(hex);
    return result ? parseInt(result[1], 16) + "," + parseInt(result[2], 16) + "," + parseInt(result[3], 16) : "37,99,235";
  }

  function applyTheme() {
    document.documentElement.style.setProperty("--mw-primary", theme.primary);
    document.documentElement.style.setProperty("--mw-primary-rgb", hexToRgb(theme.primary));
    if (panel) panel.style.backgroundColor = "#ffffff";
  }`;

content = content.replace(oldApplyTheme, newApplyTheme);
fs.writeFileSync('public/widget.js', content);
