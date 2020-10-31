const express = require("express");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");

const crypto = require("crypto");

const fs = require("fs");

const {createCanvas} = require("canvas");

const app = express();

const rtg = require("url").parse(process.env.REDISTOGO_URL);
const redis = require("redis").createClient(rtg.port, rtg.hostname);
redis.auth(rtg.auth.split(":")[1]);

// To support URL-encoded bodies
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// To parse cookies from the HTTP Request
app.use(cookieParser());

const authTokens = [];

let masterPassword = "ggkzo_2020";

let savedSurveys;
redis.get("json", (err, reply) => {
    savedSurveys = JSON.parse(reply);
});

let runningSurveys = [];

function getHashedPassword(password) {
    const sha256 = crypto.createHash("sha256");
    const hash = sha256.update(password).digest("base64");
    return hash;
}

function generateAuthToken() {
    return crypto.randomBytes(30).toString("hex");
}

app.get("/s/:id", (req, res) => {
    if (runningSurveys[req.params.id]) {
        res.send(runningSurveys[req.params.id].orig);
    } else {
        res.status(404);
        res.end();
    }
});

app.post("/login", (req, res) => {
    const { password } = req.body;
    const hashedPassword = getHashedPassword(password);

    if (hashedPassword == getHashedPassword(masterPassword)) {
        const authToken = generateAuthToken();

        // Store authentication token
        authTokens[authToken] = "root";

        // Setting the auth token in cookies
        res.cookie("AuthToken", authToken);

        // Redirect user to the protected page
        res.redirect("/controlpanel");
    } else {
        res.sendFile(__dirname + "/static/login/index.html");
    }
});

app.get("/logout", (req, res) => {
    res.cookie("AuthToken", "");
    res.redirect("/");
});

app.get("/controlpanel", (req, res) => {
    if (authTokens[req.cookies["AuthToken"]] != null) {
        res.sendFile(__dirname + "/static/controlpanel/index.html");
    } else {
        res.redirect("/login");
    }
});

app.get("/getAllSurveys", (req, res) => {
    if (authTokens[req.cookies["AuthToken"]] == null) {
        res.redirect("/login");
        return;
    }
    res.send(savedSurveys);
    res.end();
    return;
});

app.get("/startSurvey/:id", (req, res) => {
    if (authTokens[req.cookies["AuthToken"]] == null) {
        res.redirect("/login");
        return;
    }
    if (savedSurveys[req.params.id]) {
        let id = crypto.randomBytes(2).toString("hex");
        console.log(id);
        let survey = savedSurveys[req.params.id];
        runningSurveys[id] = {
            orig: survey,
            answers: Array.from(Array(survey.questions.length), () => [])
        };
        console.log(runningSurveys[id]);
        res.send(id);
        res.end();
        return;
    }
    res.status(404);
    res.end();
    return;
});

app.get("/endSurvey/:id", (req, res) => {
    if (authTokens[req.cookies["AuthToken"]] == null) {
        res.redirect("/login");
        return;
    }
    let id = String(req.params.id).toLowerCase();
    console.log(runningSurveys, id);
    if (runningSurveys[id]) {
        let answers = runningSurveys[id].answers;
        
        let img = createCanvas(800, 130, "pdf");
        
        let i = 0;

        const OFFSET_Y = 30;
        
        for (let question of answers) {
            console.log(question);
            let ctx = img.getContext("2d");

            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, img.width, img.height);
            
            ctx.fillStyle = "black";
            ctx.textAlign = "center";
            ctx.fillText(runningSurveys[id].orig.questions[i][0], img.width / 2, 20);
            ctx.textAlign = "left";
            ctx.fillText(runningSurveys[id].orig.questions[i][1], 5, 120);
            ctx.textAlign = "right";
            ctx.fillText(runningSurveys[id].orig.questions[i][2], img.width - 5, 120);
            ctx.beginPath();
            ctx.lineTo(0, OFFSET_Y);
            ctx.lineTo(img.width, OFFSET_Y);
            ctx.stroke();
            ctx.beginPath();
            ctx.lineTo(0, img.height - OFFSET_Y);
            ctx.lineTo(img.width, img.height - OFFSET_Y);
            ctx.stroke();
            for (answer of question) {
                ctx.beginPath()
                ctx.arc(answer[0] * img.width, answer[1] * (img.height - OFFSET_Y * 2) + OFFSET_Y, 4, 0, 2 * Math.PI);
                ctx.closePath();
                ctx.fill();
            }
            ctx.addPage(800, 130);
            i++;
        }
        img.toBuffer();
        img.createPDFStream();
        let pdf = img.toBuffer("application/pdf", {
            title: "Resultat Umfrage"
        });
        res.send(pdf);
        res.end();
        runningSurveys[id] = undefined;
    } else {
        res.status(404);
        res.end();
        return;
    }
});

app.post("/createSurvey", (req, res) => {
    if (authTokens[req.cookies["AuthToken"]] == null) {
        res.redirect("/login");
        return;
    }
    let id = crypto.randomBytes(30).toString("hex");
    savedSurveys[id] = req.body;
    redis.set("json", JSON.stringify(savedSurveys));
    res.status(200);
    res.end();
});

app.post("/editSurvey/:id", (req, res) => {
    if (authTokens[req.cookies["AuthToken"]] == null) {
        res.redirect("/login");
        return;
    }
    let id = String(req.params.id);
    if (!savedSurveys[id]) {
        res.status(404);
        res.end();
        return;
    }
    savedSurveys[id] = req.body;
    redis.set("json", JSON.stringify(savedSurveys));
    res.status(200);
    res.end();
});

app.get("/deleteSurvey/:id", (req, res) => {
    if (authTokens[req.cookies["AuthToken"]] == null) {
        res.redirect("/login");
        return;
    }
    let id = String(req.params.id);
    if (!savedSurveys[id]) {
        res.status(404);
        res.end();
        return;
    }
    delete savedSurveys[id];
    redis.set("json", JSON.stringify(savedSurveys));
    res.status(200);
    res.end();
});

app.post("/survey", (req, res) => {
    if (!(req.body.surveyID && req.body.answers && req.body.answers.length == runningSurveys[req.body.surveyID].orig.questions.length)) {
        console.log("invalid code lol fuck you");
        res.send("don't do that thank you very much");
        res.end();
        return;
    }
    for (let answer of req.body.answers) {
        // sanity checks
        console.log(answer);
        if (!answer || answer.length != 2 || answer[0] < 0 || answer[0] > 1 || answer[1] < 0 || answer[1] > 1) {
            console.log("fucking hacker.,.,,,.,,");
            res.send("don't do that thank you very much");
            res.end();
            return;
        }
    }
    for (let i = 0; i < req.body.answers.length; i++) {
        console.log(i + ": " + req.body.answers[i]);
        console.log(runningSurveys[req.body.surveyID].answers[i]);
        runningSurveys[req.body.surveyID].answers[i].push(req.body.answers[i]);
    }
    console.log(runningSurveys[req.body.surveyID]);
    res.send("ok");
    res.end();
});

app.use(express.static("static"));
app.listen(process.env.PORT || 3000, () => console.log("Web server is up and running"));