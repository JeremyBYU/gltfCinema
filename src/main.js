var dat = window.dat;

var app = {};
app.renderer = "";
app.scene = "";
app.camera = "";
app.geoms = {};
app.raycaster = new THREE.Raycaster();
app.mouse = new THREE.Vector2();
app.parameters = {};

const OBJ_LOADER = new THREE.ObjectLoader();
const TEXTURE_LOADER = new THREE.TextureLoader();
const FILE_LOADER = new THREE.FileLoader();

window.app = app;
import {
  CinemaEvents,
  promise_object_loader,
  scheduleEvents,
  createLine,
  setObjectRotation,
} from "./cinema.js";

const DEFAULT_DELAY = 4000; // A default delay (in ms) used in Cinematic Events
const STAR_HEIGHT = 0.1; // Height in Meters of the "star" above a goal
const Z_SCALE = 1.0;
const SPEED = 0.01;

// app.camera_start = new THREE.Vector3(
//   -6.162630813154926,
//   5.460819480560858,
//   -16.739907436691848
// );
app.camera_start = new THREE.Vector3(
  2.69204761664279,
  0.4090366227133167,
  -20.274785302236346
);

app.stare_at = new THREE.Vector3(3.409, 0, -20.561);
app.scale = 0.1;

let default_display = "Selected:\n";

app.resize = function () {
  app.setCanvasSize(window.innerWidth, window.innerHeight);
};

app.setCanvasSize = function (width, height) {
  app.width = width;
  app.height = height;
  app.camera.aspect = width / height;
  app.camera.updateProjectionMatrix();
  app.renderer.setSize(width, height);
};

app.canvasClicked = function (e) {
  // var canvasOffset = app._offset(app.renderer.domElement);

  // var canvasOffset = app._offset(app.renderer.domElement);
  // var objs = app.intersectObjects(e.clientX - canvasOffset.left, e.clientY - canvasOffset.top);
  app.mouse.x = (event.clientX / app.width) * 2 - 1;
  app.mouse.y = -(event.clientY / app.height) * 2 + 1;
  app.raycaster.setFromCamera(app.mouse, app.camera);
  // console.log(e)
  // // calculate objects intersecting the picking ray
  var intersects = app.raycaster.intersectObjects(app.geoms.env.children);
  console.log(intersects);
  let results = "";
  for (var i = 0; i < intersects.length; i++) {
    var obj = intersects[i];
    if (!obj.object.visible) continue;
    console.log(obj);
    results += `\nx: ${obj.point.x.toFixed(3)}, y: ${obj.point.y.toFixed(
      3
    )}, z: ${obj.point.z.toFixed(3)}`;
    results += `\n[${obj.point.x.toFixed(3)}, ${obj.point.y.toFixed(
      3
    )}, ${obj.point.z.toFixed(3)}]`;
    break;
  }
  let final_string = default_display + results;

  document.querySelector("#info").textContent = final_string;
};

async function loadEnv() {
  var loader = new THREE.GLTFLoader();
  let env = await promise_object_loader(
    "../data/AA_3D_V3_simplify_remove_v2.glb",
    loader
  );
  let main_mesh = env.scene.children[0];
  main_mesh.position.set(0, 0, 0);

  let position = main_mesh.children[1].geometry.boundingSphere.center;
  // debugger;
  app.scene.add(main_mesh);
  app.geoms["env"] = main_mesh;

  // app.TJS.camera.position.set(position.x, position.y, position.z);
  app.controls.update();
}

