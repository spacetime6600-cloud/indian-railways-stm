'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Indian Railways STM — Comprehensive Seed
// 10,000 trains · 15 zones · 60 platforms · 20 users · 20 alerts · 20 maintenance · 30-day analytics
// ─────────────────────────────────────────────────────────────────────────────
const pool   = require('../config/db');
const fs     = require('fs');
const path   = require('path');
const bcrypt = require('bcryptjs');

const rand  = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randN = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const future = (d) => new Date(Date.now() + d * 86400000);
const past   = (d) => new Date(Date.now() - d * 86400000);

// ── 15 IR Zones ───────────────────────────────────────────────────────────────
const ZONES = [
  'Northern','North Eastern','North Western','North Central',
  'Eastern','East Central','East Coast',
  'Western','West Central',
  'Southern','South Central','South Eastern','South East Central','South Western',
  'Central',
];

// ── Stations [name, code, zone] ───────────────────────────────────────────────
const STATIONS = [
  ['New Delhi','NDLS','Northern'],
  ['Hazrat Nizamuddin','NZM','Northern'],
  ['Amritsar Jn.','ASR','Northern'],
  ['Ambala Cantt.','UMB','Northern'],
  ['Ludhiana Jn.','LDH','Northern'],
  ['Dehradun','DDN','Northern'],
  ['Gorakhpur Jn.','GKP','North Eastern'],
  ['Varanasi Jn.','BSB','North Eastern'],
  ['Lucknow Charbagh','LKO','North Eastern'],
  ['Guwahati','GHY','North Eastern'],
  ['Jaipur Jn.','JP','North Western'],
  ['Jodhpur Jn.','JU','North Western'],
  ['Ajmer Jn.','AII','North Western'],
  ['Prayagraj Jn.','ALD','North Central'],
  ['Kanpur Central','CNB','North Central'],
  ['Agra Cantt.','AGC','North Central'],
  ['Howrah Jn.','HWH','Eastern'],
  ['Sealdah','SDAH','Eastern'],
  ['Asansol Jn.','ASN','Eastern'],
  ['Dhanbad Jn.','DHN','Eastern'],
  ['Patna Jn.','PNBE','East Central'],
  ['Gaya Jn.','GAYA','East Central'],
  ['Muzaffarpur Jn.','MFP','East Central'],
  ['Bhubaneswar','BBS','East Coast'],
  ['Visakhapatnam','VSKP','East Coast'],
  ['Puri','PURI','East Coast'],
  ['Mumbai Central','BCT','Western'],
  ['Bandra Terminus','BDTS','Western'],
  ['Ahmedabad Jn.','ADI','Western'],
  ['Surat','ST','Western'],
  ['Vadodara Jn.','BRC','Western'],
  ['Jabalpur','JBP','West Central'],
  ['Bhopal Jn.','BPL','West Central'],
  ['Kota Jn.','KOTA','West Central'],
  ['Chennai Central','MAS','Southern'],
  ['Coimbatore Jn.','CBE','Southern'],
  ['Madurai Jn.','MDU','Southern'],
  ['Thiruvananthapuram','TVC','Southern'],
  ['Secunderabad Jn.','SC','South Central'],
  ['Hyderabad Deccan','HYB','South Central'],
  ['Vijayawada Jn.','BZA','South Central'],
  ['Bengaluru City','SBC','South Western'],
  ['Hubballi Jn.','UBL','South Western'],
  ['Mangaluru Central','MAQ','South Western'],
  ['Nagpur Jn.','NGP','Central'],
  ['Pune Jn.','PUNE','Central'],
  ['Lokmanya Tilak Term.','LTT','Central'],
  ['Ranchi','RNC','South Eastern'],
  ['Raipur Jn.','R','South East Central'],
  ['Bilaspur Jn.','BSP','South East Central'],
];

const STATION_MAP = {};
STATIONS.forEach(([name, code, zone]) => { STATION_MAP[code] = { name, zone }; });

// ── Train type config ─────────────────────────────────────────────────────────
const TYPE_CFG = {
  'Vande Bharat Express':  { min:130, max:180, dc:0.08 },
  'Rajdhani Express':      { min:110, max:150, dc:0.12 },
  'Shatabdi Express':      { min:100, max:140, dc:0.15 },
  'Duronto Express':       { min:100, max:140, dc:0.10 },
  'Tejas Express':         { min:120, max:160, dc:0.08 },
  'Garib Rath Express':    { min: 90, max:120, dc:0.18 },
  'Superfast Express':     { min: 80, max:120, dc:0.20 },
  'Mail Express':          { min: 70, max:110, dc:0.25 },
  'Intercity Express':     { min: 70, max:100, dc:0.22 },
  'Jan Shatabdi Express':  { min: 80, max:110, dc:0.20 },
  'Passenger':             { min: 40, max: 70, dc:0.35 },
  'MEMU':                  { min: 50, max: 80, dc:0.20 },
  'DEMU':                  { min: 50, max: 80, dc:0.22 },
  'Container Freight':     { min: 30, max: 70, dc:0.15 },
  'Coal Freight':          { min: 25, max: 60, dc:0.18 },
  'Goods Train':           { min: 20, max: 55, dc:0.20 },
  'Parcel Train':          { min: 40, max: 80, dc:0.15 },
  'Festival Special':      { min: 70, max:110, dc:0.30 },
  'Military Special':      { min: 60, max:100, dc:0.10 },
  'Medical Relief Train':  { min: 80, max:120, dc:0.05 },
};
const TRAIN_TYPES = Object.keys(TYPE_CFG);

