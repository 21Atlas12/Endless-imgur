var idLen = 7
var carefulSearch = false
const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

self.addEventListener('message', function(msg) {
    //[idLen, carefulSearch]
    var data = msg.data.split(",")
    idLen = parseInt(data[0])
    carefulSearch = (data[1] === 'true')
    workerGetValidId()
});

async function workerGetValidId() {
    var validImg = false;
    var newId = "";

    do {
        var id = generateId()
        sendUpdateMsg(id)
        var url = getUrl(id)
        try {
            await testUrl(url).then(
                function fulfilled() {
                    newId = id;
                    validImg = true;
                },
    
                function rejected() {
                    //do nothing in worker
                }
            )
        } catch(e) {
            //destroy self on error (good life advice)
            //this isnt really a good idea
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

const errorImgSize = [161, 81]
const errorImgB64 = "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";

function testUrl(url) {

    // Define the promise
    let imgPromise = new Promise(async function imgPromise(resolve, reject) {

        var img = await fetch(url)

        if (img.url !== "https://i.imgur.com/removed.png") {
            resolve()
        } else {
            reject()
        }
    });

    return imgPromise;
}

function sendUpdateMsg(id) {
    self.postMessage("@" + id)
}