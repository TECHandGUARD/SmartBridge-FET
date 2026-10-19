import { Link } from 'react-router-dom';

export default function AccountDeletion() {
  const address = 'aneleq@techandguard.co.za';
  const subject = encodeURIComponent('SmartBridge FET account and data deletion request');
  return <main className="mx-auto max-w-2xl px-5 py-12 space-y-5">
    <h1 className="text-3xl font-bold">Request account and data deletion</h1>
    <p>SmartBridge FET is operated by TECH AND GUARD (Pty) Ltd. You can request deletion of your SmartBridge account and associated personal information even if you have uninstalled the app or cannot sign in.</p>
    <p>Send your request from the email address associated with your account. If you no longer have access to that email, explain this in your message so support can verify ownership securely. Never send your password, identity document, or payment card details by email.</p>
    <a className="inline-flex rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground" href={`mailto:${address}?subject=${subject}`}>Email account deletion request</a>
    <p className="text-sm">If the email button does not open, contact <a className="underline" href={`mailto:${address}`}>{address}</a> and use the subject “SmartBridge FET account and data deletion request”.</p>
    <p className="text-sm">Support will verify your request and explain any information that must legally be retained, such as financial transaction records. Deletion is not instantaneous; this page submits a request and does not automatically erase data.</p>
    <p className="text-sm"><Link className="underline" to="/privacy">Read the privacy policy</Link> · <Link className="underline" to="/terms">Legal documents</Link></p>
  </main>;
}
