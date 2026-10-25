# Outstanding production setup — do not mark complete

## COO AI provider setup (OPEN)

- [ ] Configure a valid OPENAI_API_KEY in SmartBridge FET Supabase Edge Function Secrets. Never commit or paste the value into source code.
- [ ] Set OPENAI_MODEL to a verified model ID available to this API account. Do not assume that a previously suggested model name exists.
- [ ] Run the admin-only Test COO AI scenario and confirm a real generated response obeys approved instructions and tutor opt-outs.
- [ ] Confirm audit and reporting behaviour without sending emails or modifying tutor accounts.
- [ ] Only after the above verification: close the item and remove/update the Boardroom warning in a reviewed change.

**Deployment check:** Before merging future application changes, review this document and the AI Boardroom notice. Keep the open item visible until the COO is verified working. An AWS build succeeding does not prove that AI generation works.

## Domain status (verification outstanding)
AWS Amplify reports the smartbridge-fet.co.za domain association AVAILABLE and www DNS verified. Bare-domain subdomain verification is false. Verify HTTPS visits and redirects for both https://smartbridge-fet.co.za and https://www.smartbridge-fet.co.za before declaring both URLs live.

COO onboarding automatic email reminders must stay paused pending separate opt-out/compliance verification.
