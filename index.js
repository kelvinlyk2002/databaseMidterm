const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const mysql = require("mysql");
const port = 8089;
const db = mysql.createConnection({
    host: "127.0.0.1",
    user: "root",
    password: "",
    database: "midterm"
});
db.connect((err) => {
    if (err) {
        throw err;
    }
    console.log("Connected to database");
});
global.db = db;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));
require("./routes/main")(app);
app.set("views", __dirname + "/views");
app.set("view engine", "ejs");
app.engine("html", require("ejs").renderFile);
app.listen(port, () => console.log(`LondonCrime app listening on port ${port}!`));