const db = require('../dbHandler.js').db.collection('waitlist');
const setup = require('../setup.js');
const user = require('./user.js')(setup);
const users = require('./users.js')(setup);
const log = require('../logger.js')(module);

module.exports = function (setup) {
    var module = {};
    
    module.get = function (cb) {
		db.find({}).sort({ "signupTime": 1 }).toArray(function (err, docs) {
			if (err) log.error("get: Error for db.find", { err });
            
            for(let i = 0; i < docs.length; i++){
                var signuptime = Math.floor((Date.now() - docs[i].signup)/1000/60);
                var signupHours = 0;
                while (signuptime > 59) {
                    signuptime -= 60;
                    signupHours++;
                }
                docs[i].signup = signupHours +'H '+signuptime+'M';   
            }
            cb(docs);
		})
	}
    
    /*
    * Adds a pilot to the waitlist
    * @params
    * @return
    */
    module.add = function(waitlistMain, pilot, fits, contact, newbee, cb){
        module.isUserPresent(pilot.characterID, function(result){
            if(result){
                cb(400, "You are already on the waitlist");
                return;
            }

            users.getMain(waitlistMain.characterID, function(userObject){
                var disciplinary = false;
                for(let i = 0; i < userObject.notes.length; i++){
                    if (userObject.notes[i] && userObject.notes[i].isDisciplinary){
                        var disciplinary = true;
                        break;
                    }
                }

                var waitlist = {
                    "waitlistMain": waitlistMain,
                    "name": pilot.name,
                    "characterID": pilot.characterID,
                    "fits": fits,
                    "location": {
                        "systemID": null,
                        "name": null
                    },
                    "contact": contact,
                    "disciplinary": disciplinary,
                    "signup": Date.now(),
                }

                db.insert(waitlist, function (err) {
                    if (err) log.error("waitlist.add: Error for db.insert", { err, name: pilot.name });
                    if (!err) cb(200);
                });
            })

        })
    }

    /*
    * Remove a user from the waitlist
    * @params type (string), characterID (int)
    * @return status
    */
    module.remove = function(type, characterID, cb){
        if(type == "all"){
            users.getAlts(Number(characterID), function(pilotArray){

                var removePromises = [];

                pilotArray.forEach(function(pilot){
                    var promise = new Promise(function(resolve, reject) {
                        
                        db.remove({"waitlistMain.characterID": Number(pilot.characterID)}, function (err) {
                            if (err) {
                                if (err) log.error("waitlist.remove: Error for db.remove", { err, 'character ID': characterID });
                                reject({"class": "error", "title": "Woops!", "message":"We could not remove you from the waitlist!"});
                                return;
                            }
                            resolve(undefined);
                        });
                    });

                    removePromises.push(promise);
                });


                Promise.all(removePromises).then(function(errors) {
                    let errored = undefined;

                    for(let i = 0; i < errors.length; i++) {
                        // If we have an error
                        if(!!errors[i]) {
                            errored = errors[i];
                            break;
                        }
                    }

                    if(errored) {
                        cb(errored);
                    } else {
                        cb({"class": "success", "title": "Success", "message":"We removed you from the waitlist!"});
                    }
                });
            })
        } else { //Remove alt only
            db.remove({characterID: Number(characterID)}, function (err) {
                if (err) {
                    if (err) log.error("waitlist.remove: Error for db.remove", { err, 'character ID': characterID });
                    cb({"class": "error", "title": "Woops!", "message":"We could not remove you from the waitlist!"});
                    return;
                }  
                cb({"class": "success", "title": "Success", "message":"We removed your alt the waitlist!"});
            });
        }
    }

    /*
    * Remove a user from the waitlist
    * @params characterID (int)
    * @return status
    */
    module.adminRemove = function(characterID, cb){
        db.remove({characterID: Number(characterID)}, function (err){
            if(err){
                log.error("waitlist.adminRemove: Error removing pilot from the waitlist", {"pilot ID": characterID, err});
                cb(400);
                return;
            }

            cb(200);
        })
    }

    /*
    * Checks to see if a user is on the waitlist
    * @params characterID (int)
    * @return bool
    */
    module.isUserPresent = function (characterID, cb) {
		db.findOne({ "characterID": characterID }, function (err, doc) {
			if (err) {
                log.error("waitlist.isUserPresent: Error for db.findOne", { err, 'character ID': characterID });
                cb(false);
                return;
            }
            
            if(!!doc) {
                cb(true);
            } else {
                cb(false);
            }
		})
	}

    /*
    * Returns an array of a users pilots
    * @param [ {characterID, name} ]
    * @return [ {characterID, name, onwaitlist(bool) }]
    */
    module.checkCharsOnWaitlist = function(pilotArray, cb){
        var pilots = [];
        try{
            for(let p = 0; p < pilotArray.length; p++){
                module.isUserPresent(pilotArray[p].characterID, function(onWaitlist){
                    pilots.push({
                        "characterID": pilotArray[p].characterID,
                        "name": pilotArray[p].name,
                        "onWaitlist": onWaitlist
                    })

                    pilots.sort(function(a,b) {
                        if(a.name > b.name) return 1;
                        return -1;
                    })
                    
                    if(pilots.length == pilotArray.length) cb(pilots);
                })
                
            }
        } catch(err){
            cb(null)
        }

    }

    return module;
}