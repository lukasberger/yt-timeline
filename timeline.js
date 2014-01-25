var width;     // player width
var videoid;   // id of the video
var duration;  // duration of the video

var comments = []; // array of all comments that reference time

var container;  // container of the video info section
var panel;      // ui button panel, above which we insert the timeline
var timeline;   // the actual timeline
var comment;    // an element containing the author's name and the comment
var pointer;    // shows the time referenced in the comment in the player

var observer;   // an iterval, which periodically checks for page changes
var currenturi; // current page location, so we can scan for changes

var player;     // the player element, so we can control it


// once the document is loaded run main once
$(document).ready(setupTimeline);

// add mouse event handlers for comment displaying
$(document).on("mousemove", ".avatar", function(e) {
    // get the comment which belongs to this avatar
    var c = comments[e.target.id.substr(6)];
    // position the comment, so that it is exactly aligned with the avatar
    $(".comment").css("left", (c.left < 600 ? c.left + 40: 640)) .css("top", 0)
        // and fill the content
        .html("<strong>" + c.author + "</strong><br> " + c.comment).show();
    // add pointer to the time which the comment references
    $(".pointer").css("left", c.left).css("top", -30).show();
    // when the mouse leaves the avatar hide the pointer and the comment
}).on("mouseleave", ".avatar", function(e) {
    $(".pointer").hide();
    $(".comment").hide();
});

// add an onclick event to the avatar, so we can seek to the referenced time
$(document).on("click", ".avatar", function(e) {
    e.preventDefault();
    // get the comment to which this avatar is linked
    var c = comments[e.target.id.substr(6)];
    // move the video to the desired time
    player.seekTo(c.seconds, true);
});

// save the current uri, so we can later use it to check for page changes
currenturi = window.location.href;

// set up an interval to periodically check for page changes
observer = setInterval(function() {
    // if the current uri differs, save the new one and update the timeline
    if (window.location.href !== currenturi) {
        currenturi = window.location.href;
        setTimeout(update, 1000);
    }
}, 200);

// update the timeline to serve the new video
function update() {
    // if we are not on a page with a video, get out
    if (window.location.pathname !== "/watch") return;

    // once the page is loaded and the content element is present, proceed
    if ($("body").hasClass("page-loaded") &&
        document.getElementById("watch7-content") !== null) {
        setupTimeline();
    } else {
        // otherwise wait for a bit and try again
        setTimeout(update, 200);
    }
}

/**
 * Sets up the timeline based on the current video
 */
function setupTimeline() {

    container = document.getElementById("watch7-content");
    if (container !== null) {
        panel = container.firstChild;
        
        // get all necessart player data
        player = document.getElementById("movie_player");
        width = player.clientWidth;
        videoid = $("meta[itemprop=videoId]").attr("content");
        duration = ytTimeToSeconds($("meta[itemprop=duration]").attr("content"));

        // the timeline element holds all the avatars
        timeline = document.createElement("div");
        timeline.id = "timeline";
        timeline.className = "timeline";
        timeline = container.insertBefore(timeline, panel);

        // the comment element displays the author's name and the comment
        comment = document.createElement("div");
        comment.className = "comment";
        comment = container.insertBefore(comment, timeline);

        // the pointer shows exact time reference in the comment on the video
        pointer = document.createElement("div");
        pointer.className = "pointer";
        pointer = container.insertBefore(pointer, timeline);

        // start gathering comments which reference a time, start with first
        getComments(1);
    }
}

/**
 * By scanning comments from newest to oldest, finds all comments, which
 * reference a time
 * @param  {Integer} start  number of the comment to begin at
 */
