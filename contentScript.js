let start = 0;
let end = 0;
let looping = false;

const video = document.querySelector('video');
function reportVideoDuration() {
    if (video && Number.isFinite(video.duration) && video.duration > 0) {
        chrome.runtime.sendMessage({ type: "VIDEO_DURATION", duration: video.duration });
    }
}

if (video) {
    video.addEventListener("loadedmetadata", reportVideoDuration);
    video.addEventListener("durationchange", reportVideoDuration);
    reportVideoDuration();
}

const loopFunction = function () {
    if (this.currentTime >= end) {
        this.currentTime = start;
    }
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "GET_VIDEO_DURATION") {
        sendResponse({ duration: video && Number.isFinite(video.duration) ? video.duration : 0 });
    } else if (request.type === "SET_LOOP") {
        start = request.start;
        end = request.end;

        video.currentTime = start;
        if (!looping) {
            video.addEventListener('timeupdate', loopFunction, false);
            looping = true;
        }
    } else if (request.type === "STOP_LOOP") {
        if (looping) {
            video.removeEventListener('timeupdate', loopFunction, false);
            looping = false;
        }
    }
});

window.addEventListener("beforeunload", (event) => {
    chrome.storage.local.remove(['start', 'end']);
});
