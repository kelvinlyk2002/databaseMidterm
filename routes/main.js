module.exports = function (app) {
    app.get("/", function (req, res) {
        res.redirect(302, "/london")
    });

    app.get("/london", function (req, res) {
        let boroughSqlquery = `
            SELECT
                borough.name AS boroughName
            FROM borough;
        `;
        let crimeSqlquery = `
            SELECT
                majorCrimeCategory.name AS majorCrimeName
            FROM majorCrimeCategory;
        `;

        result = [];
        db.query(boroughSqlquery, (err, rows) => {
            if (err) {
                res.sendStatus(500);
            }
            result.push(rows);
            db.query(crimeSqlquery, (err, rows) => {
                if (err) {
                    res.sendStatus(500);
                }
                result.push(rows);
                if(req.query.startYearMonth == undefined || req.query.endYearMonth == undefined){
                    startYearMonth = "202004";
                    endYearMonth = "202203";
                } else {
                    startYearMonth = req.query.startYearMonth;
                    endYearMonth = req.query.endYearMonth;
                }
                res.render("pages/london", {
                    result: result, 
                    borough: req.query.borough, 
                    startYearMonth: startYearMonth, 
                    endYearMonth:endYearMonth 
                });
            });
        });
    })

    app.get("/getLatLong/:boroughName?", function (req, res) {
        if(req.params.boroughName == undefined){
            res.json([-0.118092, 51.509865]);
        } else {
            const fs = require('fs');
            let rawdata = fs.readFileSync('./helper/london.geojson');
            let londonGEO = JSON.parse(rawdata);
            let wardCodeSqlquery = `
            SELECT
                ward.wardCode AS wardCode
            FROM ward
            INNER JOIN borough ON ward.boroughID = borough.id
            WHERE borough.name = "${req.params.boroughName}"
            LIMIT 1;
            `;
            db.query(wardCodeSqlquery, (err, rows) => {
                if (err) {
                    res.sendStatus(500);
                }
                for(var i = 0; i < londonGEO['features'].length; i++){
                    if(londonGEO['features'][i]['properties']['WD21CD'] == rows[0]['wardCode']){
                        res.json([londonGEO['features'][i]['properties']['LONG'], londonGEO['features'][i]['properties']['LAT']])
                    }
                }
            });
        }
    });

    app.get("/londonGEO/:boroughName?", function (req, res) {
        const fs = require('fs');
        let rawdata = fs.readFileSync('./helper/london.geojson');
        let londonGEO = JSON.parse(rawdata);
        if(req.params.boroughName != undefined){
            let boroughQuery = `
            SELECT
                ward.wardCode AS wardCode
            FROM ward
            INNER JOIN borough ON ward.boroughID = borough.id
            WHERE borough.name = "${req.params.boroughName}";
            `
            db.query(boroughQuery, (err, rows) => {
                if (err) {
                    res.sendStatus(500);
                }
                boroughGEO = {
                    "type": "FeatureCollection",
                    "name": "boroughWards",
                    "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}},
                    "features": []
                }
                wardCodes = []
                for(var i = 0; i < rows.length; i++){
                    wardCodes.push(rows[i]['wardCode']);
                }
                for(var i = 0; i<londonGEO['features'].length; i++){
                    if(wardCodes.includes(londonGEO['features'][i]['properties']['WD21CD'])){
                        boroughGEO['features'].push(londonGEO['features'][i])
                    }
                }
                res.json(boroughGEO);
            })
        } else {
            res.json(londonGEO);
        }
    })

    app.get("/enquireCrime/:startYearMonth/:endYearMonth/:boroughName?", function (req, res) {
        if(req.params.boroughName != undefined){
            boroughSelectionClause = `WHERE borough.name = "${req.params.boroughName}"`
        } else {
            boroughSelectionClause = '';
        }
        let formattedStartYearMonth = req.params.startYearMonth.slice(0, 4) + "-" + req.params.startYearMonth.slice(4, 6) + "-01";
        let formattedEndYearMonth = req.params.endYearMonth.slice(0, 4) + "-" + req.params.endYearMonth.slice(4, 6) + "-01";
        let crimeSelectionClause = '';
        if(req.query.crimeTypes != undefined){
            crimeSelectionClause += "WHERE majorCrimeCategory.name IN ("
            for(var i = 0; i < req.query.crimeTypes.length; i++){
                crimeSelectionClause += "'"
                crimeSelectionClause += req.query.crimeTypes[i]
                crimeSelectionClause += "'"
                if(i != req.query.crimeTypes.length -1 ){
                    crimeSelectionClause += ","
                }
            }
            crimeSelectionClause += ")"
        }
        let boroughOverallSqlquery = `
WITH wardCrime AS (
    WITH crimeCategory AS (
        SELECT
            minorCrimeCategory.id AS minorCrimeID,
            minorCrimeCategory.name AS minorCrimeName,
            majorCrimeCategory.name AS majorCrimeName
        FROM minorCrimeCategory
        INNER JOIN majorCrimeCategory ON minorCrimeCategory.majorCrimeID = majorCrimeCategory.id
        ${crimeSelectionClause}
    ), boroughWard AS (
        SELECT
            ward.id AS wardID,
            ward.wardCode AS wardCode,
            borough.name AS boroughName,
            ward.name AS wardName
        FROM ward
        INNER JOIN borough ON ward.boroughID = borough.id
        ${boroughSelectionClause}
    )
    SELECT
        boroughWard.wardCode as wardCode,
        SUM(crime.crimeCount) as crimeCount,
        crime.yearmonth as yearmonth
    FROM crime
    INNER JOIN crimeCategory ON crime.minorCrimeID = crimeCategory.minorCrimeID
    INNER JOIN boroughWard ON crime.wardID = boroughWard.wardID
    WHERE crime.yearmonth BETWEEN "${formattedStartYearMonth}" AND "${formattedEndYearMonth}"
    GROUP BY boroughWard.wardCode, yearmonth
)
SELECT
    wardCrime.wardCode as wardCode,
    SUM(wardCrime.crimeCount) as crimeCount
FROM wardCrime
GROUP BY wardCrime.wardCode;
`;
        db.query(boroughOverallSqlquery, (err, rows) => {
            if (err) {
                res.sendStatus(500);
            }
            if(rows.length == 0){
                // no crime
                result = {
                    "minmax": {"min": 0, "max": 0},
                    "average":0,
                    "data": rows
                };
            } else {
                rows.sort((a, b) => a.crimeCount || 0 - b.crimeCount || 0);
                let runningSum = 0;
                for(var i = 0; i < rows.length; i++){
                    runningSum += parseInt(rows[i].crimeCount);
                }
                result = {
                    "minmax": {"min": rows[0].crimeCount, "max": rows[rows.length-1].crimeCount},
                    "average": Math.floor(runningSum / rows.length),
                    "data": rows
                }
            }
            res.json(result);
        });
    });
}