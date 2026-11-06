// Page through a PostgREST query 1000 rows at a time. fn(from, to) must return a query with .range(from, to).
export async function fetchAll(fn, size = 1000) {
  const out = [];
  for (let a = 0; ; a += size) {
    const { data, error } = await fn(a, a + size - 1);
    if (error) throw error;
    out.push(...data);
    if (data.length < size) return out;
  }
}
