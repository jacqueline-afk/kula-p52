// ============================================================
// KULA NETWORK — GOOGLE SHEETS VERSION
// ============================================================

// ------------------------------------------------------------
// GOOGLE SHEET URLs
// ------------------------------------------------------------

const STUDENTS_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSKk0XaNraYk9amt7zBt_IR7jgPhDt0_uqTzDhlCPc1ph9_IagK-SnwpSnB-52osj-GSlPPqpD5VBrr/pub?gid=0&single=true&output=csv";

const PLACES_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSKk0XaNraYk9amt7zBt_IR7jgPhDt0_uqTzDhlCPc1ph9_IagK-SnwpSnB-52osj-GSlPPqpD5VBrr/pub?gid=609795682&single=true&output=csv";

const STUDENT_PLACES_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSKk0XaNraYk9amt7zBt_IR7jgPhDt0_uqTzDhlCPc1ph9_IagK-SnwpSnB-52osj-GSlPPqpD5VBrr/pub?gid=2048513661&single=true&output=csv";

// NEW: Kumu master table
const KUMU_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSKk0XaNraYk9amt7zBt_IR7jgPhDt0_uqTzDhlCPc1ph9_IagK-SnwpSnB-52osj-GSlPPqpD5VBrr/pub?gid=801438965&single=true&output=csv";

// NEW: Place ↔ Kumu relationship table
const PLACE_KUMU_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSKk0XaNraYk9amt7zBt_IR7jgPhDt0_uqTzDhlCPc1ph9_IagK-SnwpSnB-52osj-GSlPPqpD5VBrr/pub?gid=1638532722&single=true&output=csv";


// ------------------------------------------------------------
// GRAPH DATA
// ------------------------------------------------------------

let networkNodes = [];
let networkEdges = [];

let graphReady = false;

let selectedNode = null;

let radialTargets = new Map();

let zoomLevel = 1;
let panX = 0;
let panY = 0;

let draggingNode = null;
let lastMouseX = 0;
let lastMouseY = 0;


// ------------------------------------------------------------
// COLORS
// ------------------------------------------------------------

const STUDENT_COLOR = "#00A6E8";
const PLACE_COLOR = "#EC2DB5";
const KUMU_COLOR = "#FF4B45";

const BACKGROUND_COLOR = "#000000";
const TEXT_COLOR = "#FFFFFF";
const MUTED_TEXT = "#A8A8A8";
const EDGE_COLOR = "#555555";
const EDGE_ACTIVE = "#FFFFFF";


// ------------------------------------------------------------
// NODE CLASS
// ------------------------------------------------------------

class NetworkNode {

  constructor(id, name, type) {

    this.id = id;
    this.name = name;
    this.type = type;

    this.x = random(150, width - 150);
    this.y = random(150, height - 150);

    this.vx = 0;
    this.vy = 0;

    this.radius = 32;

  }

}


// ------------------------------------------------------------
// SETUP
// ------------------------------------------------------------

function setup() {

  createCanvas(windowWidth, windowHeight);

  textFont("Arial");

  loadNetworkData();

}


// ------------------------------------------------------------
// LOAD GOOGLE SHEET DATA
// ------------------------------------------------------------

async function loadNetworkData() {

  try {

    console.log("Loading Kula network data...");

    const responses = await Promise.all([

      fetch(STUDENTS_URL),
      fetch(PLACES_URL),
      fetch(STUDENT_PLACES_URL),
      fetch(KUMU_URL),
      fetch(PLACE_KUMU_URL)

    ]);

    const studentsCSV =
      await responses[0].text();

    const placesCSV =
      await responses[1].text();

    const studentPlacesCSV =
      await responses[2].text();

    const kumuCSV =
      await responses[3].text();

    const placeKumuCSV =
      await responses[4].text();


    console.log("Students CSV received");
    console.log("Places CSV received");
    console.log("Student Places CSV received");
    console.log("Kumu CSV received");
    console.log("Place Kumu CSV received");


    const students =
      parseCSV(studentsCSV);

    const places =
      parseCSV(placesCSV);

    console.log("FIRST PLACE ROW:", places[0]);
console.log("PLACE HEADERS:", Object.keys(places[0]));

    const studentPlaces =
      parseCSV(studentPlacesCSV);

    const kumu =
      parseCSV(kumuCSV);

    const placeKumu =
      parseCSV(placeKumuCSV);


    console.log("Students:", students);
    console.log("Places:", places);
    console.log("Student Places:", studentPlaces);
    console.log("Kumu:", kumu);
    console.log("Place Kumu:", placeKumu);


    buildNetwork(
      students,
      places,
      studentPlaces,
      kumu,
      placeKumu
    );


    graphReady = true;

  }

  catch (error) {

    console.error(
      "ERROR LOADING NETWORK:",
      error
    );

  }

}


