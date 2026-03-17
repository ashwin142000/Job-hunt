import json, os, anthropic

def handler(event, context):
    try:
        body  = json.loads(event.get("body") or "{}")
        query = body.get("query", "")

        client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

        msg = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=200,
            messages=[{
                "role": "user",
                "content": f"""Convert this job search query into JSON filters.
Query: "{query}"
Return ONLY valid JSON, no explanation:
{{
  "q": "role or title keywords",
  "location": "city or empty string",
  "work_type": "remote or onsite or hybrid or empty string"
}}"""
            }]
        )

        filters = json.loads(msg.content[0].text)

        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
            "body": json.dumps(filters),
        }
    except Exception as e:
        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"q": body.get("query", "")}),
        }
