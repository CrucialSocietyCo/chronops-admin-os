#!/bin/bash
# test-admin-upload.sh
# Tests the /api/admin/upload-audio endpoint with JSON payload (Option B)

# 1. Get a Token? 
# Hard to get a real token without login flow.
# Temporarily, we will rely on the endpoint's behavior with INVALID token (should be 401)
# vs VALID token.
# BUT we want to test the 500 error logic. The 500 happens AFTER auth.
# If I send NO token, I expect 401.
# If I send BAD token, I expect 401.
# If I get 500, it means the endpoint crashed even before Auth or during Auth?

# Wait, if I use the Service Role Key as Bearer token, Supabase checks fail usually.
# However, for debugging, I can modify the endpoint to LOG every request headers.

echo "Testing /api/admin/upload-audio..."

curl -X POST http://localhost:3000/api/admin/upload-audio \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mock-token-for-test" \
  -d '{"audioUrl": "https://example.com/fake.webm", "durationMs": 1500}' \
  -v