async function load_models() {
  // Here we are asynchronously loading all the models, textures, and files that we will need
  let loaded_quad = promise_object_loader("models/uas.json", OBJ_LOADER);
  let loaded_box = promise_object_loader("models/box.json", OBJ_LOADER);
  let loaded_texture = promise_object_loader(
    "models/amazon_box.jpg",
    TEXTURE_LOADER
  );
  let loaded_db = promise_object_loader("models/db.json", OBJ_LOADER);
  let loaded_danger = promise_object_loader("models/danger.json", OBJ_LOADER);
  let promise_star = promise_object_loader("models/star.json", OBJ_LOADER);
  let promise_paths = promise_object_loader("models/paths_simple.json", FILE_LOADER);
  let promise_sphere = promise_object_loader("models/sphere.json", OBJ_LOADER);

  app.geoms.star_group = new THREE.Group();
  app.scene.add(app.geoms.star_group);


  Promise.all([
    loaded_quad,
    loaded_box,
    loaded_texture,
    loaded_db,
    loaded_danger,
    promise_star,
    promise_paths,
    promise_sphere,
  ]).then(([quad, box, box_texture, db, danger, star, path_resp, sphere]) => {
    // update box material to amazon prime picture
    box.material = new THREE.MeshPhongMaterial({
      map: box_texture,
      side: THREE.DoubleSide,
    });
    box.position.set(0, -0.4, 0);

    // create connecting line between box and drone
    let line = createLine([box.position, quad.position], 0.005 );

    // Create the DB Mesh, set invisible initially
    db.position.set(0, 0.2, 0);
    db.visible = false;

    // Create the danger sign mesh, set invisible
    danger.position.set(0, 0.5, 0.0);
    danger.visible = false;

    // Create the Quadrotor Group: quad, box, db, and line
    let quad_group = new THREE.Group();
    quad_group.position.copy(app.stare_at);
    quad_group.add(quad, box, line, db, danger);
    quad_group.scale.set(app.scale, app.scale, app.scale);
    app.geoms.quad_group = quad_group; // Set a global variable, ugly but helps out quite a bit
    // add to scene
    app.scene.add(quad_group);

    let path_details = JSON.parse(path_resp);
    addStars(path_details, star);
  });
}


function addStars(path_vectors, star_template) {
  // Need to add a dummy group around the star so that it can be displaced instead of the mesh
  let star_group_template = new THREE.Group();
  star_group_template.add(star_template);
  path_vectors.forEach(path => {
    let end_vec = path.end;
    let clone_star = star_group_template.clone();
    clone_star.position.set(end_vec[0], end_vec[1] + STAR_HEIGHT, end_vec[2]);
    app.geoms.star_group.add(clone_star);
  });
  app.geoms.star_group.visible = false;
}



function setup_threejs() {
  let scene = new THREE.Scene();
  let camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  let light = new THREE.AmbientLight(0x404040, 6.0); // soft white light
  let hemi_light = new THREE.HemisphereLight(0x7E8183, 0x080820, 1);

  let renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  scene.background = new THREE.Color(0xbfe3dd);

  var axesHelper = new THREE.AxesHelper(5);
  scene.add(light);
  scene.add(hemi_light);
  scene.add(axesHelper);

  camera.position.copy(app.camera_start);

  app.scene = scene;
  app.camera = camera;
  app.renderer = renderer;
  app.controls = new THREE.OrbitControls(camera, renderer.domElement);

  app.controls.target.set(app.stare_at.x, app.stare_at.y, app.stare_at.z);
  app.controls.update();

  app.width = window.innerWidth;
  app.height = window.innerHeight;
  app._fullWindow = true;
  window.addEventListener("resize", app.resize);

  app.controls.update();
}

function setup_datgui() {
  app.parameters.cinema = {};
  app.parameters.active_cinema = false;

  app.gui = new dat.GUI();
  let folder = app.gui.addFolder("Cinema");
  folder.add(app.parameters, "active_cinema").name("Active");
}

let animate = function () {
  requestAnimationFrame(animate);

  app.renderer.render(app.scene, app.camera);

  // animate danger triangle and goal positions
  if (app.geoms.quad_group)
  {
    app.geoms.quad_group.children[4].rotation.y += SPEED * 2;
  }
  setObjectRotation(app.geoms.star_group);

  if (!app.parameters.active_cinema) return;

  scheduleEvents(cinema_timings);
};

