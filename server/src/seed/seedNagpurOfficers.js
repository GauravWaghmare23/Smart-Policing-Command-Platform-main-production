import './guardProduction.js';
import mongoose from 'mongoose';
import { connectDB } from '../config/database.js';
import User from '../models/User.js';
import PoliceStation from '../models/PoliceStation.js';
import PoliceOfficer from '../models/PoliceOfficer.js';
import { env } from '../config/env.js';
import { ROLES, OFFICER_RANKS, DUTY_STATUS, USER_STATUS, STATION_STATUS } from '../utils/constants.js';

// Official Nagpur City Police Stations Directory
// Source: https://nagpurpolice.gov.in/police-stations
export const NAGPUR_POLICE_STATIONS = [
  {
    name: 'Ajni Police Station',
    stationCode: 'AJN-NGP',
    slug: 'ajni',
    address: 'Near Ajni Square, Wardha Road, Ajni, Nagpur - 440015',
    phone: '0712-2746433',
    email: 'ajanipst.ngp@gmail.com',
    location: { latitude: 21.12303, longitude: 79.09748 },
    jurisdictionRadiusKm: 5
  },
  {
    name: 'Ambazari Police Station',
    stationCode: 'AMB-NGP',
    slug: 'ambazari',
    address: 'Near Ambazari Lake, Ambazari Road, Nagpur - 440033',
    phone: '0712-2244433',
    email: 'ps.ambazari.ngp@mahapolice.gov.in',
    location: { latitude: 21.14859, longitude: 79.05538 },
    jurisdictionRadiusKm: 5
  },
  {
    name: 'Bajaj Nagar Police Station',
    stationCode: 'BAJ-NGP',
    slug: 'bajajnagar',
    address: 'Bajaj Nagar, South Ambazari Road, Nagpur - 440010',
    phone: '0712-2244455',
    email: 'bajajnagarps.ngp@gmail.com',
    location: { latitude: 21.1265, longitude: 79.0624 },
    jurisdictionRadiusKm: 5
  },
  {
    name: 'Beltarodi Police Station',
    stationCode: 'BEL-NGP',
    slug: 'beltarodi',
    address: 'Beltarodi, Outer Ring Road, Nagpur - 440037',
    phone: '0712-2747100',
    email: 'ps.beltarodi.ngp-mh@gov.in',
    location: { latitude: 21.0772, longitude: 79.0768 },
    jurisdictionRadiusKm: 6
  },
  {
    name: 'Bhandewadi Police Station',
    stationCode: 'BHA-NGP',
    slug: 'bhandewadi',
    address: 'Bhandewadi, Shanti Nagar Road, Nagpur - 440008',
    phone: '0712-2712200',
    email: 'psbhandewadinagpurcity@gmail.com',
    location: { latitude: 21.1396, longitude: 79.1558 },
    jurisdictionRadiusKm: 5
  },
  {
    name: 'Butibori Police Station',
    stationCode: 'BUT-NGP',
    slug: 'butibori',
    address: 'MIDC Industrial Area, Butibori, Nagpur - 441108',
    phone: '07104-265100',
    email: '',
    location: { latitude: 20.9258, longitude: 78.9942 },
    jurisdictionRadiusKm: 8
  },
  {
    name: 'Dhantoli Police Station',
    stationCode: 'DHA-NGP',
    slug: 'dhantoli',
    address: 'Dhantoli Main Road, Mehadia Square, Nagpur - 440012',
    phone: '0712-2423333',
    email: 'ps.dhantoli.ngp@mahapolice.gov.in',
    location: { latitude: 21.13739, longitude: 79.08536 },
    jurisdictionRadiusKm: 4
  },
  {
    name: 'Ganeshpeth Police Station',
    stationCode: 'GAN-NGP',
    slug: 'ganeshpeth',
    address: 'Near Central Bus Station, Ganeshpeth, Nagpur - 440018',
    phone: '0712-2723333',
    email: 'ps.ganeshpeth.ngp@mahapolice.gov.in',
    location: { latitude: 21.14271, longitude: 79.10080 },
    jurisdictionRadiusKm: 4
  },
  {
    name: 'Gittikhadan Police Station',
    stationCode: 'GIT-NGP',
    slug: 'gittikhadan',
    address: 'Katol Road, Gittikhadan, Nagpur - 440013',
    phone: '0712-2582233',
    email: 'ps.gittikhadan.ngp@mahapolice.gov.in',
    location: { latitude: 21.1714, longitude: 79.0528 },
    jurisdictionRadiusKm: 6
  },
  {
    name: 'Hingna Police Station',
    stationCode: 'HIN-NGP',
    slug: 'hingna',
    address: 'Hingna Main Road, Hingna, Nagpur - 441110',
    phone: '07104-242133',
    email: 'ps.hingna.ngp@mahapolice.gov.in',
    location: { latitude: 21.0664, longitude: 78.9723 },
    jurisdictionRadiusKm: 7
  },
  {
    name: 'Hudkeshwar Police Station',
    stationCode: 'HUD-NGP',
    slug: 'hudkeshwar',
    address: 'Hudkeshwar Road, Nagpur - 440034',
    phone: '0712-2741200',
    email: 'ps.hudkeshwar.ngp@mahapolice.gov.in',
    location: { latitude: 21.0963, longitude: 79.1171 },
    jurisdictionRadiusKm: 6
  },
  {
    name: 'Imamwada Police Station',
    stationCode: 'IMA-NGP',
    slug: 'imamwada',
    address: 'Imamwada, Great Nag Road, Nagpur - 440003',
    phone: '0712-2743322',
    email: 'ps.imamwada.ngp@mahapolice.gov.in',
    location: { latitude: 21.1332, longitude: 79.0945 },
    jurisdictionRadiusKm: 4
  },
  {
    name: 'Jaripatka Police Station',
    stationCode: 'JAR-NGP',
    slug: 'jaripatka',
    address: 'Jaripatka Main Market, Nagpur - 440014',
    phone: '0712-2641122',
    email: 'ps.jaripatka.ngp@mahapolice.gov.in',
    location: { latitude: 21.1852, longitude: 79.0898 },
    jurisdictionRadiusKm: 5
  },
  {
    name: 'Kalamna Police Station',
    stationCode: 'KAL-NGP',
    slug: 'kalamna',
    address: 'Kalamna Market Road, Nagpur - 440035',
    phone: '0712-2681122',
    email: 'ps.kalamna.ngp@mahapolice.gov.in',
    location: { latitude: 21.1706, longitude: 79.1418 },
    jurisdictionRadiusKm: 6
  },
  {
    name: 'Kapil Nagar Police Station',
    stationCode: 'KAP-NGP',
    slug: 'kapilnagar',
    address: 'Kapil Nagar, Uppalwadi, Nagpur - 440026',
    phone: '0712-2631200',
    email: 'ps.kapilnagar.ngp@mahapolice.gov.in',
    location: { latitude: 21.1963, longitude: 79.1001 },
    jurisdictionRadiusKm: 5
  },
  {
    name: 'Khaparkheda Police Station',
    stationCode: 'KHA-NGP',
    slug: 'khaparkheda',
    address: 'Khaparkheda Power Plant Area, Nagpur - 441102',
    phone: '07113-262100',
    email: 'ps.khaparkheda.ngp@mahapolice.gov.in',
    location: { latitude: 21.2721, longitude: 79.1215 },
    jurisdictionRadiusKm: 8
  },
  {
    name: 'Koradi Police Station',
    stationCode: 'KOR-NGP',
    slug: 'koradi',
    address: 'Koradi Temple Road, Nagpur - 441111',
    phone: '07109-262233',
    email: 'ps.koradi.ngp@mahapolice.gov.in',
    location: { latitude: 21.2394, longitude: 79.0988 },
    jurisdictionRadiusKm: 7
  },
  {
    name: 'Kotwali Police Station',
    stationCode: 'KOT-NGP',
    slug: 'kotwali',
    address: 'Badkas Chowk, Mahal, Kotwali, Nagpur - 440032',
    phone: '0712-2722233',
    email: 'kotwalips.ngp@gmail.com',
    location: { latitude: 21.1458, longitude: 79.1054 },
    jurisdictionRadiusKm: 4
  },
  {
    name: 'Lakadganj Police Station',
    stationCode: 'LAK-NGP',
    slug: 'lakadganj',
    address: 'Near Timber Market, Lakadganj, Nagpur - 440008',
    phone: '0712-2766633',
    email: 'ps.lakadganj.ngp@mahapolice.gov.in',
    location: { latitude: 21.15406, longitude: 79.12104 },
    jurisdictionRadiusKm: 5
  },
  {
    name: 'Mankapur Police Station',
    stationCode: 'MAN-NGP',
    slug: 'mankapur',
    address: 'Near Mankapur Sports Complex, Koradi Road, Nagpur - 440030',
    phone: '0712-2591133',
    email: 'mankapurps.ngp@gmail.com',
    location: { latitude: 21.1895, longitude: 79.0762 },
    jurisdictionRadiusKm: 5
  },
  {
    name: 'MIDC Police Station',
    stationCode: 'MID-NGP',
    slug: 'midc',
    address: 'MIDC Industrial Area, Hingna Road, Nagpur - 440028',
    phone: '07104-237733',
    email: 'Ps.midc.nag@mahapolice.gov.in',
    location: { latitude: 21.1189, longitude: 79.0062 },
    jurisdictionRadiusKm: 6
  },
  {
    name: 'Nandanvan Police Station',
    stationCode: 'NAN-NGP',
    slug: 'nandanvan',
    address: 'KDK College Road, Nandanvan, Nagpur - 440009',
    phone: '0712-2711133',
    email: 'ps.nandanvan.ngp@mahapolice.gov.in',
    location: { latitude: 21.13691, longitude: 79.12206 },
    jurisdictionRadiusKm: 5
  },
  {
    name: 'New Kamptee Police Station',
    stationCode: 'NKP-NGP',
    slug: 'newkamptee',
    address: 'Cantonment Area, New Kamptee, Nagpur - 441002',
    phone: '07109-282133',
    email: 'kampteewireless@gmail.com',
    location: { latitude: 21.2228, longitude: 79.1995 },
    jurisdictionRadiusKm: 6
  },
  {
    name: 'North Cyber Police Station',
    stationCode: 'NCY-NGP',
    slug: 'northcyber',
    address: 'Police Commissioner Office Complex, Civil Lines, Nagpur - 440001',
    phone: '0712-2566766',
    email: 'ps.cybernagpur-mh@gov.in',
    location: { latitude: 21.1630, longitude: 79.0795 },
    jurisdictionRadiusKm: 15
  },
  {
    name: 'Old Kamptee Police Station',
    stationCode: 'OKP-NGP',
    slug: 'oldkamptee',
    address: 'Main Road, Old Kamptee, Nagpur - 441001',
    phone: '07109-288222',
    email: 'ps.junikamthi.ngp-mh@mah.gov.in',
    location: { latitude: 21.2185, longitude: 79.1864 },
    jurisdictionRadiusKm: 6
  },
  {
    name: 'Panchpaoli Police Station',
    stationCode: 'PAN-NGP',
    slug: 'panchpaoli',
    address: 'Panchpaoli Overbridge Road, Nagpur - 440017',
    phone: '0712-2651133',
    email: 'panchpaoli.ngp@gmail.com',
    location: { latitude: 21.1662, longitude: 79.1082 },
    jurisdictionRadiusKm: 4
  },
  {
    name: 'Pardi Police Station',
    stationCode: 'PAR-NGP',
    slug: 'pardi',
    address: 'Bhandara Road, Pardi Naka, Nagpur - 440035',
    phone: '0712-2682200',
    email: 'ps.pardi.ngp-mh@gov.in',
    location: { latitude: 21.1492, longitude: 79.1578 },
    jurisdictionRadiusKm: 6
  },
  {
    name: 'R.P. Nagar / Pratap Nagar Police Station',
    stationCode: 'RPN-NGP',
    slug: 'pratapnagar',
    address: 'Pratap Nagar Square, Ring Road, Nagpur - 440022',
    phone: '0712-2282233',
    email: 'ps.pratapnagar.ngp@mahapolice.gov.in',
    location: { latitude: 21.11554, longitude: 79.03983 },
    jurisdictionRadiusKm: 5
  },
  {
    name: 'Sadar Police Station',
    stationCode: 'SAD-NGP',
    slug: 'sadar',
    address: 'Residency Road, Sadar, Nagpur - 440001',
    phone: '0712-2531133',
    email: 'sadar.ngp@mahapolice.gov.in',
    location: { latitude: 21.16303, longitude: 79.07954 },
    jurisdictionRadiusKm: 4
  },
  {
    name: 'Sakkardara Police Station',
    stationCode: 'SAK-NGP',
    slug: 'sakkardara',
    address: 'Sakkardara Square, Umred Road, Nagpur - 440009',
    phone: '0712-2748833',
    email: 'sakkardaraps.ngp@gmail.com',
    location: { latitude: 21.1215, longitude: 79.1172 },
    jurisdictionRadiusKm: 5
  },
  {
    name: 'Shanti Nagar Police Station',
    stationCode: 'SHA-NGP',
    slug: 'shantinagar',
    address: 'Shanti Nagar Main Road, Nagpur - 440002',
    phone: '0712-2761100',
    email: 'ps.shantingr.ngpmh@gov.in',
    location: { latitude: 21.1638, longitude: 79.1265 },
    jurisdictionRadiusKm: 5
  },
  {
    name: 'Sitabuldi Police Station',
    stationCode: 'SIT-NGP',
    slug: 'sitabuldi',
    address: 'Near Variety Square, Sitabuldi, Nagpur - 440012',
    phone: '0712-2522233',
    email: 'ps.sitabuldi.ngp@mahapolice.gov.in',
    location: { latitude: 21.1443, longitude: 79.08034 },
    jurisdictionRadiusKm: 4
  },
  {
    name: 'Sonegaon Police Station',
    stationCode: 'SON-NGP',
    slug: 'sonegaon',
    address: 'Wardha Road, Near Airport, Sonegaon, Nagpur - 440025',
    phone: '0712-2288833',
    email: 'sonegaonps.ngp@gmail.com',
    location: { latitude: 21.0952, longitude: 79.0583 },
    jurisdictionRadiusKm: 6
  },
  {
    name: 'South Cyber Police Station',
    stationCode: 'SCY-NGP',
    slug: 'southcyber',
    address: 'Ajni Police Complex, Wardha Road, Nagpur - 440015',
    phone: '0712-2746400',
    email: 'ps.cybernagpur-mh@gov.in',
    location: { latitude: 21.1230, longitude: 79.0975 },
    jurisdictionRadiusKm: 15
  },
  {
    name: 'Tahsil Police Station',
    stationCode: 'TAH-NGP',
    slug: 'tahsil',
    address: 'Gandhibagh, Tahsil, Nagpur - 440002',
    phone: '0712-2721133',
    email: 'Ps.tahsil.ngp@mahapolicegov.in',
    location: { latitude: 21.1521, longitude: 79.1023 },
    jurisdictionRadiusKm: 4
  },
  {
    name: 'Wadi Police Station',
    stationCode: 'WAD-NGP',
    slug: 'wadi',
    address: 'Amravati Road, Wadi Naka, Nagpur - 440023',
    phone: '07104-222133',
    email: 'ps.wadi.ngp@mahapolice.gov.in',
    location: { latitude: 21.1495, longitude: 79.0112 },
    jurisdictionRadiusKm: 7
  },
  {
    name: 'Wathoda Police Station',
    stationCode: 'WAT-NGP',
    slug: 'wathoda',
    address: 'Wathoda Layout, Kharbi Road, Nagpur - 440009',
    phone: '0712-2715500',
    email: 'ps.wathoda.ngp@mahapolice.gov.in',
    location: { latitude: 21.1285, longitude: 79.1482 },
    jurisdictionRadiusKm: 5
  },
  {
    name: 'Yashodhara Nagar Police Station',
    stationCode: 'YAS-NGP',
    slug: 'yashodharanagar',
    address: 'Yashodhara Nagar, Kundanlal Gupta Nagar, Nagpur - 440026',
    phone: '0712-2632200',
    email: 'ps.yashodhara.ngp@mahapolice.gov.in',
    location: { latitude: 21.1925, longitude: 79.1245 },
    jurisdictionRadiusKm: 6
  }
];

