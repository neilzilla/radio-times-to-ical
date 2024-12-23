// ==UserScript==
// @name         Radio Times to iCal
// @namespace    http://neilgaryallen.dev/
// @version      1.0.0
// @description  Create a TV Schedula from the Radio Times TV Guide in iCal format.
// @author       Neil Gary Allen
// @match        https://www.radiotimes.com/tv/tv-listings/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=radiotimes.com
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function () {
    "use strict";

    const list = GM_getValue("list", []);
    if (list.length) construct_list();

    function remove_show(ev) {
        const parent = ev.target.closest("li");
        let hash = parent.getAttribute("hash");

        let index = list.findIndex((i) => i.hash == hash);
        if (index > -1) list.splice(index, 1);
        construct_list();
    }

    function export_ical() {
        var cal = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//NeilGaryAllen.dev//Radio Times//EN
CALSCALE:GREGORIAN`;
        list.forEach((i) => {
            cal += `
BEGIN:VEVENT
UID:${i.hash}@neilgaryallen.dev
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z
DTSTART:${new Date(i.time).toISOString().replace(/[-:]/g, "").split(".")[0]}Z
DTEND:${new Date(i.endtime).toISOString().replace(/[-:]/g, "").split(".")[0]}Z
SUMMARY:${i.title}
DESCRIPTION:${i.title}
LOCATION:${i.channel}
STATUS:CONFIRMED
END:VEVENT`;
        });
        cal += `
END:VCALENDAR`;

        const blob = new Blob([cal], { type: "text/calendar" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "RadioTimes.ics";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function add_to_list(e) {
        e.preventDefault();
        e.stopPropagation();

        const parent = e.target.closest(".schedule__cell");
        const parent_channel = parent.closest(".schedule__row-list-item");

        const title = parent.querySelector(".schedule__cell-title").innerText;
        const time = parent.querySelector(".schedule__cell-time time").getAttribute("datetime");
        const channel = parent_channel.querySelector("button").innerText;
        const endtime = parent.nextElementSibling
            .querySelector(".schedule__cell-time time")
            .getAttribute("datetime");

        list.push({
            title,
            time,
            endtime,
            channel,
            hash: btoa(title + time + channel),
        });

        list.sort((a, b) => new Date(a.time) - new Date(b.time));
        GM_setValue("list", list);

        construct_list();
    }

    function getDayWithPostfix(date) {
        const day = date.getDate();
        let postfix;

        if (day % 10 === 1 && day !== 11) {
            postfix = "st";
        } else if (day % 10 === 2 && day !== 12) {
            postfix = "nd";
        } else if (day % 10 === 3 && day !== 13) {
            postfix = "rd";
        } else {
            postfix = "th";
        }

        return `${day}${postfix}`;
    }

    function getTime(date) {
        let hours = date.getHours();

        const minutes = date.getMinutes().toString().padStart(2, "0");
        const ampm = hours >= 12 ? "PM" : "AM";
        hours = hours % 12 || 12; // Convert to 12-hour format

        return `${hours}:${minutes} ${ampm}`;
    }
    function construct_list() {
        const existing = document.getElementById("christmas-listmas");
        if (existing) existing.remove();
        const exporter = document.getElementById("export-to-ical");
        if (exporter) exporter.remove();

        const new_list = document.createElement("ul");
        new_list.id = "christmas-listmas";

        list.forEach((i) => {
            let show = document.createElement("li");

            show.setAttribute("hash", i.hash);
            let date = new Date(i.time);

            let dow = date.toLocaleString("en-GB", { weekday: "short" });
            let day = getDayWithPostfix(date);
            let time = getTime(date);
            show.innerHTML = `
<div class="show-time">
  <h4>${dow} ${day}</h4>
  <h4>${time}</h4>
</div>
<h3 class="show-title">
  ${i.title}
</h3>
<div class="show-remove">
            <svg width="50" height="50" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg"><rect x="20" y="10" width="10" height="30" fill="black" /><rect x="10" y="20" width="30" height="10" fill="black" /></svg>
</div>
    `;
            new_list.appendChild(show);
        });

        document.body.appendChild(new_list);

        document
            .querySelectorAll("#christmas-listmas li .show-remove")
            .forEach((i) => i.addEventListener("click", remove_show));

        if (list.length > 0) {
            const dl = document.createElement("h3");
            dl.id = "export-to-ical";
            dl.innerText = "Export";
            dl.addEventListener("click", export_ical);
            document.body.appendChild(dl);
        }
    }

    function colour_in(node) {
        if (node.classList.contains("schedule__cell")) {
            var hover = document.createElement("div");
            hover.addEventListener("click", add_to_list);
            hover.classList.add("add-cal");
            hover.innerHTML =
                '<svg width="50" height="50" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg"><rect x="20" y="10" width="10" height="30" fill="black" /><rect x="10" y="20" width="30" height="10" fill="black" /></svg>';
            node.querySelector("a").appendChild(hover);
        }
    }

    // Select the target node to observe (in this case, the entire document body)
    const targetNode = document.body;

    // Create a callback function to run when mutations are observed
    const callback = (mutationsList, observer) => {
        mutationsList.forEach((mutation) => {
            if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        setTimeout(() => colour_in(node), 100);
                    }
                });
            }
        });
    };

    // Create an instance of MutationObserver
    const observer = new MutationObserver(callback);

    // Configure the observer to watch for added nodes
    const config = { childList: true, subtree: true };

    // Start observing the target node
    observer.observe(targetNode, config);

    var style = `
  .add-cal{
  display: block;
    width: 20px;
    height: 20px;
    position: absolute;
    right: 0;
    top: 0;
  }
    .add-cal svg{
    width: 20px;
    height: 20px;
}
.schedule__cell:hover .add-cal {
background: grey;
}

.schedule__cell:hover .add-cal svg rect {
fill: lightgrey;
}

.schedule__cell:hover .add-cal:hover svg rect {
fill: white;
}
#christmas-listmas{
width: 250px;
position: fixed;
bottom: 0;
right: 0;
background: white;
z-index: 999;
padding: 0;
margin: 0;
  border: 1px solid lightgrey;
    max-height: 100%;
    overflow: auto;
}

#christmas-listmas li{
  display: flex;
  border-top: 1px solid lightgrey;
}

#christmas-listmas li .show-time{
padding: 5px;
box-sizing: border-box;

}

#christmas-listmas li .show-time h4{
margin: 0;
font-size: 12px;
line-height: 12px;
width: 60px;
}

#christmas-listmas li h3.show-title{
font-size: 12px;
line-height: 12px;
padding: 5px;
flex-grow: 1;
margin: 0;
box-sizing: border-box;

}


#christmas-listmas li .show-remove {
cursor:pointer;
width:25px;
flex-shrink:0;
}
#christmas-listmas li .show-remove svg{
width: 20px;
height: 20px;
transform: rotate(45deg);
overflow: hidden;l
}

#export-to-ical {
 padding: 10px;
 position: fixed;
 right: 260px;
 bottom:0;
background: white;
cursor: pointer;
z-index: 999;
border: 1px solid lightgrey;
padding: 5px;
margin: 0;
}


`;

    const css = document.createElement("style");
    css.textContent = style;

    document.body.appendChild(css);
})();
