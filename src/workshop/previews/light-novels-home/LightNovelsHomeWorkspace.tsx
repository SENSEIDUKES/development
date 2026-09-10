import { FeatureWorkspace } from '../../FeatureWorkspace';
import { workshopEntries } from '../../manifest';

export function LightNovelsHomeWorkspace() {
  const render = (reference: boolean) => {
    const src = `/library-shell.html?variant=development&source=main-library&screen=home&collection=featured${reference ? '&homeReference=1' : ''}`;
    return <div className="p-4">
      <iframe title={`Light Novels Home ${reference ? 'reference' : 'development'}`} src={src} className="h-[844px] w-full border border-white/20 rounded-xl" />
      <a className="inline-flex min-h-11 items-center text-cyan-200 underline" href={src} target="_blank" rel="noreferrer">Open responsive Home at browser width</a>
    </div>;
  };
  return <FeatureWorkspace entry={workshopEntries.find(entry => entry.id === 'light-novels-home')!}
    renderReference={() => render(true)} renderDevelopment={() => render(false)} />;
}
