curl --user $ROKU_CRED --digest --silent --show-error \
    -F mysubmit=Install \
    -F archive=@$OUT_FOLDER/$BUILD_ZIP_PACKAGE \
    --output $OUT_FOLDER/file.txt --write-out %{http_code} \
    http://$ROKU_IP/plugin_install;

echo