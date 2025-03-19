function markdownLexer(markdown) {
    const lines = markdown.split('\n')
    
    const tokens = []
    const headingPattern = /^#+/;
    const listItemPattern = /^\s*[*-]\s+/;
    const numberedListItemPattern = /^\s*\d+\.\s+/;
    const codeBlockPattern = /^```/;
    const horizontalLinePattern = /^---$/;
    const indentPattern = /^\s+/;
    for (const line of lines) {
        const raw = line
        let isHorizontalLine = false
        let headingNumber = 0
        let isCodeBlock = false
        let isListItem = false
        let indent = 0
        let listNumber
        let text = ''
        const headingMatch = line.match(headingPattern)
        const listItemMatch = line.match(listItemPattern)
        const numberedListItemMatch = line.match(numberedListItemPattern)
        const codeBlockMatch = line.match(codeBlockPattern)
        const horizontalLineMatch = line.match(horizontalLinePattern)
        const indentMatch = line.match(indentPattern)
        if (horizontalLineMatch) {
            isHorizontalLine = true
        } else if (codeBlockMatch) {
            isCodeBlock = true
            text = line.substring(codeBlockMatch[0].length).trim()
        } else {
            if (indentMatch) {
                indent = indentMatch[0].length
            }
            if (headingMatch) {
                text = line.substring(headingMatch[0].length).trim()
                headingNumber = headingMatch[0].length
            } else if (numberedListItemMatch) {
                listNumber = line.substring(0, numberedListItemMatch[0].length).trim()
                isListItem = true
                text = line.substring(numberedListItemMatch[0].length).trim()
            } else if (listItemMatch) {
                isListItem = true
                text = line.substring(listItemMatch[0].length).trim()
            } else {
                text = line.trim()
            }
        }
        tokens.push({ raw, text, headingNumber, isCodeBlock, isListItem, indent, listNumber})
    }
    return tokens
}
const MarkDownState = {
    NORMAL: 0,
    LIST_ITEM: 2,
    CODE_BLOCK: 3,
}
function parseInlineMarkDown(token) {
    // TODO: parse inline markdown
    return document.createTextNode(token.text + '\n')
}
function parseMarkDown(markdown) {
    const tokens = markdownLexer(markdown)
    let state = MarkDownState.NORMAL
    const root = document.createElement('div')
    let codeBlock
    let listStack = []
    let p = null
    for (const token of tokens) {
        switch (state) {
        case MarkDownState.NORMAL:
            if (token.isHorizontalLine) {
                root.appendChild(document.createElement('hr'))
                p = null
            } else if (token.isCodeBlock) {
                codeBlock = document.createElement('pre')
                root.appendChild(codeBlock)
                p = null
            } else if (token.isListItem) {
                const listItem = document.createElement('li')
                listItem.appendChild(parseInlineMarkDown(token))
                const isNumberedList = token.listNumber !== undefined
                let found = false
                for (let j = listStack.length - 1; j >= 0; j--) {
                    const list = listStack[j]
                    const listIndent = parseInt(list.dataset['indent'])
                    if (listIndent === token.indent) {
                        if (list.tagName.toUpperCase() === 'UL' && isNumberedList) {
                            const orderedList = document.createElement('ol')
                            list.parentElement.replaceChild(orderedList, list)
                            listStack[j] = orderedList
                        } else if (list.tagName.toUpperCase() === 'OL' && !isNumberedList) {
                            const unorderedList = document.createElement('ul')
                            list.parentElement.replaceChild(unorderedList, list)
                            listStack[j] = unorderedList
                        }
                        listStack[j].appendChild(listItem)
                        found = true
                        break
                    } else if (listIndent > token.indent) {
                        listStack.pop()
                    }
                }
                if (!found) {
                    const list = isNumberedList ? document.createElement('ol') : document.createElement('ul');
                    list.appendChild(listItem)
                    list.dataset['indent'] = token.indent
                    if (listStack.length === 0) {
                        root.appendChild(list)
                    } else {
                        const li = listStack[listStack.length - 1].lastElementChild;
                        li.appendChild(list);
                        listStack[listStack.length - 1].appendChild(li);
                    }
                    listStack.push(list)
                }
                p = null
            } else if (token.headingNumber > 0) {
                const heading = document.createElement('h' + token.headingNumber)
                heading.appendChild(parseInlineMarkDown(token))
                root.appendChild(heading)
                p = null
            } else {
                if (token.text.trim().length) {
                    // clear list context
                    listStack = []
                    if (p === null) {
                        p = document.createElement('p')
                        root.appendChild(p)
                    }
                    p.appendChild(parseInlineMarkDown(token))
                }
                /*
                if (token.text.length === 0 || p === null) {
                    p = document.createElement('p')
                    root.appendChild(p)
                }
                */
            }
            break
        case MarkDownState.CODE_BLOCK:
            if (token.isCodeBlock) {
                codeBlock = null
                state = MarkDownState.NORMAL
            } else {
                codeBlock.appendChild(document.createTextNode(token.raw + '\n'))
            }
            break
        }
    }
    return root
}

export { parseMarkDown };