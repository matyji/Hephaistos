document.addEventListener('DOMContentLoaded', function() {
    var textarea = document.getElementById('message-input');
    var sendButton = document.getElementById('send-button');

    // Fonction pour vérifier le contenu du textarea et activer/désactiver le bouton
    function toggleButtonState() {
        // Si le textarea n'est pas vide, le bouton est activé, sinon il est désactivé
        sendButton.disabled = !textarea.value.trim();
    }

    // Écoute les événements 'input' sur le textarea
    textarea.addEventListener('input', toggleButtonState);

    // Vérifie l'état initial au chargement de la page
    toggleButtonState();
});

function sendMessage(valeurInput) {
    let sendButton = document.getElementById('send-button');

    // Vérifie si le bouton est désactivé
    if (sendButton.disabled) {
        // Le bouton est désactivé, donc ne rien faire (sortir de la fonction)
        console.log('Le bouton est désactivé.');
        return;
    }else{
        let date = getCurrentDateTimeFormatted();
        createMessageUserFromTemplate("message-user", valeurInput, date);
        get_AI_reponse(valeurInput);

    }
}


document.getElementById('send-button').addEventListener('click', sendMessage);
document.getElementById('message-input').addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        // Récupérer la valeur entrée par l'utilisateur
        let userInput = document.getElementById('message-input').value;
        // Réinitialiser la valeur de l'input
        document.getElementById('message-input').value = ''; 
        // Envoyer le message
        sendMessage(userInput);
        // Enlever le focus de l'input pour faire disparaître le curseur
        document.getElementById('message-input').blur();
    }
});

function envoyerRequete(userInput) {
    const threadID = document.getElementById("thread-id").textContent;
    let date_update = getCurrentDateTimeFormatted();
    let data_user = {"thread_id":threadID,"role":"user","date_creation":date_update,"date_update":date_update,"object":"thread.message","type":"text","content": userInput};
    fetch('/envoyerRequete', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data_user),
    })
    .then(response => response.json())
    .then(data => {
        console.log('Réponse reçue:', data);
        reponse = data["content"]
        createMessageAssistantFromTemplate("message-assistant", reponse, data['date_update'])
    })
    .catch((error) => {
        console.error('Erreur:', error);
    });
}

function get_AI_reponse(userInput) {
    const threadID = document.getElementById("thread-id").textContent;
    let date_update = getCurrentDateTimeFormatted();
    let data_user = {"thread_id":threadID,"role":"user","date_creation":date_update,"date_update":date_update,"object":"thread.message","type":"text","content": userInput};
    fetch('/get_AI_reponse', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data_user),
    })
    .then(response => response.json())
    .then(data => {
        console.log('Réponse reçue:', data);
        reponse = data["content"]
        return createMessageAssistantFromTemplate("message-assistant", reponse, data['date_update']);
    })
    .then(() => {
        setUpCopyButtons();
        // Appeler hljs.highlightAll() seulement après que les messages sont dans le DOM
        hljs.highlightAll();
    })
    .catch((error) => {
        console.error('Erreur:', error);
    });
}

function createMessageUserFromTemplate(templateName, messageContent, date) {
    return new Promise((resolve, reject) => {
        fetch(`/get_template/${templateName}`)
            .then(response => response.text())
            .then(template => {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = template;
                
                tempDiv.querySelector('.timestamp').textContent = formatDateTime(date);
                tempDiv.querySelector('.message-content-user').innerHTML = formatMessageContent(messageContent);
                
                const messagesContainer = document.querySelector('.messages-container');
                if (!messagesContainer) {
                    console.log('Le conteneur de messages n\'a pas été trouvé.');
                    reject('Le conteneur de messages n\'a pas été trouvé.');
                } else {
                    messagesContainer.appendChild(tempDiv);
                    resolve(); // Résoudre la promesse une fois l'opération terminée
                }
            })
            .catch(error => {
                console.error('Error loading the template:', error);
                reject(error); // Rejeter la promesse en cas d'erreur
            });
    });
}

function createMessageAssistantFromTemplate(templateName, reponse, date) {
    return new Promise((resolve, reject) => {
        fetch(`/get_template/${templateName}`)
            .then(response => response.text())
            .then(template => {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = template;
                tempDiv.querySelector('.timestamp').textContent = formatDateTime(date);
                tempDiv.querySelector('.message-assistant-content').innerHTML = formatMessageContent(reponse);
                
                const messagesContainer = document.querySelector('.messages-container');
                if (!messagesContainer) {
                    console.log('Le conteneur de messages n\'a pas été trouvé.');
                    reject('Le conteneur de messages n\'a pas été trouvé.');
                } else {
                    messagesContainer.appendChild(tempDiv);
                    resolve(); // Résoudre la promesse une fois l'opération terminée
                }
            })
            .catch(error => {
                console.error('Error loading the template:', error);
                reject(error); // Rejeter la promesse en cas d'erreur
            });
    });
}

