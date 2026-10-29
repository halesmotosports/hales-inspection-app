"use strict";

/*
  HALE'S MOTORSPORTS
  Technician Vehicle Inspection App — V2

  Stage 1:
  - Inspection sections and items
  - Green / Yellow / Red status controls
  - Selected status can be unselected
  - Only one status per inspection item
  - Measurement / notes fields
  - Automatic summary counts

  Media, persistent saved inspections, cloud storage,
  customer reports, and finalization are added in later stages.
*/
// ============================================================
// SUPABASE CONFIGURATION
// ============================================================

const SUPABASE_URL = "https://kvjxiqeohnodrxjpsnfj.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_QdbihJ6tGgPHlW8-_qRDIg_SbOz5TIV";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);
// ============================================================
// INSPECTION DEFINITION
// ============================================================

const inspectionDefinition = [
  {
    id: "tires-wheels",
    title: "TIRES & WHEELS",
    items: [
      "LF Tire Tread Depth / Condition",
      "RF Tire Tread Depth / Condition",
      "LR Tire Tread Depth / Condition",
      "RR Tire Tread Depth / Condition",
      "Tire Pressure",
      "Tire Wear Pattern",
      "Tire Sidewalls / Damage",
      "Wheel Condition",
      "Wheel / Lug Nut Condition",
      "Spare Tire / Mount / Pressure"
    ]
  },

  {
    id: "brakes",
    title: "BRAKES",
    items: [
      "Front Brake Pads / Rotors — Left",
      "Front Brake Pads / Rotors — Right",
      "Rear Disc Pads / Rotors — Left (if equipped)",
      "Rear Disc Pads / Rotors — Right (if equipped)",
      "Rear Drum Brakes / Shoes (if equipped)",
      "Brake Hoses / Lines",
      "Brake Fluid Level / Condition",
      "Parking Brake Operation"
    ]
  },

  {
    id: "steering-front-suspension",
    title: "STEERING & FRONT SUSPENSION",
    items: [
      "Upper Ball Joints — Left / Right",
      "Lower Ball Joints — Left / Right",
      "Inner Tie Rods — Left / Right",
      "Outer Tie Rods — Left / Right",
      "Steering Rack / Mounts",
      "Steering Shaft / Joints",
      "Front Wheel Bearings",
      "Control Arms / Bushings",
      "Sway Bar / Links / Bushings"
    ]
  },

  {
    id: "suspension-chassis",
    title: "SUSPENSION & CHASSIS",
    items: [
      "Front Shocks / Struts / Coilovers",
      "Rear Shocks",
      "Front Springs / Coil Springs",
      "Rear Leaf Springs / Bushings",
      "Rear Shackles / Mounts",
      "Body / Cab Mounts",
      "Frame Rust / Corrosion",
      "Frame Cracking / Tearing",
      "Frame Bending / Overloading",
      "Frame Twist / Structural Condition"
    ]
  },

  {
    id: "drivetrain-4wd",
    title: "DRIVETRAIN & 4WD",
    items: [
      "Front CV Axles / Boots",
      "Front Differential / Seals / Fluid Leaks",
      "Rear Differential / Seals / Fluid Leaks",
      "Transfer Case / Seals / Fluid Leaks",
      "Transmission / Fluid Leaks",
      "Driveshafts / U-Joints",
      "Carrier Bearing (if equipped)",
      "4WD System Operation"
    ]
  },

  {
    id: "engine-underhood",
    title: "ENGINE & UNDERHOOD",
    items: [
      "Engine Oil Level / Condition / Leaks",
      "Coolant Level / Condition / Leaks",
      "Belts / Tensioners / Pulleys",
      "Radiator / Hoses",
      "Battery / Terminals / Hold-Down",
      "Air Filter / Intake System",
      "Power Steering System",
      "Engine Mounts / Cracking",
      "Visible Wiring / Connectors"
    ]
  },

  {
    id: "lighting-electrical",
    title: "LIGHTING & ELECTRICAL",
    items: [
      "Headlights — Low / High Beam",
      "Fog Lights",
      "Front Turn Signals / Marker Lights",
      "Rear Turn Signals / Tail Lights",
      "Brake Lights",
      "Reverse Lights",
      "License Plate Lights",
      "Horn",
      "Wipers / Washers",
      "Accessory Wiring / Electrical Installations"
    ]
  },

  {
    id: "exhaust-armor-offroad",
    title: "EXHAUST, ARMOR & OFF-ROAD EQUIPMENT",
    items: [
      "Exhaust System / Hangers / Leaks",
      "Skid Plates / Mounting Hardware",
      "Rock Sliders / Steps",
      "Bumpers / Mounting",
      "Recovery Points",
      "Winch / Mount / Wiring (if equipped)",
      "Aftermarket Armor / Interference",
      "Visible Modification Fitment / Hardware"
    ]
  },

  {
    id: "safety-general",
    title: "SAFETY & GENERAL CONDITION",
    items: [
      "Windshield / Mirrors / Glass",
      "Seat Belts / Latches",
      "Doors / Hood / Tailgate Latches",
      "Fluid Leaks Under Vehicle",
      "Warning Lights / Instrument Cluster",
      "Visible Loose / Missing Hardware",
      "General Vehicle Condition"
    ]
  }
];


