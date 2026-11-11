import { expect, it } from 'vitest';
import { usesIosSafeArea } from './platform-style';
it('uses iOS safe-area styling independently of an iPad desktop user agent', () => {
  expect(usesIosSafeArea('ios', true)).toBe(true);
  expect(usesIosSafeArea('android', true)).toBe(false);
  expect(usesIosSafeArea('web', false)).toBe(false);
});