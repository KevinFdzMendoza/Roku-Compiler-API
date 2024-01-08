# File management section

`/files` route.

In this section you'll find the main funtionality for the management of the files that will be queried from the front-end app.

## Calling the API

Currently, the API has the following CRUD methods for the folders and files that may need to be served or fetched in the front-end application.

| Route | Params | Request | Description |
|---|---|---|---|
| /newProject | | | This will create a new base project with the basic structure of a roku channel build.<br/>It will return a json with the recently created project. |
| /runProject | | | This will compress the project into a build.zip file and will send it to the roku device with the env variables already set.<br/>It will return a text of success. |
| /addFile | `name` must be sent as URL parameter. Structure: `fileName` or `folder/fileName`. The `fileName` should have the file extension. | | This will create a new file ready to be witten.<br/>It will return a text of success. |
| /updateFile | `name` must be sent as URL parameter. Structure: `fileName` or `folder/fileName`. The `fileName` should have the file extension. | `body` required.<br/>The `body` object should have the `text` property which should contain the updated text of the edited file. | This will update a file edited on front-end. The complete file data should be sent in FE.<br/>It will return a text of success. |
| /deleteFile | `name` must be sent as URL parameter. Structure: `fileName` or `folder/fileName`. The `fileName` should have the file extension. | | This will remove a file from the channel build.<br/>It will return a text of success. |
| /addFolder | `name` must be sent as URL parameter. Structure: `fileName` or `folder/fileName`. The `fileName` should have the file extension. | | This will create a new folder in the channel build.<br/>It will return a text of success. |
| /updateFolder | `name` must be sent as URL parameter. Structure: `fileName` or `folder/fileName`. The `fileName` should have the file extension. | `body` required.<br/>The `body` object should have a property called `newPath` which should have the new name of the edited folder. | This will update the name of a folder changed on front-end.<br/>It will return a text of success. |
| /deleteFolder | `name` must be sent as URL parameter. Structure: `fileName` or `folder/fileName`. The `fileName` should have the file extension. | | This will remove a folder from the channel build.<br/>It will return a text of success. |