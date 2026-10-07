import { useState, useCallback } from 'react';
import { storyStorage } from '../lib/storage';
import { getLoreGlossary } from '../lib/persistence';

export function useChapterTranslation() {
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);

  const translateChapter = useCallback(async (
    storyId: string,
    chapterNumber: number,
    englishText: string,
    targetLang: string
  ): Promise<string | null> => {
    setIsTranslating(true);
    setTranslationError(null);

    try {
      // 1. Check cache first
      let cachedContent = await storyStorage.getChapterContent(storyId, chapterNumber);
      
      if (cachedContent && cachedContent.translations && cachedContent.translations[targetLang]) {
        setIsTranslating(false);
        return cachedContent.translations[targetLang].content;
      }

      // 1.5 Fetch glossary terms for this specific story novel_id
      const glossaryTerms = await getLoreGlossary(storyId);
      // Filter for this specific language
      const applicableTerms = glossaryTerms.filter(t => t.target_lang === targetLang);

      // 2. Not cached, so we call our Express API
      const response = await fetch('/api/translate-chapter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chapterId: `${storyId}-${chapterNumber}`,
          targetLang,
          englishText,
          glossaryTerms: applicableTerms
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Translation failed with status ${response.status}`);
      }

      const result = await response.json();
      const translatedText = result.translatedText;

      // 3. Save to storage (merge into existing translations)
      if (!cachedContent) {
        // Fallback in case there's no chapter content yet, though there should be to get here.
        cachedContent = {
           storyId,
           chapterNumber,
           generatedContent: englishText,
           blocks: [],
           translations: {}
        };
      }
      
      cachedContent.translations = {
        ...(cachedContent.translations || {}),
        [targetLang]: {
          title: targetLang,
          content: translatedText,
          translatedAt: Date.now()
        }
      };

      await storyStorage.saveChapterContent(cachedContent);

      setIsTranslating(false);
      return translatedText;
    } catch (err: any) {
      console.error("Translation Hook Error:", err);
      setTranslationError(err.message || 'Failed to translate chapter');
      setIsTranslating(false);
      return null;
    }
  }, []);

  return {
    translateChapter,
    isTranslating,
    translationError
  };
}
