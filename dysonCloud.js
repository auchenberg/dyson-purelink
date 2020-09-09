var request = require('request-promise-native');
var crypto = require('crypto');

class DysonCloud {

    constructor() {
        this.api = 'https://appapi.cp.dyson.com'
        this.auth = {}
    }

    authenticate(email, password, country) {
        if (!country) {
            country = 'US'
        }

        var options = {
            url: `${this.api}/v1/userregistration/authenticate?country=${country}`,
            method: 'post',
            body: {
                Email: email,
                Password: password
            },
            agentOptions: {
                rejectUnauthorized: false
            },
            json: true
        }

        return request(options).then(info => {
            this.auth = {
                account: info.Account,
                password: info.Password
            }
            return this.auth
        })
    }

    logout() {
        this.auth = {}
    }

    getCloudDevices() {
        var options = {
            url: `${this.api}/v2/provisioningservice/manifest`,
            method: 'get',
            auth: {
                username: this.auth.account,
                password: this.auth.password,
            },
            agentOptions: {
                rejectUnauthorized: false
            },
            json: true
        }

        return request(options);
    }

};

module.exports = DysonCloud;
