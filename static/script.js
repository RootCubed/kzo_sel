let answers = [];
let ID = "";

document.addEventListener("DOMContentLoaded", () => {
    document.querySelector("#btn-done").addEventListener("click", () => {
        location.reload();
    });
    document.getElementById("questionnaireCodeEntry").addEventListener("keyup", (e) => {
        let val = e.target.value;
        if (val.length == 4) {
            e.target.blur();
            ID = val;
            // login
            fetch(window.location + "s/" + val)
            .then(r => {
                if (r.status != 200) {
                    alert("Ungültiger Code!");
                    e.target.value = "";
                    return;
                }
                return r.json()
            })
            .then(r => {
                if (!r) return;
                document.getElementById("maincontainer").style.display = "none";
                document.getElementById("footer").style.display = "none";
                let div = document.querySelector("#questions");
                div.innerHTML = "<h2>" + r.name + "</h2>";
                let i = 0;
                for (let question of r.questions) {
                    div.innerHTML += `
                    <div class="question">
                        <label>${question[0]}</label><br>
                        <canvas height="50px" width="400px" id="q_${i++}"></canvas>
                        <div class="vl">
                            <span class="labelLeft">${question[1]}</span>
                            <span class="labelRight">${question[3]}</span>
                        </div>
                        <div class="vl2">
                            <span class="labelMiddle">${question[2]}</span>
                        </div>
                    </div>
                    `
                }
                div.innerHTML += "<span class='btn' id='submit'>Senden</span>";
                answers = new Array(r.length);
                resizeCanvas();
                document.getElementById("submit").addEventListener("click", () => {
                    fetch("/survey", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            surveyID: ID,
                            answers: answers
                        })
                    }).then(res => {
                        console.log(res);
                        div.style.display = "none";
                        document.querySelector("#done").style.display = "inline";
                    });
                });
                document.querySelectorAll("canvas").forEach(element => {
                    element.addEventListener("click", (e) => {
                        let ctx = e.target.getContext("2d");
                        ctx.clearRect(0, 0, e.target.width, e.target.height);
                        
                        drawBackground(e.target, ctx);

                        ctx.fillStyle = "#f5163b";

                        ctx.beginPath()
                        ctx.ellipse(e.offsetX, e.offsetY, 4, 4, 0, 0, 2 * Math.PI);
                        ctx.closePath();
                        ctx.fill();
                        let questionID = e.target.id.split('q_')[1];
                        answers[questionID] = [e.offsetX / e.target.width, e.offsetY / e.target.height];
                    });
                });
            });
        }
    });
});

window.addEventListener("resize", (e) => {
    resizeCanvas();
});

function drawBackground(cv, ctx) {
    /*var gradient = ctx.createLinearGradient(0, 0, cv.width, 0);
    gradient.addColorStop(0, "red");
    gradient.addColorStop(0.5, "yellow");
    gradient.addColorStop(1, "green");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, cv.width, cv.height);*/
}

function resizeCanvas() {
    let width = document.body.clientWidth;
    document.querySelectorAll("canvas").forEach(element => {
        element.width = width * 0.8;
        drawBackground(element, element.getContext("2d"));
    });
}