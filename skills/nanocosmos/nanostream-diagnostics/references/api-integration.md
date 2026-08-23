---
id: api-integration
audience: customer
category: api
triggers:
  - "401"
  - "403"
  - authentication error
  - rate limit
  - invalid API key
  - API not working
  - integration error
  - forbidden
  - unauthorized
severity_default: MEDIUM
---

## API / Integration Issues

### When to Use
A customer gets authentication errors, rate limiting, or unexpected API responses when using the bintu API.

### Steps
1. Verify the API key is valid and has the correct permissions (Dashboard > Organization > API Keys)
2. Check the bintu API documentation: https://doc.pages.nanocosmos.de/bintuapi-docs
3. Review request format, headers, and parameters
4. Check whether rate limits have been exceeded
5. Confirm the correct API endpoint is being used

### Customer Response Guidance
- Point to bintu API docs for authentication reference
- Remind customer that API keys should never be exposed in client-side code
- For 422 errors: check that request payload matches schema

### Contact nanocosmos support when
- Valid API key is consistently rejected (possible platform auth issue)
- Rate limits seem incorrect for the customer's plan
