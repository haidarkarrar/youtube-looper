let videoDuration = 0;

function secondsToHms(d) {
    d = Number(d);
    const h = Math.floor(d / 3600);
    const m = Math.floor((d % 3600) / 60);
    const s = Math.floor((d % 3600) % 60);
    return [h, m, s];
}

function hmsToSeconds(arr) {
    let h = parseInt(arr[0]);
    let m = parseInt(arr[1]);
    let s = parseInt(arr[2]);

    h = isNaN(h) ? 0 : h;
    m = isNaN(m) ? 0 : m;
    s = isNaN(s) ? 0 : s;

    return h * 3600 + m * 60 + s;
}

function secondsToTime(d) {
    d = Number(d);
    const h = Math.floor(d / 3600);
    const m = Math.floor((d % 3600) / 60);
    const s = Math.floor((d % 3600) % 60);
    const hDisplay = h > 0 ? h + ":" : "00:";
    const mDisplay = m > 0 ? m + ":" : "00:";
    const sDisplay = s > 0 ? s : "00:";
    return hDisplay + mDisplay + sDisplay;
}

function validateInput(h, m, s, maxH, maxM, maxS) {
    if (
        h < 0 ||
        m < 0 ||
        s < 0 ||
        m > 59 ||
        s > 59 ||
        h > maxH ||
        (h === maxH && m > maxM) ||
        (h === maxH && m === maxM && s > maxS)
    ) {
        return false;
    } else {
        return true;
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "VIDEO_DURATION") {
        videoDuration = request.duration; // Store the video duration.
        const [h, m, s] = secondsToHms(videoDuration);
        document.getElementById("maxTimeHint").textContent =
            "Max time: " + h + ":" + m + ":" + s;
        const endInputs = document
            .getElementById("endTime")
            .getElementsByTagName("input");
        endInputs[0].max = h;
        endInputs[1].max = m;
        endInputs[2].max = s;
    }
});

document.getElementById("stopLoop").addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {
            type: "STOP_LOOP",
        });
    });

    chrome.storage.local.remove(['start', 'end']).then(() => {
        document.getElementById(
            "currentLoop"
        ).textContent = `Current loop: 00:00:00 - 00:00:00`;
    });
});

document.getElementById("setLoop").addEventListener("click", () => {
    const startInputs = document
        .getElementById("startTime")
        .getElementsByTagName("input");
    const endInputs = document
        .getElementById("endTime")
        .getElementsByTagName("input");

    const startH = parseInt(startInputs[0].value);
    const startM = parseInt(startInputs[1].value);
    const startS = parseInt(startInputs[2].value);
    const endH = parseInt(endInputs[0].value);
    const endM = parseInt(endInputs[1].value);
    const endS = parseInt(endInputs[2].value);

    const [maxH, maxM, maxS] = secondsToHms(videoDuration);

    if (!validateInput(startH, startM, startS, maxH, maxM, maxS)) {
        document.getElementById("error").textContent =
            "Invalid start time. Please check your input.";
        return;
    }

    if (!validateInput(endH, endM, endS, maxH, maxM, maxS)) {
        document.getElementById("error").textContent =
            "Invalid end time. Please check your input.";
        return;
    }

    const start = hmsToSeconds([startH, startM, startS]);
    const end = hmsToSeconds([endH, endM, endS]);

    if (start >= end) {
        document.getElementById("error").textContent =
            "End time must be greater than start time.";
        return;
    }

    document.getElementById("error").textContent = ""; // clear the error message

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {
            type: "SET_LOOP",
            start: start,
            end: end,
        });
    });

    const startTime = secondsToTime(start);
    const endTime = secondsToTime(end);

    chrome.storage.local
        .set({
            start: startTime,
            end: endTime,
        })
        .then(() => {
            document.getElementById("currentLoop").textContent = `Current loop: ${
                startTime || "00:00:00"
            } - ${endTime || "00:00:00"}`;
        });
});

document.addEventListener("DOMContentLoaded", (event) => {
    chrome.storage.local.get(["start", "end"]).then((result) => {
        console.log(result);

        const startTime = result?.start || "00:00:00";
        const endTime = result?.end || "00:00:00";

        document.getElementById(
            "currentLoop"
        ).textContent = `Current loop: ${startTime} - ${endTime}`;
    });
});
