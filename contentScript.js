let start = 0;
let end = 0;
let looping = false;

const video = document.querySelector('video');
const loopFunction = function () {
    if (this.currentTime >= end) {
        this.currentTime = start;
    }
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "SET_LOOP") {
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
