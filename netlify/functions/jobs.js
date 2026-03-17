exports.handler = async function(event) {
const p = event.queryStringParameters || {}
const q = p.q || “developer”
const location = p.location || “india”
const page = p.page || “1”

const AZ_ID  = process.env.ADZUNA_APP_ID
const AZ_KEY = process.env.ADZUNA_APP_KEY

let jobs = []

// Adzuna India
try {
const url = “https://api.adzuna.com/v1/api/jobs/in/search/” + page +
“?app_id=” + AZ_ID +
“&app_key=” + AZ_KEY +
“&what=” + encodeURIComponent(q) +
“&where=” + encodeURIComponent(location) +
“&results_per_page=20”
const res = await fetch(url)
const data = await res.json()
const mapped = (data.results || []).map(function(j) {
return {
external_id: “az_” + j.id,
title: j.title,
company: (j.company && j.company.display_name) || “Unknown”,
location: (j.location && j.location.display_name) || “India”,
work_type: j.contract_type || “onsite”,
salary_min: j.salary_min || null,
description: (j.description || “”).slice(0, 300),
apply_url: j.redirect_url,
source: “Adzuna”,
posted_at: j.created
}
})
jobs = jobs.concat(mapped)
} catch(e) {
console.log(“Adzuna error: “ + e.message)
}

// Remotive remote jobs
try {
const url = “https://remotive.com/api/remote-jobs?search=” + encodeURIComponent(q) + “&limit=10”
const res = await fetch(url)
const data = await res.json()
const mapped = (data.jobs || []).map(function(j) {
return {
external_id: “rm_” + j.id,
title: j.title,
company: j.company_name,
location: “Remote”,
work_type: “remote”,
salary_min: null,
description: (j.description || “”).replace(/<[^>]+>/g, “”).slice(0, 300),
apply_url: j.url,
source: “Remotive”,
posted_at: j.publication_date
}
})
jobs = jobs.concat(mapped)
} catch(e) {
console.log(“Remotive error: “ + e.message)
}

// Deduplicate
var seen = {}
var unique = []
for (var i = 0; i < jobs.length; i++) {
var key = (jobs[i].title + jobs[i].company).toLowerCase().replace(/\s+/g, “”)
if (!seen[key]) {
seen[key] = true
unique.push(jobs[i])
}
}

return {
statusCode: 200,
headers: {
“Content-Type”: “application/json”,
“Access-Control-Allow-Origin”: “*”
},
body: JSON.stringify({ jobs: unique })
}
}