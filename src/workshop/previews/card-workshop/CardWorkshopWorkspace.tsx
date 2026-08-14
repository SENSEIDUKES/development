import React from 'react';
import { CardWorkshopView } from '../../../components/card-workshop/development/CardWorkshopView';
import { CardWorkshopReferenceView } from '../../../components/card-workshop/reference/CardWorkshopReferenceView';
import { FeatureWorkspace } from '../../FeatureWorkspace';
import { workshopEntries } from '../../manifest';
import '../../../components/reader-chamber/shared/reader-chamber.css';
import '../../../components/reader-codex/shared/reader-codex.css';

export const CardWorkshopWorkspace: React.FC = () => {
  const entry = workshopEntries.find((item) => item.id === 'card-workshop')!;

  return (
    <FeatureWorkspace
      entry={entry}
      allowCompare
      renderReference={() => (
        <div className="w-full h-full bg-[#01070e]">
          <CardWorkshopReferenceView />
        </div>
      )}
      renderDevelopment={() => (
        <div className="w-full h-full bg-[#01070e]">
          <CardWorkshopView
            initialMode="overview"
          />
        </div>
      )}
    />
  );
};

export default CardWorkshopWorkspace;
