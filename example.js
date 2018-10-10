var DysonPureLink = require('./index')

var pureLink = new DysonPureLink('<your dyson cloud email>', '<your password>', 'NL');

pureLink.getDevices().then(devices => {

    if(!Array.isArray(devices) || devices.length === 0) {
        console.log('No devices found')
        return
    }

    devices[0].turnOn();
    devices[0].getTemperature().then(t => console.log('getTemperature', t))
    devices[0].getAirQuality().then(t => console.log('getAirQuality', t))
    devices[0].getRelativeHumidity().then(t => console.log('getRelativeHumidity', t))

    devices[0].getFanStatus().then(t => console.log('getFanStatus', t))
    devices[0].getFanSpeed().then(t => console.log('getFanSpeed', t))
    devices[0].getRotationStatus().then(t => console.log('getRotationStatus', t))
    devices[0].getAutoOnStatus().then(t => console.log('getAutoOnStatus', t))

    devices[0].setRotation(true).then(t => console.log('setRotation', t))
    devices[0].setFanSpeed(100).then(t => console.log('setFanSpeed', t))

}).catch(err => console.error(err))
