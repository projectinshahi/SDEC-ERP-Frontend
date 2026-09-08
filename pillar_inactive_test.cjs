const B = 'http://localhost:3001/api';
const H = { Authorization: 'Bearer user-token-10', 'Content-Type': 'application/json' };
const j = async (u, o={}) => (await fetch(B+u, { headers: H, ...o })).json();
(async () => {
  await j('/marketing/content/1', { method: 'PUT', body: JSON.stringify({ pillarId: 3 }) });
  await j('/marketing/reference-data/pillars/3', { method: 'PUT', body: JSON.stringify({ active: false }) });
  const ref = await j('/marketing/reference-data');
  const card = (await j('/marketing/content/1')).content;
  const inList = ref.pillars.some(p => p.id === 3);
  console.log('pillar 3 offered in dropdown data:', inList, '(expected false — deactivated)');
  console.log('card still stores pillar_id:', card.pillar_id, '(expected 3 — value NOT silently lost)');
  console.log(!inList && card.pillar_id === 3
    ? 'PASS — this is exactly the case pillarOptions keeps as an explicit option'
    : 'FAIL');
  await j('/marketing/reference-data/pillars/3', { method: 'PUT', body: JSON.stringify({ active: true }) });
  await j('/marketing/content/1', { method: 'PUT', body: JSON.stringify({ pillarId: null }) });
})();
