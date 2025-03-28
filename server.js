// https://www.30secondsofcode.org/js/s/nodejs-static-file-server/
// https://github.com/Chalarangelo/30-seconds-of-code/blob/master/content/snippets/js/s/nodejs-static-file-server.md
// CC-BY-4.0
/* Node.js static file web server */
   
// Importing necessary modules 
const http = require('http'); 
const url = require('url'); 
const fs = require('fs'); 
const path = require('path'); 
   
// Port on which the server will create 
const PORT = 1800; 
   
// Maps file extension to MIME types which 
// helps browser to understand what to do 
// with the file 
const mimeType = { 
    '.ico': 'image/x-icon', 
    '.html': 'text/html', 
    '.js': 'text/javascript', 
    '.json': 'application/json', 
    '.css': 'text/css', 
    '.png': 'image/png', 
    '.jpg': 'image/jpeg', 
    '.wav': 'audio/wav', 
    '.mp3': 'audio/mpeg', 
    '.svg': 'image/svg+xml', 
    '.pdf': 'application/pdf', 
    '.doc': 'application/msword', 
    '.eot': 'application/vnd.ms-fontobject', 
    '.ttf': 'application/font-sfnt'
}; 
function serveFileForResonse(pathname, res) {
    // Read file from file system limit to  
    // the current directory only. 
    fs.readFile(pathname, function (err, data) {
        if (err) {
            res.statusCode = 500;
            res.end(`Error in getting the file.`);
        }
        else {

            // Based on the URL path, extract the 
            // file extension. Ex .js, .doc, ... 
            const ext = path.parse(pathname).ext;

            // If the file is found, set Content-type 
            // and send data 
            res.setHeader('Content-type',
                mimeType[ext] || 'text/plain');

            res.end(data);
        }
    });
}   
function serveDirForResponse(pathname, res, parsedUrl) {
    if (!pathname.endsWith('/')) {
        res.setHeader('Location', parsedUrl.pathname + '/');
        res.statusCode = 302;
        res.end('Redirecting to dir');
        return
    }
    var filesLink = "<ul>";
    res.setHeader('Content-type', 'text/html');
    var filesList = fs.readdirSync(pathname);
    filesList.forEach(element => {
        const stat = fs.statSync(pathname + 
            "/" + element);
        if (stat.isFile()) {
            filesLink += `<br/><li><a href='./${element}'> 
                    ${element} 
                </a></li>` ;
        } else if (stat.isDirectory()) {
            filesLink += `<br/><li><a href='./${element}/'> 
                    ${element} 
                </a></li>` ;
        }
    });

    filesLink += "</ul>";

    res.end("<h1>List of files:</h1> " + filesLink);
}
// Creating a server and listening at port 1800 
http.createServer((req, res) => { 
     
   
    // Parsing the requested URL 
    const parsedUrl = url.parse(req.url); 
    /* Processing the requested file pathname to 
    avoid directory traversal like, 
    http://localhost:1800/../fileOutofContext.txt 
    by limiting to the current directory only. */
    const sanitizePath =  
    path.normalize(parsedUrl.pathname).replace(/^(\.\.[\/\\])+/, ''); 
      
    let pathname = path.join(__dirname, sanitizePath); 
 
    // If requested url is "/" like "http://localhost:1800/" 
     
    if(!fs.existsSync(pathname)) { 
        const indexFile = pathname + (pathname.endsWith('/') ? 'index.html' : '/index.html');
        if (fs.existsSync(indexFile)) {
            serveFileForResonse(indexFile, res);
        } else {
            // If the file is not found, return 404 
            res.statusCode = 404; 
            res.end(`File ${pathname} not found!`); 
        }
    } 
    else if (fs.statSync(pathname).isFile()) { 
        serveFileForResonse(pathname, res);  
    } else if (fs.statSync(pathname).isDirectory()) {
        serveDirForResponse(pathname, res, parsedUrl);
    }
}).listen(PORT); 
   
console.log(`Server listening on port ${PORT}`); 
