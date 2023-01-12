var idLen = 7
const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

self.addEventListener('message', function(msg) {
    idLen = parseInt(msg.data)
    workerGetValidId()
});

async function workerGetValidId() {
    var validImg = false;
    var newId = "";

    do {
        var id = generateId()
        sendUpdateMsg(id)
        var url = getUrl(id, true)
        try {
            await testUrl(url).then(
                function fulfilled() {
                    newId = id;
                    validImg = true;
                },
    
                function rejected() {
                    sendLoggingMsg(id + " is not valid")
                }
            )
        } catch(e) {
            sendErrorMsg(e.message)
            self.close()
        }
    } while (!validImg)

    self.postMessage(newId)
    self.close()
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

function testUrl(url) {

    let imgPromise = new Promise(async function imgPromise(resolve, reject) {

        var img = await fetch(url)

        if (img.status == 200) {
            if (img.url !== "https://i.imgur.com/removed.png") {
                resolve()
            } else {
                reject()
            }
        } else {
            sendErrorMsg("unreachable")
        }
        
    });

    return imgPromise;
}

function sendUpdateMsg(id) {
    self.postMessage("@" + id)
}

function sendLoggingMsg(msg) {
    self.postMessage("#" + msg)
}

function sendErrorMsg(msg) {
    self.postMessage("!" + msg)
}