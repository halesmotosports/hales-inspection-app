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
  const mediaArea = createElement(
    "div",
    "section-media"
  );

  mediaArea.dataset.sectionId = section.id;

  const heading = createElement(
    "div",
    "section-media-heading",
    "Inspection Media"
  );

  const explanation = createElement(
    "p",
    "section-media-description",
    "Add photos or videos for this inspection category."
  );

  const mediaGrid = createElement(
    "div",
    "media-grid"
  );

  mediaGrid.id = `media-${section.id}`;

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*,video/*";
  fileInput.multiple = true;
  fileInput.hidden = true;
  fileInput.id = `media-input-${section.id}`;

  const addMediaButton = createElement(
    "button",
    "add-media-button",
    "Add Photo / Video"
  );

  addMediaButton.type = "button";

  addMediaButton.addEventListener(
    "click",
    () => {
      fileInput.click();
    }
  );

  fileInput.addEventListener(
    "change",
    async () => {
      const files = Array.from(
        fileInput.files || []
      );

      if (!files.length) {
        return;
      }

      addMediaButton.disabled = true;
      addMediaButton.textContent = "Uploading...";

      try {
        for (const file of files) {
          await uploadInspectionMedia(
            section,
            file
          );
        }

        await loadInspectionMedia(
          section.id
        );
      } catch (error) {
        console.error(
          "Media upload failed:",
          error
        );

        alert(
          error?.message ||
          "The photo or video could not be uploaded."
        );
      } finally {
        fileInput.value = "";
        addMediaButton.disabled = false;
        addMediaButton.textContent =
          "Add Photo / Video";
      }
    }
  );

  mediaArea.appendChild(heading);
  mediaArea.appendChild(explanation);
  mediaArea.appendChild(mediaGrid);
  mediaArea.appendChild(fileInput);
  mediaArea.appendChild(addMediaButton);

  return mediaArea;
}

// ============================================================
// INSPECTION MEDIA — SUPABASE
// ============================================================

async function getInspectionMediaContext() {
  const {
    data: { user },
    error: userError
  } = await supabaseClient.auth.getUser();

  if (userError || !user) {
    throw new Error(
      "You must be signed in to use inspection media."
    );
  }

  collectFormState();

  if (!inspectionState.inspectionNumber) {
    await saveInspection();
  }

  if (!inspectionState.inspectionNumber) {
    throw new Error(
      "The inspection must be saved before adding media."
    );
  }

  const {
    data: inspection,
    error: inspectionError
  } = await supabaseClient
    .from("inspections")
    .select("id, inspection_number")
    .eq(
      "inspection_number",
      inspectionState.inspectionNumber
    )
    .eq("owner_id", user.id)
    .single();

  if (inspectionError || !inspection) {
    console.error(
      "Could not retrieve inspection for media:",
      inspectionError
    );

    throw new Error(
      "The inspection could not be found in cloud storage."
    );
  }

  return {
    user,
    inspection
  };
}


function makeSafeFilename(filename) {
  const dotIndex =
    filename.lastIndexOf(".");

  const extension =
    dotIndex >= 0
      ? filename.slice(dotIndex).toLowerCase()
      : "";

  const baseName =
    dotIndex >= 0
      ? filename.slice(0, dotIndex)
      : filename;

  const safeBase =
    baseName
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "media";

  return `${safeBase}${extension}`;
}


async function uploadInspectionMedia(
  section,
  file
) {
  if (
    !file.type.startsWith("image/") &&
    !file.type.startsWith("video/")
  ) {
    throw new Error(
      `${file.name} is not a supported photo or video.`
    );
  }

  setSaveStatus("Uploading media...");

  const {
    user,
    inspection
  } = await getInspectionMediaContext();

  const mediaType =
    file.type.startsWith("video/")
      ? "video"
      : "photo";

  const safeFilename =
    makeSafeFilename(file.name);

  const uniqueFilename =
    `${crypto.randomUUID()}-${safeFilename}`;

  const storagePath =
    `${user.id}/${inspection.id}/${uniqueFilename}`;

  const {
    error: uploadError
  } = await supabaseClient.storage
    .from("inspection-media")
    .upload(
      storagePath,
      file,
      {
        contentType:
          file.type ||
          "application/octet-stream",
        upsert: false
      }
    );

  if (uploadError) {
    console.error(
      "Media storage upload failed:",
      uploadError
    );

    setSaveStatus("Media upload failed");

    throw uploadError;
  }

  const {
    data: existingMedia,
    error: orderError
  } = await supabaseClient
    .from("inspection_media")
    .select("display_order")
    .eq(
      "inspection_id",
      inspection.id
    )
    .eq(
      "category",
      section.id
    )
    .order(
      "display_order",
      { ascending: false }
    )
    .limit(1);

  if (orderError) {
    console.error(
      "Could not determine media order:",
      orderError
    );
  }

  const displayOrder =
    existingMedia &&
    existingMedia.length
      ? Number(
          existingMedia[0].display_order
        ) + 1
      : 0;

  const now =
    new Date().toISOString();

  const mediaRecord = {
    inspection_id: inspection.id,
    owner_id: user.id,
    category: section.id,
    media_type: mediaType,
    storage_path: storagePath,
    original_filename: file.name,
    mime_type:
      file.type ||
      "application/octet-stream",
    file_size_bytes: file.size,
    technician_caption: "",
    customer_visible: false,
    display_order: displayOrder,
    created_at: now,
    updated_at: now
  };

  const {
    error: metadataError
  } = await supabaseClient
    .from("inspection_media")
    .insert(mediaRecord);

  if (metadataError) {
    console.error(
      "Media metadata save failed:",
      metadataError
    );

    await supabaseClient.storage
      .from("inspection-media")
      .remove([storagePath]);

    setSaveStatus(
      "Media upload failed"
    );

    throw metadataError;
  }

  setSaveStatus("Media uploaded");
}


async function loadInspectionMedia(
  sectionId
) {
  const mediaGrid =
    document.getElementById(
      `media-${sectionId}`
    );

  if (!mediaGrid) {
    return;
  }

  mediaGrid.innerHTML = "";

  if (!inspectionState.inspectionNumber) {
    return;
  }

  let context;

  try {
    context =
      await getInspectionMediaContext();
  } catch (error) {
    console.error(
      "Could not load media context:",
      error
    );

    return;
  }

  const {
    inspection
  } = context;

  const {
    data: mediaRecords,
    error: mediaError
  } = await supabaseClient
    .from("inspection_media")
    .select("*")
    .eq(
      "inspection_id",
      inspection.id
    )
    .eq(
      "category",
      sectionId
    )
    .order(
      "display_order",
      { ascending: true }
    );

  if (mediaError) {
    console.error(
      "Could not load inspection media:",
      mediaError
    );

    return;
  }

  for (
    const media of mediaRecords || []
  ) {
    await renderInspectionMedia(
      mediaGrid,
      media
    );
  }
}


async function getMediaSignedUrl(
  storagePath
) {
  const {
    data,
    error
  } = await supabaseClient.storage
    .from("inspection-media")
    .createSignedUrl(
      storagePath,
      3600
    );

  if (error || !data?.signedUrl) {
    console.error(
      "Could not create media URL:",
      error
    );

    return null;
  }

  return data.signedUrl;
}


async function renderInspectionMedia(
  mediaGrid,
  media
) {
  const signedUrl =
    await getMediaSignedUrl(
      media.storage_path
    );

  if (!signedUrl) {
    return;
  }

  const tile =
    createElement(
      "div",
      "media-tile"
    );

  tile.dataset.mediaId = media.id;

  const preview =
    createElement(
      "div",
      "media-preview"
    );

  if (media.media_type === "video") {
    const video =
      document.createElement("video");

    video.src = signedUrl;
    video.controls = true;
    video.preload = "metadata";
    video.playsInline = true;

    preview.appendChild(video);
  } else {
    const image =
      document.createElement("img");

    image.src = signedUrl;
    image.alt =
      media.original_filename ||
      "Inspection photo";

    image.loading = "lazy";

    image.addEventListener(
      "click",
      () => {
        openMediaViewer(
          signedUrl,
          "photo"
        );
      }
    );

    preview.appendChild(image);
  }

  const controls =
    createElement(
      "div",
      "media-tile-controls"
    );

  const caption =
    document.createElement(
      "textarea"
    );

  caption.className =
    "media-caption";

  caption.placeholder =
    "Technician caption / note";

  caption.value =
    media.technician_caption || "";

  let captionTimer = null;

  caption.addEventListener(
    "input",
    () => {
      clearTimeout(captionTimer);

      captionTimer =
        setTimeout(
          async () => {
            await updateInspectionMedia(
              media.id,
              {
                technician_caption:
                  caption.value
              }
            );
          },
          500
        );
    }
  );

  const visibilityLabel =
    createElement(
      "label",
      "media-visibility"
    );

  const visibilityCheckbox =
    document.createElement("input");

  visibilityCheckbox.type =
    "checkbox";

  visibilityCheckbox.checked =
    Boolean(
      media.customer_visible
    );

  const visibilityText =
    document.createTextNode(
      " Include in customer report"
    );

  visibilityCheckbox.addEventListener(
    "change",
    async () => {
      await updateInspectionMedia(
        media.id,
        {
          customer_visible:
            visibilityCheckbox.checked
        }
      );
    }
  );

  visibilityLabel.appendChild(
    visibilityCheckbox
  );

  visibilityLabel.appendChild(
    visibilityText
  );

  const deleteButton =
    createElement(
      "button",
      "media-delete-button",
      "Delete"
    );

  deleteButton.type = "button";

  deleteButton.addEventListener(
    "click",
    async () => {
      const confirmed =
        window.confirm(
          "Delete this inspection photo or video?"
        );

      if (!confirmed) {
        return;
      }

      deleteButton.disabled = true;

      try {
        await deleteInspectionMedia(
          media
        );

        tile.remove();
      } catch (error) {
        console.error(
          "Media delete failed:",
          error
        );

        alert(
          error?.message ||
          "The media could not be deleted."
        );

        deleteButton.disabled = false;
      }
    }
  );

  controls.appendChild(caption);
  controls.appendChild(
    visibilityLabel
  );
  controls.appendChild(
    deleteButton
  );

  tile.appendChild(preview);
  tile.appendChild(controls);

  mediaGrid.appendChild(tile);
}


async function updateInspectionMedia(
  mediaId,
  changes
) {
  const now =
    new Date().toISOString();

  const {
    error
  } = await supabaseClient
    .from("inspection_media")
    .update({
      ...changes,
      updated_at: now
    })
    .eq("id", mediaId);

  if (error) {
    console.error(
      "Could not update media:",
      error
    );

    setSaveStatus(
      "Media update failed"
    );

    return false;
  }

  setSaveStatus("Media updated");

  return true;
}


async function deleteInspectionMedia(
  media
) {
  setSaveStatus("Deleting media...");

  const {
    error: storageError
  } = await supabaseClient.storage
    .from("inspection-media")
    .remove([
      media.storage_path
    ]);

  if (storageError) {
    console.error(
      "Could not delete media file:",
      storageError
    );

    setSaveStatus(
      "Media delete failed"
    );

    throw storageError;
  }

  const {
    error: databaseError
  } = await supabaseClient
    .from("inspection_media")
    .delete()
    .eq("id", media.id);

  if (databaseError) {
    console.error(
      "Could not delete media record:",
      databaseError
    );

    setSaveStatus(
      "Media record delete failed"
    );

    throw databaseError;
  }

  setSaveStatus("Media deleted");
}


function openMediaViewer(
  url,
  mediaType
) {
  const viewer =
    document.getElementById(
      "mediaViewer"
    );

  if (!viewer) {
    if (mediaType === "photo") {
      window.open(
        url,
        "_blank",
        "noopener"
      );
    }

    return;
  }

  viewer.innerHTML = "";

  const closeButton =
    createElement(
      "button",
      "media-viewer-close",
      "Close"
    );

  closeButton.type = "button";

  const closeViewer = () => {
    viewer.hidden = true;
    viewer.innerHTML = "";
  };

  closeButton.addEventListener(
    "click",
    closeViewer
  );

  let mediaElement;

  if (mediaType === "video") {
    mediaElement =
      document.createElement("video");

    mediaElement.controls = true;
    mediaElement.playsInline = true;
  } else {
    mediaElement =
      document.createElement("img");
  }

  mediaElement.src = url;

  viewer.appendChild(closeButton);
  viewer.appendChild(mediaElement);

  viewer.hidden = false;
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

  const {
  data: savedInspection,
  error: inspectionLookupError
} = await supabaseClient
  .from("inspections")
  .select("id")
  .eq("inspection_number", snapshot.inspectionNumber)
  .single();

if (inspectionLookupError || !savedInspection) {
  console.error(
    "Could not retrieve saved inspection ID:",
    inspectionLookupError
  );

  applyStateToForm();
  setSaveStatus(
    "Inspection saved – results not saved"
  );
  return;
}

const resultRows = [];

let displayOrder = 0;

inspectionDefinition.forEach((section) => {
  section.items.forEach((itemLabel, itemIndex) => {
    const itemKey = makeItemId(
      section.id,
      itemIndex
    );

    const result =
      snapshot.items?.[itemKey] || {};

    resultRows.push({
      inspection_id: savedInspection.id,
      owner_id: user.id,
      item_key: itemKey,
      category: section.title,
      item_label: itemLabel,
      display_order: displayOrder,
      status: result.status || "unmarked",
      measurement_notes:
        result.notes || "",
      updated_at: now
    });

    displayOrder += 1;
  });
});

const { error: deleteResultsError } =
  await supabaseClient
    .from("inspection_results")
    .delete()
    .eq(
      "inspection_id",
      savedInspection.id
    );

if (deleteResultsError) {
  console.error(
    "Could not replace inspection results:",
    deleteResultsError
  );

  applyStateToForm();
  setSaveStatus(
    "Inspection saved – results save failed"
  );
  return;
}

const { error: resultsError } =
  await supabaseClient
    .from("inspection_results")
    .insert(resultRows);

if (resultsError) {
  console.error(
    "Supabase inspection results save failed:",
    resultsError
  );

  applyStateToForm();
  setSaveStatus(
    "Inspection saved – results save failed"
  );
  return;
}  
  applyStateToForm();

  setSaveStatus(
    "Inspection and results saved to cloud"
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

async function openCloudInspection(
  inspectionNumber
) {
  setSaveStatus("Opening inspection...");

  const {
    data: { user },
    error: userError
  } = await supabaseClient.auth.getUser();

  if (userError || !user) {
    setSaveStatus(
      "Unable to open – not signed in"
    );
    return;
  }

  const {
    data: inspection,
    error: inspectionError
  } = await supabaseClient
    .from("inspections")
    .select("*")
    .eq(
      "inspection_number",
      inspectionNumber
    )
    .eq("owner_id", user.id)
    .single();

  if (inspectionError || !inspection) {
    console.error(
      "Cloud inspection load failed:",
      inspectionError
    );

    setSaveStatus(
      "Unable to load cloud inspection"
    );
    return;
  }

  const {
    data: results,
    error: resultsError
  } = await supabaseClient
    .from("inspection_results")
    .select("*")
    .eq("inspection_id", inspection.id)
    .eq("owner_id", user.id)
    .order("display_order", {
      ascending: true
    });

  if (resultsError) {
    console.error(
      "Cloud inspection results load failed:",
      resultsError
    );

    setSaveStatus(
      "Unable to load inspection results"
    );
    return;
  }

  const cloudState = {
    inspectionNumber:
      inspection.inspection_number,

    status:
      inspection.status || "draft",

    vehicle: {
      customerName:
        inspection.customer_name || "",

      customerPhone:
        inspection.customer_phone || "",

      inspectionDate:
        inspection.inspection_date || "",

      repairOrder:
        inspection.repair_order || "",

      technician:
        inspection.technician || "",

      vehicleYear:
        inspection.vehicle_year ?? "",

      vehicleMake:
        inspection.vehicle_make || "",

      vehicleModel:
        inspection.vehicle_model || "",

      vehicleMileage:
        inspection.vehicle_mileage ?? "",

      vehicleVin:
        inspection.vehicle_vin || "",

      licensePlate:
        inspection.license_plate || "",

      registrationState:
        inspection.registration_state || ""
    },

    items: {},

    technicianSummary:
      inspection.technician_summary || "",

    priorityRepairs:
      inspection.priority_repairs || "",

    technicianSignature:
      inspection.technician_signature || "",

    customerAdvised:
      Boolean(inspection.customer_advised),

    createdAt:
      inspection.created_at || null,

    updatedAt:
      inspection.updated_at || null
  };

  (results || []).forEach((result) => {
    cloudState.items[result.item_key] = {
      status:
        result.status || "unmarked",

      notes:
        result.measurement_notes || ""
    };
  });

  loadInspectionState(cloudState);

  applyStateToForm();

  writeStorage(
    STORAGE_KEYS.active,
    cloneInspectionState()
  );

  closeSavedInspections();

  setSaveStatus(
    "Cloud inspection opened"
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

async function showSavedInspections() {
  const panel =
    document.getElementById(
      "savedInspectionsPanel"
    );

  if (!panel) {
    return;
  }

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

  const loadingMessage =
    createElement(
      "p",
      "",
      "Loading saved inspections..."
    );

  content.appendChild(loadingMessage);
  panel.appendChild(content);

  const {
    data: { user },
    error: userError
  } = await supabaseClient.auth.getUser();

  if (userError || !user) {
    loadingMessage.textContent =
      "Unable to load saved inspections — not signed in.";
    return;
  }

  const {
    data: savedInspections,
    error: inspectionsError
  } = await supabaseClient
    .from("inspections")
    .select(
      `
        id,
        inspection_number,
        status,
        customer_name,
        inspection_date,
        repair_order,
        vehicle_year,
        vehicle_make,
        vehicle_model,
        updated_at
      `
    )
    .eq("owner_id", user.id)
    .order("updated_at", {
      ascending: false
    });

  loadingMessage.remove();

  if (inspectionsError) {
    console.error(
      "Could not load saved inspections:",
      inspectionsError
    );

    content.appendChild(
      createElement(
        "p",
        "",
        "Saved inspections could not be loaded."
      )
    );

    return;
  }

  if (!savedInspections?.length) {
    content.appendChild(
      createElement(
        "p",
        "",
        "No saved inspections yet."
      )
    );

    return;
  }

  savedInspections.forEach(
    (inspection) => {
      const row =
        createElement(
          "div",
          "saved-inspection-row"
        );

      row.style.display = "grid";
      row.style.gridTemplateColumns =
        "1fr auto";
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
          inspection.inspection_number
        );

      const descriptionParts = [];

      if (inspection.customer_name) {
        descriptionParts.push(
          inspection.customer_name
        );
      }

      const vehicle = [
        inspection.vehicle_year,
        inspection.vehicle_make,
        inspection.vehicle_model
      ]
        .filter(Boolean)
        .join(" ");

      if (vehicle) {
        descriptionParts.push(vehicle);
      }

      if (inspection.inspection_date) {
        descriptionParts.push(
          inspection.inspection_date
        );
      }

      if (inspection.repair_order) {
        descriptionParts.push(
          `RO: ${inspection.repair_order}`
        );
      }

      const description =
        createElement(
          "div",
          "",
          descriptionParts.join(" • ")
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
          openCloudInspection(
            inspection.inspection_number
          );
        }
      );

      row.appendChild(info);
      row.appendChild(openButton);

      content.appendChild(row);
    }
  );
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