// Realistic pools of fictional officer first and last names for Nagpur
const FIRST_NAMES = [
  'Vikram', 'Rajesh', 'Sanjay', 'Anil', 'Pradeep', 'Sunil', 'Ajay', 'Sachin',
  'Mahesh', 'Ganesh', 'Pravin', 'Nitin', 'Manoj', 'Amol', 'Santosh', 'Ramesh',
  'Deepak', 'Suresh', 'Kiran', 'Vijay', 'Sandip', 'Pramod', 'Avinash', 'Rahul',
  'Ashok', 'Dhananjay', 'Bhushan', 'Shashank', 'Kishor', 'Sudhir', 'Devendra',
  'Rohit', 'Ravindra', 'Chetan', 'Umesh', 'Milind', 'Tushar', 'Sarang', 'Anand'
];

const LAST_NAMES = [
  'Patil', 'Deshmukh', 'Shinde', 'Jadhav', 'Pawar', 'Kulkarni', 'Chavan', 'Wagh',
  'Gaikwad', 'Bhosale', 'More', 'Kale', 'Sawant', 'Mane', 'Raut', 'Kadam',
  'Ghuge', 'Meshram', 'Bhende', 'Waghmare', 'Thakre', 'Tembhurne', 'Gawande',
  'Borkar', 'Zade', 'Nagpure', 'Tirpude', 'Chaudhari', 'Mahajan', 'Gudadhe'
];

