const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
var imgHolder = null
var currentId = ""

//setup listeners, init values
function setup() {
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === "visible") {
            setFavicon(false)
        }
    })

    document.addEventListener('touchstart', handleTouchStart, false);        
    document.addEventListener('touchmove', handleTouchMove, false);

    imgHolder = document.getElementById("currentImage");   
    imgHolder.crossOrigin = "anonymous"; 

    imgHolder.addEventListener("load", () => {
        checkForFunny(imgHolder)
    })
}

//#region fetching images

var carefulSearch=false;
var idLen = 5;

async function getNewImage() {    
    disableControls(true)    
    
    if (threads < 2) {
        await getValidId().then(
            function resolved(id) {
                pushImage(id)
            }
        )
    } else {
        var pool = []        
        let idLabel = document.getElementById("idLabel")
        for (let i = 0; i < (threads); i++) {
            var newWorker = new Worker("worker.js")
            newWorker.addEventListener("message", function(msg) {
                var data = msg.data
                if (data.startsWith("@")) {
                    idLabel.innerHTML = "ID: " + data.replace("@", "")
                } else {
                    pool.forEach((worker) => {
                        worker.terminate()
                    })
    
                    disableControls(false)
                    pushImage(data)
                }                
            })
            pool.push(newWorker)
        }
        pool.forEach((worker) => {
            worker.postMessage(idLen.toString() + "," + carefulSearch.toString())
        })        
    }    
}

function getValidId() {
    let idLabel = document.getElementById("idLabel")

    let idPromise = new Promise(async function idPromise(resolve) {
        var validImg = false;
        var newId = ""
        do {
            var id = generateId()
            idLabel.innerHTML = "ID: " + id
            var url = getUrl(id, false)
            try {
                await testUrl(url).then(
                    function fulfilled() {
                        newId = id;
                        validImg = true;
                    },
        
                    function rejected() {
                        console.log(id + " is invalid")
                    }
                )
            } catch(e) {
                window.alert(e.message)
                break;
            }
        } while (!validImg)
        resolve(newId)
    })
    
    return idPromise
}

function generateId() {
    var id = "";
 
    for (var i = 0; i < idLen; i++) {
        var charIndex = Math.round(Math.random() * (chars.length - 1));
        id += chars.charAt(charIndex);
    }

    return id;
}

function getUrl(id, asThumbnail) {
    var url = "https://i.imgur.com/" + id
    if (asThumbnail) {
        url = url + "s"
    }
    return url + ".jpg"
}

//#endregion

//#region testing images
const errorImgSize = [161, 81]
const errorImgB64 = "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";
const monopolyManSize = [298, 256]
const mcSkinSize = [64, 32]

function testUrl(url) {

    // Define the promise
    let imgPromise = new Promise(function imgPromise(resolve, reject) {

        // Create the image
        let imgElement = new Image();
        imgElement.crossOrigin = "anonymous";

        // When image is loaded, resolve the promise
        imgElement.addEventListener('load', function imgOnLoad() {
            if(imgElement.width != errorImgSize[0] && imgElement.height != errorImgSize[1]) {
                resolve(this);
            } else if (carefulSearch) {
                var b64 = getBase64Image(imgElement)
                if (b64 != errorImgB64) {
                    resolve(this)
                } else {
                    reject()
                }
            } else {
                reject()
            }           
        });

        // When there's an error during load, reject the promise
        imgElement.addEventListener('error', function imgOnError() {
            window.alert("Imgur is unreachable")
            throw new Error("Imgur is unreachable");
        })

        // Assign URL
        imgElement.src = url;

    });

    return imgPromise;
}

function checkForFunny(img) {
    //only check after loading
    var imgSize = [img.naturalWidth, img.naturalHeight]
    switch (true) {
        case arraysIdentical(imgSize, monopolyManSize):
            document.body.style.backgroundImage = "url(res/fallingMoney.gif)"
            break;
        case arraysIdentical(imgSize, mcSkinSize):
            document.getElementById("header").style.backgroundImage = "url(res/mcDirt.png)"
            var title = document.getElementById("title")
            title.style.webkitTextStroke = "2px black"
            title.style.fontFamily = "Minecrafter"
            title.style.color = "#c5bab7"
            title.innerHTML = "Endless∞MC skins"
         
            break;
        default:
            document.getElementById("header").removeAttribute("style")
            document.body.removeAttribute("style")
            var title = document.getElementById("title")
            title.removeAttribute("style")
            title.innerHTML = "Endless∞Imgur"
    }
}

function getImgData(img) {
    var canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    var ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    return ctx.getImageData(0, 0, img.width, img.height);
}

function getBase64Image(img) {
    var canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    var ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    var dataURL = canvas.toDataURL("image/png");
    return dataURL.replace(/^data:image\/(png|jpg);base64,/, "");
}

//#endregion

//#region manage current image
const scalingTypes = {
    fit: "fit",
    stretch: "stretch",
    nearestNeighbour: "nearestNeighbour"
}
var currentScaling = scalingTypes.fit

function pushImage(imgId) {    
    currentId = imgId
    imgHolder.setAttribute("src", getUrl(currentId))
    setupScaling()
    historyBuffer.unshift(imgId)
    if (historyBuffer.length > 10) {
        historyBuffer.pop()
    }    
    renderHistory()
    if (playNotif) {
        notify()
    }
}