// ------------------------------------------------------------
// SIMPLE CSV PARSER
// ------------------------------------------------------------

function parseCSV(csv) {

  const lines = csv
    .trim()
    .split(/\r?\n/);

  if (lines.length === 0) {
    return [];
  }

  const headers = lines[0]
    .split(",")
    .map(header => header.trim());


  return lines
    .slice(1)
    .map(line => {

      const values = line.split(",");

      const row = {};

      headers.forEach((header, index) => {

        row[header] = values[index]
          ? values[index].trim()
          : "";

      });

      return row;

    });

}


// ------------------------------------------------------------
// BUILD NETWORK
// ------------------------------------------------------------

function buildNetwork(
  students,
  places,
  studentPlaces,
  kumu,
  placeKumu
) {

  networkNodes = [];
  networkEdges = [];


  // ----------------------------------------------------------
  // STUDENT NODES
  // ----------------------------------------------------------

  students.forEach(student => {

    const id =
      student["Student ID"];

    const name =
      student["Student Name"];

    if (!id || !name) return;

    networkNodes.push(
      new NetworkNode(
        id,
        name,
        "student"
      )
    );

  });


  // ----------------------------------------------------------
  // PLACE NODES
  // ----------------------------------------------------------

  places.forEach(place => {

    const id =
      place["Place ID"];

    const name =
      place["Place Name"];

    if (!id || !name) return;

    networkNodes.push(
      new NetworkNode(
        id,
        name,
        "place"
      )
    );

  });

  console.log("PLACE NODES:", networkNodes.filter(n => n.type === "place"));

  console.log("PLACE NODES:", networkNodes.filter(n => n.type === "place"));


  // ----------------------------------------------------------
  // KUMU NODES
  // ----------------------------------------------------------

  kumu.forEach(person => {

    const id =
      person["Kumu ID"];

    const name =
      person["Kumu Name"];

    if (!id || !name) return;

    networkNodes.push(
      new NetworkNode(
        id,
        name,
        "kumu"
      )
    );

  });


  // ----------------------------------------------------------
  // STUDENT → PLACE EDGES
  // ----------------------------------------------------------

  studentPlaces.forEach(row => {

    const studentID =
      row["Student ID"];

    const placeID =
      row["Place ID"];

    if (!studentID || !placeID) return;

    networkEdges.push({

      source: studentID,

      target: placeID,

      relationship: "Visited"

    });

  });


  // ----------------------------------------------------------
  // PLACE → KUMU EDGES
  // ----------------------------------------------------------
  //
  // This now comes from the separate
  // Place Kumu relationship table.
  //
  // This allows:
  //
  // Place A → Kumu 1
  // Place A → Kumu 2
  // Place A → Kumu 3
  //
  // without duplicating the Place itself.
  // ----------------------------------------------------------

  const relationshipKeys = new Set();

  placeKumu.forEach(row => {

    const placeID =
      row["Place ID"];

    const kumuID =
      row["Kumu ID"];

    if (!placeID || !kumuID) return;


   const relationshipKey =
  placeID + "|" + kumuID;

if (relationshipKeys.has(relationshipKey)) {
  return;
}

relationshipKeys.add(relationshipKey);


    networkEdges.push({

      source: placeID,

      target: kumuID,

      relationship: "Associated"

    });

  });


  console.log(
    "NETWORK NODES:",
    networkNodes
  );

  console.log(
    "NETWORK EDGES:",
    networkEdges
  );


  arrangeNodes();

}


