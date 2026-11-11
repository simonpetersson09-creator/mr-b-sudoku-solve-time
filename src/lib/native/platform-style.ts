/** Native platform identity is reliable even when iPadOS advertises a desktop user agent. */
export function usesIosSafeArea(platform: string, native: boolean): boolean {
  return native && platform === 'ios';
}