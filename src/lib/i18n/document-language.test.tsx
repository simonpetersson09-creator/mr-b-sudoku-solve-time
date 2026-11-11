import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { useDocumentLanguage } from './document-language';
import { setLanguage } from './language';
afterEach(cleanup);
it('native document language initializes and follows manual player choices', () => {
  localStorage.clear(); setLanguage('fr'); document.documentElement.lang = 'en';
  renderHook(useDocumentLanguage);
  expect(document.documentElement.lang).toBe('fr');
  act(() => { setLanguage('sv'); });
  expect(document.documentElement.lang).toBe('sv');
});