// ── 100 real named trains [num, name, src, dst, type, zone] ──────────────────
const NAMED = [
  ['12301','Howrah Rajdhani Express','HWH','NDLS','Rajdhani Express','Northern'],
  ['12302','New Delhi Rajdhani Express','NDLS','HWH','Rajdhani Express','Eastern'],
  ['12951','Mumbai Rajdhani Express','BCT','NDLS','Rajdhani Express','Western'],
  ['12952','New Delhi Rajdhani Express','NDLS','BCT','Rajdhani Express','Northern'],
  ['12953','August Kranti Rajdhani','BCT','NDLS','Rajdhani Express','Western'],
  ['12001','New Delhi Shatabdi Express','NDLS','BPL','Shatabdi Express','North Central'],
  ['12002','Bhopal Shatabdi Express','BPL','NDLS','Shatabdi Express','West Central'],
  ['12009','Mumbai Shatabdi Express','BCT','ADI','Shatabdi Express','Western'],
  ['12010','Ahmedabad Shatabdi Express','ADI','BCT','Shatabdi Express','Western'],
  ['22435','Vande Bharat Express','NDLS','BSB','Vande Bharat Express','Northern'],
  ['22436','Varanasi Vande Bharat','BSB','NDLS','Vande Bharat Express','North Eastern'],
  ['20901','Mumbai-Ahmedabad Vande Bharat','BCT','ADI','Vande Bharat Express','Western'],
  ['20902','Ahmedabad-Mumbai Vande Bharat','ADI','BCT','Vande Bharat Express','Western'],
  ['12213','Mumbai Duronto Express','LTT','NDLS','Duronto Express','Western'],
  ['12214','New Delhi Duronto Express','NDLS','LTT','Duronto Express','Northern'],
  ['12203','Kolkata Garib Rath','HWH','NDLS','Garib Rath Express','Eastern'],
  ['12204','New Delhi Garib Rath','NDLS','HWH','Garib Rath Express','Northern'],
  ['12621','Tamil Nadu Express','NDLS','MAS','Mail Express','Southern'],
  ['12622','Tamil Nadu Express','MAS','NDLS','Mail Express','Northern'],
  ['12311','Kalka Mail','HWH','UMB','Mail Express','Eastern'],
  ['12312','Kalka Mail','UMB','HWH','Mail Express','Northern'],
  ['12423','Dibrugarh Rajdhani','NDLS','GHY','Rajdhani Express','North Eastern'],
  ['12424','Dibrugarh Rajdhani','GHY','NDLS','Rajdhani Express','North Eastern'],
  ['12431','Thiruvananthapuram Rajdhani','NDLS','TVC','Rajdhani Express','Southern'],
  ['12432','Thiruvananthapuram Rajdhani','TVC','NDLS','Rajdhani Express','Northern'],
  ['12433','Chennai Rajdhani Express','NDLS','MAS','Rajdhani Express','Southern'],
  ['12434','Chennai Rajdhani Express','MAS','NDLS','Rajdhani Express','Northern'],
  ['12259','Sealdah Duronto Express','SDAH','NDLS','Duronto Express','Eastern'],
  ['12260','New Delhi Duronto Express','NDLS','SDAH','Duronto Express','Northern'],
  ['12019','Howrah Shatabdi Express','HWH','NDLS','Shatabdi Express','Eastern'],
  ['12020','New Delhi Shatabdi Express','NDLS','HWH','Shatabdi Express','Northern'],
  ['12025','Pune Shatabdi Express','PUNE','SC','Shatabdi Express','South Central'],
  ['12026','Secunderabad Shatabdi','SC','PUNE','Shatabdi Express','South Central'],
  ['12027','Chennai Shatabdi Express','MAS','BZA','Shatabdi Express','Southern'],
  ['12028','Vijayawada Shatabdi','BZA','MAS','Shatabdi Express','South Central'],
  ['12049','Gatimaan Express','NDLS','AGC','Superfast Express','North Central'],
  ['12050','Gatimaan Express','AGC','NDLS','Superfast Express','Northern'],
  ['12101','Jnaneswari Super Deluxe','HWH','LTT','Superfast Express','Eastern'],
  ['12102','Jnaneswari Super Deluxe','LTT','HWH','Superfast Express','Central'],
  ['12123','Deccan Queen Express','PUNE','LTT','Superfast Express','Central'],
  ['12124','Deccan Queen Express','LTT','PUNE','Superfast Express','Central'],
  ['12201','Mumbai Garib Rath','LTT','PNBE','Garib Rath Express','East Central'],
  ['12202','Patna Garib Rath','PNBE','LTT','Garib Rath Express','Eastern'],
  ['12217','Sampark Kranti Express','NDLS','SC','Superfast Express','South Central'],
  ['12218','Sampark Kranti Express','SC','NDLS','Superfast Express','Northern'],
  ['12219','Secunderabad Rajdhani','NDLS','SC','Rajdhani Express','South Central'],
  ['12220','Secunderabad Rajdhani','SC','NDLS','Rajdhani Express','Northern'],
  ['12223','Mumbai CSMT Rajdhani','LTT','NDLS','Rajdhani Express','Northern'],
  ['12224','Mumbai CSMT Rajdhani','NDLS','LTT','Rajdhani Express','Central'],
  ['12225','Kaifiyat Express','ALD','NDLS','Superfast Express','Northern'],
  ['12226','Kaifiyat Express','NDLS','ALD','Superfast Express','North Central'],
  ['12229','Lucknow Mail','LKO','NDLS','Mail Express','Northern'],
  ['12230','Lucknow Mail','NDLS','LKO','Mail Express','North Eastern'],
  ['12237','Begampura Express','NDLS','ASR','Superfast Express','Northern'],
  ['12238','Begampura Express','ASR','NDLS','Superfast Express','Northern'],
  ['12243','Coromandel Express','HWH','MAS','Superfast Express','Southern'],
  ['12244','Coromandel Express','MAS','HWH','Superfast Express','Eastern'],
  ['12245','Howrah Duronto Express','HWH','NDLS','Duronto Express','Northern'],
  ['12246','New Delhi Duronto Express','NDLS','HWH','Duronto Express','Eastern'],
  ['12255','Brahmaputra Mail','NDLS','GHY','Mail Express','North Eastern'],
  ['12256','Brahmaputra Mail','GHY','NDLS','Mail Express','Northern'],
  ['12257','Kashi Vishwanath Express','NDLS','BSB','Superfast Express','North Eastern'],
  ['12258','Kashi Vishwanath Express','BSB','NDLS','Superfast Express','Northern'],
  ['12261','Howrah Duronto Express','HWH','PUNE','Duronto Express','Central'],
  ['12262','Pune Duronto Express','PUNE','HWH','Duronto Express','Eastern'],
  ['12265','Jaipur Duronto Express','JP','LTT','Duronto Express','Western'],
  ['12266','Mumbai Duronto Express','LTT','JP','Duronto Express','North Western'],
  ['12269','Chennai Duronto Express','NDLS','MAS','Duronto Express','Southern'],
  ['12270','New Delhi Duronto Express','MAS','NDLS','Duronto Express','Northern'],
  ['12271','Howrah Duronto Express','HWH','BBS','Duronto Express','East Coast'],
  ['12272','Bhubaneswar Duronto Express','BBS','HWH','Duronto Express','Eastern'],
  ['12273','Howrah Duronto Express','HWH','VSKP','Duronto Express','East Coast'],
  ['12274','Visakhapatnam Duronto Express','VSKP','HWH','Duronto Express','Eastern'],
  ['12279','Taj Express','NDLS','AGC','Superfast Express','North Central'],
  ['12280','Taj Express','AGC','NDLS','Superfast Express','Northern'],
  ['12559','Shiv Ganga Express','NDLS','BSB','Superfast Express','North Eastern'],
  ['12560','Shiv Ganga Express','BSB','NDLS','Superfast Express','Northern'],
  ['12561','Swatantrata Senani Express','NDLS','MFP','Superfast Express','East Central'],
  ['12562','Swatantrata Senani Express','MFP','NDLS','Superfast Express','Northern'],
  ['12563','Bihar Sampark Kranti','NDLS','PNBE','Superfast Express','East Central'],
  ['12564','Bihar Sampark Kranti','PNBE','NDLS','Superfast Express','Northern'],
  ['12565','Bihar Sampark Kranti','NDLS','DHN','Superfast Express','Eastern'],
  ['12566','Bihar Sampark Kranti','DHN','NDLS','Superfast Express','Northern'],
  ['12567','Sapt Kranti Express','NDLS','MFP','Superfast Express','East Central'],
  ['12568','Sapt Kranti Express','MFP','NDLS','Superfast Express','Northern'],
  ['12569','Jansadharan Express','NDLS','PNBE','Superfast Express','East Central'],
  ['12570','Jansadharan Express','PNBE','NDLS','Superfast Express','Northern'],
  ['12571','Gorakhpur Express','NDLS','GKP','Superfast Express','North Eastern'],
  ['12572','Gorakhpur Express','GKP','NDLS','Superfast Express','Northern'],
  ['12573','Dibrugarh Express','NDLS','GHY','Superfast Express','North Eastern'],
  ['12574','Dibrugarh Express','GHY','NDLS','Superfast Express','Northern'],
  ['12575','Magadh Express','NDLS','GAYA','Superfast Express','East Central'],
  ['12576','Magadh Express','GAYA','NDLS','Superfast Express','Northern'],
  ['12577','Bagmati Express','NDLS','MFP','Superfast Express','East Central'],
  ['12578','Bagmati Express','MFP','NDLS','Superfast Express','Northern'],
  ['12579','Poorabiya Express','NDLS','PNBE','Superfast Express','East Central'],
  ['12580','Poorabiya Express','PNBE','NDLS','Superfast Express','Northern'],
];