function setupScaling() {
    imgHolder.removeAttribute("style")
    imgHolder.style.width = "100%"
    
    switch(currentScaling) {
        case scalingTypes.fit:
            imgHolder.style.maxWidth = imgHolder.naturalWidth + "px"
            break;

        case scalingTypes.stretch:
            imgHolder.style.imageRendering = "auto"
            break;

        case scalingTypes.nearestNeighbour:
            imgHolder.style.imageRendering = "pixelated"
            break;

        default:            
    }
}

//#endregion

//#region manage history
const historyBuffer = []

function loadHistory(historyIndex) {
    var id = historyBuffer[historyIndex]
    historyBuffer.splice(historyIndex, 1)
    pushImage(id)
}

function renderHistory() {
    historyBuffer.forEach(function (element, index) {
        var elementId = "pastImg" + (index + 1)
        document.getElementById(elementId).setAttribute("src", getUrl(element, true))
    })
}
//#endregion

//#region manage settings
var newImgControlsDisabled = false
var playNotif = false
var threads = 1

function disableControls(disable) {
    if(disable) {
        newImgControlsDisabled = true
        document.getElementById("newImgButton").disabled = true;
        document.getElementById("copyUrlButton").disabled = true;
    } else {
        newImgControlsDisabled = false
        document.getElementById("newImgButton").disabled = false;
        document.getElementById("copyUrlButton").disabled = false;
    }
}

function setThreadCount(num) {
    if (num % 1 == 0){
        threads = num
    }    
}

function toggleCarefulSearch() {
    if (document.getElementById("carefulSearchToggle").checked) {
        carefulSearch = true
    } else {
        carefulSearch = false
    }

}

function toggleIdLen() {
    if (document.getElementById("7DigitToggle").checked) {
        idLen = 7
    } else {
        idLen = 5
    }
}

function toggleNotif() {
    playNotif = document.getElementById("notifToggle").checked
}

function showHistory(visible) {
    var divider = document.getElementById("historyExpander")
    var historyHolder = document.getElementById("history")
    var expandIcon = document.getElementById("expandIcon")
    if (visible) {
        historyHolder.style.display = "initial"
        expandIcon.style.transform = "rotate(180deg)"
        divider.setAttribute("onclick", "showHistory(false)")
        renderHistory()
    } else {        
        historyHolder.style.display = "none"
        expandIcon.style.transform = "rotate(0deg)"
        divider.setAttribute("onclick", "showHistory(true)")
    }
}

function cycleScaling(){
    switch(currentScaling) {
        case scalingTypes.fit:
            currentScaling = scalingTypes.stretch
            break;

        case scalingTypes.stretch:
            currentScaling = scalingTypes.nearestNeighbour
            break;

        case scalingTypes.nearestNeighbour:
            currentScaling = scalingTypes.fit
            break;

        default:
            currentScaling = scalingTypes.fit               
    }

    document.getElementById("scalingButton").innerHTML = currentScaling
    setupScaling()
}

//#endregion

//#region UI functions
function setFavicon(isAlert) {
    var link = document.querySelector("link[rel~='icon']");
    if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
    }
    
    if (isAlert) {
        link.href = 'res/alertFavicon.ico';
    } else {
        link.href = '../favicon.ico'
    }
}

function notify() {
    var notifSound = ((Math.floor(Math.random() * 11)) == 1 ? "res/scorn.mp3" : "res/notif.wav" )
    var audio = new Audio(notifSound);
    audio.play();

    if (document.visibilityState !== "visible") {
        setFavicon(true)
    }
}

function copyCurrentUrl() {
    var button = document.getElementById("copyUrlButton")

    try {
        navigator.clipboard.writeText(getUrl(currentId))
        button.style.backgroundColor = "greenyellow"
        button.innerHTML = "copied!"
    } catch (error) {
        button.style.backgroundColor = "tomato"
        button.innerHTML = "error!"
    }
    
    setTimeout(function () {
        button.removeAttribute("style")
        button.innerHTML = "copy URL"
      }, 300);
}

//#endregion

//#region helpers

function arraysIdentical(a, b) {
    var i = a.length;
    if (i != b.length) return false;
    while (i--) {
        if (a[i] !== b[i]) return false;
    }
    return true;
};

//#endregion

//#region touch functions
var xDown = null;                                                        
var yDown = null;

function getTouches(evt) {
  return evt.touches
}                                                     
                                                                         
function handleTouchStart(evt) {
    document.getElementById("title").classList.add("mobile")
    document.getElementById("controls").classList.add("mobile")
    
    const firstTouch = getTouches(evt)[0];                                      
    xDown = firstTouch.clientX;                                      
    yDown = firstTouch.clientY;                                      
};
                                                                         
function handleTouchMove(evt) {
    if (!newImgControlsDisabled) {
        if ( ! xDown || ! yDown ) {
            return;
        }
    
        if (yDown < document.getElementById("header").clientHeight) {
            return;
        }
    
        var xUp = evt.touches[0].clientX;                                    
        var yUp = evt.touches[0].clientY;
    
        var xDiff = xDown - xUp;
        var yDiff = yDown - yUp;
                                                                             
        if ( Math.abs( xDiff ) > Math.abs( yDiff ) ) {/*most significant*/
            if ( xDiff > 0 ) {
                /* right swipe */ 
                getNewImage()
            } else {
                /* left swipe */
            }                       
        } else {
            if ( yDiff > 0 ) {
                /* down swipe */ 
            } else { 
                /* up swipe */
            }                                                                 
        }
        /* reset values */
        xDown = null;
        yDown = null;  
    }                                               
};
//#endregion