// ------------------------------------------------------------
// INITIAL NODE ARRANGEMENT
// ------------------------------------------------------------

function arrangeNodes() {

  networkNodes.forEach(node => {

    node.x =
      random(
        width * 0.2,
        width * 0.8
      );

    node.y =
      random(
        height * 0.2,
        height * 0.8
      );

    node.vx = 0;
    node.vy = 0;

  });

}

function calculateRadialTargets() {
  radialTargets.clear();

  if (!selectedNode || selectedNode.type !== "student") return;

  const centerX = width / 2;
  const centerY = height / 2;

  // Selected Haumana goes in the center
  radialTargets.set(selectedNode.id, {
    x: centerX,
    y: centerY
  });

  // Find connected Wahi Pana
  const connectedPlaces = networkNodes.filter(node =>
    node.type === "place" &&
    isNodeConnected(node)
  );

  // Find connected Kumu
  const connectedKumu = networkNodes.filter(node =>
    node.type === "kumu" &&
    isNodeConnected(node)
  );

  // Wahi Pana: inner ring
  const placeRadius = 180;

  connectedPlaces.forEach((node, i) => {
    const angle =
      -HALF_PI +
      (TWO_PI * i) / Math.max(connectedPlaces.length, 1);

    radialTargets.set(node.id, {
      x: centerX + cos(angle) * placeRadius,
      y: centerY + sin(angle) * placeRadius
    });
  });

  // Kumu: outer ring
  const kumuRadius = 340;

  connectedKumu.forEach((node, i) => {
    const angle =
      -HALF_PI +
      (TWO_PI * i) / Math.max(connectedKumu.length, 1);

    radialTargets.set(node.id, {
      x: centerX + cos(angle) * kumuRadius,
      y: centerY + sin(angle) * kumuRadius
    });
  });
}

// ------------------------------------------------------------
// PHYSICS
// ------------------------------------------------------------

function updatePhysics() {

  const repulsion = 2500;

  const springLength = 240;

  const springStrength = 0.004;

  const centerStrength = 0.0008;

  const damping = 0.82;


  // --------------------------------
  // REPULSION
  // --------------------------------

  for (
    let i = 0;
    i < networkNodes.length;
    i++
  ) {

    for (
      let j = i + 1;
      j < networkNodes.length;
      j++
    ) {

      const a =
        networkNodes[i];

      const b =
        networkNodes[j];


      let dx =
        b.x - a.x;

      let dy =
        b.y - a.y;


      let distance =
        sqrt(
          dx * dx +
          dy * dy
        );


      if (distance < 1) {
        distance = 1;
      }


      const force =
        repulsion /
        (distance * distance);


      const fx =
        (dx / distance) *
        force;

      const fy =
        (dy / distance) *
        force;


      a.vx -= fx;
      a.vy -= fy;

      b.vx += fx;
      b.vy += fy;

    }

  }


  // --------------------------------
  // CONNECTED NODES PULL TOGETHER
  // --------------------------------

  networkEdges.forEach(edge => {

    const a =
      findNode(edge.source);

    const b =
      findNode(edge.target);


    if (!a || !b) return;


    let dx =
      b.x - a.x;

    let dy =
      b.y - a.y;


    let distance =
      sqrt(
        dx * dx +
        dy * dy
      );


    if (distance < 1) {
      distance = 1;
    }


    const force =
      (distance - springLength) *
      springStrength;


    const fx =
      (dx / distance) *
      force;

    const fy =
      (dy / distance) *
      force;


    a.vx += fx;
    a.vy += fy;

    b.vx -= fx;
    b.vy -= fy;

  });


  // --------------------------------
  // GENTLE PULL TOWARD CENTER
  // --------------------------------

  networkNodes.forEach(node => {

    const centerX =
      width / 2;

    const centerY =
      height / 2;


    node.vx +=
      (centerX - node.x) *
      centerStrength;

    node.vy +=
      (centerY - node.y) *
      centerStrength;

  });


  // --------------------------------
  // MOVE NODES
  // --------------------------------

  networkNodes.forEach(node => {

    node.vx *= damping;

    node.vy *= damping;


    node.x += node.vx;

    node.y += node.vy;


    node.x =
      constrain(
        node.x,
        100,
        width - 100
      );

    node.y =
      constrain(
        node.y,
        120,
        height - 100
      );

  });

}


