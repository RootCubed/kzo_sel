let currentCode = "";
let loadedQuestions;
let currEdit = "";

//heartbeat every 10 minutes to stop server from sleeping
setInterval(() => {
    fetch("/heartbeat");
}, 1000 * 60 * 10);

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("code-survey-div").style.display = "none";
    document.getElementById("edit-survey-div").style.display = "none";
    document.querySelector("#cs-end").addEventListener("mousedown", () => {
        endCurrSurvey();
        document.getElementById("code-survey-div").style.display = "none";
    });
    document.querySelector("#user-div").addEventListener("click", () => {
        window.location = "/logout";
    });
    document.getElementById("edit-cancel").addEventListener("click", () => {
        document.getElementById("edit-survey-div").style.display = "none";
    });
    document.getElementById("edit-save").addEventListener("click", () => {
        let questionObj = {
            "name": document.querySelector("input.title").value,
            "questions": Array.from(document.getElementsByClassName("edit-box")).map(el => {
                return [
                    el.children[0].value,
                    el.children[1].children[0].value,
                    el.children[2].children[0].value,
                    el.children[3].children[0].value];
            })
        };
        let path = "/createSurvey";
        if (currEdit != "") {
            path = "/editSurvey/" + currEdit;
        }
        fetch(path, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(questionObj)
        }).then(() => {
            document.getElementById("edit-survey-div").style.display = "none";
            loadSurveys();
        });
    });
    document.getElementById("add-question").addEventListener("click", () => {
        let newEl = document.createElement("div");
        newEl.classList.add("edit-box");
        newEl.innerHTML = `
            <textarea class="edit-title" placeholder="Frage"></textarea>
            <div style="display: inline-block;">
                <textarea class="edit-left" placeholder="Antwort links"></textarea>
            </div>
            <div style="display: inline-block;">
                <textarea class="edit-right" placeholder="Antwort rechts"></textarea>
            </div>
            <span class="survey-btn" id="delete-question">Frage löschen</span>
        `;
        document.getElementById("edit-content").appendChild(newEl);
        document.querySelectorAll(".edit-box .survey-btn").forEach(element => {
            element.addEventListener("click", e => deleteQuestionFunc(e));
        });
    });
    loadSurveys();
});

function loadSurveys() {
    document.getElementById("content").innerHTML = "";
    fetch("/getAllSurveys/")
    .then(r => {
        return r.json();
    })
    .then(r => {
        loadedQuestions = r;
        let list = document.querySelector("#content");
        for (let question in r) {
            list.innerHTML += `<div class="survey-outer" data-id="${question}">
            <span class="survey-title">${r[question].name}</span>
            <span class="survey-btn survey-start">Starten</span>
            <span class="survey-btn survey-edit">Bearbeiten</span>
            <span class="survey-btn survey-delete">Löschen</span>
        </div>`;
        }

        document.getElementById("create-survey").addEventListener("click", () => {
            currEdit = "";
            document.getElementById("edit-content").innerHTML = "";
            document.getElementById("edit-survey-div").style.display = "inline";
            document.querySelector("#edit-survey-div .title").value = "";
            document.getElementById("add-question").click();
        });
        document.querySelectorAll(".survey-delete").forEach(element => {
            element.addEventListener("click", e => {
                let id = e.target.parentElement.dataset["id"];
                if (confirm("Wollen Sie wirklich diese Umfrage löschen?")) {
                    fetch("/deleteSurvey/" + id).then(() => {
                        loadSurveys();
                    });
                }
            });
        });
        document.querySelectorAll(".edit-box .survey-btn").forEach(element => {
            element.addEventListener("click", e => deleteQuestionFunc(e));
        });
        document.querySelectorAll(".survey-btn").forEach(element => {
            element.addEventListener("click", e => {
                let id = e.target.parentElement.dataset["id"];
                switch (e.target.classList[1]) {
                    case "survey-start":
                        fetch("/startSurvey/" + id)
                        .then(r => {
                            if (r.redirected) {
                                alert("Sitzung abgelaufen. Bitte loggen Sie sich erneut ein.");
                                location.reload();
                            }
                            if (r.status != 200) {
                                alert("Ein Fehler ist aufgetreten. Bitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.");
                                return;
                            }
                            return r.text()
                        })
                        .then(r => {
                            document.getElementById("code-survey-div").style.display = "inline";
                            document.getElementById("code-survey").innerText = r.toUpperCase();
                            currentCode = r;
                        });
                        break;
                    case "survey-edit":
                        currEdit = id;
                        document.getElementById("edit-survey-div").style.display = "inline";
                        document.querySelector("#edit-survey-div .title").value = loadedQuestions[id].name;
                        let innerHTML = "";
                        let qs = loadedQuestions[id].questions;
                        for (let question in qs) {
                            innerHTML += `
                            <div class="edit-box">
                                <textarea class="edit-title" placeholder="Frage">${qs[question][0]}</textarea>
                                <div style="display: inline-block;">
                                    <textarea class="edit-left" placeholder="Antwort links">${qs[question][1]}</textarea>
                                </div>
                                <div style="display: inline-block;">
                                    <textarea class="edit-right" placeholder="Antwort mitte (optional)">${qs[question][2]}</textarea>
                                </div>
                                <div style="display: inline-block;">
                                    <textarea class="edit-right" placeholder="Antwort rechts">${qs[question][3]}</textarea>
                                </div>
                                <span class="survey-btn" id="delete-question">Frage löschen</span>
                            </div>
                            `;
                        }
                        document.getElementById("edit-content").innerHTML = innerHTML;
                        break;
                    case "survey-end":
                        endCurrSurvey();
                        break;
                }
            });
        });
    });
}

function deleteQuestionFunc(e) {
    e.target.parentElement.remove();
}

function endCurrSurvey() {
    fetch("/endSurvey/" + currentCode)
    .then(r => {
        if (r.status != 200) {
            alert("Ein Fehler ist aufgetreten. Bitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.");
            return;
        }
        return r.blob();
    })
    .then(blob => {
        let url = window.URL.createObjectURL(blob);
        let a = document.createElement("a");
        a.href = url;
        a.download = "Resultat Umfrage.pdf";
        document.body.appendChild(a); // we need to append the element to the dom -> otherwise it will not work in firefox
        a.click();    
        a.remove();  //afterwards we remove the element again         
    });
}