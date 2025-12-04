
import React from 'react';
import { WaitingListSection } from '../components/WaitingListSection';
import { SEOHead } from '../../../components/SEOHead';

export const WaitingListPage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto py-8 md:py-12 px-4 sm:px-6">
      <SEOHead type="default" overrideTitle="Join the Waitlist" />
      <WaitingListSection />
    </div>
  );
};
