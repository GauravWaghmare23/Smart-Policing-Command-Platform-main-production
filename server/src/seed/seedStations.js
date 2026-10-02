// seedStations.js
//
// Seeds real Nagpur police stations (verified coordinates) plus officers so that
// seed.js (complaints / FIRs / SOS) has stations and officers to attach to.
//
// Run order: seedAdmin.js -> seedStations.js -> seed.js
//
// Safe to re-run: it never deletes anything. Stations are matched by stationCode,
// users by email, officers by userId. Address/phone/email/jurisdiction come from
// NAGPUR_POLICE_STATIONS (seedNagpurOfficers.js); only the coordinates below
// are authoritative here.

import './guardProduction.js';
import { connectDB } from '../config/database.js';
import User from '../models/User.js';
import PoliceStation from '../models/PoliceStation.js';
import PoliceOfficer from '../models/PoliceOfficer.js';
import {
  ROLES,
  USER_STATUS,
  DUTY_STATUS,
  OFFICER_RANKS,
  STATION_STATUS
} from '../utils/constants.js';
import { NAGPUR_POLICE_STATIONS } from './seedNagpurOfficers.js';

// [stationCode, name, latitude, longitude]
const STATION_LOCATIONS = [
  ['AJN-NGP', 'Ajni Police Station', 21.12303, 79.09748],
  ['AMB-NGP', 'Ambazari Police Station', 21.14859, 79.05538],
  ['BAJ-NGP', 'Bajaj Nagar Police Station', 21.1369, 79.0785],
  ['BEL-NGP', 'Beltarodi Police Station', 21.0847, 79.0899],
  ['BHA-NGP', 'Bhandewadi Police Station', 21.1356, 79.1526],
  ['DHA-NGP', 'Dhantoli Police Station', 21.13739, 79.08536],
  ['GAN-NGP', 'Ganeshpeth Police Station', 21.14271, 79.1008],
  ['GIT-NGP', 'Gittikhadan Police Station', 21.17368, 79.06092],
  ['HIN-NGP', 'Hingna Police Station', 21.1167, 78.995],
  ['HUD-NGP', 'Hudkeshwar Police Station', 21.1058, 79.11719],
  ['IMA-NGP', 'Imamwada Police Station', 21.1254, 79.0985],
  ['JAR-NGP', 'Jaripatka Police Station', 21.18869, 79.09188],
  ['KAL-NGP', 'Kalamna Police Station', 21.1628, 79.14559],
  ['KAP-NGP', 'Kapil Nagar Police Station', 21.177, 79.117],
  ['KHA-NGP', 'Khaparkheda Police Station', 21.259, 79.196],
  ['KOR-NGP', 'Koradi Police Station', 21.246, 79.099],
  ['KOT-NGP', 'Kotwali Police Station', 21.1497, 79.1102],
  ['LAK-NGP', 'Lakadganj Police Station', 21.1459, 79.0882],
  ['MAN-NGP', 'Mankapur Police Station', 21.173, 79.062],
  ['MID-NGP', 'MIDC Police Station', 21.073, 78.98],
  ['NAN-NGP', 'Nandanvan Police Station', 21.13691, 79.12206],
  ['PAR-NGP', 'Pardi Police Station', 21.143, 79.17],
  ['RPN-NGP', 'R.P. Nagar Police Station', 21.147, 79.042],
  ['SAD-NGP', 'Sadar Police Station', 21.164, 79.073],
  ['SAK-NGP', 'Sakkardara Police Station', 21.132, 79.116],
  ['SHA-NGP', 'Shanti Nagar Police Station', 21.145, 79.108],
  ['SIT-NGP', 'Sitabuldi Police Station', 21.14406, 79.08356],
  ['SON-NGP', 'Sonegaon Police Station', 21.111, 79.085],
  ['TAH-NGP', 'Tahsil Police Station', 21.153, 79.102],
  ['WAD-NGP', 'Wadi Police Station', 21.145, 78.997],
  ['WAT-NGP', 'Wathoda Police Station', 21.132, 79.145],
  ['YAS-NGP', 'Yashodhara Nagar Police Station', 21.176, 79.086],
  // Not in the provided list; kept from the existing project data (home area).
  ['BUT-NGP', 'Butibori Police Station', 20.9258, 78.9942]
];

const DEMO_PASSWORD = 'password123';

