const express = require("express");
const bodyParser = require("body-parser");

const crypto = require("crypto");
const fs = require("fs");
const {createCanvas} = require("canvas");

const app = express();

let savedSurveys;
if (!fs.existsSync("surveys.json")) {
    fs.writeFileSync("surveys.json", "[]");
}
savedSurveys = JSON.parse(fs.readFileSync("surveys.json"));

let runningSurveys = [];

app.get("/getAllSurveys", (req, res) => {
    res.send(savedSurveys);
    res.end();
    return;
});

app.get("/startSurvey/:id", (req, res) => {
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
            ctx.font = "bold 10pt Verdana";
            let size = 10;
            let textWidth = ctx.measureText(runningSurveys[id].orig.questions[i][0]);
            while (textWidth.width > 800) {
                size -= 0.5;
                ctx.font = "bold " + size + "pt Verdana";
                textWidth = ctx.measureText(runningSurveys[id].orig.questions[i][0]);
            }
            ctx.fillText(runningSurveys[id].orig.questions[i][0], img.width / 2, 20);
            ctx.font = "10pt Verdana";
            ctx.textAlign = "left";
            ctx.fillText(runningSurveys[id].orig.questions[i][1], 5, 120);
            ctx.textAlign = "center";
            ctx.fillText(runningSurveys[id].orig.questions[i][2], img.width / 2, 120);
            ctx.textAlign = "right";
            ctx.fillText(runningSurveys[id].orig.questions[i][3], img.width - 5, 120);
            ctx.beginPath();
            ctx.lineTo(0, OFFSET_Y);
            ctx.lineTo(img.width, OFFSET_Y);
            ctx.stroke();
            ctx.beginPath();
            ctx.lineTo(0, img.height - OFFSET_Y);
            ctx.lineTo(img.width, img.height - OFFSET_Y);
            ctx.stroke();
            ctx.fillStyle = "#f5163b";
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
    let id = crypto.randomBytes(30).toString("hex");
    savedSurveys[id] = req.body;
    fs.writeFileSync("surveys.json", JSON.stringify(savedSurveys));
    res.status(200);
    res.end();
});

app.post("/editSurvey/:id", (req, res) => {
    let id = String(req.params.id);
    if (!savedSurveys[id]) {
        res.status(404);
        res.end();
        return;
    }
    savedSurveys[id] = req.body;
    fs.writeFileSync("surveys.json", JSON.stringify(savedSurveys));
    res.status(200);
    res.end();
});

app.get("/deleteSurvey/:id", (req, res) => {
    let id = String(req.params.id);
    if (!savedSurveys[id]) {
        res.status(404);
        res.end();
        return;
    }
    delete savedSurveys[id];
    fs.writeFileSync("surveys.json", JSON.stringify(savedSurveys));
    res.status(200);
    res.end();
});

app.use(express.static("static"));
app.listen(process.env.PORT_TEACHER || 3001, () => console.log("Web server is up and running"));

const app_student = express();

// To support URL-encoded bodies
app_student.use(bodyParser.urlencoded({ extended: true }));
app_student.use(bodyParser.json());

app_student.post("/survey", (req, res) => {
    let sId = req.body.surveyID.toLowerCase();
    if (!(sId && req.body.answers && req.body.answers.length == runningSurveys[sId].orig.questions.length)) {
        console.log("student entered an invalid code");
        res.send("don't do that thank you very much");
        res.end();
        return;
    }
    for (let answer of req.body.answers) {
        // sanity checks
        console.log(answer);
        if (!answer || answer.length != 2 || answer[0] < 0 || answer[0] > 1 || answer[1] < 0 || answer[1] > 1) {
            res.send("don't do that thank you very much");
            res.end();
            return;
        }
    }
    for (let i = 0; i < req.body.answers.length; i++) {
        console.log(i + ": " + req.body.answers[i]);
        console.log(runningSurveys[sId].answers[i]);
        runningSurveys[sId].answers[i].push(req.body.answers[i]);
    }
    console.log(runningSurveys[sId]);
    res.send("ok");
    res.end();
});

app_student.get("/s/:id", (req, res) => {
    let id = req.params.id.toLowerCase();
    if (runningSurveys[id]) {
        res.send(runningSurveys[id].orig);
    } else {
        res.status(404);
        res.end();
    }
});

app_student.use(express.static("static_student"));
app_student.listen(process.env.PORT_STUDENT || 3000, () => console.log("Web server is up and running"));