#!/usr/bin/env node

// Parse git log output and estimate working hours
const commits = `16af3b3b33df0eee454f8052affdd5e4f27c8be0|2026-01-04 12:14:43 +0000|David Vicente|fix: update background color in SchemaCanvas for improved visibility
0296bffe1bb2bc14b395f042c645675bb8c498b6|2026-01-04 12:10:27 +0000|David Vicente|fix: update Toolbar.vue icons for improved clarity and functionality
aa6d77ed68fe0b165711561c8d4b9aa21b8ced09|2026-01-04 12:07:30 +0000|David Vicente|feat: enhance schema management with zoom functionality and SQL export
15fd63da11e7f2a442024e0cb290c37054bbe2bb|2026-01-04 11:51:23 +0000|David Vicente|feat: enhance README and components for Cloudflare D1 support
4eb01b78d95960ba08c83dc4738c6b48d6ffe147|2026-01-02 04:58:47 +0000|David Vicente|feat: add vite-plugin-vue-devtools for enhanced development experience
3fc809d50183a25146c3f1468e34466a51989b39|2026-01-02 03:05:57 +0000|David Vicente|feat: add OpenAPI export functionality to Toolbar and schema management
21c3976610b63b7e0ec932721ccf9e6688fc913f|2026-01-02 02:44:56 +0000|David Vicente|feat: enhance schema functionality with auto-arrange feature
0855436ee587551271768998af49891414a5f343|2026-01-02 01:45:53 +0000|David Vicente|feat: integrate AI chat functionality and enhance Toolbar interactions
3cdb5c8bcbd7bbe642de2af763cffba401f68095|2025-12-26 20:35:06 +0000|David Vicente|feat: add Help modal to Toolbar for user assistance
7e35ea640e3abc7bbd8e668563f036696de3ff91|2025-12-26 20:30:45 +0000|David Vicente|feat: enhance schema management with import/export functionality
b630c2f1541c3e74a3884aaca2e0ebdb46cfd127|2025-12-26 20:08:57 +0000|David Vicente|fix: update schema components for improved interaction and layout
635eddb18d3d831a91f835abdfabeced187fd7ab|2025-12-26 18:23:02 +0000|David Vicente|fix: update Toolbar.vue to simplify theme display
f5841adbefdc7fbf173318b88c6614a889326031|2025-12-26 18:22:13 +0000|David Vicente|feat: implement dark mode support and enhance UI consistency
8696420d9a4cdc619d2dd0935f677d7c03f97637|2025-12-26 18:08:39 +0000|David Vicente|fix: improve interaction handling in SchemaCanvas and enhance RelationLine styling
b690ec871a68aac011be8308c9ab668be77b32c8|2025-12-26 18:04:19 +0000|David Vicente|feat: enhance schema management with multi-select and column configuration
a4bbb8ac8a3352f44207d16d4ade2ac5ee9a255b|2025-12-26 17:37:05 +0000|David Vicente|refactor: remove HelloWorld component and enhance schema management features
2bae363408e0dcbe1c6ca42219d2c865cef311c4|2025-12-26 17:22:55 +0000|David Vicente|feat: enhance schema designer with relation management and UI improvements
2b029c0d84af47916c615dbc6a95cd76564c2c20|2025-12-25 23:39:00 +0000|David Vicente|feat: enhance schema canvas with zoom and pan functionality
da1a4edecf4ed2e638be428390c89da4108c88dc|2025-12-25 23:11:45 +0000|David Vicente|chore: remove package-lock.json and update dependencies
2d8cf5cd88a9eb5eb4aae475648db39139a703bc|2025-12-25 23:01:38 +0000|Claude|feat: initial implementation of Drizzle schema designer`.split('\n');

// Parse commits
const parsed = commits.map(line => {
  const [hash, dateTime, author, message] = line.split('|');
  return {
    hash: hash.substring(0, 7),
    date: new Date(dateTime),
    author,
    message
  };
});

// Group by day
const byDay = {};
parsed.forEach(commit => {
  const dayKey = commit.date.toISOString().split('T')[0];
  if (!byDay[dayKey]) {
    byDay[dayKey] = [];
  }
  byDay[dayKey].push(commit);
});

// Sort days
const days = Object.keys(byDay).sort();

console.log('Working Hours Estimation Based on Git Commits\n');
console.log('=' .repeat(60));
console.log('\nAssumptions:');
console.log('- Work session = time span between first and last commit of the day');
console.log('- Add 1 hour buffer for setup/cleanup time per session');
console.log('- Minimum 2 hours per day with commits (even if span is shorter)');
console.log('- Maximum 10 hours per day (to account for realistic limits)\n');
console.log('=' .repeat(60) + '\n');

let totalHours = 0;
const dayEstimates = [];

days.forEach(day => {
  const dayCommits = byDay[day].sort((a, b) => a.date - b.date);
  const firstCommit = dayCommits[0];
  const lastCommit = dayCommits[dayCommits.length - 1];
  
  // Calculate time span in hours
  const spanMs = lastCommit.date - firstCommit.date;
  const spanHours = spanMs / (1000 * 60 * 60);
  
  // Estimate: span + buffer, but with reasonable min/max
  let estimatedHours = spanHours + 1.0; // Add 1 hour buffer
  estimatedHours = Math.max(estimatedHours, 2.0); // Minimum 2 hours
  estimatedHours = Math.min(estimatedHours, 10.0); // Maximum 10 hours
  
  // Round to 1 decimal
  estimatedHours = Math.round(estimatedHours * 10) / 10;
  
  totalHours += estimatedHours;
  
  dayEstimates.push({
    day,
    commits: dayCommits.length,
    firstCommit: firstCommit.date.toISOString(),
    lastCommit: lastCommit.date.toISOString(),
    spanHours: Math.round(spanHours * 10) / 10,
    estimatedHours
  });
  
  console.log(`${day} (${dayCommits.length} commit${dayCommits.length > 1 ? 's' : ''})`);
  console.log(`  First commit: ${firstCommit.date.toISOString()}`);
  console.log(`  Last commit:  ${lastCommit.date.toISOString()}`);
  console.log(`  Time span:    ${Math.round(spanHours * 10) / 10} hours`);
  console.log(`  Estimated:    ${estimatedHours} hours`);
  console.log('');
});

console.log('=' .repeat(60));
console.log(`Total Estimated Working Hours: ${Math.round(totalHours * 10) / 10} hours`);
console.log(`Total Estimated Working Days: ${days.length} days`);
console.log(`Average Hours per Day: ${Math.round((totalHours / days.length) * 10) / 10} hours`);
console.log('=' .repeat(60));

// Alternative estimation: More conservative
console.log('\nAlternative (Conservative) Estimation:');
console.log('Assuming 4-6 hours per day with commits\n');
const conservativeTotal = days.length * 5; // 5 hours average
console.log(`Conservative Estimate: ${conservativeTotal} hours (${days.length} days × 5 hours)`);

// Alternative estimation: More aggressive (based on commit density)
console.log('\nAlternative (Commit-Density Based) Estimation:');
console.log('Assuming time based on commit frequency and complexity\n');
let densityHours = 0;
days.forEach(day => {
  const dayCommits = byDay[day];
  const commitCount = dayCommits.length;
  // More commits = more work, but with diminishing returns
  const baseHours = Math.min(commitCount * 1.5, 8); // 1.5h per commit, max 8h
  densityHours += baseHours;
});
console.log(`Density-Based Estimate: ${Math.round(densityHours * 10) / 10} hours`);