// ============================================================
// APP STATE
// ============================================================

const inspectionState = {
  version: 2,
  inspectionNumber: null,
  status: "draft",
  createdAt: null,
  updatedAt: null,
  vehicle: {},
  items: {},
  technicianSummary: "",
  priorityRepairs: "",
  technicianSignature: "",
  customerAdvised: "",
  media: {}
};

const STORAGE_KEYS = {
  active: "hales-v2-active-inspection",
  saved: "hales-v2-saved-inspections"
};

let autosaveTimer = null;


// ============================================================
// DOM REFERENCES
// ============================================================

const sectionsContainer =
  document.getElementById("inspectionSections");

const goodCount =
  document.getElementById("goodCount");

const monitorCount =
  document.getElementById("monitorCount");

const repairCount =
  document.getElementById("repairCount");

const unmarkedCount =
  document.getElementById("unmarkedCount");


// ============================================================
// HELPERS
// ============================================================

function makeItemId(sectionId, itemIndex) {
  return `${sectionId}-${itemIndex}`;
}


function createElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  if (text !== undefined) {
    element.textContent = text;
  }

  return element;
}


// ============================================================
// STATUS CONTROL
// ============================================================

function setItemStatus(itemId, newStatus) {
  const itemState = inspectionState.items[itemId];

  if (!itemState) {
    return;
  }

  /*
    IMPORTANT V2 RULE:

    Clicking the currently selected status again clears it.

    Example:
      Green -> click Green again -> Unmarked

    Selecting a different status replaces the previous status.
  */

  if (itemState.status === newStatus) {
    itemState.status = "";
  } else {
    itemState.status = newStatus;
  }

  refreshStatusButtons(itemId);
updateSummaryCounts();
scheduleAutosave();}


function refreshStatusButtons(itemId) {
  const itemState = inspectionState.items[itemId];

  const row = document.querySelector(
    `[data-item-id="${itemId}"]`
  );

  if (!row || !itemState) {
    return;
  }

  const buttons =
    row.querySelectorAll(".status-button");

  buttons.forEach((button) => {
    const buttonStatus =
      button.dataset.status;

    const selected =
      itemState.status === buttonStatus;

    button.classList.toggle(
      "selected",
      selected
    );

    button.setAttribute(
      "aria-pressed",
      selected ? "true" : "false"
    );
  });
}


// ============================================================
// SUMMARY COUNTS
// ============================================================

