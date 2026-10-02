import { connectDB } from '../config/database.js';
import Suspect from '../models/Suspect.js';
import FIR from '../models/FIR.js';
import Complaint from '../models/Complaint.js';
import { sanitizeSuspectFields } from '../controllers/suspect.controller.js';

export const repairSuspectRecords = async () => {
  console.log('--- Starting Non-Destructive Suspect and Case Repair ---');
  await connectDB();

  try {
    const suspects = await Suspect.find({});
    console.log(`Found ${suspects.length} suspect records in database.`);

    for (const suspect of suspects) {
      let changed = false;

      // 1. Sanitize malformed name/alias
      const { name, alias } = sanitizeSuspectFields(suspect.name, suspect.alias);
      if (name !== suspect.name) {
        console.log(`[Sanitize] Suspect ${suspect.suspectId} name changed: "${suspect.name}" -> "${name}"`);
        suspect.name = name;
        changed = true;
      }
      if (alias !== suspect.alias) {
        console.log(`[Sanitize] Suspect ${suspect.suspectId} alias changed: "${suspect.alias}" -> "${alias}"`);
        suspect.alias = alias;
        changed = true;
      }

      // 2. Sync linked complaints with their corresponding FIRs
      for (const complaintId of suspect.linkedComplaintIds || []) {
        const complaint = await Complaint.findById(complaintId);
        if (complaint) {
          if (!suspect.stationId && complaint.policeStationId) {
            suspect.stationId = complaint.policeStationId;
            changed = true;
          }

          // Check if complaint has an FIR
          const fir = await FIR.findOne({ complaintId });
          if (fir) {
            const firIdStr = fir._id.toString();
            const hasFir = (suspect.linkedFirIds || []).some(id => id.toString() === firIdStr);
            if (!hasFir) {
              suspect.linkedFirIds.push(fir._id);
              changed = true;
              console.log(`[Link] Connected FIR ${fir.firNumber} to Suspect ${suspect.suspectId}`);
            }

            // Sync FIR side
            const hasSuspectInFir = (fir.suspectIds || []).some(id => id.toString() === suspect._id.toString());
            if (!hasSuspectInFir) {
              await FIR.findByIdAndUpdate(fir._id, { $addToSet: { suspectIds: suspect._id } });
              console.log(`[Link] Connected Suspect ${suspect.suspectId} into FIR ${fir.firNumber}`);
            }
          }
        }
      }

      // 3. Sync linked FIRs back to their complaints
      for (const firId of suspect.linkedFirIds || []) {
        const fir = await FIR.findById(firId);
        if (fir) {
          if (!suspect.stationId && fir.policeStationId) {
            suspect.stationId = fir.policeStationId;
            changed = true;
          }
          if (fir.complaintId) {
            const compIdStr = fir.complaintId.toString();
            const hasComp = (suspect.linkedComplaintIds || []).some(id => id.toString() === compIdStr);
            if (!hasComp) {
              suspect.linkedComplaintIds.push(fir.complaintId);
              changed = true;
              console.log(`[Link] Connected Complaint ${fir.complaintId} to Suspect ${suspect.suspectId}`);
            }
          }

          // Ensure FIR has this suspect
          const hasSuspectInFir = (fir.suspectIds || []).some(id => id.toString() === suspect._id.toString());
          if (!hasSuspectInFir) {
            await FIR.findByIdAndUpdate(fir._id, { $addToSet: { suspectIds: suspect._id } });
            console.log(`[Link] Connected Suspect ${suspect.suspectId} into FIR ${fir.firNumber}`);
          }
        }
      }

      if (changed) {
        await suspect.save();
        console.log(`✓ Saved repaired record for ${suspect.suspectId}`);
      }
    }

    console.log('--- Suspect and Case Repair Complete ---');
    process.exit(0);
  } catch (err) {
    console.error('Error repairing suspect records:', err);
    process.exit(1);
  }
};

if (process.argv[1] && process.argv[1].endsWith('repairSuspectLinks.js')) {
  repairSuspectRecords();
}
