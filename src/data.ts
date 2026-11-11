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
  prerequisites?: string[];
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
    title: "Register a new patient",
    category: "Front office",
    description: "Collect registration details, records, consent, and communication preferences.",
    duration: "11 steps",
    steps: [
      "Search the practice management system for an existing chart using the office's approved identifiers before creating a new record.",
      "If no matching record exists, create a patient chart and enter the patient's legal name and preferred name according to office policy.",
      "Collect date of birth, address, phone number, and email; confirm each detail with the patient.",
      "Record the referring provider and primary dental office, including contact details when available.",
      "Ask the patient to complete the current registration, medical history, privacy, and consent forms.",
      "Review forms for required fields, signatures, and dates; route clinical questions to the appropriate clinician.",
      "Enter patient-reported allergies, medications, and relevant medical alerts in the designated chart fields.",
      "Collect referral documents and available records through approved channels, then attach them to the correct chart.",
      "Record the patient's communication preferences, permitted channels, and any restrictions in the designated fields.",
      "Verify insurance details using the office's insurance intake workflow and explain that verification is not a guarantee of payment.",
      "Confirm the appointment details, answer administrative questions within your role, and route unresolved items to the assigned team member.",
    ],
  },
  {
    id: "appointment-confirmation",
    title: "Appointment confirmation & reminders",
    category: "Front office",
    description: "Coordinate batch email, approved Comms texting, and phone follow-up before appointments.",
    duration: "8 steps",
    steps: [
      "Review the upcoming schedule and identify appointments due for confirmation using the office's reminder cadence.",
      "Check each patient's documented contact preferences, communication permissions, and any opt-out or channel restrictions before sending.",
      "Prepare a batch of email reminders using the approved system template; verify the recipient list and appointment details before sending.",
      "If the office uses TDO Comms, send text reminders only through the configured, approved workflow and only when permitted by the patient's recorded preferences.",
      "Review delivery results and mark responses or confirmations in the appointment record.",
      "For appointments still unconfirmed within 24 hours of the scheduled time, call using the office-approved script and document the outcome.",
      "Route requests to change or cancel an appointment to the scheduling workflow and update the schedule promptly.",
      "Record unsuccessful contact attempts and assign any remaining follow-up according to office policy.",
    ],
  },
  {
    id: "patient-check-in",
    title: "Patient check-in",
    category: "Front office",
    description: "Welcome the patient, verify visit details, and alert the clinical team.",
    duration: "8 steps",
    steps: [
      "Greet the patient discreetly and confirm identity using the office's approved identifiers.",
      "Confirm the appointment, visit type, and referring provider without discussing sensitive details where others can overhear.",
      "Ask whether contact, insurance, or medical-history information has changed since the last visit.",
      "Route updates or new medical information to the appropriate team member; do not make clinical judgments outside your role.",
      "Confirm required forms, signatures, and consents are complete or provide the approved forms for completion.",
      "Check that referral records and insurance information are attached to the correct chart, and flag missing items.",
      "Update the patient's arrival and check-in status in the scheduling system.",
      "Notify the clinical team that the patient is ready and communicate any time-sensitive administrative notes discreetly.",
    ],
  },
  {
    id: "insurance-entry",
    title: "Enter or update patient insurance",
    category: "Front office",
    description: "Capture insurance details accurately and track verification follow-up.",
    duration: "9 steps",
    steps: [
      "Ask the patient for current insurance information and an image or copy of the insurance card using the office's approved intake process.",
      "Confirm the subscriber's name, date of birth, relationship to the patient, and contact details as shown on the card.",
      "Enter the payer, plan, member ID, group number, subscriber, and effective dates into the designated fields.",
      "Record claims mailing details and payer contact information when required by the office workflow.",
      "Attach the card images or documents to the correct patient record and limit access to approved systems.",
      "Check for missing, unreadable, or inconsistent fields and ask the patient to clarify them.",
      "Submit an eligibility or benefit inquiry through the office-approved payer channel when assigned.",
      "Document the inquiry date, source, reference number if provided, and any response or pending follow-up.",
      "Explain that eligibility and benefit information is an estimate and does not guarantee claim payment; route coverage questions to the designated staff member.",
    ],
  },
  {
    id: "treatment-estimate",
    title: "Prepare and share a treatment estimate",
    category: "Front office",
    description: "Create a clear, preliminary estimate and review it with the patient.",
    duration: "8 steps",
    steps: [
      "Confirm the proposed services and coding details with the clinician or authorized team member before preparing the estimate.",
      "Review available plan information and any payer response; note when benefits are unverified, pending, or incomplete.",
      "Enter the office fee, applicable plan information, and estimated patient portion in the approved estimate workflow.",
      "Check arithmetic, service details, and patient identifiers before presenting the estimate.",
      "Clearly explain that the estimate is preliminary, benefits are not a guarantee of payment, and the final amount may change after claim processing.",
      "Invite questions and route clinical, coverage, or payment-plan questions to the appropriately authorized staff member.",
      "Share the estimate using the patient's approved secure communication channel or provide it directly according to office policy.",
      "Document the estimate date, assumptions discussed, delivery method, and any requested follow-up in the appropriate record.",
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
    title: "Patient checkout",
    category: "Front office",
    description: "Review next steps, handle the account, and close the visit with clear follow-up.",
    duration: "8 steps",
    steps: [
      "Confirm the clinician's checkout instructions, recommended follow-up, and any items that must be routed to the clinical team.",
      "Schedule the next visit according to the clinician's instructions, or document why it was not scheduled.",
      "Review today's account activity and explain charges, payments, or outstanding balances using office policy.",
      "Review any estimate or financial information with the patient without representing an estimate as a guarantee of insurance payment.",
      "Provide approved visit documents or instructions through the patient's preferred, permitted delivery method.",
      "Confirm the patient's preferred contact method for reminders and follow-up, and update it in the appropriate record.",
      "Prepare or send the visit summary to the referring provider when indicated and authorized.",
      "Complete checkout documentation and route unresolved account, scheduling, or records tasks to the responsible team member.",
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
