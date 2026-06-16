import ProviderAlert from './components/ProviderAlert';
import Header from './components/Header';
import Hero from './components/Hero';
import Penalties from './components/Penalties';
import Providers from './components/Providers';
import TheLaw from './components/TheLaw';
import WhyItMatters from './components/WhyItMatters';
import AuditTrail from './components/AuditTrail';
import Toolkit from './components/Toolkit';
import GetStarted from './components/GetStarted';
import FAQ from './components/FAQ';
import About from './components/About';
import Footer from './components/Footer';

export default function App() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <ProviderAlert />
      <Header />
      <main>
        <Hero />
        <Penalties />
        <Providers />
        <TheLaw />
        <WhyItMatters />
        <AuditTrail />
        <Toolkit />
        <GetStarted />
        <FAQ />
        <About />
      </main>
      <Footer />
    </div>
  );
}
