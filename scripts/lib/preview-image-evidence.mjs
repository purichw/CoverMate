// Retain proof independently of requestfailed delivery: Chromium can report an
// aborted fallback after the preview has already loaded its replacement.
export function createPreviewImageEvidence() {
  const frames = new Map();
  function documentEvidence(frame, navigation) {
    if (!frames.has(frame)) frames.set(frame, new Map());
    const documents = frames.get(frame);
    if (!documents.has(navigation)) documents.set(navigation, { images: [], completed: new Map() });
    return documents.get(navigation);
  }
  return {
    recordCompleted(frame, navigation, url, requestId) {
      const completed = documentEvidence(frame, navigation).completed;
      if (!completed.has(url)) completed.set(url, new Set());
      completed.get(url).add(requestId);
    },
    recordImages(frame, navigation, images, observedRequestId) {
      documentEvidence(frame, navigation).images.push(...images.filter(image =>
        image.complete && image.naturalWidth > 0 && image.selected &&
        (image.selected === image.fallback || image.candidates.includes(image.selected))
      ).map(image => ({ ...image, observedRequestId })));
    },
    resolve(frame, navigation, url, requestId) {
      const evidence = frames.get(frame)?.get(navigation);
      if (!evidence) return null;
      const image = evidence.images.find(image => {
        if (image.fallback !== url) return false;
        const completedIds = evidence.completed.get(image.selected) || [];
        // A same-URL replacement must be a later, successfully completed
        // request, not an earlier load that predates the canceled request.
        return [...completedIds].some(completedId => completedId <= image.observedRequestId &&
          (image.selected !== url || completedId > requestId));
      });
      return image?.selected || null;
    }
  };
}
