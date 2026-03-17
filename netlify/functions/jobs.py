import json, os, urllib.request, urllib.parse

def handler(event, context):
    p = event.get("queryStringParameters") or {}
    q        = p.get("q", "developer")
    location = p.get("location", "")
    work_type= p.get("work_type", "")
    page     = p.get("page", "1")

    jobs = []

    # ── Adzuna ──────────────────────────────────────────────
    try:
        params = urllib.parse.urlencode({
            "app_id":          os.environ["ADZUNA_APP_ID"],
            "app_key":         os.environ["ADZUNA_API_KEY"],
            "what":            q,
            "where":           location,
            "results_per_page": 20,
        })
        url = f"https://api.adzuna.com/v1/api/jobs/in/search/{page}?{params}"
        with urllib.request.urlopen(url, timeout=8) as r:
            data = json.loads(r.read())
        for j in data.get("results", []):
            jobs.append({
                "external_id": f"adzuna_{j['id']}",
                "title":       j.get("title", ""),
                "company":     j.get("company", {}).get("display_name", "Unknown"),
                "location":    j.get("location", {}).get("display_name", ""),
                "work_type":   j.get("contract_type", "onsite"),
                "salary_min":  j.get("salary_min"),
                "salary_max":  j.get("salary_max"),
                "description": j.get("description", "")[:300],
                "apply_url":   j.get("redirect_url", ""),
                "source":      "Adzuna",
                "posted_at":   j.get("created", ""),
            })
    except Exception as e:
        print("Adzuna error:", e)

    # ── Remotive (remote jobs, always free) ─────────────────
    if work_type in ("remote", ""):
        try:
            url = f"https://remotive.com/api/remote-jobs?search={urllib.parse.quote(q)}&limit=20"
            with urllib.request.urlopen(url, timeout=8) as r:
                data = json.loads(r.read())
            for j in data.get("jobs", []):
                jobs.append({
                    "external_id": f"remotive_{j['id']}",
                    "title":       j.get("title", ""),
                    "company":     j.get("company_name", ""),
                    "location":    "Remote",
                    "work_type":   "remote",
                    "salary_min":  None,
                    "salary_max":  None,
                    "description": j.get("description", "").replace("<br>", " ")[:300],
                    "apply_url":   j.get("url", ""),
                    "source":      "Remotive",
                    "posted_at":   j.get("publication_date", ""),
                })
        except Exception as e:
            print("Remotive error:", e)

    # ── Deduplicate ──────────────────────────────────────────
    seen, unique = set(), []
    for j in jobs:
        key = (j["title"] + j["company"]).lower().replace(" ", "")
        if key not in seen:
            seen.add(key)
            unique.append(j)

    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
        "body": json.dumps({"jobs": unique}),
    }