// ------------------------------------------------------------
// DRAW
// ------------------------------------------------------------

function draw() {

  background(
    BACKGROUND_COLOR
  );


if (graphReady) {
  if (selectedNode && selectedNode.type === "student") {
    calculateRadialTargets();
    function updateRadialPositions() {
  networkNodes.forEach(node => {
    const target = radialTargets.get(node.id);

    if (target) {
      node.x = lerp(node.x, target.x, 0.08);
      node.y = lerp(node.y, target.y, 0.08);
      node.vx = 0;
      node.vy = 0;
    }
  });
}
    updateRadialPositions();
  } else {
    updatePhysics();
  }
}


  if (!graphReady) {

    fill(60);

    textAlign(
      CENTER,
      CENTER
    );

    textSize(20);

    text(
      "Loading Kula network…",
      width / 2,
      height / 2
    );

    return;

  }


  // --------------------------------
  // APPLY PAN + ZOOM
  // --------------------------------

  push();


  translate(
    width / 2 + panX,
    height / 2 + panY
  );


  scale(zoomLevel);


  translate(
    -width / 2,
    -height / 2
  );


  // --------------------------------
  // EDGES
  // --------------------------------

  drawEdges();


  // --------------------------------
  // NODES
  // --------------------------------

  networkNodes.forEach(node => {

    drawNode(node);

  });


  pop();


  // --------------------------------
  // UI
  // --------------------------------

  drawLegend();

  drawInfo();


  // --------------------------------
  // TITLE
  // --------------------------------

  fill(TEXT_COLOR);

  noStroke();

  textAlign(
    LEFT,
    TOP
  );

  textSize(18);

  text(
    "Nānā i Ke Kumu",
    24,
    22
  );

}


// ------------------------------------------------------------
// DRAW EDGES
// ------------------------------------------------------------

function drawEdges() {

  networkEdges.forEach(edge => {

    const source =
      findNode(edge.source);

    const target =
      findNode(edge.target);


    if (!source || !target) {
      return;
    }


    // --------------------------------
    // SELECTION MODE
    // --------------------------------

    if (selectedNode) {

      const sourceConnected =
        source.id === selectedNode.id ||
        isNodeConnected(source);


      const targetConnected =
        target.id === selectedNode.id ||
        isNodeConnected(target);


      // Hide unrelated edges completely

      if (
        !sourceConnected ||
        !targetConnected
      ) {

        return;

      }


      stroke(
        EDGE_ACTIVE
      );

      strokeWeight(3);

    }


    // --------------------------------
    // NORMAL MODE
    // --------------------------------

    else {

      stroke(
        EDGE_COLOR
      );

      strokeWeight(1);

    }


    line(
      source.x,
      source.y,
      target.x,
      target.y
    );

  });

}


// ------------------------------------------------------------
// DRAW NODE
// ------------------------------------------------------------