function updateSummaryCounts() {
  let good = 0;
  let monitor = 0;
  let repair = 0;
  let unmarked = 0;

  Object.values(inspectionState.items)
    .forEach((item) => {

      switch (item.status) {
        case "green":
          good += 1;
          break;

        case "yellow":
          monitor += 1;
          break;

        case "red":
          repair += 1;
          break;

        default:
          unmarked += 1;
      }

    });

  goodCount.textContent = good;
  monitorCount.textContent = monitor;
  repairCount.textContent = repair;
  unmarkedCount.textContent = unmarked;
}


// ============================================================
// INSPECTION ITEM
// ============================================================

function buildInspectionItem(
  section,
  itemName,
  itemIndex
) {

  const itemId =
    makeItemId(section.id, itemIndex);

  inspectionState.items[itemId] = {
    sectionId: section.id,
    sectionTitle: section.title,
    itemName: itemName,
    status: "",
    notes: ""
  };


  const row =
    createElement(
      "div",
      "inspection-item"
    );

  row.dataset.itemId = itemId;


  const itemLabel =
    createElement(
      "div",
      "inspection-item-label",
      itemName
    );


  const statusControls =
    createElement(
      "div",
      "status-controls"
    );


  const statuses = [
    {
      value: "green",
      label: "Green"
    },
    {
      value: "yellow",
      label: "Yellow"
    },
    {
      value: "red",
      label: "Red"
    }
  ];


  statuses.forEach((status) => {

    const button =
      createElement(
        "button",
        `status-button ${status.value}`,
        status.label
      );

    button.type = "button";

    button.dataset.status =
      status.value;

    button.setAttribute(
      "aria-pressed",
      "false"
    );

    button.addEventListener(
      "click",
      () => {
        setItemStatus(
          itemId,
          status.value
        );
      }
    );

    statusControls.appendChild(button);

  });


  const notes =
    document.createElement("input");

  notes.type = "text";

  notes.className =
    "inspection-item-notes";

  notes.placeholder =
    "Measurement / notes";

  notes.setAttribute(
    "aria-label",
    `${itemName} measurement or notes`
  );

  notes.addEventListener(
    "input",
    () => {
  inspectionState.items[itemId].notes =
  notes.value;

scheduleAutosave();    }
  );


  row.appendChild(itemLabel);
  row.appendChild(statusControls);
  row.appendChild(notes);

  return row;
}


// ============================================================
// CATEGORY MEDIA PLACEHOLDER
// ============================================================

function buildMediaArea(section) {

  const mediaArea =
    createElement(
      "div",
      "section-media"
    );

  mediaArea.dataset.sectionId =
    section.id;


  const heading =
    createElement(
      "div",
      "section-media-heading",
      "Inspection Media"
    );


  const explanation =
    createElement(
      "p",
      "section-media-description",
      "Photos and videos for this category will appear here."
    );


  const mediaGrid =
    createElement(
      "div",
      "media-grid"
    );

  mediaGrid.id =
    `media-${section.id}`;


  const addMediaButton =
    createElement(
      "button",
      "add-media-button",
      "Add Photo / Video"
    );

  addMediaButton.type = "button";

  /*
    Media functionality is intentionally disabled
    during Stage 1.

    We are creating the correct UI location now so
    photos/videos can be added without restructuring
    the inspection later.
  */

  addMediaButton.disabled = true;

  addMediaButton.title =
    "Photo and video support will be enabled in the media stage.";


  mediaArea.appendChild(heading);
  mediaArea.appendChild(explanation);
  mediaArea.appendChild(mediaGrid);
  mediaArea.appendChild(addMediaButton);

  return mediaArea;
}


// ============================================================
// INSPECTION SECTION
// ============================================================

