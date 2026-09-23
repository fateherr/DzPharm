import { PEDIATRIC_DRUGS, computeDose } from '../src/lib/pediatric-dosing'

const para = PEDIATRIC_DRUGS.find(d => d.dciKey === 'PARACETAMOL')!
const ibu = PEDIATRIC_DRUGS.find(d => d.dciKey === 'IBUPROFENE')!
const amox = PEDIATRIC_DRUGS.find(d => d.dciKey === 'AMOXICILLINE')!

console.log('=== Paracetamol 120mg/5mL suspension ===')
for (const [w, a] of [[3, 1], [6, 6], [12, 24], [25, 96], [50, 144], [80, 144]] as [number, number][]) {
  const r = computeDose(para, w, a, 0)
  console.log(`${w}kg ${a}m: dose=${r.doseMg}mg (expected ${15*w}) vol=${r.volumeMl}mL (expected ${((15*w)/120*5).toFixed(2)}) maxDaily=${r.maxDailyMg} capped=${r.capped} blockers=${r.blockers.length}`)
}

console.log('\n=== Blocker checks ===')
const b1 = computeDose(para, 2, 0, 0)
const b2 = computeDose(ibu, 5, 2, 0)
const b3 = computeDose(ibu, 7, 3, 0)
console.log('para 2kg/0m blockers:', b1.blockers.length >= 1 ? 'OK' : 'MISSING', JSON.stringify(b1.blockers))
console.log('ibu 5kg/2m blockers:', b2.blockers.length >= 1 ? 'OK' : 'MISSING')
console.log('ibu 7kg/3m blockers:', b3.blockers.length === 0 ? 'OK (boundary allowed)' : 'WRONG: ' + b3.blockers.join('; '))

console.log('\n=== Cap checks (heavy child) ===')
const r80 = computeDose(para, 80, 144, 0)
console.log('para 80kg: dose=' + r80.doseMg + ' ' + (r80.doseMg === 1000 ? 'OK' : 'FAIL') + ' maxDaily=' + r80.maxDailyMg + ' ' + (r80.maxDailyMg === 4000 ? 'OK' : 'FAIL'))
const ibu80 = computeDose(ibu, 80, 144, 0)
console.log('ibu 80kg: dose=' + ibu80.doseMg + ' ' + (ibu80.doseMg === 400 ? 'OK' : 'FAIL') + ' maxDaily=' + ibu80.maxDailyMg + ' ' + (ibu80.maxDailyMg === 1200 ? 'OK' : 'FAIL'))

console.log('\n=== Amoxicillin 25mg/kg q8h ===')
for (const w of [5, 10, 20, 40]) {
  const r = computeDose(amox, w, 24, 0)
  console.log(`${w}kg: ${r.doseMg}mg ×3 = ${r.doseMg! * 3}mg/j vs maxDaily field=${r.maxDailyMg}`)
}

console.log('\n=== Sachet (dry) ===')
const rs = computeDose(para, 12, 24, 2)
console.log('sachet dose=' + rs.doseMg + ' vol=' + rs.volumeMl + ' ' + (rs.volumeMl === null ? 'OK' : 'FAIL'))

console.log('\n=== Band-based (cetirizine boundaries) ===')
const cet = PEDIATRIC_DRUGS.find(d => d.dciKey === 'CETIRIZINE')!
for (const a of [23, 24, 71, 72, 143, 144]) {
  const r = computeDose(cet, 20, a, 0)
  console.log(`age ${a}m: dose=${r.doseMg}mg label="${r.bandLabel}"`)
}
