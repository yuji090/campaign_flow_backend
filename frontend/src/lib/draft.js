// Inline forms remember what they opened with, so Cancel can ask before throwing away typing.
//   setEntry(withSnapshot({ revenue: '100' }))  ...  if (hasChanges(entry)) confirm(...)

const SNAPSHOT = '__snapshot'

const fields = (entry) => {
  const copy = { ...entry }
  delete copy[SNAPSHOT]
  return JSON.stringify(copy)
}

export function withSnapshot(entry) {
  return { ...entry, [SNAPSHOT]: fields(entry) }
}

export function hasChanges(entry) {
  return Boolean(entry) && entry[SNAPSHOT] !== undefined && fields(entry) !== entry[SNAPSHOT]
}
