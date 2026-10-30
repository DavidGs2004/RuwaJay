export class ApiError extends Error {
  constructor(status, code, message) { super(message); this.status=status; this.code=code; }
}
export function assert(condition, status, code, message) { if(!condition) throw new ApiError(status,code,message); }
export function identifier(value) {
  assert(typeof value==='string' && value.length>0 && value.length<=500 && !value.includes('/') && value!=='.' && value!=='..',400,'invalid-argument','Identificador inválido.');
  return value;
}
export function active(profile) {
  if (['active','inactive','suspended'].includes(profile?.accountStatus)) return profile.accountStatus === 'active';
  return !profile?.suspended && !['suspended','inactive'].includes(profile?.status);
}
export function boundedText(value, limit=4000) {
  assert(value==null || typeof value==='string',400,'invalid-argument','Texto inválido.');
  const text=String(value||'').trim(); assert(text.length<=limit,400,'invalid-argument','El texto es demasiado largo.'); return text;
}
