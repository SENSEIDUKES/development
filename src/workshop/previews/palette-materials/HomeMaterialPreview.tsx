import { useEffect, useRef, useState } from 'react';
import type { PaletteSettings } from '../../../components/palette-materials/development/model';
import './home-material-preview.css';

/** A separate document gives Home its real breakpoints, fixed shell and portal targets. */
export function HomeMaterialPreview({ settings }: { settings: PaletteSettings }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState(0);
  const [viewport, setViewport] = useState('auto');
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const width = viewport === 'auto' ? available : Number(viewport);
  const scale = width > 0 ? Math.min(1, available / width) : 1;
  const height = 800;

  useEffect(() => {
    const element = container.current!;
    const observer = new ResizeObserver(() => setAvailable(element.clientWidth));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin === window.location.origin && event.source === frame.current?.contentWindow && event.data?.type === 'pm-home-ready') {
        frame.current?.contentWindow?.postMessage({ type: 'pm-home-settings', settings: settingsRef.current }, window.location.origin);
      }
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, []);
  useEffect(() => {
    frame.current?.contentWindow?.postMessage({ type: 'pm-home-settings', settings }, window.location.origin);
  }, [settings]);

  return <div className="pm-home-preview">
    <div className="pm-home-toolbar"><label>Preview size<select aria-label="Home preview size" value={viewport} onChange={event => setViewport(event.target.value)}>
      <option value="auto">Fit this screen</option><option value="390">Phone</option><option value="834">Tablet</option><option value="1440">Desktop</option>
    </select></label><p>Scroll inside Home to inspect its cards and footer. Actions stay in this mock.</p></div>
    <div ref={container} className="pm-home-frame-container" style={{ height: available ? height * scale : height }}>
      <iframe ref={frame} title="Home material preview" src="/library-shell.html?source=palette-materials" className="pm-home-frame"
        style={{ width: width || '100%', height, transform: `scale(${scale})` }} />
    </div>
  </div>;
}
