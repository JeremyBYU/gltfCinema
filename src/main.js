var dat = window.dat

var app = {};
app.renderer = '';
app.scene = ''
app.camera = ''
app.geoms = {};
app.raycaster = new THREE.Raycaster();
app.mouse = new THREE.Vector2();
app.parameters = {};
window.app = app;
import { CinemaEvents, promise_object_loader, scheduleEvents } from './cinema.js'


const DEFAULT_DELAY = 200; // A default delay (in ms) used in Cinematic Events
const STAR_HEIGHT = 2; // Height in Meters of the "star" above a goal
const Z_SCALE = 1.0


app.stare_at = new THREE.Vector3(8.644848097735595, 0.8570437703239369, -20.568877345322854);

let default_display = "Selected:\n"


function setup_threejs() {
	let scene = new THREE.Scene();
	let camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
	let light = new THREE.AmbientLight(0x404040, 6.0); // soft white light

	let renderer = new THREE.WebGLRenderer();
	renderer.setSize(window.innerWidth, window.innerHeight);
	document.body.appendChild(renderer.domElement);

	scene.background = new THREE.Color(0xbfe3dd);

	var axesHelper = new THREE.AxesHelper( 5 );
	// let cube = new THREE.Mesh(geometry, material);
	// scene.add(cube);
	scene.add(light);
	scene.add(axesHelper);


	camera.position.x = app.stare_at.x;
	camera.position.y = app.stare_at.y + 10;
	camera.position.z = app.stare_at.z;

	app.scene = scene;
	app.camera = camera;
	app.renderer = renderer;
	app.controls = new THREE.OrbitControls(camera, renderer.domElement);

	app.controls.target.set(app.stare_at.x, app.stare_at.y, app.stare_at.z);
	app.controls.update();

	app.width = window.innerWidth;
	app.height = window.innerHeight;
	app._fullWindow = true;

	app.controls.update();

}

app._offset = function (elm) {
    var top = 0, left = 0;
    do {
      top += elm.offsetTop || 0; left += elm.offsetLeft || 0; elm = elm.offsetParent;
    } while (elm);
    return {top: top, left: left};
  };

  app.intersectObjects = function (offsetX, offsetY) {
    var x = (offsetX / app.width) * 2 - 1;
    var y = -(offsetY / app.height) * 2 + 1;
    var vector = new THREE.Vector3(x, y, 1);
    vector.unproject(app.camera);
    var ray = new THREE.Raycaster(app.camera.position, vector.sub(app.camera.position).normalize());
    return ray.intersectObjects(app.scene.children);
  };


app.canvasClicked = function (e) {
	// var canvasOffset = app._offset(app.renderer.domElement);

    // var canvasOffset = app._offset(app.renderer.domElement);
    // var objs = app.intersectObjects(e.clientX - canvasOffset.left, e.clientY - canvasOffset.top);
	app.mouse.x = ( event.clientX / app.width ) * 2 - 1;
	app.mouse.y = - ( event.clientY / app.height ) * 2 + 1;
	app.raycaster.setFromCamera( app.mouse, app.camera );
	// console.log(e)
	// // calculate objects intersecting the picking ray
	var intersects = app.raycaster.intersectObjects( app.geoms.env.children );
	console.log(intersects)
	let results = ""
	for ( var i = 0; i < intersects.length; i++ ) {
		var obj = intersects[i];
		if (!obj.object.visible) continue;
		console.log(obj)
		results += `\nx: ${obj.point.x.toFixed(3)}, y: ${obj.point.y.toFixed(3)}, z: ${obj.point.z.toFixed(3)}`;
		break;
	}
	let final_string = default_display + results;

	document.querySelector("#info").textContent = final_string;

	// for (var i = 0, l = objs.length; i < l; i++) {
	// 	var obj = objs[i];
	// 	if (!obj.object.visible) continue;

	// 	// query marker
	// 	app.queryMarker.position.set(obj.point.x, obj.point.y, obj.point.z);
	// 	app.queryMarker.visible = true;
	// 	app.queryMarker.updateMatrixWorld();

	// 	// get layerId and featureId of clicked object
	// 	var object = obj.object, layerId, featureId;
	// 	while (object) {
	// 		layerId = object.userData.layerId,
	// 			featureId = object.userData.featureId;
	// 		if (layerId !== undefined) break;
	// 		object = object.parent;
	// 	}

	// 	// highlight clicked object
	// 	app.highlightFeature((layerId === undefined) ? null : layerId,
	// 		(featureId === undefined) ? null : featureId);

	// 	app.showQueryResult(obj.point, layerId, featureId);

	// 	if (Q3D.Options.debugMode && object instanceof THREE.Mesh) {
	// 		var face = obj.face,
	// 			geom = object.geometry;
	// 		if (face) {
	// 			if (geom instanceof THREE.Geometry) {
	// 				var v = object.geometry.vertices;
	// 				console.log(v[face.a], v[face.b], v[face.c]);
	// 			}
	// 			else {
	// 				console.log("Qgis2threejs: [DEBUG] THREE.BufferGeometry");
	// 			}
	// 		}
	// 	}

	// 	return;
	// }
	// app.closePopup();
};

async function loadEnv() {
	var loader = new THREE.GLTFLoader();
	let env = await promise_object_loader("../data/AA_3D_V3_simplify_remove_v2.glb", loader)
	let main_mesh = env.scene.children[0]
	main_mesh.position.set(0, 0, 0);

	let position = main_mesh.children[1].geometry.boundingSphere.center
	// debugger;
	app.scene.add(main_mesh)
	app.geoms['env'] = main_mesh


	// app.TJS.camera.position.set(position.x, position.y, position.z);
	app.controls.update();
	// debugger
}


function setup_datgui() {

	const gui = new dat.GUI();
}


function getIntersections(event) {
	var vector = new THREE.Vector2();

	vector.set(
		(event.clientX / window.innerWidth) * 2 - 1,
		- (event.clientY / window.innerHeight) * 2 + 1);

	app.raycaster.setFromCamera(vector, app.TJS.camera);

	var intersects = raycaster.intersectObjects(app.geoms.env.children);

	return intersects;

}


let animate = function () {

	requestAnimationFrame(animate);

	// cube.rotation.x += 0.01;
	// cube.rotation.y += 0.01;

	scheduleEvents(cinema_timings);

	app.renderer.render(app.scene, app.camera);
};






// These are all the 'cinema' events
// They start/finish by either by timers, sequences, or variables reaching some value
// Read the README.md to understand more
export let cinema_timings = {
	start: {
		start_offset: 3000,
		finished: false,
		active: false
	},
	events: [
		new CinemaEvents({
			name: "initial_zoom",
			variable: "radius",
			amt: 0.992,
			until: 0.1,
			eps: .05,
			app: app
		}),
		new CinemaEvents({
			name: "initial_tilt",
			variable: "phi",
			amt: 0.01,
			until: 0.94,
			app: app
		}),
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
		new CinemaEvents({
			name: "first_rotate",
			variable: "theta",
			amt: 0.01,
			until: 3.1,
			pre_event: "initial_tilt",
			start_offset: DEFAULT_DELAY,
			app: app
		}),
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
	]
};

async function setup() {
	setup_threejs();
	setup_datgui();
	loadEnv();
	animate();
}

setup();

