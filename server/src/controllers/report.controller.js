import DailyReport from '../models/DailyReport.js';
import Complaint from '../models/Complaint.js';
import SOS from '../models/SOS.js';
import { calculateHotspots } from '../services/hotspot.service.js';
import { ApiResponse } from '../utils/response.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { env } from '../config/env.js';

export const generateDailyReport = asyncHandler(async (req, res) => {
  const { date } = req.body;
  if (!date) {
    throw new ApiError(400, 'Date string is required (YYYY-MM-DD)');
  }
  
  const targetDate = new Date(date);
  const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
  const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
  
  // 1. Gather stats
  const totalComplaints = await Complaint.countDocuments({
    createdAt: { $gte: startOfDay, $lte: endOfDay }
  });
  
  const complaints = await Complaint.find({
    createdAt: { $gte: startOfDay, $lte: endOfDay }
  });
  
  const crimeBreakdown = {};
  complaints.forEach((c) => {
    crimeBreakdown[c.crimeType] = (crimeBreakdown[c.crimeType] || 0) + 1;
  });
  
  const activeSOS = await SOS.countDocuments({
    createdAt: { $gte: startOfDay, $lte: endOfDay },
    status: { $in: ['ACTIVE', 'ACKNOWLEDGED', 'DISPATCHED', 'ESCALATED'] }
  });
  
  const resolvedCases = await Complaint.countDocuments({
    updatedAt: { $gte: startOfDay, $lte: endOfDay },
    status: 'RESOLVED'
  });
  
  const hotspots = await calculateHotspots();
  const highRiskAreas = hotspots
    .filter(h => h.severity === 'CRITICAL' || h.severity === 'HIGH')
    .slice(0, 3)
    .map(h => h.name);
    
  // 2. Summary text
  let summary = `Daily Safety Report for ${date}. Total incident filings: ${totalComplaints}. Active SOS alarms: ${activeSOS}. Cases resolved: ${resolvedCases}.`;
  
  // Call AI if key is present to summarize statistics
  if (env.aiApiKey) {
    try {
      const prompt = `
        You are a police safety intelligence reporter.
        Summarize the crime activity statistics for ${date}:
        Total Complaints: ${totalComplaints}
        Crime Type Breakdown: ${JSON.stringify(crimeBreakdown)}
        Active SOS Alerts: ${activeSOS}
        Resolved Cases: ${resolvedCases}
        High Risk Areas: ${highRiskAreas.join(', ')}
        
        Write a concise, professional public summary report (2-3 sentences).
        Do NOT invent or modify these statistics. Keep them accurate to the numbers provided.
      `;
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.aiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      
      if (response.ok) {
        const resData = await response.json();
        summary = resData.candidates[0].content.parts[0].text.trim();
      }
    } catch (err) {
      console.warn('AI summary generation failed. Sticking to fallback summary.', err.message);
    }
  }
  
  // 3. Create or Update report
  let report = await DailyReport.findOne({ date: startOfDay });
  if (report) {
    report.totalComplaints = totalComplaints;
    report.crimeBreakdown = crimeBreakdown;
    report.activeSOS = activeSOS;
    report.resolvedCases = resolvedCases;
    report.highRiskAreas = highRiskAreas;
    report.summary = summary;
    report.createdBy = req.user._id;
    await report.save();
  } else {
    report = await DailyReport.create({
      date: startOfDay,
      totalComplaints,
      crimeBreakdown,
      activeSOS,
      resolvedCases,
      highRiskAreas,
      summary,
      createdBy: req.user._id
    });
  }
  
  return ApiResponse(res, 201, 'Daily safety report generated successfully', { report });
});

export const getDailyReports = asyncHandler(async (req, res) => {
  const reports = await DailyReport.find({}).sort({ date: -1 });
  return ApiResponse(res, 200, 'Daily safety reports retrieved successfully', { reports });
});

export const getDailyReportById = asyncHandler(async (req, res) => {
  const report = await DailyReport.findById(req.params.id);
  if (!report) {
    throw new ApiError(404, 'Safety report not found');
  }
  return ApiResponse(res, 200, 'Safety report details retrieved successfully', { report });
});
