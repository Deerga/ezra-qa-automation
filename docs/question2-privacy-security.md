# Question 2 – Privacy and Security

## Integration Test: Preventing cross-member data access

Before writing this I actually went through the questionnaire on staging. It covers a lot of personal information across three sections — and when you're done, it redirects to `/cat/results` with a personalized risk score. The whole flow runs on a single URL that never changes.

That's what got me thinking about this test. The URL stays the same for everyone. What's actually separating one person's data from another's is the session token and whatever ID is being passed in the background API calls. So the real question is — does the backend validate *whose* data is being requested, not just *whether* the person is logged in?

**Test setup:**
Two accounts in staging. Member A has completed the questionnaire and has a result. Member B is a separate account with a valid session. Before running anything, I'd use DevTools to capture the actual API calls the app makes — endpoint paths, the token in the Authorization header, and Member A's member/questionnaire ID from the request.

**What I'd test:**
Using Member B's valid token, attempt to read Member A's questionnaire data and results by substituting Member A's ID into the request. Also attempt to write — submit an answer into Member A's questionnaire using Member B's token. All of these should return 403. None of Member A's data should appear in any response. After running through all the attack attempts, log back in as Member A and confirm everything is exactly as it was.

Why I'd prioritize this — the questionnaire isn't collecting generic information. It's asking things people don't typically share with anyone. A bug here isn't just a test failure, it's a trust issue.

---

## HTTP Requests

The endpoint paths below are inferred from how the SPA behaves — actual paths should be confirmed from network traffic before running these.

**1. Login as Member A**
```
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "member-a@test.com",
  "password": "Password1!"
}
```
Capture: `tokenA`, `memberIdA`

**2. Fetch Member A's questionnaire (baseline)**
```
GET /api/v1/members/{memberIdA}/questionnaire
Authorization: Bearer {tokenA}
```
Capture: `questionnaireIdA`

**3. Login as Member B**
```
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "member-b@test.com",
  "password": "Password1!"
}
```
Capture: `tokenB`

**4. Member B attempts to read Member A's questionnaire**
```
GET /api/v1/members/{memberIdA}/questionnaire
Authorization: Bearer {tokenB}
```
Expected: `403 Forbidden`
If this returns data → confirmed vulnerability.

**5. Member B attempts to read Member A's results**
```
GET /api/v1/members/{memberIdA}/questionnaire/results
Authorization: Bearer {tokenB}
```
Expected: `403 Forbidden`

**6. Member B attempts to write into Member A's questionnaire**
```
POST /api/v1/questionnaire/{questionnaireIdA}/answer
Authorization: Bearer {tokenB}
Content-Type: application/json

{
  "questionId": "sex_at_birth",
  "answer": "male"
}
```
Expected: `403 Forbidden`
If this returns 200 → Member A's data was just modified by someone else.

**7. Verify Member A's data is untouched**
```
GET /api/v1/members/{memberIdA}/questionnaire
Authorization: Bearer {tokenA}
```
Expected: all original answers intact, nothing changed by steps 4–6.

---

## Security strategy for 100+ sensitive endpoints

100+ endpoints makes sense for a platform like this — there's the member portal, the admin hub, scan center management, payment integrations, and probably more I haven't seen. That's a real surface area and the number itself isn't a concern.

The approach I'd take is to stop thinking about it as 100 individual things to test and start thinking about the common pattern underneath all of them. The security risk that actually matters here is the same one across every endpoint: can someone access data that isn't theirs? If I can get a solid automated check on that pattern running in CI — across member side, admin side, and anything in between — that covers far more ground than writing one-off tests per endpoint.

Before building anything though, I'd want to sit with the team and understand the full picture. I've only seen part of the surface area from the staging environment. The admin side in particular is something I'd want to map out — it tends to have broader access and gets less attention in testing because it's not customer-facing.

Where I'd still insist on manual eyes: any time the authentication or authorization logic changes, when a new third-party integration starts touching user data, or when a new user role gets introduced. Those are the moments where something new can slip through before automation catches up.

The honest answer is that no amount of automation covers everything. But if the authorization checks are solid and running consistently, and the team has a habit of reviewing the riskier changes before they ship — you're in a much better position than testing endpoints one by one and hoping you haven't missed any.
