// Generate southern greetings
function genGreeting(plural = true) {
    var greets = ["howdy", "mornin'", "hello", "hiya", "hey", "good morning"]
    var subjects = [null, "there"]
    var users = [null];

    if (plural) {
        subjects.push("folks");
        subjects.push("y'all");
        subjects.push("guys");
        subjects.push("everybody");
    }
    else {
        subjects.push("partner");
        subjects.push("friend");
        subjects.push("pal");
        subjects.push("buddy");
        // subjects.push("USERNAME"); // Will be used in DMs in the future
    }

    // Get the parts of the greeting
    var g = greets[Math.floor(Math.random() * greets.length)];
    var s = subjects[Math.floor(Math.random() * subjects.length)];
    var u = users[Math.floor(Math.random() * users.length)];

    // Check for exceptions
    // "hiya" can't be used with "y'all", it will just be "hi"
    if (g == "hiya" && s == "y'all") g = "hi";

    // Generate the greeting
    var greeting = g + (s ? " " + s : "") + (u ? " " + u : "") + "!";

    // Return the greeting with the first letter capitalized
    return greeting.charAt(0).toUpperCase() + greeting.slice(1);
}

var fs = require('fs');

const fetchUrl = require("fetch").fetchUrl;

var gifPrompts = [
    "dead space",
    // "marvel",
    // "space",
    // "star trek",
    // "soma",
    // "the stanley parable",
    // "return of the obra dinn",
    // "doom",
    // "tenet",
    // "saw",
    // "the simpsons",
    // "the big bang theory",
    // "the office",
    // "rick and morty",
    // "the imitation game",
    // "the martian",
    // "wargames",
    // "inception",
    // "back to the future",
    // "memento",
    // "veritasium",
    // "kurzgesagt",
    // "vsauce",
    // "elon musk",
    // "spacex",
    // "nasa",
    // "neuralink",
    // "tesla",
    // "starlink"
]

// get the contents of each {prompt}.txt file as an array
// each line is an element

var gifUrls = {}

gifPrompts.forEach(prompt => {
    try {
        var promptUrls = fs.readFileSync(prompt + ".txt", "utf8").split("\n");
    }
    catch (err) {
        var promptUrls = [];
    }

    gifUrls[prompt] = promptUrls;
});

var urlPrefix = "https://tenor.googleapis.com/v2/search?q=";
var urlSuffix = "&key=AIzaSyDpNHxZEKMMZd-9m6Av4nbAglk0fEw_M0U&media_filter=minimal";

function gifloop() {
    // Will get the urls of every gif for each prompt
    // and store them in the gifUrls array
    // since tenor only allows 50 gifs per request, the 'next' parameter will be used to get the next 50 gifs    

    console.log("Getting gifs...")

    gifPrompts.forEach(prompt => {
        var url = urlPrefix + prompt + urlSuffix;
    
        getGifs(url, prompt);
    });
}

function getGifs(url, prompt, next = "") {
    fetchUrl(url + next, function(error, meta, body) {
        var json = JSON.parse(body.toString());
        var results = json.results.map(result => {
            return {
                prompt: prompt,
                url: result.itemurl
            }
        });

        // Add the urls to the array (if it doesn't already exist)
        results.forEach(result => {
            if (!gifUrls[prompt].includes(result.url)) {
                gifUrls[prompt].push(result.url);
            }
        }); 

        if (json.next != "") {
            getGifs(url, prompt, "&pos=" + json.next);
        }
        else {
            console.log(prompt + " done!");

            // Save the gif urls to a file
            saveGifs(prompt);
        }
    });
}

function saveGifs(prompt) {
    var txt = gifUrls[prompt].join("\n");txt
    fs.writeFile(prompt + ".txt", "txt", function(err) {
        if (err) return console.log(err);
        console.log(prompt + " saved!");
    });
}