function formatMessageContent(messageContent) {
    // Détection et formatage des blocs de code avec l'indication de langage pour highlight.js
    const codeRegex = /```(\w+)?\n([\s\S]*?)```/g; // Regex pour détecter les blocs de code avec langage facultatif

    return messageContent.replace(codeRegex, function(match, lang, code) {
        const uniqueId = `code-${Date.now()}`;
        const languageClass = lang ? `language-${lang}` : 'language-plaintext';
        return `<div class="code-header">
                    <span>${lang}</span>
                    <span>
                        <button class="flex gap-1 items-center copy-code-button">
                            <svg class="icon-sm" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path fill-rule="evenodd" clip-rule="evenodd" d="M12 3.5C10.8954 3.5 10 4.39543 10 5.5H14C14 4.39543 13.1046 3.5 12 3.5ZM8.53513 3.5C9.22675 2.3044 10.5194 1.5 12 1.5C13.4806 1.5 14.7733 2.3044 15.4649 3.5H17.25C18.9069 3.5 20.25 4.84315 20.25 6.5V18.5C20.25 20.1569 19.1569 21.5 17.25 21.5H6.75C5.09315 21.5 3.75 20.1569 3.75 18.5V6.5C3.75 4.84315 5.09315 3.5 6.75 3.5H8.53513ZM8 5.5H6.75C6.19772 5.5 5.75 5.94772 5.75 6.5V18.5C5.75 19.0523 6.19772 19.5 6.75 19.5H17.25C18.0523 19.5 18.25 19.0523 18.25 18.5V6.5C18.25 5.94772 17.8023 5.5 17.25 5.5H16C16 6.60457 15.1046 7.5 147.5H10C8.89543 7.5 8 6.60457 8 5.5Z" fill="currentColor"></path>
                            </svg>
                            Copy code
                        </button>
                    </span>
                </div>
                <pre><code class="${languageClass}">${escapeHTML(code)}</code></pre>`;
    });
}

document.addEventListener('click', function(event) {
    if (event.target.classList.contains('copy-code-button')) {
        // Trouvez l'élément <pre><code> le plus proche pour obtenir le texte à copier
        const codeBlock = event.target.closest('.code-header').nextElementSibling.querySelector('code');
        const codeToCopy = codeBlock.innerText;
        navigator.clipboard.writeText(codeToCopy).then(() => {
            // Affichez une confirmation ici
            event.target.innerHTML = `<img src="./static/images/saved.png" class="icon-sm" width="24" height="24"></img> Copied!`;
            setTimeout(() => {
                event.target.innerHTML = `<svg class="icon-sm" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M12 3.5C10.8954 3.5 10 4.39543 10 5.5H14C14 4.39543 13.1046 3.5 12 3.5ZM8.53513 3.5C9.22675 2.3044 10.5194 1.5 12 1.5C13.4806 1.5 14.7733 2.3044 15.4649 3.5H17.25C18.9069 3.5 20.25 4.84315 20.25 6.5V18.5C20.25 20.1569 19.1569 21.5 17.25 21.5H6.75C5.09315 21.5 3.75 20.1569 3.75 18.5V6.5C3.75 4.84315 5.09315 3.5 6.75 3.5H8.53513ZM8 5.5H6.75C6.19772 5.5 5.75 5.94772 5.75 6.5V18.5C5.75 19.0523 6.19772 19.5 6.75 19.5H17.25C18.0523 19.5 18.25 19.0523 18.25 18.5V6.5C18.25 5.94772 17.8023 5.5 17.25 5.5H16C16 6.60457 15.1046 7.5 147.5H10C8.89543 7.5 8 6.60457 8 5.5Z" fill="currentColor"></path>
                </svg>
                Copy code`;
            }, 2000);
        }).catch(err => {
            console.error('Could not copy text: ', err);
        });
    }
});

  

function changeButtonText(button, originalText) {
    button.innerHTML = `<svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m5 12 4.7 4.5 9.3-9"/>
    </svg> Copied!`; // Ajoutez ici le SVG de votre choix
    setTimeout(() => {
        button.innerHTML = originalText;
    }, 3000); // Revenez au texte original après 2 secondes
}


function escapeHTML(html) {
    // Cette fonction remplace les caractères spéciaux par leurs entités HTML pour une affichage correct
    return html
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatDateTime(dateTimeString) {
    // Vérifier si dateTimeString est défini
    if (!dateTimeString) {
        console.error('formatDateTime appelé avec une valeur undefined ou null');
        return ''; // Retourner une chaîne vide ou une valeur par défaut
    }

    // Parser manuellement la chaîne de date pour obtenir jour, mois, année, heure et minute
    const [datePart, timePart] = dateTimeString.split(' ');
    const [day, month, year] = datePart.split('/').map(num => parseInt(num, 10));
    const [hour, minute] = timePart.split(':').map(num => parseInt(num, 10));

    const dateTime = new Date(year, month - 1, day, hour, minute);
    const now = new Date();

    const isToday = dateTime.getDate() === now.getDate() &&
                    dateTime.getMonth() === now.getMonth() &&
                    dateTime.getFullYear() === now.getFullYear();

    if (isToday) {
        return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    } else {
        return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    }
}

function getCurrentDateTimeFormatted() {
    const now = new Date();

    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Janvier est 0 !
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}`;
}