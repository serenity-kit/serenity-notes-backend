export default function haveEqualStringEntries(
  array1: string[],
  array2: string[]
) {
  if (array1.length !== array2.length) return false;
  const array2Sorted = array2.slice().sort();
  return array1
    .slice()
    .sort()
    .every((value, index) => value === array2Sorted[index]);
}
