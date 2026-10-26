let videoDuration = 0;
let activeVideoId = null;

function getVideoId(url) {
    try {
        const parsedUrl = new URL(url);
        if (parsedUrl.hostname === "youtube.com" || parsedUrl.hostname.endsWith(".youtube.com")) {
            return parsedUrl.searchParams.get("v") ||
                parsedUrl.pathname.match(/^\/(?:shorts|embed)\/([^/?]+)/)?.[1] || null;
        }
        if (parsedUrl.hostname === "youtu.be") {
            return parsedUrl.pathname.slice(1).split("/")[0] || null;
        }
    } catch (error) {
        return null;
    }
    return null;
}

function rangeStorageKey(videoId) {
    return `loopRange:${videoId}`;
}

function displayRange(range) {
    const startTime = range?.start || "00:00:00";
    const endTime = range?.end || "00:00:00";
    document.getElementById("currentLoop").textContent = `Current loop: ${startTime} - ${endTime}`;
}

function getActiveTab(callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        activeVideoId = tab ? getVideoId(tab.url || "") : null;
        callback(tab);
    });
}

function secondsToHms(d) {
    d = Number(d);
    return [Math.floor(d / 3600), Math.floor((d % 3600) / 60), Math.floor(d % 60)];
}

function hmsToSeconds(arr) {
    const [h, m, s] = arr.map((value) => {
        const parsed = parseInt(value);
        return isNaN(parsed) ? 0 : parsed;
    });
    return h * 3600 + m * 60 + s;
}

function secondsToTime(d) {
    const [h, m, s] = secondsToHms(d);
    return `${h > 0 ? h : "00"}:${m > 0 ? m : "00"}:${s > 0 ? s : "00"}`;
}

function validateInput(h, m, s, maxH, maxM, maxS) {
    return !(h < 0 || m < 0 || s < 0 || m > 59 || s > 59 || h > maxH ||
        (h === maxH && m > maxM) || (h === maxH && m === maxM && s > maxS));
}

chrome.runtime.onMessage.addListener((request) => {
    if (request.type === "VIDEO_DURATION") {
        videoDuration = request.duration;
        const [h, m, s] = secondsToHms(videoDuration);
        document.getElementById("maxTimeHint").textContent = `Max time: ${h}:${m}:${s}`;
        const endInputs = document.getElementById("endTime").getElementsByTagName("input");
        endInputs[0].max = h;
        endInputs[1].max = m;
        endInputs[2].max = s;
    }
});

document.getElementById("stopLoop").addEventListener("click", () => {
    getActiveTab((tab) => {
        if (tab) chrome.tabs.sendMessage(tab.id, { type: "STOP_LOOP" });
        if (activeVideoId) chrome.storage.local.remove(rangeStorageKey(activeVideoId));
        displayRange(null);
    });
});

document.getElementById("setLoop").addEventListener("click", () => {
    const startInputs = document.getElementById("startTime").getElementsByTagName("input");
    const endInputs = document.getElementById("endTime").getElementsByTagName("input");
    const startParts = Array.from(startInputs, (input) => parseInt(input.value));
    const endParts = Array.from(endInputs, (input) => parseInt(input.value));
    const [maxH, maxM, maxS] = secondsToHms(videoDuration);

    if (!validateInput(...startParts, maxH, maxM, maxS)) {
        document.getElementById("error").textContent = "Invalid start time. Please check your input.";
        return;
    }
    if (!validateInput(...endParts, maxH, maxM, maxS)) {
        document.getElementById("error").textContent = "Invalid end time. Please check your input.";
        return;
    }
    const start = hmsToSeconds(startParts);
    const end = hmsToSeconds(endParts);
    if (start >= end) {
        document.getElementById("error").textContent = "End time must be greater than start time.";
        return;
    }
    document.getElementById("error").textContent = "";

    getActiveTab((tab) => {
        if (!tab || !activeVideoId) {
            document.getElementById("error").textContent = "Open a YouTube video to set a loop.";
            return;
        }
        chrome.tabs.sendMessage(tab.id, { type: "SET_LOOP", start, end });
        const range = { start: secondsToTime(start), end: secondsToTime(end) };
        chrome.storage.local.set({ [rangeStorageKey(activeVideoId)]: range })
            .then(() => displayRange(range));
    });
});

document.addEventListener("DOMContentLoaded", () => {
    getActiveTab(() => {
        if (!activeVideoId) {
            displayRange(null);
            return;
        }
        chrome.storage.local.get(rangeStorageKey(activeVideoId)).then((result) => {
            displayRange(result[rangeStorageKey(activeVideoId)]);
        });
    });
});
