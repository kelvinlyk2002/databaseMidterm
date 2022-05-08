// The main.js file of your application
module.exports = function (app) {
    // Purpose: to serve a static landing page, home page
    // input: nil
    // output: a static home page
    app.get("/", function (req, res) {
        res.render("pages/index")
    });

    app.get("/london", async function (req, res) {
        // load table for further processing
        // const mysql = require("mysql");
        // const db = mysql.createConnection({
        //     host: "localhost",
        //     user: "root",
        //     password: "",
        //     database: "midterm"
        // });
        // db.connect((err) => {
        //     if (err) {
        //         throw err;
        //     }
        //     console.log("Connected to database");
        // });
        // global.db = db;

        let sqlquery = `
WITH crimeCategory AS (
    SELECT
        minorCrimeCategory.id AS minorCrimeID,
        minorCrimeCategory.name AS minorCrimeName,
        majorCrimeCategory.name AS majorCrimeName
    FROM minorCrimeCategory
    INNER JOIN majorCrimeCategory ON minorCrimeCategory.majorCrimeID = majorCrimeCategory.id
), boroughWard AS (
    SELECT
        ward.id AS wardID,
        ward.wardCode AS wardCode,
        borough.name AS boroughName,
        ward.name AS wardName
    FROM ward
    INNER JOIN borough ON ward.boroughID = borough.id
)
SELECT
    boroughWard.boroughName as boroughName,
    boroughWard.wardName as wardName,
    boroughWard.wardCode as wardCode,
    crimeCategory.minorCrimeName as minorCrimeName,
    crimeCategory.majorCrimeName as majorCrimeName,
    crime.month as month,
    crime.year as year,
    crime.crimeCount as crimeCount
FROM crime
INNER JOIN crimeCategory ON crime.minorCrimeID = crimeCategory.minorCrimeID
INNER JOIN boroughWard ON crime.wardID = boroughWard.wardID;
`;
        
let boroughSqlquery = `
WITH crimeCategory AS (
    SELECT
        minorCrimeCategory.id AS minorCrimeID,
        minorCrimeCategory.name AS minorCrimeName,
        majorCrimeCategory.name AS majorCrimeName
    FROM minorCrimeCategory
    INNER JOIN majorCrimeCategory ON minorCrimeCategory.majorCrimeID = majorCrimeCategory.id
), boroughWard AS (
    SELECT
        ward.id AS wardID,
        ward.wardCode AS wardCode,
        borough.name AS boroughName,
        ward.name AS wardName
    FROM ward
    INNER JOIN borough ON ward.boroughID = borough.id
)
SELECT
    boroughWard.boroughName as boroughName,
    crimeCategory.minorCrimeName as minorCrimeName,
    crimeCategory.majorCrimeName as majorCrimeName,
    crime.month as month,
    crime.year as year,
    SUM(crime.crimeCount) as crimeCount
FROM crime
INNER JOIN crimeCategory ON crime.minorCrimeID = crimeCategory.minorCrimeID
INNER JOIN boroughWard ON crime.wardID = boroughWard.wardID
GROUP BY boroughWard.boroughName, minorCrimeName, majorCrimeName, crime.month, crime.year;
`;

        db.query(boroughSqlquery, (err, rows) => {
            if (err) {
                res.sendStatus(500);
            }
            res.render("pages/about", { result: JSON.parse(JSON.stringify(rows))});
        });
    });

    app.get("/londonGEO", function (req, res) {
        const fs = require('fs');
        let rawdata = fs.readFileSync('./helper/london.geojson');
        let londonGEO = JSON.parse(rawdata);
        res.json(londonGEO);
    })

    app.get("/boroughCrime", function (req, res) {
        let boroughOverallSqlquery = `
WITH crimeCategory AS (
    SELECT
        minorCrimeCategory.id AS minorCrimeID,
        minorCrimeCategory.name AS minorCrimeName,
        majorCrimeCategory.name AS majorCrimeName
    FROM minorCrimeCategory
    INNER JOIN majorCrimeCategory ON minorCrimeCategory.majorCrimeID = majorCrimeCategory.id
), boroughWard AS (
    SELECT
        ward.id AS wardID,
        ward.wardCode AS wardCode,
        borough.name AS boroughName,
        ward.name AS wardName
    FROM ward
    INNER JOIN borough ON ward.boroughID = borough.id
)
SELECT
    boroughWard.wardCode as wardCode,
    SUM(crime.crimeCount) as crimeCount
FROM crime
INNER JOIN crimeCategory ON crime.minorCrimeID = crimeCategory.minorCrimeID
INNER JOIN boroughWard ON crime.wardID = boroughWard.wardID
GROUP BY boroughWard.wardCode;
        `;

        db.query(boroughOverallSqlquery, (err, rows) => {
            if (err) {
                res.sendStatus(500);
            }
            res.json(JSON.parse(JSON.stringify(rows)));
        });
    });

    // Purpose: to serve a static about page
    // input: nil
    // output: a static about page
    app.get("/about", function (req, res) {
        res.render("pages/about", {result: []})
    });

    // Purpose: to serve a page where user can add new devices into the database
    // input: user provide the parameters of a device
    // output: a device added to the database
    app.get("/add", function (req, res) {
        // SQL Purpose: Retrieve the whole set of device types
        // SQL input: nil
        // SQL output: 20 predefined device types
        let sqlquery = "SELECT * FROM DeviceTypes;";
        db.query(sqlquery, (err, result) => {
            if (err) {
                res.sendStatus(500);
            }
            res.render("pages/add", { deviceTypes: result });
        });
    });

    // Purpose: to serve a page where user can add new devices into the database
    // input: nil
    // output: a dashboard with added devices
    app.get("/status", function (req, res) {
        // SQL Purpose: Retrieve the parameters and information whether each parameters can be amended of all devices
        // SQL input: nil
        // SQL output: All devices, their parameters, and which parameters could be amended
        let sqlquery = "SELECT Devices.id, DeviceTypes.name, Devices.onOff, Devices.openClose, Devices.volume, Devices.temperature, Devices.brightness, DeviceTypes.canOnOff, DeviceTypes.canOpenClose, DeviceTypes.canAdjustVol, DeviceTypes.canAdjustTemp, DeviceTypes.canAdjustBrightness FROM Devices JOIN DeviceTypes ON Devices.deviceType = DeviceTypes.id;";
        db.query(sqlquery, (err, result) => {
            if (err) {
                res.sendStatus(500);
            }
            res.render("pages/status", { devices: result });
        });
    });

    // Purpose: to update the parameters of a device in the database
    // input: new values of the parameters of a selected device
    // output: update parameters of a device in the database
    app.get("/update/:id?", function (req, res) {
        if(req.params.id != null && !isNaN(parseInt(req.params.id))) {
            // SQL Purpose: Retrieve the parameters and information whether each parameters can be amended of a given device
            // SQL input: id of the required device
            // SQL output: All devices, their parameters, and which parameters could be amended
            let sqlquery = "SELECT Devices.id, DeviceTypes.name, Devices.onOff, Devices.openClose, Devices.volume, Devices.temperature, Devices.brightness, DeviceTypes.canOnOff, DeviceTypes.canOpenClose, DeviceTypes.canAdjustVol, DeviceTypes.canAdjustTemp, DeviceTypes.canAdjustBrightness FROM Devices JOIN DeviceTypes ON Devices.deviceType = DeviceTypes.id WHERE Devices.id = ?;"
            db.query(sqlquery, [req.params.id], (err, result) => {
                if (err){
                    res.sendStatus(500);
                }
                // SQL Purpose: Retrieve the whole set of device types, required to use the modular form validation
                // SQL input: nil
                // SQL output: 20 predefined device types
                let sqlquery_deviceTypes = "SELECT * FROM DeviceTypes;";
                db.query(sqlquery_deviceTypes, (err, result_deviceTypes) => {
                    if (err) {
                        res.sendStatus(500);
                    }
                    res.render("pages/update", {device: result[0], deviceTypes: result_deviceTypes});
                });
            });
        } else {
            // redirect to status page if no id was given
            res.redirect("/status");
        }
    });

    // Purpose: confirmation page before deleting an entry
    // input: the id, name & current values of their parameters of the devices from a database
    // output: a webform with predefined device types that allow user to update parameters of the devices
    app.get("/delete/:id?", function (req, res) {
        if(req.params.id != null && !isNaN(parseInt(req.params.id))) {
            // SQL Purpose: Retrieve the name of the device & confirm input id is valid to delete
            // SQL input: id of the required device
            // SQL output: the id and name of the device
            let sqlquery = "SELECT Devices.id, DeviceTypes.name FROM Devices JOIN DeviceTypes ON Devices.deviceType = DeviceTypes.id where Devices.id = ?";
            db.query(sqlquery, [req.params.id], (err, result) => {
                if (err) {
                    res.sendStatus(500);
                }
                res.render("pages/delete", {device: result[0]});
            });
        } else {
            // redirect to status page if no id was given
            res.redirect("/status");
        }
    });

    // Purpose: a post-only restful interface to add device
    // input: the initial parameters of a device
    // output: a device added to the database
    app.post("/add-device", function (req, res) {
        let formReturn = [req.body.deviceType, req.body.onOff, req.body.openClose, req.body.volume, req.body.temperature, req.body.brightness];
        // SQL Purpose: add the device and its initial parameter to the database
        // SQL input: parameter of a device
        // SQL output: a device added into the database
        let sqlquery = "INSERT INTO Devices (deviceType, onOff, openClose, volume, temperature, brightness) VALUES (?, ?, ?, ?, ?, ?);";
        db.query(sqlquery, formReturn, (err, result) => {
            if (err){
                res.sendStatus(500);
            }
            res.sendStatus(200);
        });
    });

    // Purpose: a post-only restful interface to update device
    // input: the new parameters of a device
    // output: new parameter of a device updated to the database
    app.post("/update-device", function (req, res) {
        let formReturn = [req.body.onOff, req.body.openClose, req.body.volume, req.body.temperature, req.body.brightness, req.body.id];
        // SQL Purpose: update the parameters of a device
        // SQL input: the id and new parameters of the device
        // SQL output: updated the parameters of the device into the database
        let sqlquery = "UPDATE Devices SET onOff = ?, openClose = ?, volume = ?, temperature = ?, brightness = ? WHERE id = ?;";
        db.query(sqlquery, formReturn, (err, result) => {
            if (err){
                res.sendStatus(500);
            }
            res.sendStatus(200);
        });
    });

    // Purpose: a post-only restful interface to delete device
    // input: the id of the device
    // output: a device deleted
    app.post("/delete-device", function (req, res) {
        // SQL Purpose: delete a device
        // SQL input: the id of the device
        // SQL output: a device deleted
        let sqlquery = "DELETE FROM Devices WHERE id = ?;";
        db.query(sqlquery, [req.body.id], (err, result) => {
            if (err){
                res.sendStatus(500);
            }
            res.sendStatus(200);
        });
    });
}