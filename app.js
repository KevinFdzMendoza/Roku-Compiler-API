const { app } = require("./server");
const fileManager = require("./fileManager/fileManager");

app.get("/", function (req, res) {
    res.send("Todo Bien")
});

fileManager;