// These are all the 'cinema' events
// They start/finish by either by timers, sequences, or variables reaching some value
// Read the README.md to understand more
export let cinema_timings = {
  start: {
    start_offset: 0,
    finished: false,
    active: false,
  },
  events: [
    // new CinemaEvents({
    //   name: "initial_zoom",
    //   variable: "radius",
    //   amt: 0.988,
    //   until: 0.5,
    //   eps: 0.05,
    //   app: app,
    // }),
    new CinemaEvents({
      name: "activate_danger",
    	customExec: () => {
        app.geoms.quad_group.children[4].visible = true;
    	},
    	customCheck: () => true,
    	start_offset: 2000,
    	app: app
    }),
    new CinemaEvents({
    	name: "activate_db",
    	pre_event: "activate_danger",
    	customExec: () => {
    		app.geoms.quad_group.children[4].visible = false;
    		app.geoms.quad_group.children[3].visible = true;
    	},
    	customCheck: () => true,
    	start_offset: DEFAULT_DELAY,
    	app: app
    }),
    new CinemaEvents({
      name: "outward_zoom",
      variable: "radius",
      pre_event: "activate_db",
      amt: 1.012,
      until: 5.0,
      eps: 0.05,
      app: app,
      start_offset: 2000,
    }),
    new CinemaEvents({
        name: "show_goals",
        pre_event: "outward_zoom",
        customExec: () => {
            app.geoms.star_group.visible = true;
        },
        customCheck: () => true,
        start_offset: 1000
    }),
    // new CinemaEvents({
      //   name: "initial_tilt",
    //   variable: "phi",
    //   amt: 0.01,
    //   until: 0.94,
    //   app: app,
    // }),
    // new CinemaEvents({
    // 	name: "activate_danger",
    // 	pre_event: "initial_zoom",
    // 	customExec: () => {
    // 		quad_group.children[4].visible = true;
    // 	},
    // 	customCheck: () => true,
    // 	start_offset: DEFAULT_DELAY,
    // 	app: app
    // }),
    // new CinemaEvents({
    //   name: "first_rotate",
    //   variable: "theta",
    //   amt: 0.01,
    //   until: 3.1,
    //   pre_event: "initial_zoom",
    //   start_offset: DEFAULT_DELAY,
    //   app: app,
    // }),
    // new CinemaEvents({
    // 	name: "activate_db",
    // 	pre_event: "first_rotate",
    // 	customExec: () => {
    // 		quad_group.children[4].visible = false;
    // 		quad_group.children[3].visible = true;
    // 	},
    // 	customCheck: () => true,
    // 	start_offset: DEFAULT_DELAY,
    // 	app: app
    // }),
    // new CinemaEvents({
    // 	name: "zoom_out_2",
    // 	variable: "offset",
    // 	amt: 0.98,
    // 	until: 400 * Z_SCALE,
    // 	pre_event: "activate_db",
    // 	start_offset: DEFAULT_DELAY,
    // 	eps: 20,
    // 	app: app
    // }),
    // new CinemaEvents({
    // 	name: "second_rotate",
    // 	variable: "theta",
    // 	amt: 0.01,
    // 	until: -2.6,
    // 	pre_event: "activate_db",
    // 	start_offset: DEFAULT_DELAY
    // }),
    // new CinemaEvents({
    // 	name: "second_tilt",
    // 	variable: "phi",
    // 	amt: 0.01,
    // 	until: 0.55,
    // 	pre_event: "activate_db",
    // 	start_offset: DEFAULT_DELAY,
    // 	app: app
    // }),
    // new CinemaEvents({
    //     name: "show_red_buidlings",
    //     pre_event: "zoom_out_2",
    //     customExec: function () {
    //         this.counter += 1;
    //         app.project.layers[RED_BUILDINGS_LAYER].setOpacity(this.counter / 100);
    //         app.project.layers[ALL_BUILDINGS_LAYER].setOpacity(
    //             1 - this.counter / 100
    //         );
    //     },
    //     customCheck: function () {
    //         return this.counter > 100;
    //     },
    //     start_offset: DEFAULT_DELAY
    // }),
    // new CinemaEvents({
    //     name: "show_building_cost",
    //     pre_event: "show_red_buidlings",
    //     customExec: function () {
    //         this.counter += 1;
    //         app.project.layers[BUILDING_COST_LAYER].setOpacity(this.counter / 100);
    //     },
    //     customCheck: function () {
    //         return this.counter > 100;
    //     },
    //     start_offset: DEFAULT_DELAY
    // }),
    // new CinemaEvents({
    //     name: "show_goals",
    //     pre_event: "show_building_cost",
    //     customExec: () => {
    //         star_group.visible = true;
    //     },
    //     customCheck: () => true,
    //     start_offset: DEFAULT_DELAY
    // }),
    // new CinemaEvents({
    //     name: "draw_paths",
    //     pre_event: "show_goals",
    //     customExec: function () {
    //         if (this.counter === 0) {
    //             sphere_group.visible = true;
    //         }
    //         this.counter = this.counter + 2;
    //         path_geometries.forEach((line, index) => {
    //             // Set line color
    //             const positions = line.geometry.attributes.position.array;
    //             const end_line_pos = [
    //                 positions[this.counter * 3],
    //                 positions[this.counter * 3 + 1],
    //                 positions[this.counter * 3 + 2]
    //             ];
    //             sphere_group.children[index].position.set(
    //                 end_line_pos[0],
    //                 end_line_pos[1],
    //                 end_line_pos[2]
    //             );
    //             line.geometry.setDrawRange(0, this.counter);
    //         });
    //     },
    //     customCheck: function () {
    //         return this.counter > MAX_POINTS - 5;
    //     },
    //     start_offset: 1000
    // })
  ],
};

async function setup() {
  setup_threejs();
  setup_datgui();
  loadEnv();
  load_models();
  animate();
}

setup();
