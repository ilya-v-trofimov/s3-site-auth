'use strict';

const {OAuth2Client} = require('google-auth-library');
const GOOGLE_CLIENT_ID = '<enter your client id here>';
const client = new OAuth2Client(GOOGLE_CLIENT_ID);


function getRedirect(page){
    return {
        status: '302',
        statusDescription: 'Login',
        headers: {
            location: [{
                key: 'Location',
                value: page,
            }],
        },
    };
}

function getResponse(code, descr) {
    return {
        status: code,
        statusDescription: descr,
    };
}


exports.auth = function (event, context, callback) {
    log('auth', event);
    log('context', context);
    log('process.env', process.env);

    const cfrequest = event.Records[0].cf.request;
    const headers = cfrequest.headers;

    if (!headers.authorization) {
        log('auth', {msg: "no auth header"});
        const response = getRedirect('main.html');
        log('RESPONSE', response);
        callback(null, response);
        return;
    }

    const token = headers.authorization[0].value.slice(7);
    log('auth', {token: token});

    verify(token)
        .then(() => {
            log('auth', {msg: 'Successful verification'});
            delete cfrequest.headers.authorization;
            log('RESPONSE', cfrequest);
            callback(null, cfrequest);
        })
        .catch((err) => {
            const response = getResponse(err.httpCode, err.message);
            log('RESPONSE', response);
            callback(null, response);
        });
};

async function verify(token) {
    let ticket;
    try {
        ticket = await client.verifyIdToken({
            idToken: token,
            audience: GOOGLE_CLIENT_ID + '.apps.googleusercontent.com'
        });
    } catch (err) {
        log('ERROR', err);
        throw generateError('401', err.message, 'unauthorized.html');
    }
    log('ticket', ticket);
    if (ticket.payload.hd !== '<enter your company's email domain here>') {
        throw generateError('403', 'Forbidden!', 'forbidden.html');
    }
    return true;
}

function generateError(code, message, html){
    const err = new Error();
    err.httpCode = code;
    err.message = message;
    err.htmlPage = html;
    return err;
}

function log(label, json){
    console.log(`[${label}]\n` + JSON.stringify(json));
}