const LOCATIONS = [
  'Mughal Sarai Jn.','Kota Jn.','Agra Cantt.','Prayagraj Jn.','Surat','Vadodara Jn.',
  'Dhanbad Jn.','Shahdara','Andheri','Nagpur Jn.','Lucknow Charbagh','Dum Dum',
  'Mathura Jn.','Ratlam Jn.','Itarsi Jn.','Bina Jn.','Jhansi Jn.','Gwalior',
  'Etawah','Tundla Jn.','Ambala Cantt.','Ludhiana Jn.','Jalandhar City',
  'Haridwar Jn.','Roorkee','Saharanpur','Moradabad Jn.','Bareilly Jn.',
  'Faizabad Jn.','Sultanpur','Mughalsarai Jn.','Ghazipur City','Ballia',
  'Asansol Jn.','Kharagpur Jn.','Tatanagar Jn.','Rourkela','Sambalpur',
  'Vijayawada Jn.','Warangal','Kazipet Jn.','Erode Jn.','Salem Jn.',
  'Shoranur Jn.','Palakkad Jn.','Thrissur','Ernakulam Jn.','Kollam Jn.',
  'Hubli Jn.','Dharwad','Londa Jn.','Daund Jn.','Solapur',
  'Jabalpur','Katni Jn.','Satna','Manikpur Jn.','Allahabad City',
  'Bikaner Jn.','Suratgarh','Hanumangarh','Bathinda Jn.','Firozpur',
  'Dibrugarh','Tinsukia Jn.','Mariani Jn.','Lumding Jn.',
  'New Jalpaiguri','Siliguri Jn.','Kishanganj','Katihar Jn.','Malda Town',
];

