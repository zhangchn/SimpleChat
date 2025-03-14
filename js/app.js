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
        contentP = inDiv.querySelector('p.content');
    } else {
        messageDiv = document.createElement('div');
        const nameP = document.createElement('p');
        nameP.classList.add('name');
        contentP =  document.createElement('p');
        messageDiv.classList.add('message');
        messageDiv.classList.add(message.role);
        contentP.classList.add('content');
        if (message.role === 'user') {
            nameP.textContent = 'Me:';
        } else if (message.role === 'assistant') {
            nameP.textContent = 'AI:';
        }
        messageDiv.appendChild(nameP);
        messageDiv.appendChild(document.createElement('br'));
        messageDiv.appendChild(contentP);
        thread.appendChild(messageDiv);
        created = true;
        console.log('message div created')
    }
    messageDiv.dataset['message'] = JSON.stringify(message);
    contentP.textContent = message.content;
    
    return messageDiv;
}
async function sendMessage() {
    const input = document.getElementById('user-input');
    if (!input.value.trim()) return;
    
    displayMessage({ content: input.value, role: 'user' }); // Show placeholder
    // saveMessage(input.value, ''); // Save initial state
    
    input.disabled = true;
    try {
        const useStream = true
        const res = await fetch('http://127.0.0.1:11434/api/chat', {
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
                    console.log(lineStr)
                    if (lineStr.trim()) {
                        const line = JSON.parse(lineStr);
                        lines.push(line);
                        finished = done || line.done;                   
                    }
                }
                const content = lines.reduce((prev, l) => prev + (l.message?.content || ''), '')
                const role = 'assistant';
                displayMessage({ content , role }, placeholderDiv);
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
    }
})