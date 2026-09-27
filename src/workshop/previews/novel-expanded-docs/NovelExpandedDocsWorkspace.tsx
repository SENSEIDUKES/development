import { useEffect, useState } from 'react';
import { WorkshopDocs } from '../../docs/WorkshopDocs';
import { docsHref } from '../../docs/catalog';

function currentTopic() {
  return new URLSearchParams(window.location.search).get('doc') || 'overview';
}

export function NovelExpandedDocsWorkspace() {
  const [topicId, setTopicId] = useState(currentTopic);

  useEffect(() => {
    const restoreTopic = () => setTopicId(currentTopic());
    window.addEventListener('popstate', restoreTopic);
    return () => window.removeEventListener('popstate', restoreTopic);
  }, []);

  function navigate(id: string) {
    const href = docsHref(id);
    if (window.location.search !== href) window.history.pushState(null, '', href);
    setTopicId(id);
  }

  return <WorkshopDocs topicId={topicId} onNavigate={navigate} />;
}
