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

pureLink.getDevices().then(async devices => {

    if(!Array.isArray(devices) || devices.length === 0) {
        console.log('No devices found')
        return
    }
    // Get status
    console.log('getTemperature', await devices[0].getTemperature());
    console.log('getAirQuality', await devices[0].getAirQuality());
    console.log('getRelativeHumidity', await devices[0].getRelativeHumidity());
    console.log('getFanStatus', await devices[0].getFanStatus());
    console.log('getFanSpeed', await devices[0].getFanSpeed());
    console.log('getRotationStatus', await devices[0].getRotationStatus());
    console.log('getAutoOnStatus', await devices[0].getAutoOnStatus());

    // Actions
    await devices[0].turnOn();
    console.log('setRotation', await devices[0].setRotation(true));
    console.log('setFanSpeed', await devices[0].setFanSpeed(100));

    await pureLink.disconnect();
}).catch(err => console.error(err))

```