function buildInspectionSection(section) {

  const sectionElement =
    createElement(
      "section",
      "inspection-section"
    );

  sectionElement.id = section.id;


  const heading =
    createElement(
      "h2",
      "inspection-section-title",
      section.title
    );

  sectionElement.appendChild(heading);


  const itemsContainer =
    createElement(
      "div",
      "inspection-items"
    );


  section.items.forEach(
    (itemName, itemIndex) => {

      const item =
        buildInspectionItem(
          section,
          itemName,
          itemIndex
        );

      itemsContainer.appendChild(item);

    }
  );


  sectionElement.appendChild(
    itemsContainer
  );

  sectionElement.appendChild(
    buildMediaArea(section)
  );

  return sectionElement;
}


// ============================================================
// BUILD INSPECTION
// ============================================================

function buildInspection() {

  sectionsContainer.innerHTML = "";

  inspectionDefinition.forEach(
    (section) => {

      const sectionElement =
        buildInspectionSection(section);

      sectionsContainer.appendChild(
        sectionElement
      );

    }
  );

  updateSummaryCounts();
}


// ============================================================
// DATE
// ============================================================

function setDefaultDate() {

  const dateInput =
    document.getElementById(
      "inspectionDate"
    );

  if (!dateInput || dateInput.value) {
    return;
  }

  const today = new Date();

  const year =
    today.getFullYear();

  const month =
    String(
      today.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      today.getDate()
    ).padStart(2, "0");

  dateInput.value =
    `${year}-${month}-${day}`;
}


// ============================================================
// V2 STAGE 2 — LOCAL PERSISTENCE
// ============================================================

const vehicleFieldIds = [
  "customerName",
  "customerPhone",
  "inspectionDate",
  "repairOrder",
  "technician",
  "vehicleYear",
  "vehicleMake",
  "vehicleModel",
  "vehicleMileage",
  "vehicleVin",
  "licensePlate",
  "registrationState"
];

const completionFieldIds = [
  "technicianSummary",
  "priorityRepairs",
  "technicianSignature",
  "customerAdvised"
];

function setSaveStatus(message) {
  const saveStatus =
    document.getElementById("saveStatus");

  if (saveStatus) {
    saveStatus.textContent = message;
  }
}

function readStorage(key, fallback) {
  try {
    const stored = localStorage.getItem(key);

    if (!stored) {
      return fallback;
    }

    return JSON.parse(stored);
  } catch (error) {
    console.error(
      "Unable to read Hale's inspection storage:",
      error
    );

    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify(value)
    );

    return true;
  } catch (error) {
    console.error(
      "Unable to save Hale's inspection:",
      error
    );

    setSaveStatus("Save failed");

    return false;
  }
}

function cloneInspectionState() {
  return JSON.parse(
    JSON.stringify(inspectionState)
  );
}

function generateInspectionNumber() {
  const now = new Date();

  const year = now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      now.getDate()
    ).padStart(2, "0");

  const time =
    String(
      now.getTime()
    ).slice(-6);

  return (
    `HM-${year}${month}${day}-${time}`
  );
}

function collectFormState() {

  vehicleFieldIds.forEach((fieldId) => {

    const field =
      document.getElementById(fieldId);

    if (field) {
      inspectionState.vehicle[fieldId] =
        field.value;
    }

  });

  completionFieldIds.forEach((fieldId) => {

    const field =
      document.getElementById(fieldId);

    if (field) {
      inspectionState[fieldId] =
        field.value;
    }

  });
}

function applyStateToForm() {

  vehicleFieldIds.forEach((fieldId) => {

    const field =
      document.getElementById(fieldId);

    if (field) {
      field.value =
        inspectionState.vehicle[fieldId] ||
        "";
    }

  });

  completionFieldIds.forEach((fieldId) => {

    const field =
      document.getElementById(fieldId);

    if (field) {
      field.value =
        inspectionState[fieldId] || "";
    }

  });

  Object.entries(
    inspectionState.items
  ).forEach(([itemId, itemState]) => {

    const row =
      document.querySelector(
        `[data-item-id="${itemId}"]`
      );

    if (!row) {
      return;
    }

    const notes =
      row.querySelector(
        ".inspection-item-notes"
      );

    if (notes) {
      notes.value =
        itemState.notes || "";
    }

    refreshStatusButtons(itemId);
  });

  const inspectionNumber =
    document.getElementById(
      "inspectionNumber"
    );

  if (inspectionNumber) {
    inspectionNumber.textContent =
      inspectionState.inspectionNumber ||
      "New Inspection";
  }

  updateSummaryCounts();
}

