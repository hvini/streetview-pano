const HID = require('node-hid');
const util = require('util');
const events = require('events');

let allDevices;
function getAllDevices() {
    if (!allDevices) {
        allDevices = HID.devices(9583, 50770);
    }
    return allDevices;
}

function SpaceNavigator(index) {
    if(!arguments.length) {
        index = 0;
    }

    const spaceNavs = getAllDevices();
    if(!spaceNavs.length) {
        throw new Error('No SpaceNavigator could be found');
    }

    if(index > spaceNavs.length || index < 0) {
        throw new Error('Index ' + index + ' out of range, only ' + spaceNavs.length + ' SpaceNavigators found');
    }

    this.hid = new HID.HID(spaceNavs[index].path);
    this.hid.on('data', this.interpretData.bind(this));
}

util.inherits(SpaceNavigator, events.EventEmitter);

// https://forum.3dconnexion.com/viewtopic.php?t=5642
SpaceNavigator.prototype.interpretData = function(data) {
    /* first byte is a muxing byte that determines the packet:
    1 translation 3 buttons */
    const type = data[0];

    /* the following bytes is a 2 or 6 double bytes values.
    For the long packet we get an axis data (Tx, Ty, Tz, Rx, Ry, Rz) in little endian */
    const value = data.slice(1);
    
    switch(type) {
        case 1:
            let transform = value.readInt16LE(6);
            if (transform) {
                this.emit('transform', transform);
            } else {
                // idle
            }
            break;
        case 3:
            const btnEvt = value.readUIntLE(0, 2);
            this.emit('button', btnEvt);
            break;
    }
};

exports.SpaceNavigator = SpaceNavigator;
exports.deviceCount = function () { return getAllDevices().length; };