module.exports = function(controller) {
    /*
    .greet                        - Replies with a random greeting.

    .add "<title>" <datetime>    - Adds the timer to the list.
    .add "<title>" ~ <datetime>  - (Approximate)

    .remove "<title>"             - Removes the timer from the list.

    .edit "<title>" "<new_title>" <new_datetime> - Can be used to change the attributes of the timer.
    .edit "<title>" "<new_title>"
    .edit "<title>" <new_datetime>
    .edit "<title>" ~ <new_datetime>

    .list                         - Lists all the timers.

    .help                         - Shows this message.
    */

    // Reply with a greeting when someone says "greet"
    controller.hears(".greet", ["ambient", "direct_message", "mention"], (bot, message) => {
        if (message.text !== ".greet") return;
        bot.reply(message, genGreeting());
    });

    // Add a timer to the list
    controller.hears(".add", ["ambient", "direct_message", "mention"], (bot, message) => {
        // Exit if the message doesn't start with ".add "
        if (!message.text.startsWith(".add ")) return;

        // Exit if the message does not contain at least 2 double quotes
        if (message.text.split('"').length < 3) {
            bot.reply(message, "Invalid format!");
            return;
        }

        // Get the title and datetime from the message
        var text = message.text
        var title = text.split('"')[1];
        var datetime = text.split('"')[2].trim();

        // Check if the datetime is approximate (starts with "~")
        var estimated = false;
        if (datetime.startsWith("~")) {
            estimated = true;
            datetime = datetime.substring(1);
        }

        // Get the contents of timecheck.json
        // It will be in the following format:
        // [
        //   {
        //     "id": (string), // The ID of the message that will be updated
        //     "channel": (string), // The ID of the channel containing the message
        //     "title": (string), // The title of the event that is being counted down to
        //     "datetime": (string), // The datetime that the event will occur
        //     "estimated": (boolean) // Whether the datetime is estimated or not
        //   },
        //   ...
        // ]
        
        var timers = JSON.parse(fs.readFileSync("timecheck.json", "utf8"));

        // Exit if the title is already in the list for this channel
        if (timers.some(timer => timer.title == title && timer.channel == message.channel.id)) {
            bot.reply(message, "Title already exists!");
            return;
        }

        // Exit if the datetime is invalid
        if (isNaN(Date.parse(datetime))) {
            bot.reply(message, "Invalid datetime!");
            return;
        }

        // Send a message for the countdown
        bot.reply(message, `**${title}**\n...`, (err, res) => {
            // Handle errors
            if (err) return console.log(err);

            // Get the id of that message
            console.log(res);
            // Add the timer to the list
            timers.push({
                id: res.id,
                channel: res.channel.id,
                title: title,
                datetime: datetime,
                estimated: estimated
            });

            // Save the list
            fs.writeFile("timecheck.json", JSON.stringify(timers), function(err) {
                if (err) return console.log(err);
            });

            // Delete the message that started the countdown (sent by the user)
            bot.api.chat.delete({
                token: process.env.MINUTES_DISCORD_TOKEN,
                channel: message.channel,
                ts: message.ts
            }, function(err, res) {
                if (err) return console.log(err);
            });
        });
    });

    // Remove/delete a timer from the list
    controller.hears([".remove", ".delete"], ["ambient", "direct_message", "mention"], (bot, message) => {
        // Exit if the message doesn't start with ".remove " or ".delete "
        if (!message.text.startsWith(".remove ") && !message.text.startsWith(".delete ")) return;

        // Exit if the message does not contain at least 2 double quotes
        if (message.text.split('"').length < 3) {
            bot.reply(message, "Invalid format!");
            return;
        }

        // Get the title from the message
        var title = message.text.split('"')[1];

        // Get the contents of timecheck.json
        // It will be in the following format:
        // [
        //   {
        //     "id": (string), // The ID of the message that will be updated
        //     "channel": (string), // The ID of the channel containing the message
        //     "title": (string), // The title of the event that is being counted down to
        //     "datetime": (string), // The datetime that the event will occur
        //     "estimated": (boolean) // Whether the datetime is estimated or not
        //   },
        //   ...
        // ]
        
        var timers = JSON.parse(fs.readFileSync("timecheck.json", "utf8"));

        // Exit if the title is not in the list for this channel
        if (!timers.some(timer => timer.title == title && timer.channel == message.channel.id)) {
            bot.reply(message, "Title does not exist!");
            return;
        }

        // Remove the timer from the list for this channel
        timers = timers.filter(timer => timer.title != title || timer.channel != message.channel.id);

        // Save the list
        fs.writeFile("timecheck.json", JSON.stringify(timers), function(err) {
            if (err) return console.log(err);
        });

        // Reply with a confirmation
        bot.reply(message, "Timer removed!");
    });

    // Edit a timer in the list
    controller.hears(".edit", ["ambient", "direct_message", "mention"], (bot, message) => {
        // Exit if the message doesn't start with ".edit "
        if (!message.text.startsWith(".edit ")) return;

        // Exit if the message does not contain at least 2 double quotes
        if (message.text.split('"').length < 3) {
            bot.reply(message, "Invalid format!");
            return;
        }

        // Get the title from the message
        var text = message.text
        var title = text.split('"')[1];

        // Get the text remaining after the title
        text = text.substring(text.indexOf(title) + title.length + 2);
        
        // Get the new title if it exists
        if (text.startsWith('"')) {
            var newTitle = text.split('"')[1];
            text = text.substring(newTitle.length + 2);
        }

        // Get the new datetime if it exists
        if (text != "") {
            var newDatetime = text.trim();
        }

        // Check if the datetime is approximate (starts with "~")
        var estimated = null;
        if (newDatetime && newDatetime.startsWith("~")) {
            estimated = true;
            newDatetime = newDatetime.substring(1);
        }
        else if (newDatetime) {
            estimated = false;
        }

        // Get the contents of timecheck.json
        // It will be in the following format:
        // [
        //   {
        //     "id": (string), // The ID of the message that will be updated
        //     "channel": (string), // The ID of the channel containing the message
        //     "title": (string), // The title of the event that is being counted down to
        //     "datetime": (string), // The datetime that the event will occur
        //     "estimated": (boolean) // Whether the datetime is estimated or not
        //   },
        //   ...
        // ]
        
        var timers = JSON.parse(fs.readFileSync("timecheck.json", "utf8"));

        // Exit if the title is not in the list for this channel
        if (!timers.some(timer => timer.title == title && timer.channel == message.channel.id)) {
            bot.reply(message, "Title does not exist!");
            return;
        }

        // Exit if the new title is already in the list for this channel
        if (newTitle && timers.some(timer => timer.title == newTitle && timer.channel == message.channel.id)) {
            bot.reply(message, "Title already exists!");
            return;
        }

        // Exit if the new datetime is invalid
        if (newDatetime && isNaN(Date.parse(newDatetime))) {
            bot.reply(message, "Invalid datetime!");
            return;
        }

        // Edit the timer in the list for this channel
        timers = timers.map(timer => {
            if (timer.title == title && timer.channel == message.channel.id) {
                if (newTitle) timer.title = newTitle;
                if (newDatetime) timer.datetime = newDatetime;
                if (estimated != null) timer.estimated = estimated;
            }
            return timer;
        });

        // Save the list
        fs.writeFile("timecheck.json", JSON.stringify(timers), function(err) {
            if (err) return console.log(err);
        });

        // Reply with a confirmation
        bot.reply(message, "Timer edited!");
    });

    // List all timers for this channel
    controller.hears(".list", ["ambient", "direct_message", "mention"], (bot, message) => {
        if (message.text != ".list") return;

        // Get the contents of timecheck.json for this channel
        var timers = JSON.parse(fs.readFileSync("timecheck.json", "utf8")).filter(timer => timer.channel == message.channel.id);

        // Exit if the list is empty
        if (timers.length == 0) {
            bot.reply(message, "No timers in this channel!");
            return;
        }

        // Make a formatted list of all timers
        var list = "Timers: \n";

        timers.forEach(timer => {
            list += `**${timer.title}** - ${timer.datetime}${timer.estimated ? " (approx)" : ""}\n`;
        });

        // Reply with a list of all timers
        bot.reply(message, list);
    });

    // Help command
    controller.hears(".help", ["ambient", "direct_message", "mention"], (bot, message) => {
        if (message.text != ".help") return;

        // Reply with a list of all commands
        bot.reply(message, "Commands: \n" +
            "**.add " + '"title" "datetime"' + "** - Add a timer \n" +
            "**.remove " + '"title"' + "** - Remove a timer \n" +
            "**.edit " + '"title" "new title" "new datetime"' + "** - Edit a timer \n" +
            "**.list** - List all timers \n" +
            "**.help** - Show this message");
    });

    // Show the full amount of time left for a timer
    controller.hears(".full", ["ambient", "direct_message", "mention"], (bot, message) => {
        if (!message.text.startsWith(".full ")) return;

        // Get the title from the message (first double quote to second double quote after the command)
        var title = message.text.substring(6).split('"')[1];

        // Get the contents of timecheck.json
        var timers = JSON.parse(fs.readFileSync("timecheck.json", "utf8"));

        // Exit if the title is not in the list for this channel
        if (!timers.some(timer => timer.title == title && timer.channel == message.channel.id)) {
            bot.reply(message, "Title does not exist!");
            return;
        }

        // Get the timer from the list for this channel
        var timer = timers.find(timer => timer.title == title && timer.channel == message.channel.id);

        // Get the time difference between now and the event
        var difference = new Date(timer.datetime) - new Date();

        // Minus 13 hours due to timezone difference
        difference -= 13 * 60 * 60 * 1000;

        var units = [
            // Years
            Math.floor(difference / (1000 * 60 * 60 * 24 * 365)) + " years",
            // Months until the next year
            Math.floor(difference / (1000 * 60 * 60 * 24 * 30)) % 12 + " months",
            // Days until the next month
            Math.floor(difference / (1000 * 60 * 60 * 24)) % 30 + " days",
            // Hours until the next day
            Math.floor(difference / (1000 * 60 * 60)) % 24 + " hours",
            // Minutes until the next hour
            Math.floor(difference / (1000 * 60)) % 60 + " minutes",
            // Seconds until the next minute
            Math.floor(difference / 1000) % 60 + " seconds"
        ];

        // Remove any units that begin with "0 "
        units = units.filter(unit => !unit.startsWith("0 "));

        // If the unit begins with "1 ", delete the final letter
        units = units.map(unit => unit.startsWith("1 ") ? unit.slice(0, -1) : unit);

        // Join the units with commas and "and" at the end
        var diffmessage = units.join(", ").replace(/, ([^,]*)$/, " and $1");

        var text = `**${timer.title}**\n... in ${(timer.estimated ? "approximately " : "")}${diffmessage}`;

        // Reply with the time difference
        bot.reply(message, text);
    });

    // Movie command (.pick/.spin/.movie/.wheel)
    controller.hears([".pick", ".spin", ".movie", ".wheel"], ["ambient", "direct_message", "mention"], (bot, message) => {
        // Exit if the command is not an exact match
        if (![".pick", ".spin", ".movie", ".wheel"].includes(message.text)) return;

        // Get the contents of movies.json
        // It contains an array of movie series', each of which contains an array of movies
        // Most however, only contain one movie
        var movies = JSON.parse(fs.readFileSync("movies.json", "utf8"));

        // Exit if the list is empty
        if (movies.length == 0) {
            bot.reply(message, "No movies left on the list!");
            return;
        }

        // Get a random movie series
        var index = Math.floor(Math.random() * movies.length);
        var series = movies[index];

        // Get and remove the first movie in the series
        var movie = series.shift();

        // Reply with the movie
        bot.reply(message, `**${movie}** has been chosen!`);

        // If the series is now empty, remove it from the movies list, if not then save the movies list
        if (series.length == 0) {
            // Remove the series from the movies list
            movies.splice(index, 1);
            console.log("Removed series")
        }
        else {
            // Save the changed series array to the movies list
            movies[index] = series;
            console.log("Removed movie")
        }

        // Save the movies list
        fs.writeFile("movies.json", JSON.stringify(movies), function(err) {
            if (err) return console.log(err);
        });
    });
}