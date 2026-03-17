export default async (request, context) => {
  const url = new URL(request.url)
  const q        = url.searchParams.get('q') || 'developer'
  const location = url.searchParams.get('location') || ''
  const page     = url.searchParams.get('page') || '1'

  const params = new URLSearchParams({
    app_id:           Netlify.env.get('ADZUNA_APP_ID'),
    app_key:          Netlify.env.get('ADZUNA_APP_KEY'),
    what:             q,
    where:            location,
    results_per_page: '20',
  })

  try {
    const res  = await fetch(`https://api.adzuna.com/v1/api/jobs/in/search/${page}?${params}`)
    const data = await res.json()

    const jobs = (data.results || []).map(j => ({
      external_id: `az_${j.id}`,
      title:       j.title,
      company:     j.company?.display_name || 'Unknown',
      location:    j.location?.display_name || '',
      work_type:   j.contract_type || 'onsite',
      salary_min:  j.salary_min || null,
      description: (j.description || '').slice(0, 300),
      apply_url:   j.redirect_url,
      source:      'Adzuna',
      posted_at:   j.created,
    }))

    return new Response(JSON.stringify({ jobs }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (e) {
    return new Response(JSON.stringify({ jobs: [], error: e.message }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

export const config = { path: '/api/jobs' }
