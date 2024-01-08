const {app, fileManager, platform} = require("../server")
const path = require("path");
var { createWriteStream } = require('fs');
const { cp, mkdir, open, opendir, readdir, rm, rename, unlink, writeFile } = require("node:fs/promises");
const archiver = require("archiver")
const childProcess = require('node:child_process');

// No need of main route in filemanager sub-app
// fileManager.get("/", function (req, res) {
//     res.send("(/files): Main fileManager sub app page")
// });

// middleware in case we don't have the current project pbject
// not in use right now, because we're keeping the project as a single-time session
// Meanwhile, return or send error In case app loses context of the current project
// (req, res, next) => {
//     (async () => {
//         console.log("param req.url:", req.url);
//         try {
//             checkValidProjectDirectory()
//         } catch (error) {
//             await newProject()
//         }
//         next()
//     })();
// }


// =============
//   Functions
// =============
// In case app loses context of the current project
async function newProject() {
    await resetDefaultProject()
    const pathFolderCreated = await projectCreation();
    await setCurrentFolder(pathFolderCreated);
}

async function resetDefaultProject() {
    fileManager.locals.currentFolder = undefined

    try {
        let buildPath = path.join(__dirname, "../build")
        var folders = await readdir(buildPath)
    } catch (error) {
        console.error("Couldn't get folders in path /build:", error.message);
    } finally {
        console.log("Folders en /build:", folders);
        if (!(typeof folders === "object") && folders.lenght <= 0) return

        // Delete folders before create a new one
        for (const folder of folders) {
            if (typeof folder === "string" && folder != "default-project") {
                let folderPath = path.join(__dirname, "../build", folder)
                await removeFile(folderPath, "folder");
            }
        }
    }
}

async function removeFile(pathToDelete, type = "file") {
    try {
        if (type === "file") {
            await unlink(pathToDelete).then(res => { 
                console.log("File deleted in path:", pathToDelete);
            });
        } else if (type === "folder") {
            await rm(pathToDelete, {recursive: true}).then(res => { 
                console.log("Folder deleted in path:", pathToDelete);
            });
        }
    } catch (error) {
        console.log(error.message);
        throw error;
    }
}

async function projectCreation() {
    try {
        const date = new Date()
        let seconds = date.getTime();
        let projectName = 'project-' + seconds.toString();
        let projectFolder = path.join(__dirname, '../build', projectName);

        var folderCreated = await mkdir(projectFolder, { recursive: true });
    } catch(error) {
        console.error('No Folder was created:', error.message);
    } finally {
        let defaultFolder = path.join(__dirname, '../build/default-project');
        if (!(typeof(defaultFolder) === "string" && typeof(folderCreated) === "string")){
            return;
        }

        await cp(defaultFolder, folderCreated, {recursive: true})
        console.log("Folder created in Path: ", folderCreated);

        return folderCreated;
    }
}

async function setCurrentFolder(pathFolderCreated) {
    const folder = await opendir(pathFolderCreated, {recursive: true})

    let dirMap = []
    for await (const dirent of folder) {
        let relativePath = path.relative(pathFolderCreated, dirent.path)

        dirMap.push({
            name: dirent.name,
            path: relativePath,
            isDirectory: dirent.isDirectory(),
            isFile: dirent.isFile()
        });
    }

    fileManager.locals.currentFolder = {
        path: pathFolderCreated,
        directory: dirMap
    }

    // folder.close() not necessary. Folder is closed when the for finishes
    return fileManager.locals.currentFolder
}

async function createNewFile(namePath, type = "file") {
    let invalidNamePath = (typeof namePath != "string" || namePath === "")

    checkValidProjectDirectory()
    let currFolder = getProjectDirectory()

    if (invalidNamePath) throw new Error(`Nombre/ruta: ${namePath} invalida`);

    try {
        let pathToAdd = path.join(currFolder.path, namePath);
        if (type === "file") {
            await rewriteFile(pathToAdd, "")
        } else if (type === "folder") {
            await mkdir(pathToAdd, { recursive: true });
        }

        console.log((type === "file" ? "New file created in path:" : "New folder created in path:") + pathToAdd);
    } catch (error) {
        console.error(error.message);
    }
}

async function rewriteFile(filePath, text) {
    try {
        const myBuffer = Buffer.from(text);        
        await writeFile(filePath, myBuffer);

        console.log(`File succesfully updated in path: ${filePath}`);
    } catch (error) {
        console.log(`Error while updating file: ${error.message}`);
        throw error
    }
}

function getProjectDirectory() {
    return fileManager.locals.currentFolder;
}

