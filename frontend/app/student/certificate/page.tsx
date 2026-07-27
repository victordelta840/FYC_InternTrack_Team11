import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import CertificateContent from './CertificateContent';

export default function StudentCertificate() {
  return (
    <Suspense fallback={<CertificatePageFallback />}>
      <CertificateContent />
    </Suspense>
  );
}

function CertificatePageFallback() {
  return (
    <div className="min-h-screen grid place-items-center bg-bg-950">
      <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
    </div>
  );
}
