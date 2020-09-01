const SPEED = 0.01;
const MAX_POINTS = 1000;

const Z_SCALE = 1.0;

/**
 * Returns a promise for THREE.js model and texture loaders
 *
 * @param {string} filename
 * @param {object} [loader] The loader to use
 * @returns
 */
export function promise_object_loader(filename, loader) {
  return new Promise((res, rej) => {
    loader.load(
      filename,
      (obj) => {
        res(obj);
      },
      (progress) => {},
      (err) => {
        console.log(err);
      }
    );
  });
}

export function setObjectRotation(item) {
    var axis = new THREE.Vector3(0, 1, 0).normalize();
    item.traverse(node => {
      if (node.type === "Mesh") {
        node.rotateOnAxis(axis, SPEED * 2);
      }
    });
  }

function around(val1, val2, eps = 0.05) {
  val1 = typeof val1 === "number" ? val1 : val1.length();
  return Math.abs(val1 - val2) < eps;
}

export function createLine(vertices, lineWidth = 0.02, color = 0x000000) {
  let lineGeom = new THREE.Geometry();
  vertices.forEach((vertex) => lineGeom.vertices.push(vertex));

  let line = new MeshLine();
  line.setGeometry(lineGeom);
  let color_ = new THREE.Color(color);
  let material = new MeshLineMaterial({ color: color_, lineWidth });
  let mesh = new THREE.Mesh(line.geometry, material); // this syntax could definitely be improved!
  return mesh;
}

export function scheduleEvents(timings) {
  if (!timings.start.finished) {
    if (!timings.start.active) {
      timings.start.active = true;
      setTimeout(
        () => (timings.start.finished = true),
        timings.start.start_offset
      );
    }
  } else {
    // execute active events
    let active_events = timings.events.filter((event) => event.active);
    active_events.forEach((event) => event.execute());
    // Filter out finished and active events
    let possible_new_events = timings.events.filter(
      (event) => !event.finished && !event.active
    );
    possible_new_events.forEach((event) => {
      if (typeof event.pre_event === "string") {
        let event_ = timings.events.find(
          (event_) => event.pre_event === event_.name
        );
        // If the pre event has finished than make it active
        if (event_.finished) {
          event.start_event();
        }
      } else {
        event.start_event();
      }
    });
    // start new events
  }
}

/**
 * This class created Cinema Events. Events that modify the camera or the environments
 *
 * @class CinemaEvents
 */
export class CinemaEvents {
  constructor({
    name = "UK",
    variable = "phi",
    until = 1,
    amt = 0.01,
    pre_event = null,
    start_offset = 0,
    end_timer = null,
    eps = 0.05,
    customExec = null,
    customCheck = null,
    app = null,
  } = {}) {
    this.finished = false;
    this.active = false;

    this.name = name;
    this.variable = variable;
    this.until = until;
    this.amt = amt;
    this.pre_event = pre_event;
    this.start_offset = start_offset;
    this.end_timer = end_timer;
    this.eps = eps;
    this.customExec = customExec ? customExec.bind(this) : null;
    this.customCheck = customCheck ? customCheck.bind(this) : null;

    this.cameraVars = ["radius", "theta", "phi"];
    this.counter = 0;
    // This is a global variable provided by QGIS2THREEJS
    this.app = app;
  }
  moveCamera() {
    // Only check a value if there is not end timer configured
    let value = this.app.controls.spherical[this.variable];
    if (this.end_timer === null && around(value, this.until, this.eps)) {
      this.finished_callback();
      return;
    }
    switch (this.variable) {
      case "radius":
        if (this.amt < 1 && value < this.until) {
          this.amt = -this.amt;
        }

        if (this.amt > 1 && value > this.until) {
          this.amt = this.amt;
        }

        this.app.controls.dollyInPublic(this.amt);
        break;
      case "theta":
        // if (this.amt > 0 && value < this.until) {
        //     this.amt = -this.amt
        // }

        // if (this.amt < 0 && value > this.until) {
        //     this.amt = this.amt
        // }
        this.app.controls.rotateLeftPublic(this.amt);
        break;
      case "phi":
        this.app.controls.rotateUpPublic(this.amt);
        break;
      default:
        console.error("Unknown Variable!");
    }
    this.app.controls.update();
  }
  execute() {
    if (this.customExec) {
      this.customExec();
      if (this.customCheck()) {
        this.finished_callback();
      }
    } else {
      if (this.cameraVars.includes(this.variable)) {
        this.moveCamera();
      }
    }
  }
  finished_callback() {
    this.finished = true;
    this.active = false;
  }
  start_event() {
    // Wait some time before starting the event
    if (!this.pre_timer) {
      this.pre_timer = setTimeout(
        () => (this.active = true),
        this.start_offset
      );
    }
    // The event is configured to end by a timer. Set the close it off in the future
    if (this.end_timer) {
      if (!this.post_timer) {
        this.post_timer = setTimeout(
          () => this.finished_callback(),
          this.end_timer + this.start_offset
        );
      }
    }
  }
}

function setObjectVisibility(item, visible = true) {
  item.traverse((node) => {
    node.visible = visible;
  });
}


function interpolateLine(line_geom, vectors, total_size = 1000) {
  // This contains the actual geometry array buffer!
  const positions = line_geom.geometry.attributes.position.array;
  // How many points pairs of vectors
  let interp_calls = vectors.length - 1;
  let points_per_interp_call = Math.floor(total_size / interp_calls);
  let leftover = total_size - points_per_interp_call * interp_calls;
  let n = 0;
  for (let index = 0; index < vectors.length - 1; index++) {
    const vectorFrom = vectors[index];
    const vectorTo = vectors[index + 1];
    for (let index = 0; index < points_per_interp_call; index++) {
      let newVec = new THREE.Vector3();
      newVec = newVec.lerpVectors(
        vectorFrom,
        vectorTo,
        index / points_per_interp_call
      );
      positions[n++] = newVec.x;
      positions[n++] = newVec.y;
      positions[n++] = newVec.z;
    }
  }
  const lastVec = vectors[vectors.length - 1];
  for (let i = 0; i < leftover; i++) {
    positions[n++] = lastVec.x;
    positions[n++] = lastVec.y;
    positions[n++] = lastVec.z;
  }
}

function createBufferLineGeometry(vectors, color = 0x0000ff, linewidth = 2) {
  const init_draw_count = 2;
  // geometry
  var geometry = new THREE.BufferGeometry();

  // const numPoints = vectors.length * 3
  // attributes
  var positions = new Float32Array(MAX_POINTS * 3); // 3 vertices per point
  geometry.addAttribute("position", new THREE.BufferAttribute(positions, 3));

  geometry.setDrawRange(0, init_draw_count);
  // material
  var material = new THREE.LineBasicMaterial({ color, linewidth });

  // Create the actual mesh
  const line = new THREE.Line(geometry, material);
  // Fill in the actual points for the line
  interpolateLine(line, vectors, MAX_POINTS);

  line.geometry.attributes.position.needsUpdate = true; // required after the first render
  return line;
}
