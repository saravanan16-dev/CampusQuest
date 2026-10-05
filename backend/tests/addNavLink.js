const fs = require('fs');
const path = require('path');

const dir = 'frontend';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html') && !['questions.html', 'result.html'].includes(f));

// Pattern: after the notes.html nav link, insert Question Bank link
const needleNotes = `href="notes.html"><i class="bi bi-journal-text me-1"></i>Notes</a></li>`;
const qBankLink = `<li class="nav-item"><a class="nav-link" href="questions.html"><i class="bi bi-collection me-1"></i>Question Bank</a></li>`;

let updated = 0;
for (const f of files) {
    const fp = path.join(dir, f);
    let content = fs.readFileSync(fp, 'utf8');

    if (content.includes('href="questions.html"')) {
        console.log(f + ': already has Question Bank link');
        continue;
    }

    if (content.includes(needleNotes)) {
        content = content.replace(needleNotes, needleNotes + '\n                    ' + qBankLink);
        fs.writeFileSync(fp, content, 'utf8');
        console.log(f + ': updated');
        updated++;
    } else {
        console.log(f + ': needle not found');
    }
}
console.log('Total updated:', updated);
