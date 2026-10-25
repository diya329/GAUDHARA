import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Database, 
  Mail, 
  Cpu, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Copy, 
  ShieldCheck, 
  Save, 
  Globe
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { api } from '../../services/api';

export const SettingsView: React.FC = () => {
  const { user, isConfigured } = useAuth();
  const { language, setLanguage, languages, t } = useLanguage();

  const [farmName, setFarmName] = useState('GauDhara Dairy Research Farm');
  const [ownerName, setOwnerName] = useState(user?.user_metadata?.full_name || 'Dr. Sunita Sharma (DVM)');
  const [stateReg, setStateReg] = useState('AS-VET-2026-GD');
  const [nodusStatus, setNodusStatus] = useState<any>(null);
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    api.getNodusStatus().then(setNodusStatus);
  }, []);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTemplate(label);
    setTimeout(() => setCopiedTemplate(null), 2500);
  };

  const handleSaveFarm = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const confirmationSnippet = `<h2>Confirm Your GauDhara Account</h2>
<p>Hello,</p>
<p>Thank you for registering your dairy herd on GauDhara. Please confirm your email address by clicking the link below:</p>
<p><a href="{{ .ConfirmationURL }}" style="background-color: #1B4332; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Confirm Email Address</a></p>
<p>If you did not sign up for GauDhara, you can disregard this email.</p>
<p>Best regards,<br>The GauDhara Dairy Health Team</p>`;

  const recoverySnippet = `<h2>Reset Your GauDhara Password</h2>
<p>Hello,</p>
<p>We received a request to reset your password for your GauDhara farm console. Click the button below to choose a new password:</p>
<p><a href="{{ .ConfirmationURL }}" style="background-color: #1B4332; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a></p>
<p>This password reset link will expire in 24 hours.</p>
<p>Best regards,<br>The GauDhara Dairy Health Team</p>`;

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="border-b border-[#E2E8F0] pb-4">
        <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">
          {t.settingsTitle}
        </h1>
        <p className="text-xs text-[#64748B] mt-0.5">
          {t.infrastructureSetup}
        </p>
      </div>

      {/* Section 1: Farm Profile */}
      <div className="bg-white p-6 rounded-lg border border-[#E2E8F0] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-[#0F172A]">
              {t.farmProfile}
            </h3>
            <p className="text-xs text-[#64748B]">
              {t.detailedAnalytics}
            </p>
          </div>
          {savedSuccess && (
            <span className="text-xs font-semibold text-[#166534] bg-[#DCFCE7] px-2.5 py-1 rounded border border-[#86EFAC] flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{t.resolved}</span>
            </span>
          )}
        </div>

        <form onSubmit={handleSaveFarm} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-[#334155] mb-1">
                {t.farmProfile}
              </label>
              <input
                type="text"
                value={farmName}
                onChange={(e) => setFarmName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded focus:ring-1 focus:ring-[#1B4332]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#334155] mb-1">
                {t.veterinarianInCharge}
              </label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded focus:ring-1 focus:ring-[#1B4332]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-[#334155] mb-1">
                {t.rfidCode} / Registration
              </label>
              <input
                type="text"
                value={stateReg}
                onChange={(e) => setStateReg(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-[#CBD5E1] rounded focus:ring-1 focus:ring-[#1B4332]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#334155] mb-1">
                {t.languagePreference}
              </label>
              <select
                value={language}
                onChange={(e: any) => setLanguage(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded bg-white text-[#334155]"
              >
                {languages.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.nativeName} ({l.name})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#143427] rounded shadow-xs flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{t.saveSettings}</span>
          </button>
        </form>
      </div>

      {/* Section 2: Nodus Compute Service Configuration */}
      <div className="bg-white p-6 rounded-lg border border-[#E2E8F0] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-[#F1F5F3] text-[#1B4332]">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#0F172A]">
                Nodus Compute Engine Integration
              </h3>
              <p className="text-xs text-[#64748B]">
                Cloud GPU/CPU container infrastructure for screening workloads.
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded border bg-[#DCFCE7] text-[#166534] border-[#86EFAC]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
            <span>{nodusStatus?.configured ? 'REMOTE CLUSTER ACTIVE' : 'AUTONOMOUS EDGE ENGINE ACTIVE'}</span>
          </span>
        </div>

        <div className="p-4 bg-[#F8FAF9] rounded border border-[#E2E8F0] text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[#64748B]">Execution Provider:</span>
            <span className="font-mono font-bold text-[#0F172A]">{nodusStatus?.provider || 'local_fallback'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#64748B]">Documentation URL:</span>
            <a 
              href="https://www.nodus-compute.ai/docs/" 
              target="_blank" 
              rel="noreferrer" 
              className="text-[#1B4332] hover:underline flex items-center gap-1"
            >
              <span>nodus-compute.ai/docs</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#64748B]">Python SDK Repository:</span>
            <a 
              href="https://github.com/Nodus-compute/Nodus-sdk-python" 
              target="_blank" 
              rel="noreferrer" 
              className="text-[#1B4332] hover:underline flex items-center gap-1"
            >
              <span>Nodus-compute/Nodus-sdk-python</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        <p className="text-xs text-[#475569] leading-relaxed">
          To connect your live Nodus Compute API key, set <code className="font-mono bg-[#F1F5F9] px-1 py-0.5 rounded">NODUS_API_KEY</code> in your server secrets. The system will automatically switch to remote cluster job submissions while maintaining the deterministic veterinary calculation pipeline.
        </p>
      </div>

      {/* Section 3: Supabase Authentication & Branded Email Templates */}
      <div className="bg-white p-6 rounded-lg border border-[#E2E8F0] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-[#F1F5F3] text-[#1B4332]">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#0F172A]">
                Supabase Auth & Email Branding (No Custom Domain Required)
              </h3>
              <p className="text-xs text-[#64748B]">
                Apply GauDhara-branded templates in your Supabase project without needing a purchased domain.
              </p>
            </div>
          </div>

          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded border ${
            isConfigured
              ? 'bg-[#DCFCE7] text-[#166534] border-[#86EFAC]'
              : 'bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isConfigured ? 'bg-[#16A34A]' : 'bg-[#3B82F6]'}`} />
            <span>{isConfigured ? 'SUPABASE CONNECTED' : 'DEMO MODE'}</span>
          </span>
        </div>

        <div className="space-y-3 text-xs text-[#475569] leading-relaxed">
          <p>
            Currently, default Supabase confirmation emails display standard Supabase branding. 
            You can customize the HTML email templates immediately directly in your Supabase dashboard:
          </p>

          <ol className="list-decimal list-inside space-y-1 text-[#334155] pl-1 font-medium">
            <li>Open your project at <strong>supabase.com/dashboard</strong>.</li>
            <li>Navigate to <strong>Authentication → Email Templates</strong>.</li>
            <li>Select <strong>Confirm signup</strong> or <strong>Reset Password</strong>.</li>
            <li>Paste the GauDhara HTML template below and click <strong>Save</strong>.</li>
          </ol>
        </div>

        {/* Ready to Paste Templates */}
        <div className="space-y-4 pt-2">
          {/* Template 1: Confirm Signup */}
          <div className="border border-[#E2E8F0] rounded-md overflow-hidden">
            <div className="bg-[#F8FAF9] px-4 py-2 border-b border-[#E2E8F0] flex items-center justify-between">
              <span className="font-semibold text-xs text-[#0F172A]">
                Template 1: Confirm Signup (Email Address Confirmation)
              </span>
              <button
                onClick={() => handleCopy(confirmationSnippet, 'confirm')}
                className="px-2 py-1 text-xs border border-[#CBD5E1] rounded bg-white text-[#334155] hover:bg-[#F1F5F9] flex items-center gap-1 font-medium"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedTemplate === 'confirm' ? 'Copied!' : 'Copy Template HTML'}</span>
              </button>
            </div>
            <pre className="p-3 bg-[#0F172A] text-[#E2E8F0] text-[11px] font-mono overflow-x-auto max-h-36">
              {confirmationSnippet}
            </pre>
          </div>

          {/* Template 2: Reset Password */}
          <div className="border border-[#E2E8F0] rounded-md overflow-hidden">
            <div className="bg-[#F8FAF9] px-4 py-2 border-b border-[#E2E8F0] flex items-center justify-between">
              <span className="font-semibold text-xs text-[#0F172A]">
                Template 2: Reset Password (Password Recovery)
              </span>
              <button
                onClick={() => handleCopy(recoverySnippet, 'recovery')}
                className="px-2 py-1 text-xs border border-[#CBD5E1] rounded bg-white text-[#334155] hover:bg-[#F1F5F9] flex items-center gap-1 font-medium"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedTemplate === 'recovery' ? 'Copied!' : 'Copy Template HTML'}</span>
              </button>
            </div>
            <pre className="p-3 bg-[#0F172A] text-[#E2E8F0] text-[11px] font-mono overflow-x-auto max-h-36">
              {recoverySnippet}
            </pre>
          </div>
        </div>

        {/* Honest explanation of Custom SMTP & Domain */}
        <div className="p-4 bg-[#F8FAF9] rounded border border-[#E2E8F0] text-xs space-y-2">
          <strong className="text-[#0F172A] block font-semibold">
            Important Note on Sender Address vs Email Templates:
          </strong>
          <p className="text-[#475569] leading-relaxed">
            Changing the HTML template immediately styles the email content with GauDhara forest green branding 
            and instructions. However, because you do not yet own a custom domain, Supabase's shared mailer will 
            deliver the email from Supabase's default sender infrastructure (<code className="font-mono">noreply@mail.app.supabase.io</code>). 
            Do <em>not</em> enter unverified domain addresses until you purchase and verify DNS records (SPF, DKIM, DMARC) with an SMTP provider (e.g., Resend, Brevo, AWS SES).
          </p>
        </div>
      </div>
    </div>
  );
};