function checkValidProjectDirectory() {
    let currFolder = getProjectDirectory();
    if (typeof currFolder != "object") {
        let error = new Error;
        error.name = "NO_EXISTING_PROJECT";
        error.message = `Imposible leer proyecto de canal: ${typeof currFolder}`;
        throw error;
    }
}

function validateParams(params) {
    if (typeof params != "object" || Object.keys(params).length <= 0) {
        let error = new Error
        error.name = "URI_WRONG_PARAMETER"
        error.message = "Incorrect parameter received";
        throw error
    }
}

function validateBody(body) {
    if (typeof body != "object" || Object.keys(body).length <= 0) {
        let error = new Error
        error.name = "WRONG_BODY_RECEIVED"
        error.message = "Incorrect body received";
        throw error
    }
}

// ===========
//   Routing
// ===========
fileManager.get("/newProject", (req, res) => {
    // main func
    (async () => {
        try {
            await newProject()
            let currFolder = fileManager.locals.currentFolder

            res.status(200).json(currFolder?.directory);
        } catch (error) {
            res.status(500).send(error.message)
        }
    })();
});

fileManager.get("/runProject", (req, res) => {
    (async () => {
        try {
            checkValidProjectDirectory()

            await projectZipCreation()
            let {error, stdout, stderr} = await deployZip()

            if (error || stderr) {
                res.status(500)
            } else {
                res.status(200)
            }

            res.json({ error, stdout, stderr });
        } catch (error) {
            console.error(error.message);
            res.status(500).send(error.message);
        }
    })();

    async function projectZipCreation() {
        try {
            let currFolder = getProjectDirectory()

            // `out` folder
            let outFolderPath = path.join(__dirname, '../build', "out");
            await mkdir(outFolderPath, { recursive: true });

            // Create build.zip and fill it with the current project
            let outputZipPath = path.join(outFolderPath, 'build.zip')
            let outputZip = createWriteStream(outputZipPath);
            let archive = archiver("zip");

            // Callback if needed
            // outputZip.on('close', () => { });

            // throw any error on the execution
            outputZip.on('error', (err) => {
                throw err;
            });
            archive.on('warning', (err) => { throw err });

            // set content from current project and create the zip
            archive.pipe(outputZip);
            archive.directory(currFolder.path, false);
            await archive.finalize();
        } catch (error) {
            console.error("no se pudo crear el zip del canal debido a error: ", error.message);
        }
    }

    async function deployZip() {
        let deployObject = {
            error: undefined,
            stdout: undefined,
            stderr: undefined
        };

        try {
            let file = (platform === "win32") ? "./deploy.bat" : "./deploy.sh"
            let filePath = path.join(__dirname, file);

            deployObject = new Promise((resolve, reject) => {
                childProcess.execFile(filePath, (error, stdout, stderr) => {
                    console.log(`error: ${error}`);
                    console.log(`stdout: ${stdout}`);
                    console.error(`stderr: ${stderr}`);

                    resolve({error, stdout, stderr})
                });
            });
        } catch (error) {
            console.error("deploy.bat couldn't be executed due to error:", error.message);
            throw error
        }

        return deployObject
    }
});

fileManager.post("/addFile/:name", (req, res) => {
    (async () => {
        try {
            let params = req.params ?? {}
            let filePath = params.name ?? ""
            await createNewFile(filePath)

            res.status(200).send(`Archivo ${filePath} creado correctamente`)
        } catch (error) {
            if (error.name === "NO_EXISTING_PROJECT") {
                res.status(500)
            } else {
                res.status(400)
            }

            console.error("No se pudo crear el archivo debido a error:", error.message);
            res.send(`No se pudo crear el archivo debido a error: ${error.message}`);
        }
    })();

    // TO DO:
    // Add option for images
});

fileManager.put("/updateFile/:name", (req, res) => {
    (async () => {
        let params = req.params
        let body = req.body

        try {
            validateParams(params)
            validateBody(body)

            checkValidProjectDirectory()
            let currFolder = getProjectDirectory()

            let filePath = params.name ?? "";
            let pathToUpdate = path.join(currFolder.path, filePath);
            let text = body.text ?? "";
            await rewriteFile(pathToUpdate, text);

            res.status(200).send(`Archivo ${filePath} actualizado con éxito`);
        } catch (error) {
            if (error.name === "URI_WRONG_PARAMETER" || error.name === "WRONG_BODY_RECEIVED") {
                res.status(400);
            } else if (error.name === "NO_EXISTING_PROJECT") {
                res.status(500);
            } else {
                res.status(500);
            }

            res.send(`No se pudo editar el archivo debido a error: ${error.message}`);
            console.error("No se pudo editar el archivo debido a error", error.message);
        }

    })();

    // TO DO:
    // For images should be deleted first and then recreate them?
    // Rename folder functionality
});

