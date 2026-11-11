export type SopCategory =
  | "Patient care"
  | "Clinical"
  | "Sterilization"
  | "Safety"
  | "Front office"
  | "Custom";

export type SopTemplate = {
  id: string;
  title: string;
  category: SopCategory;
  description: string;
  duration: string;
  steps: string[];
  isCustom?: boolean;
  department?: string;
  reference?: {
    title: string;
    url: string;
  };
  navigationPath?: string[];
  screenshot?: {
    src: string;
    alt: string;
    caption: string;
    storagePath?: string;
  };
};

export const categories: Array<"All procedures" | SopCategory> = [
  "All procedures",
  "Patient care",
  "Clinical",
  "Sterilization",
  "Safety",
  "Front office",
  "Custom",
];

export const sopTemplates: SopTemplate[] = [
  {
    id: "new-patient",
    title: "New patient intake",
    category: "Front office",
    description: "A consistent welcome, registration, and records workflow.",
    duration: "10 steps",
    steps: [
      "Welcome the patient and confirm their preferred name and contact details.",
      "Confirm the referring provider and primary dental office.",
      "Provide registration, medical history, and privacy forms.",
      "Review submitted forms for missing information and patient signature.",
      "Record allergies, medications, and relevant medical alerts in the chart.",
      "Scan or upload referral documents and available diagnostic images.",
      "Confirm insurance information and explain the office's financial policies.",
      "Review consent forms with the patient and answer process questions.",
      "Notify the clinical team that the patient is ready.",
      "Confirm the next appointment or checkout plan before the patient leaves.",
    ],
  },
  {
    id: "clinical-handoff",
    title: "Clinical handoff & room setup",
    category: "Clinical",
    description: "Prepare the treatment room and communicate patient readiness.",
    duration: "9 steps",
    steps: [
      "Review the schedule, patient chart, referral, and planned visit.",
      "Confirm the room has been cleaned and disinfected per office protocol.",
      "Gather procedure-specific instruments, supplies, and protective equipment.",
      "Check that required equipment is present and functioning.",
      "Review the patient's medical alerts and documented allergies.",
      "Escort the patient, confirm identity, and help them get settled.",
      "Update the clinician on the patient's arrival and any new information.",
      "Document room readiness and any equipment or supply issue.",
      "After the visit, route the room for turnover and restocking.",
    ],
  },
  {
    id: "instrument-processing",
    title: "Instrument processing",
    category: "Sterilization",
    description: "A repeatable instrument reprocessing and documentation checklist.",
    duration: "10 steps",
    steps: [
      "Transport used instruments in a designated, closed container.",
      "Put on the personal protective equipment required by office policy.",
      "Sort instruments in the designated dirty-side processing area.",
      "Clean instruments using the approved process and device instructions.",
      "Rinse and dry instruments, then inspect for visible soil or damage.",
      "Package instruments with the required internal and external indicators.",
      "Load the sterilizer according to the manufacturer's instructions.",
      "Run the selected cycle and verify cycle parameters before unloading.",
      "Record required cycle details and indicator results in the office log.",
      "Store dry, intact packages in the designated clean storage area.",
    ],
  },
  {
    id: "room-turnover",
    title: "Operatory turnover",
    category: "Clinical",
    description: "Reset the operatory between patients using your office protocol.",
    duration: "8 steps",
    steps: [
      "Remove disposable barriers and discard them in the appropriate receptacle.",
      "Transport reusable instruments to the designated processing area.",
      "Clean and disinfect clinical contact surfaces using approved products.",
      "Observe the disinfectant label's contact time and office protocol.",
      "Replace barriers and prepare clean supplies for the next visit.",
      "Restock frequently used items and report low or expired supplies.",
      "Confirm the room is clean, organized, and ready for the next patient.",
      "Document completion or report any issue that prevents room release.",
    ],
  },
  {
    id: "phone-triage",
    title: "Patient call & urgent concern routing",
    category: "Patient care",
    description: "Capture key information and route clinical concerns promptly.",
    duration: "8 steps",
    steps: [
      "Identify the caller and confirm the patient's callback number.",
      "Listen without interruption and record the patient's concern in their words.",
      "Ask only the office-approved questions needed to route the concern.",
      "Record relevant symptoms, timing, and any change since the last contact.",
      "Do not diagnose, promise an outcome, or provide advice outside your role.",
      "Route clinical questions to the designated clinician using office policy.",
      "If the caller describes an emergency, follow the office emergency protocol.",
      "Document the message, recipient, time routed, and follow-up plan.",
    ],
  },
  {
    id: "checkout",
    title: "Checkout & follow-up",
    category: "Front office",
    description: "Close the visit with clear next steps and complete documentation.",
    duration: "7 steps",
    steps: [
      "Confirm the clinician's checkout instructions and any recommended follow-up.",
      "Schedule the next appointment or document why it was not scheduled.",
      "Review the patient account and explain today's charges using office policy.",
      "Provide the patient with approved visit information or instructions.",
      "Confirm the preferred method for appointment reminders and follow-up.",
      "Send or prepare visit notes for the referring provider when indicated.",
      "Complete the checkout record and route open items to the responsible team.",
    ],
  },
  {
    id: "tdo-check-out-order",
    title: "Find TDO Check Out Order",
    category: "Front office",
    description: "Use the TDO12 menus to locate the Check Out Order setting.",
    duration: "5 steps",
    navigationPath: ["Setup", "Program Setup", "Calendar", "Check Out Order"],
    screenshot: {
      src: "/images/tdo-check-out-order.png",
      alt: "TDO Release 12.4 with Setup > Program Setup > Calendar > Check Out Order highlighted in the open menus.",
      caption: "Example screen from TDO Release 12.4. Menu labels may vary by version or permissions.",
    },
    steps: [
      "Open the Setup tab in the TDO ribbon.",
      "Select Program Setup.",
      "Open Calendar in the Program Setup menu.",
      "Select Check Out Order from the Calendar submenu.",
      "Review the setting and confirm any changes with your practice's approved workflow before saving.",
    ],
  },
  {
    id: "emergency-preparedness",
    title: "Emergency readiness check",
    category: "Safety",
    description: "Verify team readiness and escalate any supply or equipment gaps.",
    duration: "7 steps",
    steps: [
      "Confirm the assigned emergency kit location is accessible to the team.",
      "Check emergency supplies against the office's approved inventory list.",
      "Verify expiration dates and package integrity as required by policy.",
      "Check the status of designated emergency equipment.",
      "Confirm team members know how to activate the office emergency response.",
      "Record the check and promptly report missing, expired, or faulty items.",
      "Follow the office's emergency plan and applicable local requirements.",
    ],
  },
  {
    id: "daily-opening",
    title: "Daily opening & readiness",
    category: "Front office",
    description: "Start the day with a coordinated schedule, space, and systems check.",
    duration: "8 steps",
    steps: [
      "Disarm and open the office according to the building security procedure.",
      "Check shared areas for cleanliness, safety concerns, or maintenance needs.",
      "Review the day's schedule and note special coordination needs.",
      "Confirm phones, workstations, and essential software are available.",
      "Check that patient-facing forms and front-office supplies are stocked.",
      "Confirm clinical rooms have been released as ready by the clinical team.",
      "Review pending messages and route time-sensitive items.",
      "Report unresolved issues to the designated office lead before first arrival.",
    ],
  },
  {
    id: "incident-documentation",
    title: "Incident & safety reporting",
    category: "Safety",
    description: "Capture and route safety events using your approved reporting process.",
    duration: "7 steps",
    steps: [
      "Address immediate safety needs and follow the relevant office response plan.",
      "Notify the designated supervisor or clinician as soon as practical.",
      "Record the date, time, location, and people involved using the approved form.",
      "Describe observable facts and the sequence of events without speculation.",
      "Document actions taken and who was notified.",
      "Secure the report according to office privacy and recordkeeping policy.",
      "Route follow-up items to the assigned owner and document completion.",
    ],
  },
];
