var exec = require('cordova/exec');

function download(url, filename, contentType, successCallback, errorCallback){
    var options = {};
    var args = {
        url: url,
        filename: filename,
        contentType: contentType,
        options: options
    };
    document.addEventListener('deviceready', function () {
        setTimeout(function() {
            downloadDocument(args, function(entry, contentType){
                if (!!successCallback && typeof(successCallback) === 'function'){
                    successCallback(entry, contentType);
                }
            }, function(error){
                if (!!errorCallback && typeof(errorCallback) === 'function'){
                    errorCallback(error);
                }
            }); // call the function which will download the file 1s after the window is closed, just in case..
        }, 1000);
    });
}

function downloadDocument(args, successCallback, errorCallback){

    var uri = encodeURI(args.url);
    var filename = args.filename;
    var contentType = args.contentType;
    window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function (fs) {
        console.log('>>> file system open: ' + fs.name);
        fs.root.getFile(filename, { create: true, exclusive: false }, function (fileEntry) {

            var fileTransfer = new FileTransfer();

            fileTransfer.download(
                uri,
                fileEntry.toURL(),
                function(entry) {
                    if (!!successCallback && typeof(successCallback) === 'function'){
                        successCallback(entry, contentType);
                    }
                },
                function(error) {
                     if (!!errorCallback && typeof(errorCallback) === 'function'){
                        errorCallback(error);
                     }
                },
                false
            );
        }, function (err) { console.error('>>> error getting file! ' + err); });
    }, function (err) { console.error('>>> error getting persistent fs! ' + err); });
}

function isIphoneX() {
    try {
        const iphoneModel = window.device.model;
        const m = iphoneModel.match(/iPhone(\d+),?(\d+)?/);
        const model = +m[1];

        //https://www.theiphonewiki.com/wiki/Models#iPhone
        //10.1, 10.2, 10.4 and 10.5 are iphone 8 and 8 plus
        if (model > 10 && model != 10.1 && model != 10.2 && model != 10.4 && model != 10.5) { // is iphone X
            return true;
        }
    } catch (e) { }

    return false;
}

exports.close = function(){
    window.inAppBrowserRef.close();
}

exports.open = function (arg0, success, error) {
console.log(">>> 5");
    var fileOpenMode = "open";
    var fileOpenModes = ["open", "dialog"];
    var autoFixHeaderSize = true;

    if (!arg0.inAppBrowserUrl || arg0.inAppBrowserUrl.length === 0){
        error("Please set the url parameter");
        return;
    }
    if (!arg0.buttonClassName || arg0.buttonClassName.length === 0){
        error("Please set the buttonClassName parameter");
        return;
    }
    if (arg0.fileOpenMode && fileOpenModes.includes(arg0.fileOpenMode)){
        fileOpenMode = arg0.fileOpenMode;
    }
    if (arg0.autoFixHeaderSize != undefined){
        autoFixHeaderSize = arg0.autoFixHeaderSize;
    }

    var url = arg0.inAppBrowserUrl;
    var inAppBrowserOptions = arg0.inAppBrowserOptions;
    var buttonClassName = arg0.buttonClassName;

    window.inAppBrowserRef = cordova.InAppBrowser.open(url, '_blank',  inAppBrowserOptions);

    //add viewport-fit=cover so we can fill the left and right sides of the notch (if it exists)
    var script = "var metaViewport = document.querySelector('meta[name=viewport]');" +
                 "var metaViewportContent = metaViewport.getAttribute('content') + ', user-scalable=no, viewport-fit=cover';" +
                 "metaViewport.setAttribute('content', metaViewportContent);";

    //add html classes to know if it is an iphonex and above with notch
    if (isIphoneX()){
        script += "document.getElementsByTagName(\"body\")[0].classList.add(\"iphone-x\");";
    }

    script += "setTimeout(function(){" +
                "var downloadButtons = document.querySelectorAll(\"." + buttonClassName + "\");" +
                "downloadButtons.forEach(function(downloadButton){ " +
                    "if (downloadButton) {" +
                        'let pattern = /[^/\\\\&\\?]+\\.\\w{3,4}(?=([\\?&/].*$|$))/i;' +
                        "let decodedURI = decodeURI(decodeURI(downloadButton.href));" +
                        "let fileNameRegex = decodedURI.match(pattern)[0];" +
                        "debugger;" +
                        "downloadButton.addEventListener('click', function(e){" +
                            "debugger;" +
                            "var args = {" +
                                "url: downloadButton.href," +
                                "filename: fileNameRegex," +
                            "};" +
                            "webkit.messageHandlers.cordova_iab.postMessage(JSON.stringify(args));" +
                        "});" +
                    "}" +
                "});" +
            "}, 500);";

    window.inAppBrowserRef.addEventListener('loadstop', function() {
        window.inAppBrowserRef.executeScript({code: script});

        if(autoFixHeaderSize && cordova.platformId === 'ios') {
            window.inAppBrowserRef.insertCSS({ code: ".header {padding-top: env(safe-area-inset-top)} .content {margin-top: env(safe-area-inset-top)}" });
        }
    });

    window.inAppBrowserRef.addEventListener('message', function(args) {
        console.log('>>> MESSAGE RECEIVED FROM IN_APP_BROWSER' + JSON.stringify(args));
        download(args.data.url, args.data.filename, args.data.contentType, function(entry, contentType){
            if (fileOpenMode === "open"){
                cordova.plugins.fileOpener2.open(entry.toURL(), contentType,
                    function(e){
                        debugger;
                        error(e);
                    },
                    function(){
                        debugger;
                        success();
                    }
                );
            }
            if (fileOpenMode === "dialog"){
                console.log(">>> Dialog");
                if (cordova.platformId === 'android'){
                    cordova.plugins.fileOpener2.save(entry.toURL(), args.data.filename, contentType,
                        function(e){
                            debugger;
                            alert("Erro 1");
                            error(e);
                        },
                        function(){
                            debugger;
                            alert("Sucesso 1");
                            success();
                        }
                    );
                } else if(cordova.platformId === 'ios'){
                    cordova.plugins.fileOpener2.showOpenWithDialog(entry.toURL(), contentType,
                        function(e){
                            error(e);
                        },
                        function(){
                            success();
                        }
                    );
                }
            }
        }, function(e){
            error(e)
        });
    });
};
