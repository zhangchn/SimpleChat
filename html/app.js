import { parseMarkDown } from './md.js'
function getCurrentMessages() {
    const messages = document.querySelectorAll('.thread .message');
    const result = []
    for (const m of messages) {
        result.push(
            JSON.parse(m.dataset['message'])
        )
    }
    return result;
}
function displayMessage(message, inDiv) {
    let messageDiv;
    const thread = document.querySelector('div.thread');
    let created;
    let contentP;
    if (inDiv && inDiv instanceof Element) {
        messageDiv = inDiv;
        contentP = inDiv.querySelector('div.content');
    } else {
        messageDiv = document.createElement('div');
        const nameP = document.createElement('p');
        nameP.classList.add('name');
        contentP =  document.createElement('div');
        messageDiv.classList.add('message');
        messageDiv.classList.add(message.role);
        contentP.classList.add('content');
        if (message.role === 'user') {
            nameP.textContent = 'Me:';
        } else if (message.role === 'assistant') {
            nameP.textContent = 'AI:';
        }
        const endAnchor = document.createElement('a');
        endAnchor.classList.add('end-anchor');
        messageDiv.appendChild(nameP);
        messageDiv.appendChild(document.createElement('br'));
        messageDiv.appendChild(contentP);
        messageDiv.appendChild(endAnchor);
        thread.appendChild(messageDiv);
        created = true;
        console.log('message div created')
    }
    messageDiv.dataset['message'] = JSON.stringify(message);
    // contentP.textContent = message.content;
    const newContent = parseMarkDown(message.content);
    newContent.classList.add('content');
    messageDiv.replaceChild(newContent, contentP);
    
    messageDiv.querySelector('.end-anchor').scrollIntoView({behavior: "smooth"});
    return messageDiv;
}
async function loadModels(selectedId) {
    console.log('load models with selectedId', selectedId)
    const apiUrl = localStorage.getItem('ollamaApiUrl') || 'http://127.0.0.1:11434/api/';
    const tagsUri = apiUrl.endsWith('/') ? `${apiUrl}tags` : `${apiUrl}/tags`;
    const res = await fetch(tagsUri, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
    }) 
    const models = (await res.json()).models;
    const modelSelect = document.querySelector('select#model-id-selector')
    const modelOptions = modelSelect.querySelectorAll('option')
    for (let i = modelOptions.length - 1; i > -1; i--) {
        modelSelect.removeChild(modelOptions[i])
    }
    for (const model of models) {
        const o = document.createElement('option')
        o.value = model.model
        const psize = model.details.parameter_size
        const qlevel = model.details.quantization_level
        o.textContent = `${model.name} ${psize}(${qlevel})`
        modelSelect.appendChild(o)
        if (model.model === selectedId) {
            modelSelect.value = selectedId
        }
    }
}
async function sendMessage() {
    const input = document.getElementById('user-input');
    if (!input.value.trim()) return;
    
    displayMessage({ content: input.value, role: 'user' }); // Show placeholder
    // saveMessage(input.value, ''); // Save initial state
    
    input.disabled = true;
    try {
        const useStream = true
        const apiUrl = localStorage.getItem('ollamaApiUrl') || 'http://127.0.0.1:11434/api/';
        const chatUri = apiUrl.endsWith('/') ? `${apiUrl}chat` : `${apiUrl}/chat`;
        if (chatUri) {
            console.log(`Loaded chat URI from localStorage: ${chatUri}`);
        }
        const res = await fetch(chatUri, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'qwen2.5:1.5b',
                messages: getCurrentMessages(),
                stream: useStream
            })
        });
        if (useStream) {
            const reader = await res.body.getReader();
            let finished;
            const decoder = new TextDecoder();
            const lines = []

            const placeholderDiv = displayMessage({content: '...', role: 'assistant'});
            
            while (!finished) {
                const { done, value } = await reader.read();
                const str = decoder.decode(value, {stream: true});
                for (const lineStr of str.split('\n')) {
                    // console.log(lineStr)
                    if (lineStr.trim()) {
                        const line = JSON.parse(lineStr);
                        lines.push(line);
                        finished = done || line.done;                   
                    }
                }
                const content = lines.reduce((prev, l) => prev + (l.message?.content || ''), '')
                const role = 'assistant';
                displayMessage({ content , role }, placeholderDiv);
                if (finished) {
                    console.log('message finished', content, lines[lines.length - 1]);
                }
            }
        } else {
            const data = await res.json();
            console.log(data);
            const newMessageDiv = displayMessage(data.message)
            newMessageDiv.scrollIntoView({behavior: "smooth"});
            input.value = '';           
        }

    } catch (error) {
        console.error('Error:', error);
        // responseElement.innerHTML = 'Error occurred';
    } finally {
        input.disabled = false;
    }
}

document.addEventListener('readystatechange', (ev) => {
    if (document.readyState === "complete") {
        const sendButton = document.querySelector('button#send');
        sendButton.addEventListener('click', (ev) => {
            ev.preventDefault();
            sendMessage();
        })
        const showDialogButton = document.querySelector('button#show-api-dialog-btn')
        showDialogButton.addEventListener('click', (ev) => {
            ev.preventDefault();
            const dialog = document.querySelector('#api-dialog')
            if (dialog.classList.contains('dialog-hidden')) {
                // show
                dialog.classList.remove('dialog-hidden')
                dialog.classList.add('dialog')
            } else {
                // hide
                dialog.classList.remove('dialog')
                dialog.classList.add('dialog-hidden')
            }
        })
        const saveApiUrlButton = document.querySelector('#save-api-btn')
        saveApiUrlButton.addEventListener('click', (ev) => {
            ev.preventDefault()
            const dialog = document.querySelector('#api-dialog')
            // hide
            dialog.classList.remove('dialog')
            dialog.classList.add('dialog-hidden')
            const uri = document.querySelector('#api-url').value
            localStorage.setItem('ollamaApiUrl', uri)
            
            const modelId = document.querySelector('#model-id').value
            localStorage.setItem('ollamaModelId', modelId)
        })
        const modelSelect = document.querySelector('#model-id-selector')
        modelSelect.addEventListener('change', (ev) => {
            const modelId = modelSelect.value
            document.querySelector('#model-id').value = modelId
        })
        // load from localStorage
        const uri = localStorage.getItem('ollamaApiUrl')
        document.querySelector('#api-url').value = uri
        const modelId = localStorage.getItem('ollamaModelId') || document.querySelector('#model-id').placeholder
        document.querySelector('#model-id').value = modelId
        loadModels(modelId)
    }
})
window.parseMarkDown = parseMarkDown;