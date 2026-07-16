import { FileText, ShieldAlert, ShieldCheck } from 'lucide-react';
import { PublicPage } from '../../components/public/PublicPage';

type LegalSection = { title: string; body: string };

function LegalPage({ title, intro, icon, sections, notice }: {
  title: string;
  intro: string;
  icon: React.ReactNode;
  sections: LegalSection[];
  notice?: string;
}) {
  return (
    <PublicPage>
      <section className="public-hero py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white">{icon}</div>
          <h1 className="mt-4 text-4xl font-extrabold text-slate-900">{title}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">{intro}</p>
          <p className="mt-4 text-xs text-slate-400">Last updated: July 16, 2026</p>
        </div>
      </section>
      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
        {notice && <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">{notice}</div>}
        <div className="space-y-8">
          {sections.map((section) => (
            <article key={section.title}>
              <h2 className="text-xl font-bold text-slate-900">{section.title}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">{section.body}</p>
            </article>
          ))}
        </div>
      </section>
    </PublicPage>
  );
}

export function PrivacyPolicyPage() {
  return <LegalPage title="Privacy Policy" intro="How LifeLink collects, uses, and protects information provided through the platform." icon={<ShieldCheck className="h-6 w-6" />} sections={[
    { title: 'Information we collect', body: 'We collect account details such as your name, email address, phone number, role, and profile information. Depending on your role, you may also provide donation-related, organization, location, or verification information needed to operate LifeLink.' },
    { title: 'How we use information', body: 'LifeLink uses this information to create and manage accounts, connect donors with verified organizations, support donation coordination, communicate important updates, and improve platform safety and reliability.' },
    { title: 'Sharing and access', body: 'We share only the information needed to support donation coordination and platform operations. Access is limited by role and security controls; for example, administrators may review organization-verification details.' },
    { title: 'Security and retention', body: 'We use reasonable technical and organizational safeguards to protect information. No internet service can guarantee absolute security. We retain information only for as long as needed for platform operations, legal obligations, and dispute resolution.' },
    { title: 'Your choices', body: 'You may ask to review or correct your account information, or request account deletion where applicable. Contact LifeLink support for help with privacy-related requests.' },
  ]} />;
}

export function TermsOfServicePage() {
  return <LegalPage title="Terms of Service" intro="The rules for using LifeLink safely, responsibly, and respectfully." icon={<FileText className="h-6 w-6" />} sections={[
    { title: 'Using LifeLink', body: 'You must provide accurate information, protect your account credentials, and use the platform only for lawful donation-related purposes. You are responsible for activity performed through your account.' },
    { title: 'Eligibility and verification', body: 'Creating an account does not guarantee blood or organ donation eligibility, matching, or verification. Hospitals and blood banks may be subject to review before receiving verified status.' },
    { title: 'Acceptable conduct', body: 'Do not submit false medical, identity, organization, or request information. Do not harass others, misuse contact details, interfere with the platform, or use LifeLink to make fraudulent, harmful, or commercial requests.' },
    { title: 'Platform availability', body: 'LifeLink may change, suspend, or improve features at any time. We aim to keep the service available, but do not guarantee uninterrupted access, successful matching, or immediate responses to requests.' },
    { title: 'Account suspension', body: 'We may suspend or remove accounts that violate these terms, create safety risks, or contain inaccurate or misleading information.' },
  ]} />;
}

export function MedicalDisclaimerPage() {
  return <LegalPage title="Medical Disclaimer" intro="Important information about the health and donation content provided on LifeLink." icon={<ShieldAlert className="h-6 w-6" />} notice="LifeLink provides general education and coordination tools only. It does not provide medical advice, diagnosis, treatment, or emergency care." sections={[
    { title: 'Not medical advice', body: 'Information on LifeLink, including chatbot responses, awareness content, eligibility guidance, and matching information, is for general informational purposes only. It must not replace advice from a qualified healthcare professional.' },
    { title: 'Donation eligibility', body: 'Only qualified clinicians and authorized donation services can determine whether someone may donate blood or organs. Requirements can vary based on health history, medications, local rules, and current clinical assessment.' },
    { title: 'Emergencies', body: 'If you believe you or another person has a medical emergency, contact local emergency services or go to the nearest hospital immediately. Do not rely on LifeLink or its chatbot for emergency assistance.' },
    { title: 'Professional consultation', body: 'Always seek advice from a doctor, blood bank, transplant coordinator, or other qualified healthcare provider for personal medical questions, symptoms, donation decisions, or treatment concerns.' },
  ]} />;
}
