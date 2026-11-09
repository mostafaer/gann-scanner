/* Cross-checks the ephemeris used by the scanner (Astronomy Engine) against an independent
   implementation of VSOP87 / ELP (astronomia, Meeus). Any disagreement beyond a few
   hundredths of a degree would move planetary price lines and is treated as a failure. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { G, A } = require('./_load.cjs');
const { planetposition, moonposition, nutation } = require('astronomia');
const D2R = Math.PI / 180;
const DATA = {}; for (const p of ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']) DATA[p] = new planetposition.Planet(require(`astronomia/data/vsop87B${p}`).default);
const wrap = x => ((x + 540) % 360) - 180;
const dates = []; for (let y = 1950; y <= 2050; y += 2.5) dates.push(new Date(Date.UTC(Math.floor(y), Math.round((y % 1) * 12), 7 + (y * 3) % 20, 13)));
const jdeOf = d => A.MakeTime(d).tt + 2451545.0;
const rect = p => [p.range * Math.cos(p.lat) * Math.cos(p.lon), p.range * Math.cos(p.lat) * Math.sin(p.lon), p.range * Math.sin(p.lat)];

test('heliocentric longitudes agree with VSOP87 within 0.01°', () => {
  let worst = 0;
  for (const d of dates) {
    const jde = jdeOf(d), [dpsi] = nutation.nutation(jde);
    for (const [name, body] of [['mercury', 'Mercury'], ['venus', 'Venus'], ['mars', 'Mars'], ['jupiter', 'Jupiter'], ['saturn', 'Saturn'], ['uranus', 'Uranus'], ['neptune', 'Neptune']]) {
      const v = DATA[name].position(jde), ref = v.lon / D2R + dpsi / D2R;
      const ours = G.lon(body, d.getTime(), true);
      worst = Math.max(worst, Math.abs(wrap(ours - ref)));
    }
  }
  assert.ok(worst < 0.01, `worst heliocentric difference ${worst.toFixed(5)}°`);
});

test('geocentric longitudes (light-time corrected) agree with VSOP87 within 0.01°', () => {
  let worst = 0;
  for (const d of dates) {
    const jde = jdeOf(d), [dpsi] = nutation.nutation(jde), E = rect(DATA.earth.position(jde));
    for (const [name, body] of [['mercury', 'Mercury'], ['venus', 'Venus'], ['mars', 'Mars'], ['jupiter', 'Jupiter'], ['saturn', 'Saturn'], ['uranus', 'Uranus'], ['neptune', 'Neptune']]) {
      let tau = 0, g;
      for (let it = 0; it < 4; it++) { const P = rect(DATA[name].position(jde - tau)); g = [P[0] - E[0], P[1] - E[1], P[2] - E[2]]; tau = Math.hypot(...g) * 0.0057755183; }
      const ref = Math.atan2(g[1], g[0]) / D2R + dpsi / D2R;
      const ours = A.Ecliptic(A.GeoVector(body, d, false)).elon;
      worst = Math.max(worst, Math.abs(wrap(ours - ref)));
    }
  }
  assert.ok(worst < 0.01, `worst geocentric difference ${worst.toFixed(5)}°`);
});

test('Moon longitude agrees with ELP (Meeus ch. 47) within 0.02°', () => {
  let worst = 0;
  for (const d of dates) {
    const jde = jdeOf(d), [dpsi] = nutation.nutation(jde);
    const ref = moonposition.position(jde).lon / D2R + dpsi / D2R;
    worst = Math.max(worst, Math.abs(wrap(G.lon('Moon', d.getTime(), false) - ref)));
  }
  assert.ok(worst < 0.02, `worst lunar difference ${worst.toFixed(5)}°`);
});
