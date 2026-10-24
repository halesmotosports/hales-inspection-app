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
  vehicle: {},
  items: {},
  technicianSummary: "",
  priorityRepairs: "",
  technicianSignature: "",
  customerAdvised: "",
  media: {}
};


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
}


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
    }
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
// BUTTON PLACEHOLDERS
// ============================================================

function configureStageOneButtons() {

  const futureButtons = [
    "savedInspectionsButton",
    "saveInspectionButton",
    "generateReportButton",
    "finalizeInspectionButton"
  ];

  futureButtons.forEach((buttonId) => {

    const button =
      document.getElementById(buttonId);

    if (button) {
      button.disabled = true;
    }

  });


  const newInspectionButton =
    document.getElementById(
      "newInspectionButton"
    );

  if (newInspectionButton) {

    newInspectionButton.addEventListener(
      "click",
      () => {

        const confirmed =
          window.confirm(
            "Clear this inspection and start a new inspection?"
          );

        if (confirmed) {
          window.location.reload();
        }

      }
    );

  }
}


// ============================================================
// INITIALIZE V2
// ============================================================

function initializeApp() {

  buildInspection();

  setDefaultDate();

  configureStageOneButtons();

  const saveStatus =
    document.getElementById(
      "saveStatus"
    );

  if (saveStatus) {
    saveStatus.textContent =
      "V2 Stage 1 — Ready";
  }

}


initializeApp();
