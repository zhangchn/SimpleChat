function markdownLexer(markdown) {
    const lines = markdown.split('\n')
    
    const tokens = []
    const headingPattern = /^#+/;
    const listItemPattern = /^\s*[*-]\s+/;
    const numberedListItemPattern = /^\s*\d+\.\s+/;
    const codeBlockPattern = /^\s*```/;
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
function inlineMarkDownLexer(lineToken) {
    const tokens = []
    let currentText = ''
    let state = 0
    let isBold = false
    let isItalic = false
    let isUnderline = false
    for (let i = 0; i < lineToken.text.length; i++) {
        const c = lineToken.text[i]
        switch (state) {
            case 0:
                if (c === '`') {
                    state = 1
                    tokens.push({ type: "TEXT", text: currentText})
                    currentText = ''
                } else if (c === '*') {
                    if (currentText.length) {
                        tokens.push({type: "TEXT", text: currentText})
                        currentText = ''
                    }
                    const tagB = (i < lineToken.text.length - 1) && lineToken.text[i + 1] === '*';
                    const tagBI = tagB && (i < lineToken.text.length - 2) && lineToken.text[i + 2] === '*';
                    // const isEndTag = (isBold || isBoldItalic || isItalic)
                    const isEndTag = (isBold && tagB) || (isItalic || !tagB)
                    if (tagBI) {
                        if (isEndTag) {
                            tokens.push({ type: "TAG", text: "b", end: isEndTag})
                            tokens.push({ type: "TAG", text: "i", end: isEndTag})
                        } else {
                            tokens.push({ type: "TAG", text: "i", end: isEndTag})
                            tokens.push({ type: "TAG", text: "b", end: isEndTag})
                        }
                        i+=2
                        isBold = !isEndTag
                        isItalic = !isEndTag
                    } else if (tagB) {
                        tokens.push({ type: "TAG", text: "b", end: isEndTag})
                        i+=1
                        isBold = !isEndTag
                    } else {
                        tokens.push({ type: "TAG", text: "i", end: isEndTag})
                        isItalic = !isEndTag
                    }
                }  else if (c === '~') {
                    const oneTilde = (i < lineToken.text.length - 1) && lineToken.text[i + 1] === '~';
                    const twoTilde = oneTilde && (i < lineToken.text.length - 2) && lineToken.text[i + 2] === '~';
                    const isEndTag = isUnderline
                    if (twoTilde) {
                        tokens.push({ type: "TAG", text: "u", end: isEndTag})
                        isUnderline = !isEndTag
                        i+=2
                    }
                } else {
                    currentText += c
                }
                break
            case 1:
                if (c === '\\' && i < lineToken.text.length - 1 && lineToken.text[i+1] === '`') {
                    currentText += '`'
                    i += 1
                } else if (c === '`') {
                    tokens.push({ type: "PRE", text: currentText})
                    currentText = ''
                    state = 0
                } else {
                    currentText += c
                }
                break
        } 
    }
    if (currentText.length) {
        tokens.push({ type: "TEXT", text: currentText})
    } 
    return tokens
}
function parseInlineMarkDown(token) {
    const inlineTokens = inlineMarkDownLexer(token);
    const elements = []
    let insertion = null
    for (const t of inlineTokens) {
        if (t.type === 'TEXT') {
            const tNode = document.createTextNode(t.text)
            if (insertion === null) {
                elements.push(tNode)
            } else { 
                insertion.appendChild(tNode)
            }
        } else if (t.type === 'TAG') {
            if (t.end) {
                if (insertion && insertion.parentElement) {
                    insertion = insertion.parentElement
                } else {
                    insertion = null
                }
            } else {
                const e = document.createElement(t.text)
                if (insertion === null) {
                    elements.push(e)
                } else {
                    insertion.appendChild(e)
                }
                insertion = e
            }
        } else if (t.type === 'PRE') {
            const pre = document.createElement('code')
            pre.appendChild(document.createTextNode(t.text))
            if (insertion === null) {
                elements.push(pre)
            } else {
                insertion.appendChild(pre)
            }
        }
    }
    return elements;
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
                if (listStack.length === 0) {
                    root.appendChild(codeBlock)
                } else {
                    listStack[listStack.length - 1].lastElementChild.appendChild(codeBlock)
                }
                p = null
                state = MarkDownState.CODE_BLOCK;
            } else if (token.isListItem) {
                const listItem = document.createElement('li')
                // listItem.appendChild(parseInlineMarkDown(token))
                parseInlineMarkDown(token).forEach(n => listItem.appendChild(n))
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
                parseInlineMarkDown(token).forEach(n => heading.appendChild(n))
                // heading.appendChild(parseInlineMarkDown(token))
                root.appendChild(heading)
                p = null
                listStack = []
            } else {
                if (token.text.trim().length) {
                    // clear list context
                    listStack = []
                    if (p === null) {
                        p = document.createElement('p')
                        root.appendChild(p)
                    }
                    // p.appendChild(parseInlineMarkDown(token))
                    parseInlineMarkDown(token).forEach(n => p.appendChild(n))
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

