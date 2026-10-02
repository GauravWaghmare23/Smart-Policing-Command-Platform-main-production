// seed-operational-data.js
// Synthetic hackathon demo data only.
// Creates demo citizens if missing, then adds complaints, FIRs, and SOS.
// Does NOT delete records or create stations/officers.

import './guardProduction.js';
import { connectDB } from '../config/database.js';

import User from '../models/User.js';
import PoliceStation from '../models/PoliceStation.js';
import PoliceOfficer from '../models/PoliceOfficer.js';
import Complaint from '../models/Complaint.js';
import FIR from '../models/FIR.js';
import SOS from '../models/SOS.js';

import {
  ROLES,
  USER_STATUS,
  DUTY_STATUS,
  CRIME_TYPES,
  COMPLAINT_PRIORITY,
  COMPLAINT_STATUS,
  FIR_STATUS,
  SOS_STATUS
} from '../utils/constants.js';

import { generateUniqueId } from '../utils/generateId.js';

const DEMO_CITIZENS = [
  {
    name: 'Demo Citizen 1',
    email: 'demo.citizen1@smartpolice.local',
    phone: '9881100001'
  },
  {
    name: 'Demo Citizen 2',
    email: 'demo.citizen2@smartpolice.local',
    phone: '9881100002'
  },
  {
    name: 'Demo Citizen 3',
    email: 'demo.citizen3@smartpolice.local',
    phone: '9881100003'
  },
  {
    name: 'Demo Citizen 4',
    email: 'demo.citizen4@smartpolice.local',
    phone: '9881100004'
  },
  {
    name: 'Demo Citizen 5',
    email: 'demo.citizen5@smartpolice.local',
    phone: '9881100005'
  },
  {
    name: 'Demo Citizen 6',
    email: 'demo.citizen6@smartpolice.local',
    phone: '9881100006'
  }
];

const getAvailableOfficer = (officers, stationId) => {
  return officers.find((officer) =>
    String(officer.stationId) === String(stationId) &&
    (
      officer.dutyStatus === DUTY_STATUS.AVAILABLE ||
      officer.dutyStatus === DUTY_STATUS.ON_DUTY
    )
  );
};