async function bulkInsertTrains(rows) {
  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const vals = [], params = [];
    let idx = 1;
    for (const r of batch) {
      vals.push(`($${idx},$${idx+1},$${idx+2},$${idx+3},$${idx+4},$${idx+5},$${idx+6},$${idx+7},$${idx+8},$${idx+9},$${idx+10},$${idx+11},$${idx+12})`);
      params.push(r.num,r.name,r.route,r.src,r.dst,r.loc,r.zone,r.type,r.speed,r.delay,r.status,r.dp,r.rs);
      idx += 13;
    }
    await pool.query(
      `INSERT INTO trains(train_number,train_name,route,source,destination,current_location,zone,train_type,speed,delay_minutes,status,predicted_delay,risk_scores)
       VALUES ${vals.join(',')} ON CONFLICT(train_number) DO NOTHING`,
      params
    );
    process.stdout.write(`\r  Trains: ${Math.min(i+BATCH,rows.length).toLocaleString()}/${rows.length.toLocaleString()}`);
  }
  console.log('');
}
async function importData() {
  try {
    console.log('Running schema...');
    const sql = fs.readFileSync(path.join(__dirname,'../config/init_db.sql'),'utf8');
    await pool.query(sql);
    console.log('Schema ready.');
    await pool.query('TRUNCATE TABLE logs,maintenance,analytics,alerts CASCADE');
    await pool.query('UPDATE platforms SET assigned_train_id=NULL');
    await pool.query('TRUNCATE TABLE trains CASCADE');
    await pool.query('TRUNCATE TABLE platforms CASCADE');
    await pool.query('TRUNCATE TABLE users CASCADE');
    console.log('Old data cleared.');

    // ── Users ──────────────────────────────────────────────────────────────
    const hash = await bcrypt.hash('password123', 10);
    const uq = 'INSERT INTO users(full_name,email,password_hash,role,assigned_station,assigned_zone) VALUES($1,$2,$3,$4,$5,$6) RETURNING id';
    const adminId      = (await pool.query(uq,['Rajesh Kumar','admin@indianrailways.gov.in',hash,'admin',null,null])).rows[0].id;
    const ncId         = (await pool.query(uq,['Priya Sharma','controller@indianrailways.gov.in',hash,'national_controller',null,null])).rows[0].id;
    const zaId         = (await pool.query(uq,['Vikram Singh','zone.north@indianrailways.gov.in',hash,'zone_admin',null,'Northern'])).rows[0].id;
    const smId         = (await pool.query(uq,['Suresh Patel','master.ndls@indianrailways.gov.in',hash,'station_master','New Delhi','Northern'])).rows[0].id;
    const sm2Id        = (await pool.query(uq,['Anita Desai','master.hwh@indianrailways.gov.in',hash,'station_master','Howrah Jn.','Eastern'])).rows[0].id;
    const sm3Id        = (await pool.query(uq,['Ramesh Nair','master.mas@indianrailways.gov.in',hash,'station_master','Chennai Central','Southern'])).rows[0].id;
    const tcId         = (await pool.query(uq,['Deepak Verma','tc1@indianrailways.gov.in',hash,'traffic_controller',null,null])).rows[0].id;
    const tc2Id        = (await pool.query(uq,['Kavitha Rao','tc2@indianrailways.gov.in',hash,'traffic_controller',null,null])).rows[0].id;
    const dispId       = (await pool.query(uq,['Mohan Lal','disp1@indianrailways.gov.in',hash,'dispatcher','New Delhi','Northern'])).rows[0].id;
    const engId        = (await pool.query(uq,['Arun Singh','engineer@indianrailways.gov.in',hash,'engineer',null,null])).rows[0].id;
    const eng2Id       = (await pool.query(uq,['Sunita Mehta','engineer2@indianrailways.gov.in',hash,'engineer',null,null])).rows[0].id;
    const analystId    = (await pool.query(uq,['Pooja Iyer','analyst@indianrailways.gov.in',hash,'analyst',null,null])).rows[0].id;
    const viewerId     = (await pool.query(uq,['Ravi Kumar','viewer@indianrailways.gov.in',hash,'viewer',null,null])).rows[0].id;
    const za2Id        = (await pool.query(uq,['Sanjay Gupta','zone.west@indianrailways.gov.in',hash,'zone_admin',null,'Western'])).rows[0].id;
    const za3Id        = (await pool.query(uq,['Meena Pillai','zone.south@indianrailways.gov.in',hash,'zone_admin',null,'Southern'])).rows[0].id;
    const sm4Id        = (await pool.query(uq,['Harish Chandra','master.bct@indianrailways.gov.in',hash,'station_master','Mumbai Central','Western'])).rows[0].id;
    const sm5Id        = (await pool.query(uq,['Lalitha Devi','master.sc@indianrailways.gov.in',hash,'station_master','Secunderabad Jn.','South Central'])).rows[0].id;
    const tc3Id        = (await pool.query(uq,['Ajay Mishra','tc3@indianrailways.gov.in',hash,'traffic_controller',null,null])).rows[0].id;
    const disp2Id      = (await pool.query(uq,['Geeta Sharma','disp2@indianrailways.gov.in',hash,'dispatcher','Howrah Jn.','Eastern'])).rows[0].id;
    const viewer2Id    = (await pool.query(uq,['Nitin Joshi','viewer2@indianrailways.gov.in',hash,'viewer',null,null])).rows[0].id;
    console.log('Users created (20).');

    // ── Platforms (60 across major stations) ──────────────────────────────
    const pq = 'INSERT INTO platforms(platform_number,station_name,occupied,status,demand_forecasts,next_arrival) VALUES($1,$2,$3,$4,$5,$6) RETURNING id';
    const pids = {};
    const pfData = [
      ['PF-1','New Delhi (NDLS)',true,'active',92,new Date(Date.now()+3600000)],
      ['PF-2','New Delhi (NDLS)',false,'active',55,new Date(Date.now()+7200000)],
      ['PF-3','New Delhi (NDLS)',true,'active',78,new Date(Date.now()+1800000)],
      ['PF-4','New Delhi (NDLS)',false,'maintenance',20,null],
      ['PF-5','New Delhi (NDLS)',true,'active',85,new Date(Date.now()+5400000)],
      ['PF-6','New Delhi (NDLS)',false,'active',40,new Date(Date.now()+9000000)],
      ['PF-1','Howrah Jn. (HWH)',true,'active',95,new Date(Date.now()+2700000)],
      ['PF-2','Howrah Jn. (HWH)',false,'active',60,new Date(Date.now()+6300000)],
      ['PF-3','Howrah Jn. (HWH)',true,'active',88,new Date(Date.now()+1200000)],
      ['PF-4','Howrah Jn. (HWH)',false,'active',45,new Date(Date.now()+10800000)],
      ['PF-1','Mumbai Central (BCT)',true,'active',88,new Date(Date.now()+3000000)],
      ['PF-2','Mumbai Central (BCT)',false,'active',45,new Date(Date.now()+7800000)],
      ['PF-3','Mumbai Central (BCT)',true,'active',72,new Date(Date.now()+2400000)],
      ['PF-4','Mumbai Central (BCT)',false,'maintenance',15,null],
      ['PF-1','Chennai Central (MAS)',false,'active',40,new Date(Date.now()+4500000)],
      ['PF-2','Chennai Central (MAS)',true,'active',75,new Date(Date.now()+1500000)],
      ['PF-3','Chennai Central (MAS)',false,'active',55,new Date(Date.now()+8100000)],
      ['PF-1','Sealdah (SDAH)',true,'active',70,new Date(Date.now()+2100000)],
      ['PF-2','Sealdah (SDAH)',false,'active',35,new Date(Date.now()+6600000)],
      ['PF-1','Bengaluru City (SBC)',true,'active',82,new Date(Date.now()+3300000)],
      ['PF-2','Bengaluru City (SBC)',false,'active',50,new Date(Date.now()+7500000)],
      ['PF-3','Bengaluru City (SBC)',true,'active',68,new Date(Date.now()+1800000)],
      ['PF-1','Secunderabad Jn. (SC)',false,'active',60,new Date(Date.now()+4200000)],
      ['PF-2','Secunderabad Jn. (SC)',true,'active',78,new Date(Date.now()+900000)],
      ['PF-3','Secunderabad Jn. (SC)',false,'active',42,new Date(Date.now()+8400000)],
      ['PF-1','Ahmedabad Jn. (ADI)',true,'active',85,new Date(Date.now()+2400000)],
      ['PF-2','Ahmedabad Jn. (ADI)',false,'active',48,new Date(Date.now()+6900000)],
      ['PF-3','Ahmedabad Jn. (ADI)',true,'active',65,new Date(Date.now()+1200000)],
      ['PF-1','Patna Jn. (PNBE)',false,'active',55,new Date(Date.now()+5100000)],
      ['PF-2','Patna Jn. (PNBE)',true,'active',80,new Date(Date.now()+1800000)],
      ['PF-1','Pune Jn. (PUNE)',true,'active',75,new Date(Date.now()+2700000)],
      ['PF-2','Pune Jn. (PUNE)',false,'active',38,new Date(Date.now()+7200000)],
      ['PF-3','Pune Jn. (PUNE)',true,'active',62,new Date(Date.now()+3600000)],
      ['PF-1','Nagpur Jn. (NGP)',false,'active',45,new Date(Date.now()+4800000)],
      ['PF-2','Nagpur Jn. (NGP)',true,'active',70,new Date(Date.now()+1500000)],
      ['PF-1','Lucknow Charbagh (LKO)',true,'active',88,new Date(Date.now()+2100000)],
      ['PF-2','Lucknow Charbagh (LKO)',false,'active',52,new Date(Date.now()+6300000)],
      ['PF-3','Lucknow Charbagh (LKO)',true,'active',74,new Date(Date.now()+900000)],
      ['PF-1','Jaipur Jn. (JP)',false,'active',58,new Date(Date.now()+5400000)],
      ['PF-2','Jaipur Jn. (JP)',true,'active',82,new Date(Date.now()+1800000)],
      ['PF-1','Bhopal Jn. (BPL)',true,'active',65,new Date(Date.now()+3000000)],
      ['PF-2','Bhopal Jn. (BPL)',false,'active',40,new Date(Date.now()+7800000)],
      ['PF-1','Visakhapatnam (VSKP)',false,'active',50,new Date(Date.now()+4200000)],
      ['PF-2','Visakhapatnam (VSKP)',true,'active',72,new Date(Date.now()+1200000)],
      ['PF-1','Bhubaneswar (BBS)',true,'active',68,new Date(Date.now()+2400000)],
      ['PF-2','Bhubaneswar (BBS)',false,'active',35,new Date(Date.now()+6600000)],
      ['PF-1','Guwahati (GHY)',false,'active',55,new Date(Date.now()+5700000)],
      ['PF-2','Guwahati (GHY)',true,'active',78,new Date(Date.now()+1500000)],
      ['PF-1','Varanasi Jn. (BSB)',true,'active',85,new Date(Date.now()+2700000)],
      ['PF-2','Varanasi Jn. (BSB)',false,'active',48,new Date(Date.now()+7200000)],
      ['PF-1','Kanpur Central (CNB)',false,'active',60,new Date(Date.now()+4500000)],
      ['PF-2','Kanpur Central (CNB)',true,'active',75,new Date(Date.now()+1800000)],
      ['PF-1','Vijayawada Jn. (BZA)',true,'active',70,new Date(Date.now()+3300000)],
      ['PF-2','Vijayawada Jn. (BZA)',false,'active',42,new Date(Date.now()+7500000)],
      ['PF-1','Ranchi (RNC)',false,'active',45,new Date(Date.now()+5100000)],
      ['PF-2','Ranchi (RNC)',true,'active',65,new Date(Date.now()+2100000)],
      ['PF-1','Thiruvananthapuram (TVC)',true,'active',80,new Date(Date.now()+2400000)],
      ['PF-2','Thiruvananthapuram (TVC)',false,'active',38,new Date(Date.now()+6900000)],
      ['PF-1','Coimbatore Jn. (CBE)',false,'active',52,new Date(Date.now()+4800000)],
      ['PF-2','Coimbatore Jn. (CBE)',true,'active',72,new Date(Date.now()+1200000)],
      ['PF-1','Madurai Jn. (MDU)',true,'active',68,new Date(Date.now()+3000000)],
    ];
    const pfIds = [];
    for (const p of pfData) {
      const r = await pool.query(pq, p);
      pfIds.push(r.rows[0].id);
    }
    console.log(`Platforms created (${pfIds.length}).`);

    // ── 10,000 Trains ─────────────────────────────────────────────────────
    console.log('Generating 10,000 trains...');
    const usedNums = new Set(NAMED.map(n => n[0]));
    const namedRows = NAMED.map(n => {
      const cfg = TYPE_CFG[n[4]] || { min:80, max:120, dc:0.2 };
      const delay = Math.random() < cfg.dc ? randN(5,60) : 0;
      const status = delay > 0 ? 'delayed' : Math.random() < 0.7 ? 'running' : Math.random() < 0.5 ? 'scheduled' : 'halted';
      const srcName = STATION_MAP[n[2]] ? STATION_MAP[n[2]].name : n[2];
      const dstName = STATION_MAP[n[3]] ? STATION_MAP[n[3]].name : n[3];
      return { num:n[0], name:n[1], route:`${n[2]} - ${n[3]}`, src:srcName, dst:dstName,
               loc:rand(LOCATIONS), zone:n[5], type:n[4],
               speed:randN(cfg.min,cfg.max), delay, status, dp:randN(0,50), rs:randN(0,100) };
    });

    const genRows = [];
    for (let i = 0; i < 10000 - NAMED.length; i++) {
      let num;
      do { num = String(randN(10001,99999)); } while (usedNums.has(num));
      usedNums.add(num);
      const srcArr = rand(STATIONS);
      let dstArr = rand(STATIONS);
      while (dstArr[0] === srcArr[0]) dstArr = rand(STATIONS);
      const type = rand(TRAIN_TYPES);
      const cfg  = TYPE_CFG[type];
      const delay = Math.random() < cfg.dc ? randN(5,90) : 0;
      const status = delay > 0 ? 'delayed' : Math.random() < 0.68 ? 'running' : Math.random() < 0.5 ? 'scheduled' : 'halted';
      const zone = srcArr[2] || rand(ZONES);
      const nameParts = [
        `${srcArr[0]}-${dstArr[0]} ${type}`,
        `${srcArr[0]} ${type}`,
        `${dstArr[0]} ${type}`,
        `${zone} ${type}`,
      ];
      genRows.push({ num, name:rand(nameParts), route:`${srcArr[1]} - ${dstArr[1]}`,
                     src:srcArr[0], dst:dstArr[0], loc:rand(LOCATIONS), zone,
                     type, speed:randN(cfg.min,cfg.max), delay, status,
                     dp:randN(0,50), rs:randN(0,100) });
    }
    await bulkInsertTrains([...namedRows, ...genRows]);
    console.log('10,000 trains inserted.');

    // ── Assign named trains to platforms ──────────────────────────────────
    const getTid = async (num) => (await pool.query('SELECT id FROM trains WHERE train_number=$1',[num])).rows[0]?.id || null;
    const assign = async (tnum, pfIdx) => {
      const tid = await getTid(tnum);
      if (!tid || !pfIds[pfIdx]) return;
      await pool.query('UPDATE trains SET assigned_platform_id=$1 WHERE id=$2',[pfIds[pfIdx],tid]);
      await pool.query('UPDATE platforms SET assigned_train_id=$1 WHERE id=$2',[tid,pfIds[pfIdx]]);
    };
    await assign('12301',0); await assign('12951',1); await assign('12001',2);
    await assign('22435',4); await assign('12621',14); await assign('12203',6);
    await assign('12213',10); await assign('12243',7); await assign('12255',46);
    await assign('12219',22); await assign('20901',11); await assign('12431',15);
    console.log('Platform assignments done.');

    // ── 20 Realistic Alerts ───────────────────────────────────────────────
    const aq = 'INSERT INTO alerts(type,severity,title,message,station_name,related_train_id) VALUES($1,$2,$3,$4,$5,$6)';
    const t12301 = await getTid('12301'); const t12001 = await getTid('12001');
    const t12621 = await getTid('12621'); const t22435 = await getTid('22435');
    const t12951 = await getTid('12951'); const t12203 = await getTid('12203');
    const t12213 = await getTid('12213'); const t12219 = await getTid('12219');
    await pool.query(aq,['fog','critical','Dense Fog Alert — Northern Zone','Visibility below 50m at New Delhi. Rajdhani and Shatabdi services severely affected. Speed restriction 30 km/h imposed.','New Delhi',t12301]);
    await pool.query(aq,['delay','critical','12001 Shatabdi — 22 Min Delay','New Delhi Shatabdi delayed 22 minutes due to signal failure at Agra Cantt. Passengers advised to check platform.','New Delhi',t12001]);
    await pool.query(aq,['delay','high','12621 Tamil Nadu Express — 18 Min Delay','Tamil Nadu Express delayed 18 minutes. Freight priority at Nagpur Junction caused hold.','Nagpur',t12621]);
    await pool.query(aq,['maintenance','high','PF-4 NDLS — Emergency Track Maintenance','Platform 4 at New Delhi closed for urgent track maintenance. Ballast consolidation in progress. Reopening in 3 hours.','New Delhi',null]);
    await pool.query(aq,['weather','high','Heavy Rain Alert — Mumbai Division','IMD warns of heavy rainfall in Mumbai division. Western line services may face disruptions. Flood gates activated.','Mumbai',t12951]);
    await pool.query(aq,['signal','high','Signal Failure — Howrah Outer Loop','Signal failure at Howrah outer loop. Engineers dispatched. 4 trains held at Santragachi.','Kolkata',t12203]);
    await pool.query(aq,['rush','medium','Passenger Rush — Sealdah Station','Extreme rush at Sealdah. Crowd management deployed for evening peak hours. RPF alerted.','Kolkata',null]);
    await pool.query(aq,['delay','medium','12203 Garib Rath — 25 Min Delay','Garib Rath Express delayed 25 minutes due to freight priority at Dhanbad. Expected to recover 10 minutes en route.','Dhanbad',t12203]);
    await pool.query(aq,['fog','medium','Fog Advisory — Uttar Pradesh Sector','Moderate fog in UP sector. Trains on NDLS-CNB-ALD corridor running with caution. Delays of 10-15 min expected.','Kanpur',null]);
    await pool.query(aq,['maintenance','medium','Track Inspection — Bhopal Division','Scheduled track inspection on BPL-NGP section. Single-line working in effect. Trains may face 15-20 min delays.','Bhopal',null]);
    await pool.query(aq,['delay','medium','22435 Vande Bharat — 8 Min Delay','Vande Bharat Express delayed 8 minutes due to unscheduled halt at Prayagraj for medical emergency.','Prayagraj',t22435]);
    await pool.query(aq,['signal','medium','Signal Maintenance — Chennai Division','Preventive signal maintenance at MAS outer. Trains approaching Chennai Central running at restricted speed.','Chennai',null]);
    await pool.query(aq,['weather','medium','Cyclone Warning — East Coast Zone','IMD cyclone warning for Odisha coast. Bhubaneswar-Visakhapatnam services on alert. Cancellations possible.','Bhubaneswar',null]);
    await pool.query(aq,['rush','medium','Festival Rush — Varanasi Station','Chhath Puja rush at Varanasi. 15 special trains deployed. Platform crowd management in effect.','Varanasi',null]);
    await pool.query(aq,['delay','low','12951 Mumbai Rajdhani — 5 Min Delay','Mumbai Rajdhani delayed 5 minutes due to late departure from Mumbai Central. Expected to arrive on time.','Mumbai',t12951]);
    await pool.query(aq,['maintenance','low','Routine Inspection — Ghaziabad Shed','Routine locomotive inspection at Ghaziabad shed. WAP-7 fleet undergoing periodic maintenance. No service impact.','Ghaziabad',null]);
    await pool.query(aq,['signal','low','Signal Test — Ambala Division','Planned signal testing at Ambala Cantt. Brief disruptions possible between 02:00-04:00 IST. Night trains may face minor delays.','Ambala',null]);
    await pool.query(aq,['delay','low','12213 Duronto — 12 Min Delay','Mumbai Duronto delayed 12 minutes due to congestion at Vadodara. Recovery expected by Kota.','Vadodara',t12213]);
    await pool.query(aq,['weather','low','Heat Wave Advisory — Rajasthan Zone','Extreme heat advisory for Rajasthan. Passengers advised to carry water. Train AC systems on full capacity.','Jaipur',null]);
    await pool.query(aq,['maintenance','low','Bridge Inspection — Yamuna Bridge','Scheduled inspection of Yamuna Bridge at Prayagraj. Single-line working 00:00-06:00 IST. Minimal impact expected.','Prayagraj',null]);
    console.log('Alerts created (20).');

    // ── 20 Maintenance Records ────────────────────────────────────────────
    const mq = 'INSERT INTO maintenance(asset_type,asset_id,condition,risk_level,next_service_date,notes,status) VALUES($1,$2,$3,$4,$5,$6,$7)';
    await pool.query(mq,['locomotive','WAP-7 #30211','good','low',future(30),'Routine electrical inspection at Ghaziabad shed. Pantograph and traction motor check.','scheduled']);
    await pool.query(mq,['locomotive','WAP-5 #30007','fair','medium',future(7),'Pantograph replacement required. Air brake deviation -4.2%. Booked at Delhi shed.','in_progress']);
    await pool.query(mq,['track','NR-NDLS-PF4-01','poor','high',future(1),'Ballast consolidation and rail joint welding at PF-4 NDLS. Emergency closure in effect.','in_progress']);
    await pool.query(mq,['signal','SIG-HWH-OUTER-12','poor','high',future(0),'Signal relay failure at Howrah outer. Emergency repair team dispatched.','in_progress']);
    await pool.query(mq,['coach','LHB Coach #05812','good','low',future(60),'Periodic overhaul at Alambagh Workshop, Lucknow. Wheel tread and brake pad inspection.','scheduled']);
    await pool.query(mq,['coach','ICF Coach #98234','fair','medium',future(14),'Wheel tread inspection. Moderate wear observed. Replacement scheduled.','scheduled']);
    await pool.query(mq,['locomotive','WDP-4D #40119','good','low',future(45),'Diesel engine inspection at Tughlakabad shed. Fuel injection system check.','scheduled']);
    await pool.query(mq,['track','CR-BCT-MUM-09','fair','medium',future(10),'Monsoon track inspection on Mumbai-Pune route. Drainage clearance required.','scheduled']);
    await pool.query(mq,['locomotive','WAG-9 #31456','good','low',future(21),'Electric locomotive inspection at Bhusawal shed. Transformer oil change due.','scheduled']);
    await pool.query(mq,['signal','SIG-MAS-OUTER-05','fair','medium',future(5),'Signal timing calibration at Chennai outer. Relay testing in progress.','in_progress']);
    await pool.query(mq,['bridge','Yamuna Bridge PYJ-01','fair','high',future(3),'Annual structural inspection of Yamuna Bridge at Prayagraj. Crack monitoring sensors installed.','scheduled']);
    await pool.query(mq,['coach','LHB AC Coach #12301-A','good','low',future(90),'AC system overhaul for Rajdhani fleet. Compressor and condenser cleaning.','scheduled']);
    await pool.query(mq,['locomotive','WAP-4 #22345','poor','critical',future(0),'Emergency inspection after pantograph failure near Kanpur. Train withdrawn from service.','in_progress']);
    await pool.query(mq,['track','ER-HWH-ASN-14','fair','medium',future(8),'Track geometry correction on Howrah-Asansol section. Tamping machine deployed.','scheduled']);
    await pool.query(mq,['signal','SIG-SC-OUTER-08','good','low',future(30),'Routine signal maintenance at Secunderabad outer. LED signal head replacement.','scheduled']);
    await pool.query(mq,['locomotive','WDM-3A #16789','fair','medium',future(12),'Diesel engine overhaul at Erode shed. Turbocharger inspection required.','scheduled']);
    await pool.query(mq,['coach','DEMU Rake #GKP-04','fair','medium',future(15),'DEMU rake inspection at Gorakhpur workshop. Traction motor and gear box check.','scheduled']);
    await pool.query(mq,['track','NWR-JP-AII-07','good','low',future(25),'Preventive track maintenance on Jaipur-Ajmer section. Rail lubrication and fastener tightening.','scheduled']);
    await pool.query(mq,['bridge','Godavari Bridge BZA-01','fair','high',future(6),'Biannual inspection of Godavari Bridge at Rajahmundry. Pier scour monitoring.','scheduled']);
    await pool.query(mq,['locomotive','WAP-7 #30445','good','low',future(35),'Scheduled maintenance at Royapuram shed, Chennai. Pantograph and current collector check.','scheduled']);
    console.log('Maintenance records created (20).');

    // ── 30-day Analytics History ──────────────────────────────────────────
    for (let d = 29; d >= 0; d--) {
      const dt = new Date(Date.now() - d * 86400000).toISOString().split('T')[0];
      const total = 10000;
      const delayed = randN(1800, 2800);
      const onTime = Math.round(((total - delayed) / total) * 100 * 10) / 10;
      const avgDelay = (Math.random() * 15 + 5).toFixed(1);
      const platUsage = (Math.random() * 30 + 55).toFixed(1);
      const incidents = randN(15, 55);
      await pool.query(
        `INSERT INTO analytics(date,total_trains,delayed_trains,on_time_rate,avg_delay,platform_usage,incidents)
         VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(date) DO UPDATE SET
         total_trains=$2,delayed_trains=$3,on_time_rate=$4,avg_delay=$5,platform_usage=$6,incidents=$7`,
        [dt, total, delayed, onTime, avgDelay, platUsage, incidents]
      );
    }
    console.log('30-day analytics history created.');

    // ── Logs ──────────────────────────────────────────────────────────────
    await pool.query('INSERT INTO logs(user_id,action,module) VALUES($1,$2,$3)',[adminId,'BULK_SEED_10K','System']);

    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║   Indian Railways STM — Seed Complete                       ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log('║  10,000 trains  ·  60 platforms  ·  20 users                ║');
    console.log('║  20 alerts  ·  20 maintenance  ·  30-day analytics          ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log('║  admin@indianrailways.gov.in          → Admin               ║');
    console.log('║  controller@indianrailways.gov.in     → National Controller ║');
    console.log('║  master.ndls@indianrailways.gov.in    → Station Master NDLS ║');
    console.log('║  master.hwh@indianrailways.gov.in     → Station Master HWH  ║');
    console.log('║  engineer@indianrailways.gov.in       → Engineer            ║');
    console.log('║  analyst@indianrailways.gov.in        → Analyst             ║');
    console.log('║  viewer@indianrailways.gov.in         → Viewer              ║');
    console.log('║  Password for all: password123                              ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    process.exit(0);
  } catch (err) {
    console.error('\nSeed Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

importData();
