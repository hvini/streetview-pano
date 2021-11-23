const socket = io();

const params = (new URL(document.location)).searchParams;
const master = params.get('master') ? params.get('master') : false;
const yawoffset = params.get('yawoffset');

let width = window.innerWidth;
let height = window.innerHeight;
const screenratio = width / height;

const zoom = 1;

const hfov = 180 / Math.pow(2, zoom);
const vfov = hfov * screenratio;
const yawshift = master ? 0 * hfov : yawoffset * hfov;

let streetview = {};
let masterPano = '';
let masterPov = {
    heading: hfov,
    pitch: vfov,
    zoom: zoom
};

/* update master pov value */
socket.on('update', function (pov) {
    masterPov = pov;
    update();
});

/* update master pano value */
socket.on('pano_changed', function (panoid) {
    masterPano = panoid;
    moveForward();
});

/* fly to */
socket.on('search_result', function (panodata) {
    const latLng = panodata.location.latLng;
    streetview.setPosition({ lat: latLng.lat, lng: latLng.lng });
});

function initialize() {
    /* initial position */
    const pos = { lat: 42.345573, lng: -71.098326 };

    const svOptions = {
        visible: true,
        disableDefaultUI: true,
        scrollwheel: false
    }

    /* initialize street view panorama */
    streetview = new google.maps.StreetViewPanorama(
        document.getElementById('pano'),
        {
            position: pos,
            svOptions,
            pov: {
                heading: masterPov.heading + yawshift,
                pitch: masterPov.pitch,
                zoom: masterPov.zoom
            }
        }
    );

    /* master listener events */
    if (master) {
        new google.maps.event.addListener(streetview, 'pov_changed', function () {
            /* emit master pov to all other screens */
            socket.emit('update', streetview.getPov());
        });

        new google.maps.event.addListener(streetview, 'pano_changed', function () {
            const panoid = streetview.getPano();
            /* emit master pano to all other screens */
            if(panoid != masterPano) {
                socket.emit('pano_changed', panoid);
            }
        });
    }

    update();
}

/* update pov value for all screens */
function update () {
    if(!master) {
        streetview.setPov({
            heading: masterPov.heading + yawshift,
            pitch: masterPov.pitch,
            zoom: masterPov.zoom
        });
    } else {
        socket.emit('update', streetview.getPov());
    }
}

/* update pano on move forward */
function moveForward () {
    if (!master) {
        streetview.setPano(masterPano);
    }
}