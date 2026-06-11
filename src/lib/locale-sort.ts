/** Sortowanie alfabetyczne po polsku (ą, ć, …). */
export function sortByNamePl<T>(items: T[], getName: (item: T) => string): T[] {
  return [...items].sort((a, b) =>
    getName(a).localeCompare(getName(b), "pl", { sensitivity: "base" })
  );
}
