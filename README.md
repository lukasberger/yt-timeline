yt-timeline
===========

Chrome extension, which adds a Soundclound-like comment interface for YouTube videos. The comment system YouTube uses lets the users point to a specific time in the video by referencing the time in the comment. This extension uses the YouTube comment API to look through all the comments for a particular video and regular expressions to select those comments that reference a time. The avatars of the commenters are then displayed under the video relatively positioned based on the time they mention. The user can hover over the avatar to see the user's name and his/her comment and click to seek to the time.


Installation
------------
Clone the repository, navigate to [chrome://extensions](chrome://extensions/) in your browser and enable **Developer mode** at the top-right corner. Then click on **Load unpacked extension** and select the folder where you cloned the repository. Find a YouTube video and you should see a comment timeline under it.

If you are successful, you should see something like this:
![yt-timeline in action](https://dl.dropboxusercontent.com/u/26288239/yt-timeline.png)


Known bugs
----------
* seeking causes the browser tab to reload when using the HTML5 player
* every other click is ignored
* uses jQuery, even though it's not really needed