/**
 * Generate a consistent fictional full name based on station index and position
 */
function getFictionalOfficerName(stationIndex, officerIndex) {
  const fIndex = (stationIndex * 7 + officerIndex * 3) % FIRST_NAMES.length;
  const lIndex = (stationIndex * 5 + officerIndex * 2) % LAST_NAMES.length;
  return `${FIRST_NAMES[fIndex]} ${LAST_NAMES[lIndex]}`;
}

const DEFAULT_DEMO_PASSWORD = 'password123';

/**
 * Main seeding script
 */
export const seedNagpurPoliceAndOfficers = async () => {
  console.log('---------------------------------------------------------');
  console.log('Smart Police Station - Nagpur Police & Officers Seeder');
  console.log('---------------------------------------------------------');

  await connectDB();

  try {
    // 1. Ensure Control Room Admin exists without overwriting
    console.log('\n[1/3] Checking Control Room Admin...');
    let adminUser = await User.findOne({ email: env.admin.email });
    if (!adminUser) {
      adminUser = await User.create({
        name: env.admin.name || 'Control Room Admin',
        email: env.admin.email,
        phone: '9999999999',
        password: env.admin.password || DEFAULT_DEMO_PASSWORD,
        role: ROLES.CONTROL_ROOM_ADMIN,
        status: USER_STATUS.ACTIVE
      });
      console.log(`✓ Created Control Room Admin (${env.admin.email})`);
    } else {
      console.log(`✓ Preserved existing Control Room Admin (${env.admin.email})`);
    }

    // 2. Seed / Upsert Police Stations
    console.log(`\n[2/3] Seeding ${NAGPUR_POLICE_STATIONS.length} Official Police Stations...`);
    const stationMap = new Map();

    for (const stationData of NAGPUR_POLICE_STATIONS) {
      const { slug, ...stationFields } = stationData;
      
      let station = await PoliceStation.findOne({ stationCode: stationData.stationCode });
      if (!station) {
        station = await PoliceStation.create({
          ...stationFields,
          status: STATION_STATUS.ACTIVE
        });
        console.log(`  + Created: ${station.name} (${station.stationCode})`);
      } else {
        // Update contact/location info safely
        station.name = stationFields.name;
        station.address = stationFields.address;
        station.phone = stationFields.phone;
        station.email = stationFields.email;
        station.location = stationFields.location;
        station.jurisdictionRadiusKm = stationFields.jurisdictionRadiusKm;
        await station.save();
        console.log(`  * Updated: ${station.name} (${station.stationCode})`);
      }
      stationMap.set(station.stationCode, { station, slug });
    }

    // 3. Seed / Upsert Fictional Dashboard Officers for Each Station
    console.log('\n[3/3] Seeding Fictional Officers (1 Head, 1 IO, 3 Field per station)...');
    let totalStationHeads = 0;
    let totalIOs = 0;
    let totalFieldOfficers = 0;

    let stationIndex = 0;
    for (const stationData of NAGPUR_POLICE_STATIONS) {
      const { station, slug } = stationMap.get(stationData.stationCode);
      const paddedStationNum = String(stationIndex + 1).padStart(2, '0');
      const stationAbbr = slug.toUpperCase().slice(0, 4);

      // Define officer structure for this station
      const officersToCreate = [
        {
          type: 'HEAD',
          name: getFictionalOfficerName(stationIndex, 0),
          email: `${slug}.head@smartpolice.local`,
          phone: `9100${paddedStationNum}0001`,
          badgeNumber: `MH-NGP-${stationAbbr}-SH01`,
          role: ROLES.STATION_HEAD,
          rank: OFFICER_RANKS.INSPECTOR
        },
        {
          type: 'IO',
          name: getFictionalOfficerName(stationIndex, 1),
          email: `${slug}.inv01@smartpolice.local`,
          phone: `9100${paddedStationNum}0002`,
          badgeNumber: `MH-NGP-${stationAbbr}-IO01`,
          role: ROLES.INVESTIGATING_OFFICER,
          rank: OFFICER_RANKS.SUB_INSPECTOR
        },
        {
          type: 'FIELD',
          name: getFictionalOfficerName(stationIndex, 2),
          email: `${slug}.field01@smartpolice.local`,
          phone: `9100${paddedStationNum}0003`,
          badgeNumber: `MH-NGP-${stationAbbr}-FO01`,
          role: ROLES.FIELD_OFFICER,
          rank: OFFICER_RANKS.HEAD_CONSTABLE
        },
        {
          type: 'FIELD',
          name: getFictionalOfficerName(stationIndex, 3),
          email: `${slug}.field02@smartpolice.local`,
          phone: `9100${paddedStationNum}0004`,
          badgeNumber: `MH-NGP-${stationAbbr}-FO02`,
          role: ROLES.FIELD_OFFICER,
          rank: OFFICER_RANKS.CONSTABLE
        },
        {
          type: 'FIELD',
          name: getFictionalOfficerName(stationIndex, 4),
          email: `${slug}.field03@smartpolice.local`,
          phone: `9100${paddedStationNum}0005`,
          badgeNumber: `MH-NGP-${stationAbbr}-FO03`,
          role: ROLES.FIELD_OFFICER,
          rank: OFFICER_RANKS.CONSTABLE
        }
      ];

      let stationHeadUserId = null;

      for (const off of officersToCreate) {
        // Upsert User record
        let user = await User.findOne({ email: off.email });
        if (!user) {
          user = await User.create({
            name: off.name,
            email: off.email,
            phone: off.phone,
            password: DEFAULT_DEMO_PASSWORD,
            role: off.role,
            status: USER_STATUS.ACTIVE
          });
        } else {
          // Update details if needed
          user.name = off.name;
          user.phone = off.phone;
          user.role = off.role;
          await user.save();
        }

        if (off.type === 'HEAD') {
          stationHeadUserId = user._id;
          totalStationHeads++;
        } else if (off.type === 'IO') {
          totalIOs++;
        } else {
          totalFieldOfficers++;
        }

        // Upsert PoliceOfficer record
        let officerProfile = await PoliceOfficer.findOne({ userId: user._id });
        if (!officerProfile) {
          officerProfile = await PoliceOfficer.create({
            userId: user._id,
            stationId: station._id,
            badgeNumber: off.badgeNumber,
            rank: off.rank,
            role: off.role,
            dutyStatus: DUTY_STATUS.AVAILABLE,
            currentLocation: {
              latitude: null,
              longitude: null,
              isSimulated: false
            },
            lastLocationUpdate: null
          });
        } else {
          officerProfile.stationId = station._id;
          officerProfile.badgeNumber = off.badgeNumber;
          officerProfile.rank = off.rank;
          officerProfile.role = off.role;
          await officerProfile.save();
        }
      }

      // Link Station Head to Station document
      if (stationHeadUserId && (!station.stationHeadId || String(station.stationHeadId) !== String(stationHeadUserId))) {
        station.stationHeadId = stationHeadUserId;
        await station.save();
      }

      stationIndex++;
    }

    console.log('\n=========================================================');
    console.log('SEED SUMMARY');
    console.log('=========================================================');
    console.log(`Official Police Stations Seeded/Verified: ${NAGPUR_POLICE_STATIONS.length}`);
    console.log(`Station Heads (Inspectors):              ${totalStationHeads}`);
    console.log(`Investigating Officers (Sub-Inspectors): ${totalIOs}`);
    console.log(`Field Officers (Constables/Head Const):  ${totalFieldOfficers}`);
    console.log(`Total Fictional Officers:                ${totalStationHeads + totalIOs + totalFieldOfficers}`);
    console.log('Complaints / FIRs / SOS / Citizens:       0 (None created as requested)');
    console.log('Demo Password for Seeded Accounts:        password123');
    console.log('=========================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Error during Nagpur police seed:', error);
    process.exit(1);
  }
};

// Auto-run if executed directly
if (process.argv[1] && process.argv[1].endsWith('seedNagpurOfficers.js')) {
  seedNagpurPoliceAndOfficers();
}
