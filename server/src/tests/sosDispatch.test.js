import test, { describe, before, after, it } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import User from '../models/User.js';
import PoliceStation from '../models/PoliceStation.js';
import PoliceOfficer from '../models/PoliceOfficer.js';
import SOS from '../models/SOS.js';
import { calculateDistance } from '../utils/distance.js';
import {
  findNearbyStations,
  findBestOfficerForSOS,
  triggerSOS,
  acknowledgeSOS,
  rejectSOS
} from '../services/sos.service.js';
import {
  updateOfficerLocation,
  isOfficerLocationFresh
} from '../services/officer.service.js';
import { DUTY_STATUS, OFFICER_RANKS, ROLES, SOS_STATUS, USER_STATUS } from '../utils/constants.js';

describe('Smart Police Station - SOS Dispatch & Officer Location Suite', () => {
  let dbConnected = false;
  let testStation1;
  let testStation2;
  let officerUser1, officerUser2, officerUser3;
  let officer1, officer2, officer3;
  let citizenUser;

  before(async () => {
    try {
      await mongoose.connect(env.mongodbUri);
      dbConnected = true;

      // Clean up previous test records
      await Promise.all([
        User.deleteMany({ email: { $regex: /@test-suite\.local$/ } }),
        PoliceOfficer.deleteMany({ badgeNumber: { $regex: /^TBADGE/ } }),
        PoliceStation.deleteMany({ stationCode: { $regex: /^TEST-/ } }),
        SOS.deleteMany({ address: { $regex: /\[TEST-SUITE\]/ } })
      ]);

      // 1. Create Test Stations
      // Station 1: Butibori area (~20.9258, 78.9942)
      testStation1 = await PoliceStation.create({
        name: 'Test Butibori Police Station',
        stationCode: 'TEST-BUT',
        address: 'MIDC Butibori',
        phone: '07104-999991',
        location: { latitude: 20.9258, longitude: 78.9942 },
        status: 'ACTIVE'
      });

      // Station 2: Hingna area (~21.0664, 78.9723, ~16km away)
      testStation2 = await PoliceStation.create({
        name: 'Test Hingna Police Station',
        stationCode: 'TEST-HIN',
        address: 'Hingna Main Road',
        phone: '07104-999992',
        location: { latitude: 21.0664, longitude: 78.9723 },
        status: 'ACTIVE'
      });

      // 2. Create Test Users & Officers
      // Officer 1: Station 1, Live location close to Butibori (20.9280, 78.9950 - approx 0.3km)
      officerUser1 = await User.create({
        name: 'Officer Live Near',
        email: 'officer1@test-suite.local',
        phone: '9900110001',
        password: 'password123',
        role: ROLES.FIELD_OFFICER,
        status: USER_STATUS.ACTIVE
      });
      officer1 = await PoliceOfficer.create({
        userId: officerUser1._id,
        stationId: testStation1._id,
        badgeNumber: 'TBADGE01',
        rank: OFFICER_RANKS.CONSTABLE,
        role: ROLES.FIELD_OFFICER,
        dutyStatus: DUTY_STATUS.AVAILABLE,
        currentLocation: { latitude: 20.9280, longitude: 78.9950, isSimulated: false },
        lastLocationUpdate: new Date() // Fresh location
      });

      // Officer 2: Station 1, Stale location (>1 hour old)
      officerUser2 = await User.create({
        name: 'Officer Stale Location',
        email: 'officer2@test-suite.local',
        phone: '9900110002',
        password: 'password123',
        role: ROLES.FIELD_OFFICER,
        status: USER_STATUS.ACTIVE
      });
      officer2 = await PoliceOfficer.create({
        userId: officerUser2._id,
        stationId: testStation1._id,
        badgeNumber: 'TBADGE02',
        rank: OFFICER_RANKS.CONSTABLE,
        role: ROLES.FIELD_OFFICER,
        dutyStatus: DUTY_STATUS.AVAILABLE,
        currentLocation: { latitude: 20.9270, longitude: 78.9945, isSimulated: false },
        lastLocationUpdate: new Date(Date.now() - 3600 * 1000) // 1 hour stale
      });

      // Officer 3: Station 2 (Hingna), Available without live GPS (station fallback)
      officerUser3 = await User.create({
        name: 'Officer Station Fallback',
        email: 'officer3@test-suite.local',
        phone: '9900110003',
        password: 'password123',
        role: ROLES.FIELD_OFFICER,
        status: USER_STATUS.ACTIVE
      });
      officer3 = await PoliceOfficer.create({
        userId: officerUser3._id,
        stationId: testStation2._id,
        badgeNumber: 'TBADGE03',
        rank: OFFICER_RANKS.CONSTABLE,
        role: ROLES.FIELD_OFFICER,
        dutyStatus: DUTY_STATUS.AVAILABLE,
        currentLocation: { latitude: null, longitude: null, isSimulated: false },
        lastLocationUpdate: null
      });

      // Citizen
      citizenUser = await User.create({
        name: 'Test Citizen',
        email: 'citizen@test-suite.local',
        phone: '9900110099',
        password: 'password123',
        role: ROLES.CITIZEN,
        status: USER_STATUS.ACTIVE
      });
    } catch (err) {
      console.warn('Database connection warning in test setup:', err.message);
    }
  });

  after(async () => {
    if (dbConnected) {
      await Promise.all([
        User.deleteMany({ email: { $regex: /@test-suite\.local$/ } }),
        PoliceOfficer.deleteMany({ badgeNumber: { $regex: /^TBADGE/ } }),
        PoliceStation.deleteMany({ stationCode: { $regex: /^TEST-/ } }),
        SOS.deleteMany({ address: { $regex: /\[TEST-SUITE\]/ } })
      ]);
      await mongoose.disconnect();
    }
  });

  it('1. Calculates Haversine distance correctly', () => {
    // Distance from Butibori (20.9258, 78.9942) to Sitabuldi (21.1443, 79.0803) is ~25.8 km
    const dist = calculateDistance(20.9258, 78.9942, 21.1443, 79.0803);
    assert.ok(dist > 24 && dist < 28, `Expected distance ~25-27 km, got ${dist}`);
  });

  it('2. Evaluates officer location freshness correctly', () => {
    const freshOfficer = {
      currentLocation: { latitude: 20.9, longitude: 79.0 },
      lastLocationUpdate: new Date(Date.now() - 2 * 60 * 1000) // 2 minutes ago
    };
    const staleOfficer = {
      currentLocation: { latitude: 20.9, longitude: 79.0 },
      lastLocationUpdate: new Date(Date.now() - 25 * 60 * 1000) // 25 minutes ago
    };
    const nullOfficer = {
      currentLocation: { latitude: null, longitude: null },
      lastLocationUpdate: null
    };

    assert.equal(isOfficerLocationFresh(freshOfficer, 10), true, '2m old location should be fresh');
    assert.equal(isOfficerLocationFresh(staleOfficer, 10), false, '25m old location should be stale');
    assert.equal(isOfficerLocationFresh(nullOfficer, 10), false, 'null location should not be fresh');
  });

  it('3. Updates officer location securely via service and enforces coordinate bounds', async () => {
    if (!dbConnected) return;

    // Valid coordinates
    const updated = await updateOfficerLocation(officerUser1._id, 20.9300, 78.9960, false);
    assert.equal(updated.currentLocation.latitude, 20.93);
    assert.equal(updated.currentLocation.longitude, 78.996);
    assert.ok(updated.lastLocationUpdate instanceof Date);

    // Invalid coordinates should throw
    await assert.rejects(
      async () => await updateOfficerLocation(officerUser1._id, 999, 78.996),
      /Invalid latitude/
    );
  });

  it('4. Tier 1 Dispatch: Selects nearest live officer with fresh GPS', async () => {
    if (!dbConnected) return;

    // Reset officer1 to fresh location
    await updateOfficerLocation(officerUser1._id, 20.9280, 78.9950);

    const sosLoc = { latitude: 20.9260, longitude: 78.9945 };
    const candidate = await findBestOfficerForSOS(sosLoc.latitude, sosLoc.longitude, {
      freshnessMinutes: 10,
      nearbyRadiusKm: 5
    });

    assert.ok(candidate, 'Candidate should be found');
    assert.equal(candidate.tier, 'TIER_1_NEARBY_LIVE');
    assert.equal(candidate.officer.userId._id.toString(), officerUser1._id.toString());
    assert.ok(candidate.distanceKm < 1.0, `Expected < 1km, got ${candidate.distanceKm}`);
  });

  it('5. Stale Location Filter: Ignores officer with stale location in Tier 1', async () => {
    if (!dbConnected) return;

    // Exclude officer 1; officer 2 is stale (>1 hour old)
    const sosLoc = { latitude: 20.9260, longitude: 78.9945 };
    
    // Test Tier 1 only (expandedRadiusKm: 0) - should NOT pick stale officer 2
    const tier1Candidate = await findBestOfficerForSOS(sosLoc.latitude, sosLoc.longitude, {
      excludedOfficerUserIds: [officerUser1._id],
      freshnessMinutes: 10,
      nearbyRadiusKm: 5,
      expandedRadiusKm: 0
    });

    assert.equal(tier1Candidate, null, 'Stale officer must not be selected in Tier 1 live proximity search');

    // Test Station Fallback to Station 2 when Station 1 officers are excluded
    const tier2Candidate = await findBestOfficerForSOS(sosLoc.latitude, sosLoc.longitude, {
      excludedOfficerUserIds: [officerUser1._id, officerUser2._id],
      freshnessMinutes: 10,
      nearbyRadiusKm: 5,
      expandedRadiusKm: 25
    });

    assert.ok(tier2Candidate, 'Fallback candidate at Station should be found');
    assert.equal(tier2Candidate.tier, 'TIER_2_STATION_FALLBACK');
    assert.ok(tier2Candidate.officer && tier2Candidate.officer.userId, 'Officer profile with userId should be present');
    assert.ok(tier2Candidate.distanceKm >= 0, 'Station distance should be calculated');
  });

  it('6. Full SOS Trigger & Auto-Dispatch flow', async () => {
    if (!dbConnected) return;

    // Make officer 1 available and fresh
    officer1.dutyStatus = DUTY_STATUS.AVAILABLE;
    await officer1.save();
    await updateOfficerLocation(officerUser1._id, 20.9280, 78.9950);

    const sosPayload = await triggerSOS(citizenUser._id, {
      latitude: 20.9260,
      longitude: 78.9945,
      address: '[TEST-SUITE] Butibori Demonstration Incident'
    });

    assert.equal(sosPayload.status, SOS_STATUS.DISPATCHED);
    assert.equal(sosPayload.assignedOfficerId._id.toString(), officerUser1._id.toString());
    assert.ok(sosPayload.officerDistanceKm != null);

    // Verify officer status changed to BUSY
    const updatedOff1 = await PoliceOfficer.findOne({ userId: officerUser1._id });
    assert.equal(updatedOff1.dutyStatus, DUTY_STATUS.BUSY);
  });

  it('7. Rejection & Auto Re-dispatch Flow', async () => {
    if (!dbConnected) return;

    // Find the active dispatched SOS by location.address
    const sos = await SOS.findOne({ 'location.address': '[TEST-SUITE] Butibori Demonstration Incident' });
    assert.ok(sos, 'Existing SOS should be found');

    // Officer 1 rejects the SOS
    const reDispatchedSOS = await rejectSOS(sos._id, officerUser1._id, 'Vehicle maintenance required');

    // Officer 1 should be freed back to AVAILABLE
    const freedOfficer1 = await PoliceOfficer.findOne({ userId: officerUser1._id });
    assert.equal(freedOfficer1.dutyStatus, DUTY_STATUS.AVAILABLE);

    // SOS should record rejection and re-dispatch or escalate
    assert.ok(reDispatchedSOS.rejectedBy.length > 0);
    assert.equal(reDispatchedSOS.rejectedBy[0].reason, 'Vehicle maintenance required');
  });

  it('8. Escalation to Control Room when no officers are available', async () => {
    if (!dbConnected) return;

    // Trigger SOS in remote area where no stations or officers exist (e.g. coordinates in open desert 15.0, 75.0)
    const remoteSOS = await triggerSOS(citizenUser._id, {
      latitude: 15.0000,
      longitude: 75.0000,
      address: '[TEST-SUITE] Remote Uncovered Area Incident'
    });

    assert.equal(remoteSOS.status, SOS_STATUS.ESCALATED);
    assert.equal(remoteSOS.assignedOfficerId, null);
    assert.ok(remoteSOS.escalationReason.length > 0);
  });

  it('9. Station Head Self-Dispatch: Station Head dispatches themselves for personal response', async () => {
    if (!dbConnected) return;

    // Create Station Head user & officer profile for Station 1
    const stationHeadUser = await User.create({
      name: 'Station Head Inspector',
      email: 'stationhead@test-suite.local',
      phone: '9900110008',
      password: 'password123',
      role: ROLES.STATION_HEAD,
      status: USER_STATUS.ACTIVE
    });
    const stationHeadOfficer = await PoliceOfficer.create({
      userId: stationHeadUser._id,
      stationId: testStation1._id,
      badgeNumber: 'TBADGE_SH',
      rank: OFFICER_RANKS.INSPECTOR,
      role: ROLES.STATION_HEAD,
      dutyStatus: DUTY_STATUS.AVAILABLE
    });

    const testSOS = await SOS.create({
      sosId: 'TEST-SOS-09',
      citizenId: citizenUser._id,
      location: { latitude: 20.9258, longitude: 78.9942, address: '[TEST-SUITE] Station Head Self-Dispatch Incident' },
      nearestStationId: testStation1._id,
      status: SOS_STATUS.ACTIVE
    });

    const { dispatchSOS } = await import('../services/sos.service.js');
    const dispatched = await dispatchSOS(testSOS._id, null, stationHeadUser, { isPersonalResponse: true });

    assert.equal(dispatched.assignedOfficerId._id.toString(), stationHeadUser._id.toString());
    assert.equal(dispatched.isStationHeadPersonalResponse, true);
    assert.equal(dispatched.status, SOS_STATUS.ACKNOWLEDGED);

    const updatedSH = await PoliceOfficer.findOne({ userId: stationHeadUser._id });
    assert.equal(updatedSH.dutyStatus, DUTY_STATUS.RESPONDING);
  });

  it('10. Station Head Station-Only Scoping: Cannot dispatch officers from unrelated stations', async () => {
    if (!dbConnected) return;

    const stationHeadUser = await User.findOne({ email: 'stationhead@test-suite.local' });
    const testSOS = await SOS.create({
      sosId: 'TEST-SOS-10',
      citizenId: citizenUser._id,
      location: { latitude: 20.9258, longitude: 78.9942, address: '[TEST-SUITE] Station Scoping Incident' },
      nearestStationId: testStation1._id,
      status: SOS_STATUS.ACTIVE
    });

    const { dispatchSOS } = await import('../services/sos.service.js');

    // Attempt to dispatch Officer 3 (belongs to Station 2, not Station 1)
    await assert.rejects(
      async () => await dispatchSOS(testSOS._id, officerUser3._id, stationHeadUser, { isPersonalResponse: false }),
      /Station Heads can only dispatch officers belonging to their own police station/
    );

    // Dispatching Officer 1 (Station 1) should succeed
    const validDispatch = await dispatchSOS(testSOS._id, officerUser1._id, stationHeadUser, {
      isPersonalResponse: false,
      dispatchNote: 'Unit dispatch via Station Head'
    });
    assert.equal(validDispatch.assignedOfficerId._id.toString(), officerUser1._id.toString());
    assert.equal(validDispatch.status, SOS_STATUS.DISPATCHED);
  });

  it('11. Control Room Admin Central Dispatch & En Route Lifecycle', async () => {
    if (!dbConnected) return;

    const adminUser = await User.create({
      name: 'Control Room Admin Dispatcher',
      email: 'admin_test@test-suite.local',
      phone: '9900110090',
      password: 'password123',
      role: ROLES.CONTROL_ROOM_ADMIN,
      status: USER_STATUS.ACTIVE
    });

    const testSOS = await SOS.create({
      sosId: 'TEST-SOS-11',
      citizenId: citizenUser._id,
      location: { latitude: 20.9258, longitude: 78.9942, address: '[TEST-SUITE] Admin Central Dispatch Incident' },
      nearestStationId: testStation1._id,
      status: SOS_STATUS.ACTIVE
    });

    const { dispatchSOS, markEnRoute, markArrived } = await import('../services/sos.service.js');

    // Admin can dispatch Officer 3 from Station 2 even if SOS is near Station 1
    const dispatched = await dispatchSOS(testSOS._id, officerUser3._id, adminUser, {
      dispatchNote: 'Central Command backup order'
    });
    assert.equal(dispatched.assignedOfficerId._id.toString(), officerUser3._id.toString());
    assert.equal(dispatched.status, SOS_STATUS.DISPATCHED);
    assert.equal(dispatched.dispatchedByUserId._id.toString(), adminUser._id.toString());

    // Mark En Route
    const enRouteSOS = await markEnRoute(testSOS._id, officerUser3._id);
    assert.equal(enRouteSOS.status, SOS_STATUS.EN_ROUTE);
    assert.ok(enRouteSOS.enRouteAt instanceof Date);

    // Mark Arrived
    const arrivedSOS = await markArrived(testSOS._id, officerUser3._id);
    assert.equal(arrivedSOS.status, SOS_STATUS.ARRIVED);
    assert.ok(arrivedSOS.arrivedAt instanceof Date);
  });
});
