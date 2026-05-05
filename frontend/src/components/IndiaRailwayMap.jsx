// placeholder
import React, { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';

// ── Verified Station Database (100+ stations with real coordinates) ────────────
// Format: code -> { name, lat, lng, aliases[] }
const STATIONS = {
  // Northern Zone
  NDLS: { name: 'New Delhi',           lat: 28.6431, lng: 77.2197, aliases: ['new delhi','ndls','delhi','new delhi jn'] },
  NZM:  { name: 'Hazrat Nizamuddin',   lat: 28.5877, lng: 77.2507, aliases: ['hazrat nizamuddin','nzm','nizamuddin'] },
  ASR:  { name: 'Amritsar Jn.',        lat: 31.6340, lng: 74.8723, aliases: ['amritsar','asr','amritsar jn'] },
  UMB:  { name: 'Ambala Cantt.',       lat: 30.3782, lng: 76.7767, aliases: ['ambala','umb','ambala cantt'] },
  LDH:  { name: 'Ludhiana Jn.',        lat: 30.9010, lng: 75.8573, aliases: ['ludhiana','ldh','ludhiana jn'] },
  DDN:  { name: 'Dehradun',            lat: 30.3165, lng: 78.0322, aliases: ['dehradun','ddn'] },
  JAT:  { name: 'Jammu Tawi',          lat: 32.7266, lng: 74.8570, aliases: ['jammu','jat','jammu tawi'] },
  CDG:  { name: 'Chandigarh',          lat: 30.7333, lng: 76.7794, aliases: ['chandigarh','cdg'] },
  // North Eastern Zone
  GKP:  { name: 'Gorakhpur Jn.',       lat: 26.7606, lng: 83.3732, aliases: ['gorakhpur','gkp','gorakhpur jn'] },
  BSB:  { name: 'Varanasi Jn.',        lat: 25.3176, lng: 82.9739, aliases: ['varanasi','bsb','varanasi jn','benares'] },
  LKO:  { name: 'Lucknow Charbagh',    lat: 26.8467, lng: 80.9462, aliases: ['lucknow','lko','lucknow charbagh'] },
  GHY:  { name: 'Guwahati',            lat: 26.1445, lng: 91.7362, aliases: ['guwahati','ghy'] },
  DBRG: { name: 'Dibrugarh',           lat: 27.4728, lng: 94.9120, aliases: ['dibrugarh','dbrg'] },
  // North Western Zone
  JP:   { name: 'Jaipur Jn.',          lat: 26.9124, lng: 75.7873, aliases: ['jaipur','jp','jaipur jn'] },
  JU:   { name: 'Jodhpur Jn.',         lat: 26.2389, lng: 73.0243, aliases: ['jodhpur','ju','jodhpur jn'] },
  AII:  { name: 'Ajmer Jn.',           lat: 26.4499, lng: 74.6399, aliases: ['ajmer','aii','ajmer jn'] },
  BKN:  { name: 'Bikaner Jn.',         lat: 28.0229, lng: 73.3119, aliases: ['bikaner','bkn'] },
  // North Central Zone
  ALD:  { name: 'Prayagraj Jn.',       lat: 25.4358, lng: 81.8463, aliases: ['prayagraj','ald','allahabad','allahabad jn','prayagraj jn'] },
  CNB:  { name: 'Kanpur Central',      lat: 26.4499, lng: 80.3319, aliases: ['kanpur','cnb','kanpur central'] },
  AGC:  { name: 'Agra Cantt.',         lat: 27.1767, lng: 77.9545, aliases: ['agra','agc','agra cantt'] },
  MTJ:  { name: 'Mathura Jn.',         lat: 27.4924, lng: 77.6737, aliases: ['mathura','mtj','mathura jn'] },
  JHS:  { name: 'Jhansi Jn.',          lat: 25.4484, lng: 78.5685, aliases: ['jhansi','jhs','jhansi jn'] },
  GWL:  { name: 'Gwalior',             lat: 26.2183, lng: 78.1828, aliases: ['gwalior','gwl'] },
  // Eastern Zone
  HWH:  { name: 'Howrah Jn.',          lat: 22.5830, lng: 88.3426, aliases: ['howrah','hwh','howrah jn','howrah junction'] },
  SDAH: { name: 'Sealdah',             lat: 22.5626, lng: 88.3697, aliases: ['sealdah','sdah'] },
  KOAA: { name: 'Kolkata',             lat: 22.5726, lng: 88.3639, aliases: ['kolkata','koaa','calcutta'] },
  ASN:  { name: 'Asansol Jn.',         lat: 23.6833, lng: 86.9667, aliases: ['asansol','asn','asansol jn'] },
  DHN:  { name: 'Dhanbad Jn.',         lat: 23.7957, lng: 86.4304, aliases: ['dhanbad','dhn','dhanbad jn'] },
  // East Central Zone
  PNBE: { name: 'Patna Jn.',           lat: 25.6093, lng: 85.1235, aliases: ['patna','pnbe','patna jn','patna junction'] },
  GAYA: { name: 'Gaya Jn.',            lat: 24.7955, lng: 84.9994, aliases: ['gaya','gaya jn'] },
  MFP:  { name: 'Muzaffarpur Jn.',     lat: 26.1197, lng: 85.3910, aliases: ['muzaffarpur','mfp','muzaffarpur jn'] },
  // East Coast Zone
  BBS:  { name: 'Bhubaneswar',         lat: 20.2961, lng: 85.8245, aliases: ['bhubaneswar','bbs'] },
  VSKP: { name: 'Visakhapatnam',       lat: 17.6868, lng: 83.2185, aliases: ['visakhapatnam','vskp','vizag','vishakhapatnam'] },
  PURI: { name: 'Puri',                lat: 19.8135, lng: 85.8312, aliases: ['puri'] },
  CTC:  { name: 'Cuttack',             lat: 20.4625, lng: 85.8830, aliases: ['cuttack','ctc'] },
  // Western Zone
  BCT:  { name: 'Mumbai Central',      lat: 18.9696, lng: 72.8193, aliases: ['mumbai central','bct','bombay central'] },
  CSTM: { name: 'Mumbai CSMT',         lat: 18.9398, lng: 72.8355, aliases: ['mumbai csmt','cstm','csmt','victoria terminus','vt'] },
  LTT:  { name: 'Lokmanya Tilak Term.',lat: 19.0728, lng: 72.9762, aliases: ['lokmanya tilak','ltt','lokmanya tilak term'] },
  BDTS: { name: 'Bandra Terminus',     lat: 19.0544, lng: 72.8402, aliases: ['bandra','bdts','bandra terminus'] },
  ADI:  { name: 'Ahmedabad Jn.',       lat: 23.0225, lng: 72.5714, aliases: ['ahmedabad','adi','ahmedabad jn'] },
  ST:   { name: 'Surat',               lat: 21.2060, lng: 72.8369, aliases: ['surat','st'] },
  BRC:  { name: 'Vadodara Jn.',        lat: 22.3119, lng: 73.1723, aliases: ['vadodara','brc','baroda','vadodara jn'] },
  RTM:  { name: 'Ratlam Jn.',          lat: 23.3315, lng: 75.0367, aliases: ['ratlam','rtm','ratlam jn'] },
  // West Central Zone
  JBP:  { name: 'Jabalpur',            lat: 23.1815, lng: 79.9864, aliases: ['jabalpur','jbp'] },
  BPL:  { name: 'Bhopal Jn.',          lat: 23.2599, lng: 77.4126, aliases: ['bhopal','bpl','bhopal jn'] },
  KOTA: { name: 'Kota Jn.',            lat: 25.2138, lng: 75.8648, aliases: ['kota','kota jn'] },
  // Southern Zone
  MAS:  { name: 'Chennai Central',     lat: 13.0827, lng: 80.2707, aliases: ['chennai','mas','chennai central','madras'] },
  CBE:  { name: 'Coimbatore Jn.',      lat: 11.0018, lng: 76.9629, aliases: ['coimbatore','cbe','coimbatore jn'] },
  MDU:  { name: 'Madurai Jn.',         lat: 9.9195,  lng: 78.1193, aliases: ['madurai','mdu','madurai jn'] },
  TVC:  { name: 'Thiruvananthapuram',  lat: 8.4855,  lng: 76.9492, aliases: ['thiruvananthapuram','tvc','trivandrum'] },
  ERS:  { name: 'Ernakulam Jn.',       lat: 9.9816,  lng: 76.2999, aliases: ['ernakulam','ers','kochi','cochin'] },
  SA:   { name: 'Salem Jn.',           lat: 11.6643, lng: 78.1460, aliases: ['salem','sa','salem jn'] },
  ED:   { name: 'Erode Jn.',           lat: 11.3410, lng: 77.7172, aliases: ['erode','ed','erode jn'] },
  // South Central Zone
  SC:   { name: 'Secunderabad Jn.',    lat: 17.4399, lng: 78.4983, aliases: ['secunderabad','sc','secunderabad jn'] },
  HYB:  { name: 'Hyderabad Deccan',    lat: 17.3850, lng: 78.4867, aliases: ['hyderabad','hyb','hyderabad deccan'] },
  BZA:  { name: 'Vijayawada Jn.',      lat: 16.5062, lng: 80.6480, aliases: ['vijayawada','bza','vijayawada jn'] },
  GNT:  { name: 'Guntur Jn.',          lat: 16.3067, lng: 80.4365, aliases: ['guntur','gnt'] },
  TPTY: { name: 'Tirupati',            lat: 13.6288, lng: 79.4192, aliases: ['tirupati','tpty'] },
  // South Eastern Zone
  RNC:  { name: 'Ranchi',              lat: 23.3441, lng: 85.3096, aliases: ['ranchi','rnc'] },
  TATA: { name: 'Tatanagar Jn.',       lat: 22.7925, lng: 86.1842, aliases: ['tatanagar','tata','jamshedpur'] },
  KGP:  { name: 'Kharagpur Jn.',       lat: 22.3460, lng: 87.3191, aliases: ['kharagpur','kgp','kharagpur jn'] },
  // South East Central Zone
  R:    { name: 'Raipur Jn.',          lat: 21.2514, lng: 81.6296, aliases: ['raipur','r','raipur jn'] },
  BSP:  { name: 'Bilaspur Jn.',        lat: 22.0797, lng: 82.1409, aliases: ['bilaspur','bsp','bilaspur jn'] },
  // South Western Zone
  SBC:  { name: 'Bengaluru City',      lat: 12.9784, lng: 77.5723, aliases: ['bengaluru','sbc','bangalore','bengaluru city','bangalore city'] },
  UBL:  { name: 'Hubballi Jn.',        lat: 15.3647, lng: 75.1240, aliases: ['hubballi','ubl','hubli','hubballi jn'] },
  MAQ:  { name: 'Mangaluru Central',   lat: 12.8698, lng: 74.8431, aliases: ['mangaluru','maq','mangalore','mangaluru central'] },
  // Central Zone
  NGP:  { name: 'Nagpur Jn.',          lat: 21.1458, lng: 79.0882, aliases: ['nagpur','ngp','nagpur jn'] },
  PUNE: { name: 'Pune Jn.',            lat: 18.5286, lng: 73.8743, aliases: ['pune','pune jn'] },
  DD:   { name: 'Daund Jn.',           lat: 18.4600, lng: 74.5800, aliases: ['daund','dd','daund jn'] },
  SUR:  { name: 'Solapur',             lat: 17.6805, lng: 75.9064, aliases: ['solapur','sur'] },
  // Additional important stations
  ITJ:  { name: 'Itarsi Jn.',          lat: 22.6150, lng: 77.7630, aliases: ['itarsi','itj','itarsi jn'] },
  ET:   { name: 'Etawah',              lat: 26.7860, lng: 79.0200, aliases: ['etawah','et'] },
  TDL:  { name: 'Tundla Jn.',          lat: 27.2100, lng: 78.2400, aliases: ['tundla','tdl','tundla jn'] },
  MGS:  { name: 'Mughal Sarai Jn.',    lat: 25.2800, lng: 83.1200, aliases: ['mughal sarai','mgs','mughalsarai','mughal sarai jn'] },
  NDLS2:{ name: 'Ghaziabad',           lat: 28.6692, lng: 77.4538, aliases: ['ghaziabad'] },
  NJP:  { name: 'New Jalpaiguri',      lat: 26.7050, lng: 88.1620, aliases: ['new jalpaiguri','njp','siliguri'] },
  KIR:  { name: 'Katihar Jn.',         lat: 25.5500, lng: 87.5800, aliases: ['katihar','kir','katihar jn'] },
  MLD:  { name: 'Malda Town',          lat: 25.0000, lng: 88.1400, aliases: ['malda','mld','malda town'] },
  INDB: { name: 'Indore Jn.',          lat: 22.7196, lng: 75.8577, aliases: ['indore','indb','indore jn'] },
  UJN:  { name: 'Ujjain Jn.',          lat: 23.1765, lng: 75.7885, aliases: ['ujjain','ujn','ujjain jn'] },
  ABR:  { name: 'Abu Road',            lat: 24.4800, lng: 72.7800, aliases: ['abu road','abr'] },
  PBR:  { name: 'Porbandar',           lat: 21.6417, lng: 69.6293, aliases: ['porbandar','pbr'] },
  RJT:  { name: 'Rajkot Jn.',          lat: 22.3039, lng: 70.8022, aliases: ['rajkot','rjt','rajkot jn'] },
  BL:   { name: 'Anand Jn.',           lat: 22.5560, lng: 72.9280, aliases: ['anand','bl','anand jn'] },
  BDTS2:{ name: 'Borivali',            lat: 19.2307, lng: 72.8567, aliases: ['borivali'] },
  TNA:  { name: 'Thane',               lat: 19.1663, lng: 72.9526, aliases: ['thane','tna'] },
  KYN:  { name: 'Kalyan Jn.',          lat: 19.2437, lng: 73.1355, aliases: ['kalyan','kyn','kalyan jn'] },
  DR:   { name: 'Dadar',               lat: 19.0178, lng: 72.8478, aliases: ['dadar','dr'] },
  CSTM2:{ name: 'Nashik Road',         lat: 19.9975, lng: 73.7898, aliases: ['nashik','nashik road'] },
  AWB:  { name: 'Aurangabad',          lat: 19.8762, lng: 75.3433, aliases: ['aurangabad','awb'] },
  NED:  { name: 'Nanded',              lat: 19.1383, lng: 77.3210, aliases: ['nanded','ned'] },
  GR:   { name: 'Gulbarga',            lat: 17.3297, lng: 76.8343, aliases: ['gulbarga','gr','kalaburagi'] },
  WDI:  { name: 'Wadi Jn.',            lat: 17.0600, lng: 76.9800, aliases: ['wadi','wdi','wadi jn'] },
  BAY:  { name: 'Ballari Jn.',         lat: 15.1394, lng: 76.9214, aliases: ['ballari','bay','bellary'] },
  GTL:  { name: 'Guntakal Jn.',        lat: 15.1700, lng: 77.3700, aliases: ['guntakal','gtl','guntakal jn'] },
  RU:   { name: 'Renigunta Jn.',       lat: 13.6500, lng: 79.5100, aliases: ['renigunta','ru','renigunta jn'] },
  MAS2: { name: 'Katpadi Jn.',         lat: 12.9700, lng: 79.1500, aliases: ['katpadi','vellore'] },
  SA2:  { name: 'Jolarpettai',         lat: 12.5600, lng: 78.5800, aliases: ['jolarpettai'] },
  TJ:   { name: 'Thanjavur Jn.',       lat: 10.7870, lng: 79.1378, aliases: ['thanjavur','tanjore','tj'] },
  TPJ:  { name: 'Tiruchirappalli',     lat: 10.8050, lng: 78.6856, aliases: ['tiruchirappalli','tpj','trichy'] },
  NCJ:  { name: 'Nagercoil Jn.',       lat: 8.1833,  lng: 77.4167, aliases: ['nagercoil','ncj'] },
  QLN:  { name: 'Kollam Jn.',          lat: 8.8932,  lng: 76.6141, aliases: ['kollam','qln','quilon'] },
  SRR:  { name: 'Shoranur Jn.',        lat: 10.7667, lng: 76.2833, aliases: ['shoranur','srr','shoranur jn'] },
  PGT:  { name: 'Palakkad Jn.',        lat: 10.7867, lng: 76.6548, aliases: ['palakkad','pgt','palakkad jn','palghat'] },
  TCR:  { name: 'Thrissur',            lat: 10.5276, lng: 76.2144, aliases: ['thrissur','tcr','trichur'] },
  CLT:  { name: 'Kozhikode',           lat: 11.2588, lng: 75.7804, aliases: ['kozhikode','clt','calicut'] },
  CAN:  { name: 'Kannur',              lat: 11.8745, lng: 75.3704, aliases: ['kannur','can','cannanore'] },
  MAQ2: { name: 'Kasaragod',           lat: 12.4996, lng: 74.9869, aliases: ['kasaragod'] },
  LUR:  { name: 'Latur',               lat: 18.4088, lng: 76.5604, aliases: ['latur','lur'] },
  PAU:  { name: 'Panvel',              lat: 18.9894, lng: 73.1175, aliases: ['panvel','pau'] },
  PUNE2:{ name: 'Lonavala',            lat: 18.7481, lng: 73.4072, aliases: ['lonavala'] },
  SWV:  { name: 'Sawantwadi Road',     lat: 15.9000, lng: 73.8200, aliases: ['sawantwadi','swv'] },
  MAO:  { name: 'Madgaon',             lat: 15.3600, lng: 73.9600, aliases: ['madgaon','mao','margao','goa'] },
  VASCO:{ name: 'Vasco da Gama',       lat: 15.3980, lng: 73.8120, aliases: ['vasco','vasco da gama'] },
  // Northeast
  DBRG2:{ name: 'Tinsukia Jn.',        lat: 27.4900, lng: 95.3600, aliases: ['tinsukia','tinsukia jn'] },
  MXN:  { name: 'Mariani Jn.',         lat: 26.6600, lng: 94.3200, aliases: ['mariani','mxn','mariani jn'] },
  LMG:  { name: 'Lumding Jn.',         lat: 25.7500, lng: 93.1700, aliases: ['lumding','lmg','lumding jn'] },
  AGTL: { name: 'Agartala',            lat: 23.8315, lng: 91.2868, aliases: ['agartala','agtl'] },
};

// ── Build lookup maps ─────────────────────────────────────────────────────────
// 1. By station code (exact)
// 2. By normalized name/alias
const BY_CODE = {};
const BY_NAME = {};

Object.entries(STATIONS).forEach(([code, s]) => {
  BY_CODE[code.toUpperCase()] = s;
  s.aliases.forEach(alias => {
    BY_NAME[alias.toLowerCase().trim()] = s;
  });
});

// Resolve a station from a string like "New Delhi (NDLS)", "NDLS", "New Delhi"
function resolveStation(str) {
  if (!str) return null;
  const s = str.trim();

  // 1. Try extracting code from parentheses: "New Delhi (NDLS)"
  const codeMatch = s.match(/\(([A-Z0-9]{2,6})\)/);
  if (codeMatch) {
    const found = BY_CODE[codeMatch[1]];
    if (found) return found;
  }

  // 2. Try as a bare code (all caps, 2-6 chars)
  if (/^[A-Z0-9]{2,6}$/.test(s)) {
    const found = BY_CODE[s];
    if (found) return found;
  }

  // 3. Try full name / alias lookup (case-insensitive)
  const lower = s.toLowerCase().trim();
  if (BY_NAME[lower]) return BY_NAME[lower];

  // 4. Partial match — find first alias that contains the query
  for (const [alias, station] of Object.entries(BY_NAME)) {
    if (lower.includes(alias) || alias.includes(lower)) return station;
  }

  return null;
}

// ── Route corridors for drawing lines ────────────────────────────────────────
const ROUTES = [
  // Golden Quadrilateral + Diagonals
  ['NDLS','HWH'],['NDLS','BCT'],['NDLS','MAS'],['NDLS','SBC'],
  ['HWH','MAS'], ['BCT','MAS'],
  // Delhi corridors
  ['NDLS','ADI'],['NDLS','LKO'],['NDLS','JP'],['NDLS','PNBE'],
  ['NDLS','BSB'],['NDLS','AGC'],['NDLS','CNB'],['NDLS','GWL'],
  ['NDLS','ASR'],['NDLS','DDN'],['NDLS','JAT'],['NDLS','NZM'],
  // Mumbai corridors
  ['BCT','ADI'],['BCT','PUNE'],['BCT','NGP'],['BCT','BRC'],
  ['BCT','ST'], ['BCT','CSTM'],['BCT','LTT'],
  // Howrah / Kolkata corridors
  ['HWH','BBS'],['HWH','PNBE'],['HWH','GHY'],['HWH','DHN'],
  ['HWH','ASN'],['HWH','KGP'], ['HWH','NJP'],['HWH','MLD'],
  // Chennai corridors
  ['MAS','SBC'],['MAS','BZA'],['MAS','SC'],['MAS','CBE'],
  ['MAS','MDU'],['MAS','TVC'],['MAS','TPTY'],
  // Bengaluru corridors
  ['SBC','SC'],['SBC','PUNE'],['SBC','UBL'],['SBC','MAQ'],
  ['SBC','CBE'],['SBC','MAS'],
  // Nagpur hub
  ['NGP','BPL'],['NGP','VSKP'],['NGP','R'],['NGP','HWH'],
  ['NGP','SC'], ['NGP','PUNE'],['NGP','JBP'],
  // Bhopal / West Central
  ['BPL','NDLS'],['BPL','KOTA'],['BPL','ITJ'],['BPL','JBP'],
  ['BPL','ADI'],
  // Kota / Rajasthan
  ['KOTA','JP'],['KOTA','ADI'],['KOTA','NDLS'],
  ['JP','ADI'], ['JP','INDB'],
  // Lucknow / UP
  ['LKO','PNBE'],['LKO','BSB'],['LKO','CNB'],['LKO','GKP'],
  // Patna / Bihar
  ['PNBE','GAYA'],['PNBE','MFP'],['PNBE','DHN'],['PNBE','KIR'],
  // Allahabad / Prayagraj
  ['ALD','BSB'],['ALD','CNB'],['ALD','MGS'],
  // Varanasi
  ['BSB','MGS'],['BSB','GKP'],
  // Secunderabad / Hyderabad
  ['SC','BZA'],['SC','HYB'],['SC','NGP'],['SC','MAS'],
  ['SC','SBC'],['SC','GTL'],
  // Vijayawada
  ['BZA','MAS'],['BZA','VSKP'],['BZA','SC'],
  // Visakhapatnam
  ['VSKP','BBS'],['VSKP','BZA'],
  // Bhubaneswar / Odisha
  ['BBS','KGP'],['BBS','VSKP'],['BBS','HWH'],
  // Guwahati / Northeast
  ['GHY','NJP'],['GHY','DBRG'],['GHY','LMG'],
  // Ahmedabad / Gujarat
  ['ADI','BRC'],['ADI','ST'],['ADI','RJT'],['ADI','ABR'],
  // Pune / Maharashtra
  ['PUNE','NGP'],['PUNE','SBC'],['PUNE','SUR'],['PUNE','AWB'],
  // Raipur / Chhattisgarh
  ['R','NGP'],['R','BSP'],['R','BBS'],
  // Ranchi / Jharkhand
  ['RNC','DHN'],['RNC','TATA'],['RNC','HWH'],
  // South Kerala corridor
  ['TVC','ERS'],['TVC','QLN'],['ERS','SRR'],['ERS','CLT'],
  ['SRR','PGT'],['CLT','CAN'],
  // Coimbatore / Tamil Nadu
  ['CBE','MDU'],['CBE','SA'],['CBE','ED'],
  // Trichy / South TN
  ['TPJ','MDU'],['TPJ','MAS'],
  // Goa corridor
  ['MAO','SWV'],['MAO','UBL'],['MAO','VASCO'],
  // Hubballi / Karnataka
  ['UBL','SBC'],['UBL','MAQ'],['UBL','GTL'],
  // Guntakal hub
  ['GTL','SC'],['GTL','SBC'],['GTL','BAY'],
  // Kharagpur hub
  ['KGP','HWH'],['KGP','BBS'],['KGP','TATA'],
  // Itarsi hub
  ['ITJ','BPL'],['ITJ','NGP'],['ITJ','JBP'],
];

// ── Status → color ────────────────────────────────────────────────────────────
function statusColor(status, delay) {
  if (delay > 0) return '#f87171';
  switch ((status || '').toLowerCase()) {
    case 'running':   return '#22c55e';
    case 'halted':    return '#facc15';
    case 'scheduled': return '#60a5fa';
    default:          return '#94a3b8';
  }
}

// ── Deterministic pseudo-random (stable across re-renders) ───────────────────
function seededRand(seed) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

// ── Interpolate between two stations ─────────────────────────────────────────
function interpolate(src, dst, frac) {
  return {
    lat: src.lat + (dst.lat - src.lat) * frac,
    lng: src.lng + (dst.lng - src.lng) * frac,
  };
}

// ── Clamp to India bounds ─────────────────────────────────────────────────────
function clampIndia(pos) {
  return {
    lat: Math.max(6.5, Math.min(37.5, pos.lat)),
    lng: Math.max(66.0, Math.min(97.5, pos.lng)),
  };
}

export { STATIONS, BY_CODE, resolveStation };
const IndiaRailwayMap = React.memo(function IndiaRailwayMap({ liveTrains = [], filterMode = 'all', filterStation = null, filterZone = null, filterTrain = null, onMapReady }) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const markersRef   = useRef([]);
  const [ready, setReady] = useState(false);

  // ── Init map once ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current) return;

    import('leaflet').then(({ default: L }) => {
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(containerRef.current, {
        center:             [22.5, 80.0],
        zoom:               5,
        zoomControl:        false,
        attributionControl: false,
        minZoom:            4,
        maxZoom:            13,
        maxBounds:          [[5.5, 65.0], [38.0, 98.0]],
        maxBoundsViscosity: 0.9,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd', maxZoom: 19,
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Draw route lines with high visibility
      ROUTES.forEach(([sc, dc]) => {
        const s = BY_CODE[sc], d = BY_CODE[dc];
        if (!s || !d) return;
        L.polyline([[s.lat, s.lng], [d.lat, d.lng]], {
          color: '#FF9933',
          weight: 1.8,
          opacity: 0.75,
          dashArray: '6 8',
          className: 'railway-route-line',
        }).addTo(map);
      });

      // Draw hub station markers
      Object.values(STATIONS).forEach(hub => {
        const icon = L.divIcon({
          className: '',
          html: '<div style="width:9px;height:9px;border-radius:50%;background:#FF9933;border:2px solid rgba(255,153,51,0.5);box-shadow:0 0 7px rgba(255,153,51,0.7);"></div>',
          iconSize: [9, 9], iconAnchor: [4, 4],
        });
        L.marker([hub.lat, hub.lng], { icon, zIndexOffset: 200 })
          .addTo(map)
          .bindTooltip(
            '<div style="background:#0a0a0a;border:1px solid rgba(255,153,51,0.3);color:#fff;padding:4px 8px;border-radius:6px;font-size:10px;font-weight:700;white-space:nowrap">' + hub.name + '</div>',
            { permanent: false, direction: 'top', offset: [0, -7], className: 'ir-hub-tip' }
          );
      });

      mapRef.current = { map, L };
      setReady(true);
      if (onMapReady) onMapReady(map);
    });

    return () => {
      if (mapRef.current) { mapRef.current.map.remove(); mapRef.current = null; }
    };
  }, []);

  // ── Auto-zoom when filter changes ──────────────────────────────────────────
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const { map } = mapRef.current;

    if (filterMode === 'station' && filterStation) {
      const st = resolveStation(filterStation);
      if (st) { map.setView([st.lat, st.lng], 9, { animate: true }); return; }
    }
    if (filterMode === 'train' && filterTrain && liveTrains.length > 0) {
      const t = liveTrains[0];
      const st = resolveStation(t.current_location) || resolveStation(t.source);
      if (st) { map.setView([st.lat, st.lng], 9, { animate: true }); return; }
    }
    if (filterMode === 'all') {
      map.setView([22.5, 80.0], 5, { animate: true });
    }
  }, [ready, filterMode, filterStation, filterTrain, liveTrains.length]);

  // ── Update train markers ───────────────────────────────────────────────────
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const { map, L } = mapRef.current;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const maxMarkers = filterMode === 'all' ? 150 : liveTrains.length;
    liveTrains.slice(0, maxMarkers).forEach((t, i) => {
      const srcStation = resolveStation(t.source) || resolveStation(t.src);
      const dstStation = resolveStation(t.destination) || resolveStation(t.dst);
      const curStation = resolveStation(t.current_location);

      let pos = null;

      if (curStation) {
        pos = {
          lat: curStation.lat + (seededRand(i * 13) - 0.5) * 0.15,
          lng: curStation.lng + (seededRand(i * 17) - 0.5) * 0.15,
        };
      } else if (srcStation && dstStation) {
        const frac = 0.08 + seededRand(i * 7 + 3) * 0.84;
        pos = interpolate(srcStation, dstStation, frac);
        pos.lat += (seededRand(i * 11) - 0.5) * 0.12;
        pos.lng += (seededRand(i * 19) - 0.5) * 0.12;
      } else if (srcStation) {
        pos = { lat: srcStation.lat + (seededRand(i * 13) - 0.5) * 0.2, lng: srcStation.lng + (seededRand(i * 17) - 0.5) * 0.2 };
      } else if (dstStation) {
        pos = { lat: dstStation.lat + (seededRand(i * 13) - 0.5) * 0.2, lng: dstStation.lng + (seededRand(i * 17) - 0.5) * 0.2 };
      } else {
        const hubs = Object.values(STATIONS);
        const hub  = hubs[i % hubs.length];
        pos = {
          lat: hub.lat + (seededRand(i * 11) - 0.5) * 1.5,
          lng: hub.lng + (seededRand(i * 19) - 0.5) * 1.5,
        };
      }

      pos = clampIndia(pos);

      const color = statusColor(t.status, t.delay_minutes);
      // Larger markers in filtered/focused modes
      const size = (filterMode !== 'all') ? 8 : 6;
      const icon  = L.divIcon({
        className: '',
        html: '<div style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:' + color + ';border:1.5px solid ' + color + '88;box-shadow:0 0 6px ' + color + 'aa;cursor:pointer;"></div>',
        iconSize: [size, size], iconAnchor: [size/2, size/2],
      });

      const delayHtml = t.delay_minutes > 0
        ? '<span style="color:#f87171;font-weight:700">+' + t.delay_minutes + 'm</span>'
        : '<span style="color:#22c55e">On time</span>';

      const locLine = t.current_location
        ? '<div style="grid-column:span 2"><div style="color:#71717a;font-size:9px;text-transform:uppercase">Location</div><div style="color:#d4d4d8;font-size:10px">' + t.current_location + '</div></div>'
        : '';

      const popup = L.popup({ maxWidth: 240, closeButton: true, offset: [0, -4] }).setContent(
        '<div style="background:#0d0d0d;border:1px solid rgba(255,153,51,0.25);border-radius:10px;padding:12px;min-width:200px;font-family:system-ui,sans-serif">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
        '<span style="color:#FF9933;font-weight:900;font-size:13px">' + (t.train_number || '—') + '</span>' +
        '<span style="background:' + color + '22;color:' + color + ';border:1px solid ' + color + '44;padding:2px 7px;border-radius:4px;font-size:9px;font-weight:700;text-transform:uppercase">' + (t.status || '—') + '</span>' +
        '</div>' +
        '<div style="color:#e4e4e7;font-size:11px;font-weight:600;margin-bottom:8px">' + (t.train_name || '—') + '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;border-top:1px solid rgba(255,255,255,0.06);padding-top:8px">' +
        '<div><div style="color:#71717a;font-size:9px;text-transform:uppercase">From</div><div style="color:#fff;font-size:10px;font-weight:600">' + (t.source || '—') + '</div></div>' +
        '<div><div style="color:#71717a;font-size:9px;text-transform:uppercase">To</div><div style="color:#fff;font-size:10px;font-weight:600">' + (t.destination || '—') + '</div></div>' +
        '<div><div style="color:#71717a;font-size:9px;text-transform:uppercase">Speed</div><div style="color:#60a5fa;font-size:10px;font-weight:700">' + (t.speed || 0) + ' km/h</div></div>' +
        '<div><div style="color:#71717a;font-size:9px;text-transform:uppercase">Delay</div><div style="font-size:10px;font-weight:700">' + delayHtml + '</div></div>' +
        locLine +
        '</div></div>'
      );

      const marker = L.marker([pos.lat, pos.lng], { icon }).addTo(map).bindPopup(popup);
      markersRef.current.push(marker);
    });
  }, [ready, liveTrains]);

  return (
    <div className="relative w-full h-full">
      <style>{`
        .leaflet-container { background: #0a0a0a !important; }
        .leaflet-tile-pane { filter: brightness(0.8) saturate(0.6); }
        .leaflet-overlay-pane { filter: none !important; }
        .railway-route-line { filter: drop-shadow(0 0 3px rgba(255,153,51,0.5)); }
        .ir-hub-tip { background: transparent !important; border: none !important; box-shadow: none !important; padding: 0 !important; }
        .ir-hub-tip::before { display: none !important; }
        .leaflet-popup-content-wrapper { background: transparent !important; border: none !important; box-shadow: none !important; padding: 0 !important; border-radius: 0 !important; }
        .leaflet-popup-content { margin: 0 !important; }
        .leaflet-popup-tip-container { display: none !important; }
        .leaflet-control-zoom a { background: #1a1a1a !important; color: #FF9933 !important; border-color: rgba(255,153,51,0.2) !important; font-weight: 900; }
        .leaflet-control-zoom a:hover { background: #2a2a2a !important; }
        .leaflet-control-attribution { display: none !important; }
      `}</style>

      <div ref={containerRef} style={{ width: '100%', height: '100%', borderRadius: '12px' }} />

      <div className="absolute top-3 left-3 z-[1000] flex flex-col gap-1.5 pointer-events-none">
        <div className="bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-white">
            {filterMode === 'station' && filterStation ? `Station: ${filterStation}` :
             filterMode === 'zone'    && filterZone    ? `Zone: ${filterZone}` :
             filterMode === 'train'   && filterTrain   ? `Train: ${filterTrain}` :
             'Indian Railways · Live Network'}
          </span>
        </div>
        {liveTrains.length > 0 && (
          <div className="bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
            <span className="text-[9px] font-bold text-[#FF9933] uppercase tracking-widest">
              {liveTrains.length} trains · {liveTrains.filter(t => t.delay_minutes > 0).length} delayed
            </span>
          </div>
        )}
      </div>

      <div className="absolute bottom-8 left-3 z-[1000] flex flex-wrap gap-1.5 pointer-events-none max-w-[360px]">
        {[['#22c55e','On Time'],['#f87171','Delayed'],['#facc15','Halted'],['#60a5fa','Scheduled'],['#FF9933','Station']].map(([c, l]) => (
          <div key={l} className="flex items-center gap-1 bg-black/65 backdrop-blur-sm px-2 py-0.5 rounded-full border border-white/10">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: c }} />
            <span className="text-[8px] font-bold text-white/70 uppercase tracking-wide">{l}</span>
          </div>
        ))}
      </div>

      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a] rounded-xl z-[999]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-[#FF9933]/30 border-t-[#FF9933] rounded-full animate-spin" />
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Loading India Map…</span>
          </div>
        </div>
      )}
    </div>
  );
});

export default IndiaRailwayMap;
