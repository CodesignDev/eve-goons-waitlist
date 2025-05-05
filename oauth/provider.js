// import log from '../logger';

const setup = require('../setup');
const url = require('url');
const request = require('request');
const passport = require('passport');
const OAuth2Strategy = require('passport-oauth2');
const refresh = require('passport-oauth2-refresh');
const users = require('../models/users.js')(setup);
const customSSO = require('./customSSO.js')(refresh, setup, request, url);

//Configure Passport's oAuth
var oauthStrategy = new OAuth2Strategy({
    authorizationURL: `https://${setup.oauth.baseSSOUrl}/v2/oauth/authorize`,
    tokenURL: `https://${setup.oauth.baseSSOUrl}/v2/oauth/token`,
    clientID: setup.oauth.clientID,
    clientSecret: setup.oauth.secretKey,
    callbackURL: setup.oauth.callbackURL,
    passReqToCallback: true,
    state: true
},
function (req, accessToken, refreshToken, profile, done) {
    //Get Character Details
    customSSO.verifyReturnCharacterDetails(refreshToken, function (success, response, characterDetails) {
        if (success) {
            users.findOrCreateUser(users, refreshToken, characterDetails, function (user, err) {
                if(req.isAuthenticated())
                {	
                    //Link the alt to the users main account
                    users.linkPilots(req.user, characterDetails, function(result){
                        req.flash("content", {"class": result.type, "title":"Account Linked", "message": result.message});
                        done(null, req.user);
                    })
                } else {
                    //Normal login flow  - Log them in.
                    if (user === false) {
                        done(err);
                    } else {
                        done(null, user);
                    }
                }      
            })
        } else {
            log.info(`Character ID request failed for token ${refreshToken}`);
            done(success);
        }
    });
});

passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (user, done) {
    done(null, user);
});

//Extend some stuff
passport.use('provider', oauthStrategy);
refresh.use('provider', oauthStrategy);