const seedOperationalRecords = async () => {
  await connectDB();

  // 1. Create demo citizens only when their email does not already exist.
  const citizens = [];

  for (const citizenData of DEMO_CITIZENS) {
    let citizen = await User.findOne({
      email: citizenData.email
    });

    if (!citizen) {
      citizen = await User.create({
        ...citizenData,
        password: 'password123',
        role: ROLES.CITIZEN,
        status: USER_STATUS.ACTIVE
      });

      console.log(`Created demo citizen: ${citizen.email}`);
    } else {
      console.log(`Using existing citizen: ${citizen.email}`);
    }

    citizens.push(citizen);
  }

  // 2. Fetch existing stations and officers. Do not create or modify them.
  const [stations, officers] = await Promise.all([
    PoliceStation.find({}).lean(),
    PoliceOfficer.find({}).lean()
  ]);

  if (!stations.length) {
    throw new Error(
      'No existing police stations found. Seed or add stations first.'
    );
  }

  if (!officers.length) {
    throw new Error(
      'No existing police officers found. Seed or add officers first.'
    );
  }

  const findStation = (namePart) =>
    stations.find((station) =>
      station.name?.toLowerCase().includes(namePart.toLowerCase())
    );

  const complaintPlans = [
    {
      stationName: 'Sitabuldi',
      crimeType: CRIME_TYPES.THEFT,
      title: 'Mobile phone reported stolen',
      description:
        'Synthetic demo complaint: a citizen reports a mobile phone stolen near a market area.',
      status: COMPLAINT_STATUS.FIR_REGISTERED,
      priority: COMPLAINT_PRIORITY.HIGH,
      createFIR: true
    },
    {
      stationName: 'Ajni',
      crimeType: CRIME_TYPES.CYBER_CRIME,
      title: 'Suspicious UPI payment request',
      description:
        'Synthetic demo complaint: a citizen reports receiving a suspicious payment request.',
      status: COMPLAINT_STATUS.UNDER_REVIEW,
      priority: COMPLAINT_PRIORITY.MEDIUM,
      createFIR: false
    },
    {
      stationName: 'Ganeshpeth',
      crimeType: CRIME_TYPES.HARASSMENT,
      title: 'Repeated threatening messages',
      description:
        'Synthetic demo complaint: a citizen reports repeated unwanted messages and says screenshots were saved.',
      status: COMPLAINT_STATUS.FIR_REGISTERED,
      priority: COMPLAINT_PRIORITY.HIGH,
      createFIR: true
    },
    {
      stationName: 'Nandanvan',
      crimeType: CRIME_TYPES.VANDALISM,
      title: 'Vehicle damaged outside residence',
      description:
        'Synthetic demo complaint: a citizen reports damage to a parked two-wheeler.',
      status: COMPLAINT_STATUS.ASSIGNED,
      priority: COMPLAINT_PRIORITY.MEDIUM,
      createFIR: false
    },
    {
      stationName: 'Lakadganj',
      crimeType: CRIME_TYPES.FRAUD,
      title: 'Online purchase payment dispute',
      description:
        'Synthetic demo complaint: a citizen reports paying for an online purchase but not receiving the item.',
      status: COMPLAINT_STATUS.FIR_REGISTERED,
      priority: COMPLAINT_PRIORITY.MEDIUM,
      createFIR: true
    },
    {
      stationName: 'Dhantoli',
      crimeType: CRIME_TYPES.OTHER,
      title: 'Wallet reported lost',
      description:
        'Synthetic demo complaint: a citizen reports losing a wallet in the local area.',
      status: COMPLAINT_STATUS.SUBMITTED,
      priority: COMPLAINT_PRIORITY.LOW,
      createFIR: false
    }
  ];

  const createdComplaints = [];
  const complaintsNeedingFIR = [];

  // 3. Create complaints.
  for (let i = 0; i < complaintPlans.length; i++) {
    const plan = complaintPlans[i];
    const station = findStation(plan.stationName);

    if (!station) {
      throw new Error(`Required station not found: ${plan.stationName}`);
    }

    const officer = getAvailableOfficer(officers, station._id);

    if (!officer) {
      throw new Error(
        `No available/on-duty officer found for ${station.name}`
      );
    }

    const citizen = citizens[i % citizens.length];

    const complaint = await Complaint.create({
      complaintId: generateUniqueId('CMP'),
      citizenId: citizen._id,
      crimeType: plan.crimeType,
      title: plan.title,
      description: plan.description,
      location: {
        latitude: station.location.latitude,
        longitude: station.location.longitude,
        address: `${station.name}, Nagpur, Maharashtra`
      },
      policeStationId: station._id,
      assignedOfficerId: officer.userId,
      status: plan.status,
      priority: plan.priority
    });

    createdComplaints.push(complaint);

    if (plan.createFIR) {
      complaintsNeedingFIR.push({
        complaint,
        station,
        officer
      });
    }
  }

  // 4. Create FIRs linked to the complaints created above.
  const createdFIRs = [];

  for (const { complaint, station, officer } of complaintsNeedingFIR) {
    const fir = await FIR.create({
      firNumber: generateUniqueId('FIR'),
      complaintId: complaint._id,
      citizenId: complaint.citizenId,
      policeStationId: station._id,
      investigatingOfficerId: officer.userId,
      crimeType: complaint.crimeType,
      description: complaint.description,
      status: FIR_STATUS.UNDER_INVESTIGATION,
      registeredAt: new Date()
    });

    createdFIRs.push(fir);
  }

  // 5. Create synthetic SOS records using existing stations/officers.
  const sosRecords = [];
  const sosStations = stations.slice(0, Math.min(3, stations.length));

  for (let i = 0; i < sosStations.length; i++) {
    const station = sosStations[i];
    const officer = getAvailableOfficer(officers, station._id);

    if (!officer) {
      console.warn(
        `Skipping SOS for ${station.name}: no available/on-duty officer.`
      );
      continue;
    }

    const citizen = citizens[i % citizens.length];

    const sos = await SOS.create({
      sosId: generateUniqueId('SOS'),
      citizenId: citizen._id,
      location: {
        latitude: station.location.latitude,
        longitude: station.location.longitude,
        address: `${station.name} vicinity, Nagpur, Maharashtra`
      },
      nearestStationId: station._id,
      assignedOfficerId: officer.userId,
      status: SOS_STATUS.ACTIVE,
      reportedAt: new Date()
    });

    sosRecords.push(sos);
  }

  console.log('\nSynthetic demo records added:');
  console.log(`Citizens available: ${citizens.length}`);
  console.log(`Complaints created: ${createdComplaints.length}`);
  console.log(`FIRs created: ${createdFIRs.length}`);
  console.log(`SOS records created: ${sosRecords.length}`);
};

seedOperationalRecords()
  .then(() => {
    console.log('Operational demo seed completed.');
    process.exitCode = 0;
  })
  .catch((error) => {
    console.error('Operational demo seed failed:', error);
    process.exitCode = 1;
  });