function drawNode(node) {

  const isSelected =
    selectedNode &&
    selectedNode.id === node.id;


  const isConnected =
    selectedNode &&
    isNodeConnected(node);


  // --------------------------------
  // FADE UNRELATED NODES
  // --------------------------------

  if (
    selectedNode &&
    !isSelected &&
    !isConnected
  ) {

    drawingContext.globalAlpha =
      0.12;

  }

  else {

    drawingContext.globalAlpha =
      1;

  }


  push();


  translate(
    node.x,
    node.y
  );


  // --------------------------------
  // STUDENT
  // --------------------------------

  if (node.type === "student") {

    fill(STUDENT_COLOR);

    noStroke();


    circle(
      0,
      0,
      isSelected ? 72 : 58
    );

  }


  // --------------------------------
  // PLACE
  // --------------------------------

  else if (node.type === "place") {

    fill(PLACE_COLOR);

    noStroke();


    rotate(
      PI / 4
    );


    rectMode(
      CENTER
    );


    rect(
      0,
      0,
      isSelected ? 52 : 44,
      isSelected ? 52 : 44,
      5
    );


    rotate(
      -PI / 4
    );

  }


  // --------------------------------
  // KUMU
  // --------------------------------

  else if (node.type === "kumu") {

    fill(KUMU_COLOR);

    noStroke();


    circle(
      0,
      0,
      isSelected ? 62 : 52
    );

  }


  // --------------------------------
  // LABELS
  // --------------------------------

  const showLabel =
    node.type === "student" ||
    isSelected ||
    (
      selectedNode &&
      isNodeConnected(node)
    );


  if (showLabel) {

    noStroke();

    fill(TEXT_COLOR);

    textAlign(
      CENTER,
      TOP
    );

    textSize(14);

    text(
      node.name,
      0,
      42
    );

  }


  pop();


  drawingContext.globalAlpha = 1;

}


// ------------------------------------------------------------
// FIND NODE
// ------------------------------------------------------------

function findNode(id) {

  return networkNodes.find(
    node => node.id === id
  );

}


// ------------------------------------------------------------
// CHECK CONNECTION
// ------------------------------------------------------------

function isNodeConnected(node) {

  if (!selectedNode) {
    return false;
  }


  // ==========================================================
  // STUDENT SELECTED
  //
  // Student → Places → Kumu
  // ==========================================================

  if (
    selectedNode.type === "student"
  ) {

    const places =
      new Set();


    // Find Places connected
    // directly to the Student

    networkEdges.forEach(edge => {

      if (
        edge.source ===
        selectedNode.id
      ) {

        const target =
          findNode(edge.target);


        if (
          target &&
          target.type === "place"
        ) {

          places.add(
            target.id
          );

        }

      }


      if (
        edge.target ===
        selectedNode.id
      ) {

        const source =
          findNode(edge.source);


        if (
          source &&
          source.type === "place"
        ) {

          places.add(
            source.id
          );

        }

      }

    });


    // Student's Places

    if (
      places.has(node.id)
    ) {

      return true;

    }


    // Kumu connected to
    // any of those Places

    if (
      node.type === "kumu"
    ) {

      return networkEdges.some(
        edge => {

          return (

            places.has(
              edge.source
            ) &&
            edge.target ===
              node.id

          ) ||

          (

            places.has(
              edge.target
            ) &&
            edge.source ===
              node.id

          );

        }
      );

    }


    // Other students are not highlighted

    return false;

  }


  // ==========================================================
  // PLACE SELECTED
  //
  // Place → Student
  // Place → Kumu
  // ==========================================================

  if (
    selectedNode.type === "place"
  ) {

    return networkEdges.some(
      edge => {

        return (

          edge.source ===
            selectedNode.id &&

          edge.target ===
            node.id

        ) ||

        (

          edge.target ===
            selectedNode.id &&

          edge.source ===
            node.id

        );

      }
    );

  }


  // ==========================================================
  // KUMU SELECTED
  //
  // Kumu → Place → Student
  // ==========================================================

  if (
    selectedNode.type === "kumu"
  ) {

    const places =
      new Set();


    // Find Places connected
    // to selected Kumu

    networkEdges.forEach(edge => {

      if (
        edge.source ===
        selectedNode.id
      ) {

        const target =
          findNode(edge.target);


        if (
          target &&
          target.type === "place"
        ) {

          places.add(
            target.id
          );

        }

      }


      if (
        edge.target ===
        selectedNode.id
      ) {

        const source =
          findNode(edge.source);


        if (
          source &&
          source.type === "place"
        ) {

          places.add(
            source.id
          );

        }

      }

    });


    // Places connected to Kumu

    if (
      places.has(node.id)
    ) {

      return true;

    }


    // Students connected
    // through those Places

    if (
      node.type === "student"
    ) {

      return networkEdges.some(
        edge => {

          return (

            places.has(
              edge.source
            ) &&
            edge.target ===
              node.id

          ) ||

          (

            places.has(
              edge.target
            ) &&
            edge.source ===
              node.id

          );

        }
      );

    }


    return false;

  }


  return false;

}