const FIRST_NAMES = [
  'Vikram', 'Rajesh', 'Sanjay', 'Anil', 'Pradeep', 'Sunil', 'Ajay', 'Sachin',
  'Mahesh', 'Ganesh', 'Pravin', 'Nitin', 'Manoj', 'Amol', 'Santosh', 'Ramesh'
];
const LAST_NAMES = [
  'Patil', 'Deshmukh', 'Shinde', 'Jadhav', 'Pawar', 'Kulkarni', 'Chavan', 'Wagh',
  'Gaikwad', 'Bhosale', 'More', 'Kale', 'Raut', 'Kadam', 'Meshram', 'Borkar'
];

const officerName = (stationIndex, officerIndex) =>
  `${FIRST_NAMES[(stationIndex * 7 + officerIndex * 3) % FIRST_NAMES.length]} ` +
  `${LAST_NAMES[(stationIndex * 5 + officerIndex * 2) % LAST_NAMES.length]}`;

const seedStations = async () => {
  await connectDB();

  // Inserted IO first so seed.js (which picks the first available officer of a
  // station) assigns complaints/FIRs to the investigating officer, not the head.
  const OFFICER_TEMPLATES = [
    { key: 'inv01', suffix: 'IO01', role: ROLES.INVESTIGATING_OFFICER, rank: OFFICER_RANKS.SUB_INSPECTOR },
    { key: 'field01', suffix: 'FO01', role: ROLES.FIELD_OFFICER, rank: OFFICER_RANKS.HEAD_CONSTABLE },
    { key: 'field02', suffix: 'FO02', role: ROLES.FIELD_OFFICER, rank: OFFICER_RANKS.CONSTABLE },
    { key: 'head', suffix: 'SH01', role: ROLES.STATION_HEAD, rank: OFFICER_RANKS.INSPECTOR }
  ];

  let stationsCreated = 0;
  let stationsUpdated = 0;
  let officersCreated = 0;

  for (let i = 0; i < STATION_LOCATIONS.length; i++) {
    const [stationCode, name, latitude, longitude] = STATION_LOCATIONS[i];

    const meta = NAGPUR_POLICE_STATIONS.find((s) => s.stationCode === stationCode);
    if (!meta) {
      throw new Error(`No metadata found for station code ${stationCode}`);
    }

    // 1. Station (upsert by stationCode)
    let station = await PoliceStation.findOne({ stationCode });
    if (!station) {
      station = await PoliceStation.create({
        name,
        stationCode,
        address: meta.address,
        phone: meta.phone,
        email: meta.email || '',
        location: { latitude, longitude },
        jurisdictionRadiusKm: meta.jurisdictionRadiusKm,
        status: STATION_STATUS.ACTIVE
      });
      stationsCreated++;
    } else {
      station.name = name;
      station.location = { latitude, longitude };
      await station.save(); // pre-save hook re-syncs locationGeo
      stationsUpdated++;
    }

    // 2. Officers (User + PoliceOfficer), same email/badge scheme as seedNagpurOfficers.js
    const stationNum = String(i + 1).padStart(2, '0');
    const abbr = meta.slug.toUpperCase().slice(0, 4);
    let headUserId = null;

    for (let j = 0; j < OFFICER_TEMPLATES.length; j++) {
      const t = OFFICER_TEMPLATES[j];
      const email = `${meta.slug}.${t.key}@smartpolice.local`;

      let user = await User.findOne({ email });
      if (!user) {
        user = await User.create({
          name: officerName(i, j),
          email,
          phone: `9100${stationNum}000${j + 1}`,
          password: DEMO_PASSWORD,
          role: t.role,
          status: USER_STATUS.ACTIVE
        });
      }
      if (t.role === ROLES.STATION_HEAD) headUserId = user._id;

      const existingOfficer = await PoliceOfficer.findOne({ userId: user._id });
      if (!existingOfficer) {
        await PoliceOfficer.create({
          userId: user._id,
          stationId: station._id,
          badgeNumber: `MH-NGP-${abbr}-${t.suffix}`,
          rank: t.rank,
          role: t.role,
          dutyStatus: DUTY_STATUS.AVAILABLE
        });
        officersCreated++;
      }
    }

    if (headUserId && String(station.stationHeadId) !== String(headUserId)) {
      station.stationHeadId = headUserId;
      await station.save();
    }
  }

  console.log(`Stations created: ${stationsCreated}, updated: ${stationsUpdated}`);
  console.log(`Officers created: ${officersCreated}`);
  console.log('Station seed completed.');
};

seedStations()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Station seed failed:', error);
    process.exit(1);
  });