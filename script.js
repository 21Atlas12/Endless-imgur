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
        setupScaling()
        checkForFunny(imgHolder)
    })

    document.onkeyup = function(e) {
        if (!disableControls) {
            if (e.key == " " ||
            e.code == "Space" ||      
            e.keyCode == 32      
            ) {
            getNewImage()
            }
        }        
      }
}

//#region fetching images
var idLen = 5;

async function getNewImage() {    
    disableControls(true)
    var label = document.getElementById("copyPrompt")
    label.innerHTML = "searching..."    
    
    if (threads < 2) {
        await getValidId().then(
            function resolved(id) {
                pushImage(id)
                label.innerHTML = "click to copy"
                disableControls(false)
            }
        )
    } else {
        var pool = []        
        let idLabel = document.getElementById("idLabel")
        for (let i = 0; i < (threads); i++) {
            var newWorker = new Worker("worker.js")
            newWorker.addEventListener("message", function(msg) {
                var data = msg.data

                switch (true) {
                    case data.startsWith("@"): 
                        idLabel.innerHTML = "ID: " + data.replace("@", "")
                        break;
                    case data.startsWith("!"):
                        msg = data.replace("!", "")
                        showErrorToUser(msg)
                        pool.forEach((worker) => {
                            worker.terminate()
                        })
                        break;
                    case data.startsWith("#"):
                        msg = data.replace("#", "")
                        console.log(msg)
                        break;
                    default: 
                        pool.forEach((worker) => {
                            worker.terminate()
                        })
        
                        disableControls(false)
                        label.innerHTML = "click to copy"
                        pushImage(data)
                }
                if (data.startsWith("@")) {
                    
                } else {
                    
                }                
            })
            pool.push(newWorker)
        }
        pool.forEach((worker) => {
            worker.postMessage(idLen.toString())
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
const monopolyManSize = [298, 256]
const mcSkinSize = [64, 32]

function testUrl(url) {

    // Define the promise
    let imgPromise = new Promise(async function imgPromise(resolve, reject) {

        var img = await fetch(url)

        if (img.status == 200) {
            if (img.url !== "https://i.imgur.com/removed.png") {
                resolve()
            } else {
                reject()
            }
        } else {
            showErrorToUser("imgur is unreachable")
        }

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
    historyBuffer.unshift(imgId)
    if (historyBuffer.length > 30) {
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
var controlsDisabled = false
var playNotif = false
var threads = 1

function disableControls(disable) {
    if(disable) {
        controlsDisabled = true
        document.getElementById("newImgButton").disabled = true;
    } else {
        controlsDisabled = false
        document.getElementById("newImgButton").disabled = false;
    }
}

function setThreadCount(num) {
    if (num % 1 == 0){
        threads = num
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
    var historyHolder = document.getElementById("historyWheel")
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

function selectScaling() {
    switch(true) {
        case document.getElementById("fitRadio").checked:
            currentScaling = scalingTypes.fit
            break;
        case document.getElementById("stretchRadio").checked:
            currentScaling = scalingTypes.stretch
            break;
        case document.getElementById("NnRadio").checked:
            currentScaling = scalingTypes.nearestNeighbour
            break;
        default:
            currentScaling = scalingTypes.fit    
    }

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
    if (!controlsDisabled) {
        var label = document.getElementById("copyPrompt")

    try {
        navigator.clipboard.writeText(getUrl(currentId))
        label.style.color = "greenyellow"
        label.innerHTML = "copied!"
    } catch (error) {
        label.style.color = "tomato"
        label.innerHTML = "error!"
    }
    
    setTimeout(function () {
        label.removeAttribute("style")
        label.innerHTML = "click to copy"
      }, 300);
    }    
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

function showErrorToUser(msg) {
    window.alert(msg);
    throw new Error(msg);
}

//#endregion

//#region touch functions
var xDown = null;                                                        
var yDown = null;

function getTouches(evt) {
  return evt.touches
}                                                     
                                                                         
function handleTouchStart(evt) {      
    const firstTouch = getTouches(evt)[0];                                      
    xDown = firstTouch.clientX;                                      
    yDown = firstTouch.clientY; 
    
    setMobileMode(true)
};
                                                                         
function handleTouchMove(evt) {
    if (!controlsDisabled) {
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

function setMobileMode(enabled) {
    var section = document.getElementById("section")

    var children = section.querySelectorAll("*")
    children.forEach((child) => {
        if (enabled) {
            child.classList.add("mobile")
        } else {
            child.classList.remove("mobile")
        }
    })

}
//#endregion