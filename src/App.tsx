import Header from './components/Header';
import Hero from './components/Hero';
import TheLaw from './components/TheLaw';
import Penalties from './components/Penalties';
import WhyItMatters from './components/WhyItMatters';
import AuditTrail from './components/AuditTrail';
import Toolkit from './components/Toolkit';
import GetStarted from './components/GetStarted';
import FAQ from './components/FAQ';
import Footer from './components/Footer';

export default function App() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <Header />
      <main>
        <Hero />
        <TheLaw />
        <Penalties />
        <WhyItMatters />
        <AuditTrail />
        <Toolkit />
        <GetStarted />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}
