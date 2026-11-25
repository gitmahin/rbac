export const createRbacStorage = <T, A extends unknown[]>(
  storage: new (...args: A) => T,
  ...args: A
): T => {
  return new storage(...args)
}