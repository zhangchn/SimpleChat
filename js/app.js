async function sendMessage() {
    const input = document.getElementById('user-input');
    if (!input.value.trim()) return;
    
    displayMessage({ user: input.value, ai: '' }); // Show placeholder
    saveMessage(input.value, ''); // Save initial state
    
    const responseElement = document.querySelectorAll('#messages div:last-child strong')[1];
    responseElement.innerHTML = 'AI: '; // Clear placeholder
    
    try {
        const res = await fetch('http://192.168.1.89:11434/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'qwen2.5-coder:32b-instruct-q8_0',
                prompt: input.value,
                stream: true
            })
        });
    } catch (error) {
        console.error('Error:', error);
        responseElement.innerHTML = 'Error occurred';
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