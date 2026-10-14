/**
 * Note PDF Utilities & Viewer Integration
 * Supports viewing notes in PDF format with native embedding, downloads, and format switching.
 */

let generatedNotePdfUrl = null;

function getNotePdfEndpoint(note, download = false) {
    if (note && note.id) {
        return `/notes/${note.id}/pdf${download ? '?download=1' : ''}`;
    }
    return note && note.file_url ? note.file_url : "";
}

/**
 * Client-side fallback PDF generator if server is offline or note has no ID
 */
function createNotePdf(note) {
    const title = note.title || "Study Notes";
    const subject = note.subject_name || "CampusQuest";
    const unit = note.unit_number || note.unit || "N/A";
    const content = note.content || note.description || "No written content is available for this note yet.";
    const titleRows = wrapPdfLine(title, 64);
    titleRows[0].fontSize = 16;
    const rows = [
        ...titleRows,
        ...wrapPdfLine(`Subject: ${subject}    Unit: ${unit}`, 92).map(row => ({ ...row, fontSize: 10 })),
        { text: "", fontSize: 10, maxLength: 92 },
        ...String(content).split(/\r?\n/).flatMap(line => wrapPdfLine(line, 92))
    ];
    const rowsPerPage = 47;
    const pages = [];

    for (let i = 0; i < rows.length; i += rowsPerPage) {
        pages.push(rows.slice(i, i + rowsPerPage));
    }

    const objects = [];
    const pageIds = pages.map((_, index) => 3 + index);
    const contentIds = pages.map((_, index) => 3 + pages.length + index);
    const fontId = 3 + pages.length * 2;
    objects[1] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`;

    pages.forEach((pageRows, index) => {
        const pageId = pageIds[index];
        const contentId = contentIds[index];
        const stream = pageRows.map((row, rowIndex) => {
            const y = 748 - rowIndex * 15;
            return `BT /F1 ${row.fontSize || 11} Tf 50 ${y} Td (${escapePdfText(row.text)}) Tj ET`;
        }).join("\n");

        objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>`;
        objects[contentId] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
    });
    objects[fontId] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
    objects[0] = "<< /Type /Catalog /Pages 2 0 R >>";

    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    for (let id = 1; id < objects.length; id++) {
        offsets[id] = pdf.length;
        pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
    }

    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
    for (let id = 1; id < objects.length; id++) {
        pdf += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return new Blob([pdf], { type: "application/pdf" });
}

function wrapPdfLine(text, maxLength) {
    const safeText = String(text).replace(/[^\x20-\x7E]/g, "?");
    if (!safeText) return [{ text: "", fontSize: 11 }];

    const words = safeText.split(/\s+/);
    const lines = [];
    let line = "";
    for (const word of words) {
        if (line && `${line} ${word}`.length > maxLength) {
            lines.push({ text: line, fontSize: 11 });
            line = word;
        } else {
            line = line ? `${line} ${word}` : word;
        }
    }
    if (line) lines.push({ text: line, fontSize: 11 });
    return lines;
}

function escapePdfText(text) {
    return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/**
 * Displays note in modal with PDF format viewer and options
 */
function showNotePdf(note, prefix, initialMode = "pdf") {
    const contentEl = document.getElementById(`${prefix}-content`);
    const viewerEl = document.getElementById(`${prefix}-viewer`);
    const pdfFrame = document.getElementById(`${prefix}-pdf-frame`);
    const openBtn = document.getElementById(`${prefix}-open`);
    const downloadBtn = document.getElementById(`${prefix}-download`);

    // Primary: Backend dynamic PDF route /notes/:id/pdf
    let pdfUrl = getNotePdfEndpoint(note, false);
    let downloadUrl = getNotePdfEndpoint(note, true);

    if (!pdfUrl) {
        if (generatedNotePdfUrl) URL.revokeObjectURL(generatedNotePdfUrl);
        generatedNotePdfUrl = URL.createObjectURL(createNotePdf(note));
        pdfUrl = generatedNotePdfUrl;
        downloadUrl = generatedNotePdfUrl;
    }

    // Set text content
    if (contentEl) {
        contentEl.innerText = note.content || note.description || "No text content available.";
    }

    // Set iframe / embed source for PDF viewer
    if (pdfFrame) {
        pdfFrame.src = pdfUrl;
    }

    // Configure Open PDF in New Tab button
    if (openBtn) {
        openBtn.href = pdfUrl;
        openBtn.classList.remove("d-none");
        openBtn.target = "_blank";
        openBtn.title = "View in full-page PDF format";
    }

    // Configure Download PDF button
    if (downloadBtn) {
        downloadBtn.href = downloadUrl;
        downloadBtn.classList.remove("d-none");
        downloadBtn.target = "_blank";
        const filename = (note.title || "notes").replace(/[^\w-]+/g, "_");
        downloadBtn.download = `${filename}.pdf`;
    }

    // Format mode switching
    setNoteViewMode(prefix, initialMode);
}

function setNoteViewMode(prefix, mode) {
    const contentEl = document.getElementById(`${prefix}-content`);
    const viewerEl = document.getElementById(`${prefix}-viewer`);
    const tabPdf = document.getElementById(`${prefix}-tab-pdf`);
    const tabText = document.getElementById(`${prefix}-tab-text`);

    if (mode === "pdf") {
        if (viewerEl) viewerEl.classList.remove("d-none");
        if (contentEl) contentEl.classList.add("d-none");
        if (tabPdf) { tabPdf.classList.add("active", "btn-primary"); tabPdf.classList.remove("btn-outline-primary", "btn-outline-light"); }
        if (tabText) { tabText.classList.remove("active", "btn-primary"); tabText.classList.add("btn-outline-secondary", "btn-outline-light"); }
    } else {
        if (viewerEl) viewerEl.classList.add("d-none");
        if (contentEl) contentEl.classList.remove("d-none");
        if (tabPdf) { tabPdf.classList.remove("active", "btn-primary"); tabPdf.classList.add("btn-outline-secondary", "btn-outline-light"); }
        if (tabText) { tabText.classList.add("active", "btn-primary"); tabText.classList.remove("btn-outline-primary", "btn-outline-light"); }
    }
}

window.showNotePdf = showNotePdf;
window.setNoteViewMode = setNoteViewMode;
window.getNotePdfEndpoint = getNotePdfEndpoint;