fileManager.delete("/deleteFile/:name", (req, res) => {
    (async () => {
        let params = req.params;
        let filePath = params.name ?? "";

        try {
            checkValidProjectDirectory()
            let currFolder = getProjectDirectory()

            let pathToDelete = path.join(currFolder.path, filePath);
            await removeFile(pathToDelete)

            res.status(200).send(`Archivo ${filePath} eliminado con éxito`);
        } catch (error) {
            console.log(`No fue posible eliminar el archivo. Error: ${error.message}`);
            res.status(500).send(`No fue posible eliminar el archivo. Error: ${error.message}`);
        }
    }) ();
});

fileManager.post("/addFolder/:name", (req, res) => {
    (async () => {
        try {
            let params = req.params ?? {}
            let filePath = params.name ?? ""
            await createNewFile(filePath, "folder")

            res.status(200).send("Folder creado correctamente")
        } catch (error) {
            if (error.name === "NO_EXISTING_PROJECT") {
                res.status(500)
            } else {
                res.status(400)
            }

            console.error("No fue posible crear el Folder debido a error:", error.message);
            res.send(`No fue posible crear el Folder debido a error: ${error.message}`);
        }
    })();
});

fileManager.put("/updateFolder/:name", (req, res) => {
    (async () => {
        let params = req.params
        let body = req.body

        try {
            validateParams(params);
            validateBody(body);

            let oldFile = params.name ?? "";
            let newFile = body.newPath ?? "";
            await renameFile(oldFile, newFile);

            res.status(200).send(`Folder renombrado correctamente`)
        } catch (error) {
            if (error.name === "URI_WRONG_PARAMETER") {
                res.status(400);
            } else if (error.name === "WRONG_BODY_RECEIVED") {
                res.status(400);
            } else if (error.name === "NO_EXISTING_PROJECT") {
                res.status(500);
            } else {
                res.status(500);
            }

            console.log(`Imposible renombrar Folder debido a error: ${error.message}`);
            res.send(`Imposible renombrar Folder debido a error: ${error.message}`);
        }
    }) ();

    async function renameFile(oldFile, newFile) {
        try {
            checkValidProjectDirectory();
            let currFolder = getProjectDirectory();

            let oldPath = path.join(currFolder.path, oldFile);
            let newPath = path.join(currFolder.path, newFile);

            await rename(oldPath, newPath);
        } catch (error) {
            throw error;
        }
    }
});

fileManager.delete("/deleteFolder/:name", (req, res) => {
    (async () => {
        let params = req.params
        try {
            validateParams(params);

            checkValidProjectDirectory();
            let currFolder = getProjectDirectory();

            let name = params.name ?? "";
            let pathToDelete = path.join(currFolder.path, name);
            await removeFile(pathToDelete, type = "folder");

            res.status(200).send(`Folder eliminado con éxito`);
        } catch (error) {
            if (error.name === "URI_WRONG_PARAMETER") {
                res.status(400);
            } else if (error.name === "NO_EXISTING_PROJECT") {
                res.status(500);
            } else {
                res.status(500);
            }

            console.log(`No fue posible eliminar el folder: ${error.message}`);
            res.send(`No fue posible eliminar el folder: ${error.message}`);
        }
    }) ();
});

// ======================
//   Examples and utils
// ======================

// reset project to only have the default hardcoded project
// fileManager.get("/resetToDefaultProject", (req, res) => {
//     (async () => {
//         await resetDefaultProject();
//         res.send("👍🏼");
//     }) ();
// });

// // Open and read file
// fileManager.get("/file1", function (req, res) {
//     res.set("Content-Type", "text/plain");
//     // res.writeHead(200, {"Content-Type":"text/html"});

//     (async () => {
//         const file = await open("./build/default-project/source/main.brs");

//         // let i = 0
//         for await (const line of file.readLines()) {
//             res.write(line+"<br/>")
//             console.log(line)
//             // console.log("linea nueva num", i);
//             // i++;
//         }
//         // res.download(file)
//         res.end();
//     })();
//     console.log(fileManager.mountpath)
//     // res.write("File Manager")
// })

// // /file2 and /file3 : downloable files
// fileManager.get("/file2", function (req, res) {
//     console.log(path);
//     var options = {
//         root: path.join(__dirname, "../build/default-project/source"),
//         dotfiles: "deny",
//     }
//     res.sendFile("main.brs", options)
// })

// fileManager.get("/file3", function (req, res) {
//     var root = path.join(__dirname, "../build/default-project/source/main.brs")
//     res.download(root)
// })

// mount the sub app
app.use("/files", fileManager)
