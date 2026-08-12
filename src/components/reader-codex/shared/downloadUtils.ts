/**
 * Production-compatible image download helper. Cross-origin downloads use
 * an ordinary new-tab fallback when CORS prevents creating a local blob.
 */
export const handleDownload = async (url: string, filename: string) => {
  try {
    const parsedUrl = new URL(url, window.location.origin);
    if (!['http:', 'https:', 'blob:', 'data:'].includes(parsedUrl.protocol)) {
      throw new Error('Invalid URL protocol for download');
    }

    if (['http:', 'https:'].includes(parsedUrl.protocol)
      && parsedUrl.origin !== window.location.origin) {
      const hostname = parsedUrl.hostname.toLowerCase();
      const isInternal =
        hostname === 'localhost'
        || hostname === '0.0.0.0'
        || hostname === '[::1]'
        || hostname === '[::]'
        || /^127\.(?:[0-9]{1,3}\.){2}[0-9]{1,3}$/.test(hostname)
        || /^10\.(?:[0-9]{1,3}\.){2}[0-9]{1,3}$/.test(hostname)
        || /^172\.(?:1[6-9]|2[0-9]|3[0-1])\.[0-9]{1,3}\.[0-9]{1,3}$/.test(hostname)
        || /^192\.168\.[0-9]{1,3}\.[0-9]{1,3}$/.test(hostname)
        || /^169\.254\.[0-9]{1,3}\.[0-9]{1,3}$/.test(hostname)
        || /^\[f[cd][0-9a-f:]+\]$/i.test(hostname)
        || /^\[fe80:[0-9a-f:]+\]$/i.test(hostname)
        || hostname.endsWith('.localhost')
        || hostname.endsWith('.local')
        || hostname.endsWith('.internal');

      if (isInternal) {
        throw new Error('External downloads from internal network hosts are not permitted');
      }
    }
  } catch (error) {
    console.error('Security validation failed or invalid URL', error);
    return;
  }

  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) throw new Error('CORS or network error');
    const blobUrl = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(blobUrl);
  } catch {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
};
