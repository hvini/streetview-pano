const socket = io();

const params = (new URL(document.location)).searchParams;
const master = params.get('master') ? params.get('master') : false;
const yawoffset = params.get('yawoffset');

let width = window.innerWidth;
let height = window.innerHeight;
const screenratio = width / height;

const zoom = 10;

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

socket.on('transform', function (transform) {
    if (master) {
        const pov = streetview.getPov();
        if(Math.abs(transform) > 8) {
            pov.heading += transform * 0.0032;
            streetview.setPov(pov);
        }
    }
});

socket.on('button', function (event) {
    if (event > 0) {
        if (event == 1) {
            moveBackward();
        } else if (event == 2) {
            moveForward();
        }
    }
});

/* update master pov value */
socket.on('update', function (pov) {
    masterPov = pov;
    update();
});

/* update master pano value */
socket.on('pano_changed', function (panoid) {
    masterPano = panoid;
    streetview.setPano(panoid);
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
        position: pos,
        visible: true,
        disableDefaultUI: true,
        scrollwheel: false,
        pov: {
            heading: masterPov.heading + yawshift,
            pitch: masterPov.pitch,
            zoom: masterPov.zoom
        }
    }

    if(master) {
        svOptions.linksControl = true;
    }

    /* initialize street view panorama */
    streetview = new google.maps.StreetViewPanorama(
        document.getElementById('pano'),
        svOptions
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
    }
}

// move to the pano nearest the current heading
function moveForward () {
    const forward = _getForwardLink();
    if (forward) {
        socket.emit('pano_changed', forward.pano);
    } else {
        console.log('cant move forward, no links!');
    }
}

// move to the pano farthest the current heading
function moveBackward () {
    const backward = _getBackwardLink();
    if (backward) {
        socket.emit('pano_changed', backward.pano);
    } else {
        console.log('cant move forward, no links!');
    }
}

// return the difference between the current heading and the provided link
function _getLinkDifference (pov, link) {
    const pov_heading = pov.heading;
    const link_heading = link.heading;

    const diff = Math.abs(link_heading - pov_heading) % 360;

    return diff >= 180 ? diff - (diff - 180) * 2 : diff;
}

// return the link nearest the current heading
function _getForwardLink () {
    const pov = streetview.getPov();
    const links = streetview.getLinks();
    const len = links.length;
    let nearest = null;
    let nearest_difference = 360;

    for(var i = 0; i < len; i++) {
      var link = links[i];
      var difference = _getLinkDifference(pov, link);
      if (difference < nearest_difference) {
        nearest = link;
        nearest_difference = difference;
      }
    }

    return nearest;
}

// return the link farthest the current heading
function _getBackwardLink () {
    const pov = streetview.getPov();
    const links = streetview.getLinks();
    const len = links.length;
    let farthest = null;
    let farthest_difference = 0;

    for(var i = 0; i < len; i++) {
      var link = links[i];
      var difference = _getLinkDifference(pov, link);
      if (difference > farthest_difference) {
        farthest = link;
        farthest_difference = difference;
      }
    }

    return farthest;
}