const express = require("express");
const http = require("http");
const cors = require("cors");
require("dotenv").config(); // https://www.npmjs.com/package/dotenv

const app = express();
const fileManager = express();
const PORT = process.env.PORT || 3000;
const platform = process.platform;
app.use(cors());
app.use(express.json()); //https://medium.com/@mmajdanski/express-body-parser-and-why-may-not-need-it-335803cd048c

http.createServer(app).listen(PORT, function (){
    console.log("Se inició el servidor pto:", PORT);
    console.log("Presiona Ctrl+c para salir ...");
});

// https://expressjs.com/en/starter/static-files.html
// set static files as this:
// app.use(express.static("test"));
// To create a virtual path prefix (where the path does not actually exist in the file system) for files that are served by the express.static function, specify a mount path for the static directory, as shown below:
// app.use("/static", express.static("test"))

module.exports = {app, fileManager, platform};
