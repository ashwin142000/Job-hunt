export default async (request, context) => {
  const url      = new URL(request.url)
  const q        = url.searchParams.get('q') || 'developer'
  const location = url.searchParams.get('location') || 'india'
  const page     = url.searchParams.get('page') || '1'

  const results = await Promise.allSettled([
    fetchAdzuna(q, location, page),
    fetchRemotive(q),
    fetchArbeitnow(q),
  ])

  const all = results.flatMap(r => r.status === 'fulfilled' ? r.value : [])

  // Dedupe
  const seen = new Set()
  const jobs = all.filter(j => {
    const k = (j.title + j.company).toLowerCase().replace(/\s+/g, '')
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })

  return new Response(JSON.stringify({ jobs }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  })
}

// ── Adzuna India ─────────────────────────────────────────────
async function fetchAdzuna(q, location, page) {
  try {
    const params = new URLSearchParams({
      app_id:           Netlify.env.get('ADZUNA_APP_ID'),
      app_key:          Netlify.env.get('ADZUNA_APP_KEY'),
      what:             q,
      where:            location,
      results_per_page: '20',
      content-type:     'application/json',
    })
    // /in/ = India country code
    const res  = await fetch(`https://api.adzuna.com/v1/api/jobs/in/search/${page}?${params}`)
    const data = await res.json()
    return (data.results || []).map(j => ({
      external_id: `az_${j.id}`,
      title:       j.title,
      company:     j.company?.display_name || 'Unknown',
      location:    j.location?.display_name || 'India',
      work_type:   j.contract_type || 'onsite',
      salary_min:  j.salary_min || null,
      description: (j.description || '').slice(0, 300),
      apply_url:   j.redirect_url,
      source:      'Adzuna',
      posted_at:   j.created,
    }))
  } catch(e) { return [] }
}

// ── Remotive (remote global) ──────────────────────────────────
async function fetchRemotive(q) {
  try {
    const res  = await fetch(`https://remotive.com/api/remote-jobs?search=${encodeURIComponent(q)}&limit=10`)
    const data = await res.json()
    return (data.jobs || []).map(j => ({
      external_id: `rm_${j.id}`,
      title:       j.title,
      company:     j.company_name,
      location:    'Remote',
      work_type:   'remote',
      salary_min:  null,
      description: (j.description || '').replace(/<[^>]+>/g, '').slice(0, 300),
      apply_url:   j.url,
      source:      'Remotive',
      posted_at:   j.publication_date,
    }))
  } catch(e) { return [] }
}

// ── Arbeitnow (free, no key, has India jobs) ──────────────────
async function fetchArbeitnow(q) {
  try {
    const res  = await fetch(`https://www.arbeitnow.com/api/job-board-api?search=${encodeURIComponent(q)}`)
    const data = await res.json()
    return (data.data || []).slice(0, 15).map(j => ({
      external_id: `an_${j.slug}`,
      title:       j.title,
      company:     j.company_name,
      location:    j.location || 'Remote',
      work_type:   j.remote ? 'remote' : 'onsite',
      salary_min:  null,
      description: (j.description || '').replace(/<[^>]+>/g, '').slice(0, 300),
      apply_url:   j.url,
      source:      'Arbeitnow',
      posted_at:   j.created_at,
    }))
  } catch(e) { return [] }
}

export const config = { path: '/api/jobs' }
