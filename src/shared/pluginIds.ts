export const ompWebPluginIdPattern = /^[a-z][a-z0-9.-]*$/u;

export function isOmpWebPluginId(value: string): boolean {
  return ompWebPluginIdPattern.test(value);
}
