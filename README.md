# API for the web application: "Roku Compiler"

A Node.js application that will serve the necessary data.

## Getting Started

1. First of all you will need to install npm modules with `npm install`
2. Create a `.env` file where you will add the following enviromental variables:
    ```
    # This is where the zip file will be located
    OUT_FOLDER="build/out"

    # The zip name
    BUILD_ZIP_PACKAGE="build.zip"

    # The roku ip you get once you activate developer mode
    ROKU_IP=ipValueAsString

    # Both username and password you created while activating developer mode. Separate the values with ':'
    ROKU_CRED=username:password
    ```
3. Run the project with `npm run dev`. A connection using `nodemon` will be created which will allow you to keep the server running while working on it.
4. Consult the section for the [File Manager](fileManager/README.md).