// ------------------------------------------------------------
// MOUSE CLICK
// ------------------------------------------------------------

function mousePressed() {

  const worldX =
    (mouseX -
      width / 2 -
      panX) /
      zoomLevel +
    width / 2;


  const worldY =
    (mouseY -
      height / 2 -
      panY) /
      zoomLevel +
    height / 2;


  for (
    let node of networkNodes
  ) {

    const distance =
      dist(
        worldX,
        worldY,
        node.x,
        node.y
      );


    if (
      distance < 35
    ) {

      selectedNode =
        node;

      return;

    }

  }


  selectedNode = null;

}


// ------------------------------------------------------------
// MOUSE DRAG
// ------------------------------------------------------------

function mouseDragged() {

  if (!selectedNode) {
    return;
  }


  const worldX =
    (mouseX -
      width / 2 -
      panX) /
      zoomLevel +
    width / 2;


  const worldY =
    (mouseY -
      height / 2 -
      panY) /
      zoomLevel +
    height / 2;


  selectedNode.x =
    worldX;

  selectedNode.y =
    worldY;

}


// ------------------------------------------------------------
// MOUSE WHEEL — ZOOM
// ------------------------------------------------------------

function mouseWheel(event) {

  zoomLevel *=
    event.delta > 0
      ? 0.9
      : 1.1;


  zoomLevel =
    constrain(
      zoomLevel,
      0.4,
      3
    );


  return false;

}


// ------------------------------------------------------------
// LEGEND
// ------------------------------------------------------------

function drawLegend() {

  const x = 24;

  const y =
    height - 100;


  noStroke();

  textAlign(
    LEFT,
    CENTER
  );

  textSize(13);


  // --------------------------------
  // STUDENT
  // --------------------------------

  fill(
    STUDENT_COLOR
  );


  circle(
    x + 8,
    y,
    14
  );


  fill(TEXT_COLOR);


  text(
    "Haumana",
    x + 22,
    y
  );


  // --------------------------------
  // PLACE
  // --------------------------------

  fill(
    PLACE_COLOR
  );


  push();


  translate(
    x + 8,
    y + 25
  );


  rotate(
    PI / 4
  );


  rectMode(
    CENTER
  );


  rect(
    0,
    0,
    14,
    14
  );


  pop();


  fill(TEXT_COLOR);


  text(
    "Pua",
    x + 22,
    y + 25
  );


  // --------------------------------
  // KUMU
  // --------------------------------

  fill(
    KUMU_COLOR
  );


  noStroke();


  circle(
    x + 8,
    y + 50,
    16
  );


  fill(TEXT_COLOR);


  text(
    "Kumu",
    x + 22,
    y + 50
  );

}


// ------------------------------------------------------------
// INFO PANEL
// ------------------------------------------------------------

function drawInfo() {

  if (!selectedNode) {
    return;
  }


  const boxWidth = 230;

  const boxHeight = 90;


  const x =
    width -
    boxWidth -
    24;


  const y = 24;


  fill("#1E1E1E");

  stroke("#444444");

  strokeWeight(1);


  rect(
    x,
    y,
    boxWidth,
    boxHeight,
    10
  );


  noStroke();

  fill(40);

  textAlign(
    LEFT,
    TOP
  );

  textSize(16);


  text(
    selectedNode.name,
    x + 15,
    y + 14
  );


  textSize(12);

  fill(
    MUTED_TEXT
  );


  text(
    selectedNode.type.toUpperCase(),
    x + 15,
    y + 40
  );


  const connections =
    networkEdges.filter(
      edge =>

        edge.source ===
          selectedNode.id ||

        edge.target ===
          selectedNode.id

    ).length;


  text(
    connections +
      " connection" +
      (
        connections === 1
          ? ""
          : "s"
      ),

    x + 15,
    y + 60
  );

}


// ------------------------------------------------------------
// WINDOW RESIZE
// ------------------------------------------------------------

function windowResized() {

  resizeCanvas(
    windowWidth,
    windowHeight
  );


  arrangeNodes();

}