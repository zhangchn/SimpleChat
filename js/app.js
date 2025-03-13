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
function displayMessage(message) {
    const thread = document.querySelector('div.thread');
    const messageDiv = document.createElement('div');
    const nameP = document.createElement('p');
    const contentP =  document.createElement('p');
    messageDiv.dataset['message'] = JSON.stringify(message);
    nameP.classList.add('name');
    contentP.classList.add('content');
    messageDiv.classList.add('message');
    messageDiv.classList.add(message.role);
    if (message.role === 'user') {
        nameP.textContent = 'Me:';
    } else if (message.role === 'assistant') {
        nameP.textContent = 'AI:';
    }
    contentP.textContent = message.content;
    messageDiv.appendChild(nameP);
    messageDiv.appendChild(document.createElement('br'));
    messageDiv.appendChild(contentP);
    thread.appendChild(messageDiv);
    return messageDiv;
}
async function sendMessage() {
    const input = document.getElementById('user-input');
    if (!input.value.trim()) return;
    
    displayMessage({ content: input.value, role: 'user' }); // Show placeholder
    // saveMessage(input.value, ''); // Save initial state
    
    input.disabled = true;
    try {
        const res = await fetch('http://127.0.0.1:11434/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'qwen2.5:1.5b',
                messages: getCurrentMessages(),
                stream: false
            })
        });
        const data = await res.json();
        console.log(data);
        const newMessageDiv = displayMessage(data.message)
        newMessageDiv.scrollIntoView({behavior: "smooth"});
        input.value = '';
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