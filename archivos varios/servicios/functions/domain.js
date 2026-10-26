export function roomId(tenantId, ownerId, propertyId) {
  return `v2_${tenantId}_${ownerId}_${propertyId}`;
}
export function slotId(propertyId, date, time) {
  return `${propertyId}_${date}_${time.replace(':', '-')}`;
}
export function validSchedule(date, time, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time || '')) return false;
  const local = new Date(`${date}T${time}:00-06:00`);
  if (!Number.isFinite(local.getTime())) return false;
  const expected = new Date(local.getTime() - 6 * 3600000).toISOString().slice(0, 10);
  return Number.isFinite(local.getTime()) && expected === date && local > now;
}
export function permittedVisitTransition(visit, uid, next) {
  if (['cancelada', 'rechazada', 'vencida'].includes(visit.status)) return false;
  if (uid === visit.tenantId && next === 'cancelada') return true;
  return uid === visit.ownerId && (next === 'cancelada' || (visit.status === 'pendiente' && ['confirmada', 'rechazada'].includes(next)));
}
export function matchesSearch(property, search) {
  const filters = search.filters || {};
  const location = property.location || property.address || {};
  const features = property.features || {};
  const query = String(search.searchQuery || '').trim().toLowerCase();
  const address = property.address || {};
  const haystack = `${property.title || ''} ${address.approximate || location.approximateAddress || ''} ${location.municipality || address.municipality || ''} ${location.department || address.department || ''} ${location.zone || address.zone || ''}`.toLowerCase();
  const zone = String(filters.zone || '').split('(')[0].trim().toLowerCase();
  const zoneNumber = zone.match(/^zona\s*(\d+)$/)?.[1];
  const zoneMatches = !zone || zone.startsWith('todas') || zone.startsWith('todos') || (zoneNumber
    ? new RegExp(`\\bzona\\s*${zoneNumber}\\b`,'i').test(haystack)
    : haystack.includes(zone));
  const amenities = (property.amenities || []).join(' ').toLowerCase();
  return (!query || haystack.includes(query))
    && (!filters.type || filters.type === 'todos' || (filters.type==='amueblado' ? property.furnished : filters.type === property.type))
    && (!filters.department || filters.department === 'Todos' || filters.department === location.department)
    && (!filters.municipality || filters.municipality === 'Todos' || filters.municipality === location.municipality)
    && zoneMatches
    && (!filters.priceMin || property.price >= Number(filters.priceMin))
    && (!filters.priceMax || property.price <= Number(filters.priceMax))
    && (!filters.bedrooms || Number(property.bedrooms ?? features.bedrooms) >= Number(filters.bedrooms))
    && (!filters.bathrooms || Number(property.bathrooms ?? features.bathrooms) >= Number(filters.bathrooms))
    && (!filters.petsAllowed || property.petsAllowed === true)
    && (!filters.furnished || property.furnished === true)
    && (!filters.parking || Number(property.parking ?? features.parking) > 0)
    && (!filters.patio || property.patio === true)
    && (!filters.verified || property.verified === true)
    && (!filters.visitAvailable || property.status==='disponible')
    && (!filters.security || /seguridad|garita/.test(amenities))
    && (!filters.waterGuaranteed || /agua|cisterna/.test(amenities));
}
