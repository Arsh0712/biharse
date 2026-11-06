'use client';

import Hero from '@/components/home/hero';
import TrustMarquee from '@/components/home/trust-marquee';
import Bestsellers from '@/components/home/bestsellers';
import PinnedStory from '@/components/home/pinned-story';
import CompareSlider from '@/components/home/compare-slider';
import ChhathSection from '@/components/home/chhath-section';
import WhyBiharse from '@/components/home/why-biharse';
import Testimonials from '@/components/home/testimonials';
import Gifting from '@/components/home/gifting';
import DeliverySection from '@/components/home/delivery-section';
import FaqSection from '@/components/home/faq-section';
import FinalCta from '@/components/home/final-cta';

export default function HomeView() {
  return (
    <>
      <Hero />
      <TrustMarquee />
      <Bestsellers />
      <PinnedStory />
      <CompareSlider />
      <ChhathSection />
      <WhyBiharse />
      <Testimonials />
      <Gifting />
      <DeliverySection />
      <FaqSection />
      <FinalCta />
    </>
  );
}
