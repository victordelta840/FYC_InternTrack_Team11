import { LandingNav } from '@/components/landing/LandingNav';
import { Hero } from '@/components/landing/Hero';
import { Features } from '@/components/landing/Features';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { WhyInternTrack } from '@/components/landing/WhyInternTrack';
import { Stats } from '@/components/landing/Stats';
import { Benefits } from '@/components/landing/Benefits';
import { FAQ } from '@/components/landing/FAQ';
import { Footer } from '@/components/landing/Footer';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-bg-950 text-slate-100">
      <LandingNav />
      <main>
        <Hero />
        <Stats />
        <Features />
        <HowItWorks />
        <WhyInternTrack />
        <Benefits />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}
