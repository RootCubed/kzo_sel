let currentCode = "";

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("code-survey-div").style.display = "none";
    document.querySelector("#cs-end").addEventListener("mousedown", () => {
        endCurrSurvey();
        document.getElementById("code-survey-div").style.display = "none";
    });
    document.querySelector("#user-div").addEventListener("click", () => {
        window.location = "/logout";
    })
    fetch("/getAllSurveys/")
    .then(r => {
        return r.json()
    })
    .then(r => {
        let list = document.querySelector("#content");
        for (let question of r) {
            list.innerHTML += `<div class="survey-outer">
            <span class="survey-title">${question.name}</span>
            <span class="survey-btn survey-start">Starten</span>
            <span class="survey-btn survey-edit">Bearbeiten</span>
        </div>`;
        }
        document.querySelectorAll(".survey-btn").forEach(element => {
            element.addEventListener("click", (e) => {
                switch (e.target.classList[1]) {
                    case "survey-start":
                        fetch("/startSurvey/" + "1234")
                        .then(r => {
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
                    case "survey-end":
                        endCurrSurvey();
                        break;
                }
            });
        });
    });
});

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