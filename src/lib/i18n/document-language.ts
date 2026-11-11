import { useEffect } from 'react';
import { getLanguage, subscribeLanguageChanges } from './language';
export function useDocumentLanguage() {
  useEffect(() => {
    const sync = () => { document.documentElement.lang = getLanguage(); };
    sync();
    return subscribeLanguageChanges(sync);
  }, []);
}