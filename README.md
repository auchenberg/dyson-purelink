# dyson-purelink

Control Dyson PureLink fan/purifier devices from JavaScript. Discovers local devices on your WIFI via Bonjour/mDNS, logs into the Dyson Cloud to grab the device credentials and connects to the devices via MQTT.

Tested with the follow devices:
- Dyson Pure Cool Link Air Purifier & Fan Tower (1st Gen. filter)

## Install
```
npm install dyson-purelink
```

## Use

```javascript
var DysonPureLink = require('dyson-purelink')

var pureLink = new DysonPureLink("<your dyson cloud email>", "<your password>", "<your country>");

pureLink.getDevices().then(devices => {

    if(!Array.isArray(devices) || devices.length === 0) {
        console.log('No devices found')
        return
    }
    // Get status
    devices[0].getTemperature().then(t => console.log('getTemperature', t))
    devices[0].getAirQuality().then(t => console.log('getAirQuality', t))
    devices[0].getRelativeHumidity().then(t => console.log('getRelativeHumidity', t))
    devices[0].getFanStatus().then(t => console.log('getFanStatus', t))
    devices[0].getFanSpeed().then(t => console.log('getFanSpeed', t))
    devices[0].getRotationStatus().then(t => console.log('getRotationStatus', t))
    devices[0].getAutoOnStatus().then(t => console.log('getAutoOnStatus', t))

    // Actions
    devices[0].turnOn();
    devices[0].setRotation(true).then(t => console.log('setRotation', t))
    devices[0].setFanSpeed(100).then(t => console.log('setFanSpeed', t))

}).catch(err => console.error(err))

```