function getComments(start) {
    // make a request to the youtube api, receive xml of at most 50 comments
    $.ajax({
        type: "GET",
        url: "http://gdata.youtube.com/feeds/api/videos/" + videoid +
             "/comments?orderby=published&max-results=50&start-index=" + start,
        dataType: "xml",
        success: function(xml) {
            var entries = $(xml).find('entry');
            // if there are any comments, examine them, otherwise get out
            if (entries.length > 0) {
                entries.each(function() {
                    // save the comment's data for later use
                    var comment = {};
                        comment.comment = $(this).find('content').text();
                        comment.author = $(this).find('author').find("name").text();
                        comment.uri = $(this).find('author').find("uri").text();
                    // this regex recognizes time in hh:mm:ss or mm:ss
                    var time = /^(?:([01]?\d|2[0-3]):)?([0-5]?\d):([0-5]?\d)/g;
                    // find all occurences of time in the comment's text
                    var results = comment.comment.match(time);
                    // if there are any time references save and remove them
                    if (results !== null) {
                        for (var i = 0; i < results.length; i++) {
                            // time converted to seconds from the beginning
                            var seconds = toSeconds(results[i]);
                            // the x-position of the avatar
                            var pos = width / duration * seconds;
                            // convert the time to youtube link format 00h11m22s
                            comment.time = toHms(results[i]);
                            comment.seconds =  seconds;
                            comment.left = pos;
                            // remove the occurence of the time string from comment
                            comment.comment = comment.comment.replace(results[i], "");
                            // generate an avatar link and put it in timeline
                            generateAvatar("avatar" + comments.length, comment);
                            // save the comment data for later use
                            comments.push(comment);
                        }
                    }
                });
                // try getting another 50 comments
                getComments(start + 50);
            }
        }
    });
}

/**
 * Generates an avatar for the given id and comment, looks up the author's
 * avatar based on author's uri from the comment object
 * @param  {String} id      id of the avatar
 * @param  {Object} comment object containing comment data
 */
function generateAvatar (id, comment) {

    // create the avatar element
    var link = document.createElement("a");
        link.className = "avatar";
        link.href = "/watch?v=" + videoid + "&t=" + comment.time;
        link.id = id;

    // try to get the link to the avatar
    $.ajax({
        type: "GET",
        url: comment.uri,
        dataType: "xml",
        // if we succeed save avatar as a background image
        success: function(xml) {
            // get the avatar's url
            var image = $(xml).find("media\\:thumbnail, thumbnail").attr("url");
            // insert the avatar element into the timeline
            link = timeline.appendChild(link);
            // offset the avatar, so that it is below its referenced time
            $("#" + id).css("left", (comment.left < 600 ? comment.left : 600))
                .css("background-image", "url('" + image + "')");
        }
    });
}

/**
 * Converts the given time string in hh:mm:ss or mm:ss into seconds
 * @param  {String} time  string in the format hh:mm:ss or mm:ss
 * @return {Integer}      time converted into seconds
 */
function toSeconds (time) {
    // if the time is undefined, get out
    if (typeof time === "undefined") return 0;

    // split the time string into hours, minutes, seconds or minutes, seconds
    timeArray = time.split(":");
    var hrs, mins, secs;

    // the format is hh:mm:ss
    if (timeArray.length === 3) {
        hrs = parseInt(timeArray[0], 10);
        mins = parseInt(timeArray[1], 10);
        secs = parseInt(timeArray[2], 10);
    }

    // the format is mm:ss
    if (timeArray.length === 2) {
        hrs = 0;
        mins = parseInt(timeArray[0], 10);
        secs = parseInt(timeArray[1], 10);
    }

    return hrs * 3600 + mins * 60 + secs;
}

/**
 * converts the given time string in hh:mm:ss or mm:ss into seconds
 * @param  {String} time  string in the format hh:mm:ss or mm:ss
 * @return {String}      time converted into "youtube" link time
 */
function toHms (time) {
    // if the time is undefined, get out
    if (typeof time === "undefined") return "";

    // split the time string into hours, minutes, seconds or minutes, seconds
    timeArray = time.split(":");
    var hrs, mins, secs;

    // the format is hh:mm:ss
    if (timeArray.length === 3) {
        return  timeArray[0] + "h" +
                timeArray[1] + "m" +
                timeArray[2] + "s";
    }

    // the format is mm:ss
    if (timeArray.length === 2) {
        return  timeArray[0] + "m" +
                timeArray[1] + "s";
    }

    // there must have been an errorx
    return "";
}

/**
 * Converts the given youtube time string in 11m22s into seconds
 * @param  {String} time   time in the format 11m22s or 22s
 * @return {Integer}       time converted in seconds
 */
function ytTimeToSeconds (time) {
    // if the time is undefined, get out
    if (typeof time === "undefined") return 0;
    // get rid of the PT prefix
    time = time.substr(2);

    // find where minutes and and seconds end
    var m = time.indexOf("M");
    var s = time.indexOf("S");
    var mins = 0;
    var secs = 0;

    // if there are any minutes
    if (m > 0) {
        mins = time.substring(0, m);
        secs = time.substring(m + 1, s);
    // there are no minutes
    } else {
        secs = time.substring(0, s);
    }

    return parseInt(mins, 10) * 60 + parseInt(secs, 10);
}