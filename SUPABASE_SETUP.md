# GauDhara — Supabase Authentication & Email Setup Guide

This guide details how to apply GauDhara's branded email templates in your Supabase project without requiring a custom domain today, and outlines the production path for custom SMTP delivery once a domain is acquired.

---

## 1. What Is Implemented in Code vs. Supabase Dashboard

| Feature / Setting | Implemented in GauDhara Codebase | Configured in Supabase Dashboard |
|---|---|---|
| **Branded Email Templates** | Ready-to-paste HTML files in `supabase/email_templates/` | **Yes** (Authentication → Email Templates) |
| **Authentication Flow & Redirects** | Full signup, login, password recovery, session persistence | URL Configuration (Site URL / Redirect URLs) |
| **Email Sender Address** | N/A (Handled by email infrastructure) | SMTP / Mailer Settings |
| **Database Schema & RLS** | `supabase/schema.sql` & `supabase/seed.sql` | SQL Editor (Run schema migration) |

---

## 2. Step-by-Step: Applying GauDhara Email Templates in Supabase

You do **not** need a custom domain to brand your confirmation and password reset emails. You can replace the default Supabase HTML templates with GauDhara templates immediately:

### Step 1: Open Supabase Project
1. Log in to [supabase.com/dashboard](https://supabase.com/dashboard).
2. Select your GauDhara project.

### Step 2: Configure Email Confirmation Template
1. In the left navigation, click **Authentication** (the key icon).
2. Under Configuration, select **Email Templates**.
3. Click on the **Confirm signup** tab.
4. Replace the Subject with:
   ```text
   Confirm your GauDhara account
   ```
5. Open `supabase/email_templates/confirmation.html` from this project, copy its entire contents, paste it into the **Message Body (HTML)** field, and click **Save**.

### Step 3: Configure Password Reset Template
1. In the same **Email Templates** menu, click on the **Reset Password** tab.
2. Replace the Subject with:
   ```text
   Reset your GauDhara password
   ```
3. Open `supabase/email_templates/recovery.html`, copy its entire contents, paste it into the **Message Body (HTML)** field, and click **Save**.

### Step 4: Configure Magic Link (Optional)
1. Select the **Magic Link** tab.
2. Subject: `Sign in to GauDhara Console`.
3. Paste the contents of `supabase/email_templates/magic_link.html` and click **Save**.

### Step 5: Verify URL Redirects
1. Go to **Authentication → URL Configuration**.
2. Ensure your **Site URL** is set to your app URL (e.g., `http://localhost:3000` or your Cloud Run / Vercel domain).
3. Under **Redirect URLs**, add:
   ```text
   http://localhost:3000/**
   https://*.run.app/**
   ```

---

## 3. Sender Identity vs. Email Template Branding: The Honest Truth

It is vital to understand the technical boundary between **template styling** and **sender identity**:

1. **Email Template (HTML & CSS)**:
   - What the recipient sees inside the email body (GauDhara forest green headers, typography, buttons, footer).
   - Can be customized **immediately** with zero cost and no custom domain.

2. **Sender Display Name**:
   - The label shown next to the address in inboxes (e.g., `GauDhara Dairy Health`).
   - Configurable in Supabase **Authentication → Email → Sender Name**.

3. **Sender Email Address (From Header)**:
   - The actual sending mailbox (e.g., `noreply@mail.app.supabase.io` vs `noreply@gaudhara.in`).
   - If you do not own a domain, this **must remain Supabase's shared default** (`noreply@mail.app.supabase.io`).
   - You *cannot* arbitrarily claim `noreply@gaudhara.com` or `noreply@gaudhara.in` without owning the domain, because internet mail servers will reject the messages due to failed SPF and DKIM authentication.

---

## 4. Supabase Default Email Service Limitations

When using Supabase's built-in email service:
- **Rate Limit**: Supabase limits default project emails to **3 to 4 emails per hour** to prevent spam abuse on shared IPs.
- **Shared IP Reputation**: Because millions of developers test on default Supabase mailers, default emails may occasionally land in Spam or Promotions folders.
- **Best Use**: Ideal for local development, client evaluation, prototype demonstrations, and staging environments.

---

## 5. Roadmap: Custom Domain & Custom SMTP Setup (When Ready)

Once you register a domain (e.g., `gaudhara.in` or `gaudhara.com`), follow these exact steps to transition to a production-grade verified sender:

### Phase A: Select an SMTP Provider
Recommended free/low-cost transactional email providers:
- **Resend** (resend.com) — 3,000 free emails/month, fastest setup.
- **Brevo** (brevo.com) — 300 free emails/day.
- **Amazon SES** (aws.amazon.com/ses) — Most cost-effective at high scale ($0.10 per 1,000 emails).

### Phase B: Configure DNS Verification on Your Domain Registrar
Add these DNS records at your domain registrar (GoDaddy, Namecheap, Cloudflare):
1. **SPF (Sender Policy Framework)**:
   - Type: `TXT`
   - Host: `@`
   - Value: `v=spf1 include:amazonses.com ~all` (or your provider's specific SPF string)
2. **DKIM (DomainKeys Identified Mail)**:
   - Type: `CNAME` (usually 3 CNAME records generated by Resend / Brevo).
   - Validates cryptographic digital signatures on outgoing emails.
3. **DMARC (Domain-based Message Authentication, Reporting, and Conformance)**:
   - Type: `TXT`
   - Host: `_dmarc`
   - Value: `v=DMARC1; p=none; rua=mailto:dmarc-reports@yourdomain.com`

### Phase C: Enable Custom SMTP in Supabase
1. In the Supabase Dashboard, navigate to **Project Settings → Authentication**.
2. Scroll to **SMTP Settings** and toggle **Enable Custom SMTP**.
3. Enter your provider's credentials:
   - **Sender Email**: `noreply@yourdomain.com` (must match verified domain)
   - **Sender Name**: `GauDhara Dairy Health`
   - **Host**: e.g., `smtp.resend.com`
   - **Port**: `587` (TLS) or `465` (SSL)
   - **Username**: e.g., `resend`
   - **Password**: Your SMTP API Key
4. Click **Save Changes**.

---

## 6. What You Should Do Right Now

1. **Keep `.env.example` placeholders secure**: Never commit `service_role` keys or SMTP passwords.
2. **Apply the GauDhara HTML templates**: Paste `confirmation.html` and `recovery.html` into Supabase Email Templates.
3. **Set Sender Name to `GauDhara`**: In Supabase Auth settings.
4. **Use GauDhara Demo Test Mode**: When credentials are not yet configured, use the built-in "Sign in as Veterinarian" or "Sign in as Herd Manager" buttons for instant, frictionless evaluation.