function loadInspectionState(savedState) {

  if (
    !savedState ||
    typeof savedState !== "object"
  ) {
    return;
  }

  inspectionState.inspectionNumber =
    savedState.inspectionNumber || null;

  inspectionState.status =
    savedState.status || "draft";

  inspectionState.createdAt =
    savedState.createdAt || null;

  inspectionState.updatedAt =
    savedState.updatedAt || null;

  inspectionState.vehicle =
    savedState.vehicle || {};

  inspectionState.technicianSummary =
    savedState.technicianSummary || "";

  inspectionState.priorityRepairs =
    savedState.priorityRepairs || "";

  inspectionState.technicianSignature =
    savedState.technicianSignature || "";

  inspectionState.customerAdvised =
    savedState.customerAdvised || "";

  inspectionState.media =
    savedState.media || {};

  Object.keys(
    inspectionState.items
  ).forEach((itemId) => {

    const savedItem =
      savedState.items &&
      savedState.items[itemId];

    if (savedItem) {

      inspectionState.items[itemId].status =
        savedItem.status || "";

      inspectionState.items[itemId].notes =
        savedItem.notes || "";

    } else {

      inspectionState.items[itemId].status =
        "";

      inspectionState.items[itemId].notes =
        "";
    }

  });
}

function autosaveInspection() {

  collectFormState();

  inspectionState.updatedAt =
    new Date().toISOString();

  const saved =
    writeStorage(
      STORAGE_KEYS.active,
      cloneInspectionState()
    );

  if (saved) {
    setSaveStatus("Autosaved");
  }
}

function scheduleAutosave() {

  clearTimeout(autosaveTimer);

  setSaveStatus("Unsaved changes");

  autosaveTimer =
    setTimeout(
      autosaveInspection,
      400
    );
}

async function saveInspection() {
  collectFormState();

  setSaveStatus("Saving...");

  const {
    data: { user },
    error: userError
  } = await supabaseClient.auth.getUser();

  if (userError || !user) {
    setSaveStatus("Save failed — not signed in");
    return;
  }

  const now = new Date().toISOString();

  if (!inspectionState.inspectionNumber) {
    inspectionState.inspectionNumber = generateInspectionNumber();
    inspectionState.createdAt = now;
  }

  inspectionState.updatedAt = now;

  const snapshot = cloneInspectionState();

  // Keep a local saved copy for recovery/offline protection.
  const savedInspections = readStorage(
    STORAGE_KEYS.saved,
    []
  );

  const existingIndex = savedInspections.findIndex(
    (inspection) =>
      inspection.inspectionNumber ===
      snapshot.inspectionNumber
  );

  if (existingIndex >= 0) {
    savedInspections[existingIndex] = snapshot;
  } else {
    savedInspections.unshift(snapshot);
  }

  const localSaved = writeStorage(
    STORAGE_KEYS.saved,
    savedInspections
  );

  if (!localSaved) {
    setSaveStatus("Local backup failed");
    return;
  }

  writeStorage(
    STORAGE_KEYS.active,
    snapshot
  );

  const cloudRecord = {
  inspection_number: snapshot.inspectionNumber,
  owner_id: user.id,
  status: snapshot.status || "draft",

  customer_name: snapshot.vehicle?.customerName || "",
  customer_phone: snapshot.vehicle?.customerPhone || "",
  inspection_date: snapshot.vehicle?.inspectionDate || null,
  repair_order: snapshot.vehicle?.repairOrder || "",
  technician: snapshot.vehicle?.technician || "",

  vehicle_year: snapshot.vehicle?.vehicleYear
    ? Number(snapshot.vehicle.vehicleYear)
    : null,

  vehicle_make: snapshot.vehicle?.vehicleMake || "",
  vehicle_model: snapshot.vehicle?.vehicleModel || "",

  vehicle_mileage: snapshot.vehicle?.vehicleMileage
    ? Number(snapshot.vehicle.vehicleMileage)
    : null,

  vehicle_vin: snapshot.vehicle?.vehicleVin || "",
  license_plate: snapshot.vehicle?.licensePlate || "",
  registration_state:
    snapshot.vehicle?.registrationState || "",

  technician_summary:
    snapshot.technicianSummary || "",

  priority_repairs:
    snapshot.priorityRepairs || "",

  technician_signature:
    snapshot.technicianSignature || "",

  customer_advised:
    Boolean(snapshot.customerAdvised),

  created_at: snapshot.createdAt,
  updated_at: snapshot.updatedAt
};    

  const { error: cloudError } = await supabaseClient
  .from("inspections")
  .upsert(
    cloudRecord,
    {
      onConflict: "inspection_number"
    }
  );
  
  if (cloudError) {
    console.error(
      "Supabase inspection save failed:",
      cloudError
    );

    applyStateToForm();

    setSaveStatus(
      "Saved locally — cloud save failed"
    );

    return;
  }

  applyStateToForm();

  setSaveStatus(
    "Inspection saved to cloud"
  );
}

