// TS relevant util to filter out null values of an array
// https://stackoverflow.com/a/46700791/837709
export function notEmpty<TValue>(
  value: TValue | null | undefined
): value is TValue {
  return value !== null && value !== undefined;
}
