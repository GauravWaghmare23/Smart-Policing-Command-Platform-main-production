import FIR from '../models/FIR.js';
import Complaint from '../models/Complaint.js';
import Suspect from '../models/Suspect.js';
import { ApiResponse } from '../utils/response.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * AI Legal & Case Briefing Assistant
 * Provides advisory analysis: relevant legal sections (BNS / IPC / IT Act), required evidence checklist, missing information & investigation suggestions.
 */
export const getCaseBriefing = asyncHandler(async (req, res) => {
  const { title, description, crimeType, firId } = req.body;

  let textToAnalyze = description || '';

  if (firId) {
    const fir = await FIR.findById(firId);
    if (fir) textToAnalyze = `${fir.crimeType}: ${fir.description}`;
  }

  // Legal rules heuristic knowledge base for advisory briefing
  const legalSectionsMap = {
    THEFT: [
      { act: 'BNS 2023', section: 'Sec 303', title: 'Theft (Replacing IPC 378/379)', severity: 'Cognizable / Bailable' },
      { act: 'BNS 2023', section: 'Sec 305', title: 'Theft in dwelling house', severity: 'Cognizable / Non-Bailable' }
    ],
    ROBBERY: [
      { act: 'BNS 2023', section: 'Sec 309', title: 'Robbery (Replacing IPC 390/392)', severity: 'Cognizable / Non-Bailable' },
      { act: 'BNS 2023', section: 'Sec 310', title: 'Dacoity', severity: 'Cognizable / Non-Bailable' }
    ],
    CYBERCRIME: [
      { act: 'IT Act 2000', section: 'Sec 66C', title: 'Identity Theft & Unauthorized Access', severity: 'Cognizable / Bailable' },
      { act: 'IT Act 2000', section: 'Sec 66D', title: 'Cheating by personation by using computer resource', severity: 'Cognizable / Bailable' },
      { act: 'BNS 2023', section: 'Sec 318', title: 'Cheating (Replacing IPC 420)', severity: 'Cognizable / Non-Bailable' }
    ],
    ASSAULT: [
      { act: 'BNS 2023', section: 'Sec 115', title: 'Voluntarily causing hurt (Replacing IPC 323)', severity: 'Non-Cognizable / Bailable' },
      { act: 'BNS 2023', section: 'Sec 117', title: 'Voluntarily causing grievous hurt', severity: 'Cognizable / Non-Bailable' }
    ],
    MURDER: [
      { act: 'BNS 2023', section: 'Sec 101', title: 'Murder (Replacing IPC 302)', severity: 'Cognizable / Non-Bailable / Capital' },
      { act: 'BNS 2023', section: 'Sec 103', title: 'Punishment for Murder', severity: 'Non-Bailable' }
    ],
    DEFAULT: [
      { act: 'BNS 2023', section: 'Sec 173', title: 'Information in cognizable cases (Replacing CrPC 154)', severity: 'Procedural Mandate' }
    ]
  };

  const key = (crimeType || '').toUpperCase();
  const recommendedSections = legalSectionsMap[key] || legalSectionsMap.DEFAULT;

  // Evidence Checklist Guidance
  const evidenceChecklist = [
    'First Information Report (FIR) signed copy & witness statements',
    'CCTV Footage / Audio-Video Recordings from scene of crime',
    'Panchnama / Spot inspection report prepared by IO',
    'Forensic / Cyber Analysis Report (if digital/technical assets involved)',
    'Medical/Injury Certificate (if physical assault reported)'
  ];

  // Missing Information Detection
  const missingInfoList = [];
  if (!textToAnalyze.match(/\b(time|date|morning|night|afternoon|pm|am)\b/i)) {
    missingInfoList.push('Exact timestamp of incident is missing in facts narrative.');
  }
  if (!textToAnalyze.match(/\b(witness|seen|present|bystander)\b/i)) {
    missingInfoList.push('No eye-witness details recorded in initial statement.');
  }
  if (!textToAnalyze.match(/\b(value|amount|rupees|rs|cost|stolen)\b/i) && (key === 'THEFT' || key === 'ROBBERY' || key === 'CYBERCRIME')) {
    missingInfoList.push('Estimated monetary value of loss/stolen property not specified.');
  }

  // Investigation Suggestions
  const investigationTips = [
    'Secure local cell tower dump and IP logs if digital communication occurred.',
    'Issue formal notice under BNSS 35(3) [replacing CrPC 41A] to suspect for inquiry.',
    'Record statement of complainant under BNSS 180 [replacing CrPC 161].',
    'Send collected physical evidence to State Forensic Science Laboratory (FSL) with chain of custody seal.'
  ];

  const caseSummary = `Advisory Legal Briefing for [${crimeType || 'General Incident'}]. Fact analysis identified ${recommendedSections.length} statutory section(s) under Bharatiya Nyaya Sanhita (BNS 2023) / IT Act for investigating officer review.`;

  return ApiResponse(res, 200, 'AI Advisory Legal Brief generated', {
    briefing: {
      crimeType: crimeType || 'GENERAL',
      recommendedSections,
      evidenceChecklist,
      missingInfoList,
      investigationTips,
      caseSummary,
      disclaimer: 'IMPORTANT ADVISORY NOTICE: AI legal recommendations are advisory guidelines for officer reference only. Investigating officers must independently verify applicable legal provisions under Bharatiya Nyaya Sanhita (BNS) and Bharatiya Nagarik Suraksha Sanhita (BNSS).'
    }
  });
});
