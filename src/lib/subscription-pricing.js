export const PLAN_LABELS = {student:'Student Premium',parent:'Parent Premium',tutor_pro:'Tutor Pro'};
export function priceToCents(value) {
 const text=String(value).trim();
 if(!/^\d+(?:\.\d{1,2})?$/.test(text)) return null;
 const cents=Math.round(Number(text)*100);
 return Number.isSafeInteger(cents)&&cents>=100&&cents<=2147483647?cents:null;
}
export function validPrices(rows) {
 return Array.isArray(rows)&&Object.keys(PLAN_LABELS).every(product=>rows.some(row=>row.product===product&&Number.isInteger(row.amount_cents)&&row.amount_cents>=100&&row.amount_cents<=2147483647));
}