function resetInspectionState() {

  inspectionState.inspectionNumber = null;
  inspectionState.status = "draft";
  inspectionState.createdAt = null;
  inspectionState.updatedAt = null;

  inspectionState.vehicle = {};

  inspectionState.technicianSummary = "";
  inspectionState.priorityRepairs = "";
  inspectionState.technicianSignature = "";
  inspectionState.customerAdvised = "";

  inspectionState.media = {};

  Object.values(
    inspectionState.items
  ).forEach((itemState) => {

    itemState.status = "";
    itemState.notes = "";

  });
}

function startNewInspection() {

  const confirmed =
    window.confirm(
      "Start a new inspection? Unsaved work in the current inspection will be cleared."
    );

  if (!confirmed) {
    return;
  }

  localStorage.removeItem(
    STORAGE_KEYS.active
  );

  resetInspectionState();

  applyStateToForm();

  const dateInput =
    document.getElementById(
      "inspectionDate"
    );

  if (dateInput) {
    dateInput.value = "";
  }

  setDefaultDate();

  collectFormState();

  writeStorage(
    STORAGE_KEYS.active,
    cloneInspectionState()
  );

  setSaveStatus("New inspection");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function restoreActiveInspection() {

  const savedState =
    readStorage(
      STORAGE_KEYS.active,
      null
    );

  if (!savedState) {
    return false;
  }

  loadInspectionState(savedState);

  applyStateToForm();

  setSaveStatus("Draft restored");

  return true;
}

function closeSavedInspections() {

  const panel =
    document.getElementById(
      "savedInspectionsPanel"
    );

  if (panel) {
    panel.hidden = true;
    panel.innerHTML = "";
  }
}

function openSavedInspection(
  inspectionNumber
) {

  const savedInspections =
    readStorage(
      STORAGE_KEYS.saved,
      []
    );

  const savedInspection =
    savedInspections.find(
      (inspection) =>
        inspection.inspectionNumber ===
        inspectionNumber
    );

  if (!savedInspection) {

    setSaveStatus(
      "Saved inspection not found"
    );

    return;
  }

  loadInspectionState(
    savedInspection
  );

  applyStateToForm();

  writeStorage(
    STORAGE_KEYS.active,
    cloneInspectionState()
  );

  closeSavedInspections();

  setSaveStatus(
    "Saved inspection opened"
  );

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function deleteSavedInspection(
  inspectionNumber
) {

  const confirmed =
    window.confirm(
      `Delete inspection ${inspectionNumber}? This cannot be undone.`
    );

  if (!confirmed) {
    return;
  }

  const savedInspections =
    readStorage(
      STORAGE_KEYS.saved,
      []
    );

  const remainingInspections =
    savedInspections.filter(
      (inspection) =>
        inspection.inspectionNumber !==
        inspectionNumber
    );

  writeStorage(
    STORAGE_KEYS.saved,
    remainingInspections
  );

  showSavedInspections();
}

function getSavedInspectionDescription(
  inspection
) {

  const vehicle =
    inspection.vehicle || {};

  const customer =
    vehicle.customerName ||
    "No customer";

  const vehicleDescription = [
    vehicle.vehicleYear,
    vehicle.vehicleMake,
    vehicle.vehicleModel
  ]
    .filter(Boolean)
    .join(" ") ||
    "Vehicle not entered";

  const date =
    vehicle.inspectionDate || "";

  const repairOrder =
    vehicle.repairOrder || "";

  let description =
    `${customer} — ${vehicleDescription}`;

  if (date) {
    description += ` — ${date}`;
  }

  if (repairOrder) {
    description +=
      ` — RO ${repairOrder}`;
  }

  return description;
}

function showSavedInspections() {

  const panel =
    document.getElementById(
      "savedInspectionsPanel"
    );

  if (!panel) {
    return;
  }

  const savedInspections =
    readStorage(
      STORAGE_KEYS.saved,
      []
    );

  panel.innerHTML = "";
  panel.hidden = false;

  panel.style.position = "fixed";
  panel.style.inset = "0";
  panel.style.zIndex = "9999";
  panel.style.overflow = "auto";
  panel.style.background =
    "rgba(0, 0, 0, 0.72)";
  panel.style.padding = "24px";

  const content =
    createElement(
      "div",
      "saved-inspections-content"
    );

  content.style.maxWidth = "900px";
  content.style.margin = "30px auto";
  content.style.background = "#ffffff";
  content.style.borderRadius = "10px";
  content.style.padding = "24px";

  const heading =
    createElement(
      "h2",
      "",
      "Saved Inspections"
    );

  const closeButton =
    createElement(
      "button",
      "",
      "Close"
    );

  closeButton.type = "button";
  closeButton.style.marginBottom = "18px";

  closeButton.addEventListener(
    "click",
    closeSavedInspections
  );

  content.appendChild(heading);
  content.appendChild(closeButton);

  if (!savedInspections.length) {

    content.appendChild(
      createElement(
        "p",
        "",
        "No saved inspections yet."
      )
    );

  } else {

    savedInspections.forEach(
      (inspection) => {

        const row =
          createElement(
            "div",
            "saved-inspection-row"
          );

        row.style.display = "grid";
        row.style.gridTemplateColumns =
          "1fr auto auto";
        row.style.gap = "10px";
        row.style.alignItems = "center";
        row.style.borderTop =
          "1px solid #dddddd";
        row.style.padding = "14px 0";

        const info =
          createElement(
            "div",
            "saved-inspection-info"
          );

        const number =
          createElement(
            "strong",
            "",
            inspection.inspectionNumber
          );

        const description =
          createElement(
            "div",
            "",
            getSavedInspectionDescription(
              inspection
            )
          );

        info.appendChild(number);
        info.appendChild(description);

        const openButton =
          createElement(
            "button",
            "",
            "Open"
          );

        openButton.type = "button";

        openButton.addEventListener(
          "click",
          () => {
            openSavedInspection(
              inspection.inspectionNumber
            );
          }
        );

        const deleteButton =
          createElement(
            "button",
            "",
            "Delete"
          );

        deleteButton.type = "button";

        deleteButton.addEventListener(
          "click",
          () => {
            deleteSavedInspection(
              inspection.inspectionNumber
            );
          }
        );

        row.appendChild(info);
        row.appendChild(openButton);
        row.appendChild(deleteButton);

        content.appendChild(row);
      }
    );
  }

  panel.appendChild(content);
}

function configurePersistence() {

  vehicleFieldIds.forEach(
    (fieldId) => {

      const field =
        document.getElementById(
          fieldId
        );

      if (!field) {
        return;
      }

      field.addEventListener(
        "input",
        scheduleAutosave
      );

      field.addEventListener(
        "change",
        scheduleAutosave
      );
    }
  );

  completionFieldIds.forEach(
    (fieldId) => {

      const field =
        document.getElementById(
          fieldId
        );

      if (!field) {
        return;
      }

      field.addEventListener(
        "input",
        scheduleAutosave
      );

      field.addEventListener(
        "change",
        scheduleAutosave
      );
    }
  );

  const saveButton =
    document.getElementById(
      "saveInspectionButton"
    );

  const savedButton =
    document.getElementById(
      "savedInspectionsButton"
    );

  const newButton =
    document.getElementById(
      "newInspectionButton"
    );

  const reportButton =
    document.getElementById(
      "generateReportButton"
    );

  const finalizeButton =
    document.getElementById(
      "finalizeInspectionButton"
    );

  if (saveButton) {

    saveButton.disabled = false;

    saveButton.addEventListener(
      "click",
      saveInspection
    );
  }

  if (savedButton) {

    savedButton.disabled = false;

    savedButton.addEventListener(
      "click",
      showSavedInspections
    );
  }

  if (newButton) {

    newButton.disabled = false;

    newButton.addEventListener(
      "click",
      startNewInspection
    );
  }

  /*
    Report and Finalize remain disabled
    until their dedicated build stage.
  */

  if (reportButton) {
    reportButton.disabled = true;
  }

  if (finalizeButton) {
    finalizeButton.disabled = true;
  }
}


// ============================================================
// INITIALIZE V2 STAGE 2
// ============================================================

function initializeApp() {

  buildInspection();

  setDefaultDate();

  configurePersistence();

  if (!restoreActiveInspection()) {

    collectFormState();

    writeStorage(
      STORAGE_KEYS.active,
      cloneInspectionState()
    );

    setSaveStatus(
      "V2 Stage 2 — Ready"
    );
  }
}


// ============================================================
// SUPABASE AUTHENTICATION
// ============================================================

let inspectionAppInitialized = false;

function showLoginScreen() {
  const loginScreen = document.getElementById("loginScreen");
  const inspectionApp = document.getElementById("inspectionApp");

  if (loginScreen) {
    loginScreen.hidden = false;
  }

  if (inspectionApp) {
    inspectionApp.hidden = true;
  }
}

function showInspectionApp() {
  const loginScreen = document.getElementById("loginScreen");
  const inspectionApp = document.getElementById("inspectionApp");

  if (loginScreen) {
    loginScreen.hidden = true;
  }

  if (inspectionApp) {
    inspectionApp.hidden = false;
  }

  if (!inspectionAppInitialized) {
    initializeApp();
    inspectionAppInitialized = true;
  }
}

async function handleLogin(event) {
  event.preventDefault();

  const emailInput = document.getElementById("loginEmail");
  const passwordInput = document.getElementById("loginPassword");
  const loginStatus = document.getElementById("loginStatus");
  const loginButton = document.getElementById("loginButton");

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  loginStatus.textContent = "Signing in...";
  loginButton.disabled = true;

  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    loginStatus.textContent = error.message;
    loginButton.disabled = false;
    return;
  }

  passwordInput.value = "";
  loginStatus.textContent = "";
  loginButton.disabled = false;

  showInspectionApp();
}

async function initializeAuthentication() {
  const loginForm = document.getElementById("loginForm");

  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }

  const {
    data: { session }
  } = await supabaseClient.auth.getSession();

  if (session) {
    showInspectionApp();
  } else {
    showLoginScreen();
  }

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    if (session) {
      showInspectionApp();
    } else {
      showLoginScreen();
    }
  });
}

initializeAuthentication();
