async function loadData() {
    // get csv locally
    const csv = require('csv-parser')
    const fs = require('fs')
    const results = [];
    fs.createReadStream('wardlevelcrime-p24m.csv')
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => {
            console.log(results[0]);
            rows = itemise(results);
            fs.writeFile("output2.json", JSON.stringify(rows), 'utf8', function (err) {
                if (err) {
                    console.log("An error occured while writing JSON Object to File.");
                    return console.log(err);
                }

                console.log("JSON file has been saved.");
            });
        });
}
// parse into rows
function itemise(rows) {
    result = [];
    for (i = 0; i < rows.length; i++) {
        keys = Object.keys(rows[i]);
        for (j = 0; j < keys.length; j++) {
            // iterate only year & month columns, and non-undefined values
            if (Number.isInteger(parseInt(keys[j])) && rows[i][keys[j]] !== undefined) {
                item = {
                    "borough": rows[i]["LookUp_BoroughName"].replace(/\r/g, ""),
                    "ward": rows[i]["WardName"].replace(/\r/g, ""),
                    "wardCode": rows[i]["WardCode"].replace(/\r/g, ""),
                    "majorCrimeCategory": rows[i]["MajorText"].replace(/\r/g, ""),
                    "minorCrimeCategory": rows[i]["MinorText"].replace(/\r/g, ""),
                    "year": parseInt(keys[j].slice(0, 4).replace(/\r/g, "")),
                    "month": parseInt(keys[j].slice(4, 6).replace(/\r/g, "")),
                    "crimeCount": parseInt(rows[i][keys[j]].replace(/\r/g, ""))
                };
                result.push(item);
            }
        }
    }
    return result;
}

loadData();