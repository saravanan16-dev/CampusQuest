const PDFDocument = require("pdfkit");

/**
 * Strips markdown asterisks or cleans inline markdown for PDFKit text rendering
 */
function cleanInlineMarkdown(text) {
    if (!text) return "";
    return text
        .replace(/\*\*(.*?)\*\*/g, "$1") // replace **bold** with text
        .replace(/\*(.*?)\*/g, "$1")     // replace *italic* with text
        .replace(/`(.*?)`/g, "$1");      // replace `code` with text
}

/**
 * Generates a styled, multi-page PDF document buffer for a note
 * @param {Object} note - The note object containing title, subject_name, unit, content, description
 * @returns {Promise<Buffer>}
 */
function generateNotePdf(note) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                margin: 50,
                size: "A4",
                bufferPages: true // Allows two-pass rendering for page numbers
            });

            const buffers = [];
            doc.on("data", chunk => buffers.push(chunk));
            doc.on("end", () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });
            doc.on("error", err => reject(err));

            const title = note.title || "Study Notes";
            const subject = note.subject_name || "CampusQuest Engineering";
            const unit = note.unit_number || note.unit ? `Unit ${note.unit_number || note.unit}${note.unit_name ? `: ${note.unit_name}` : ""}` : "General Engineering Unit";
            const description = note.description || "";
            const content = note.content || description || "No detailed notes content available.";
            const author = note.uploader_name || "Faculty / CampusQuest Academic Team";
            const dateStr = note.created_at ? new Date(note.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : new Date().toLocaleDateString();

            // 1. Header Top Accent Bar
            doc.rect(50, 40, doc.page.width - 100, 4).fill("#2563eb"); // Primary Blue Accent Bar

            // 2. Organization / Course Sub-header
            doc.moveDown(0.8);
            doc.fontSize(9).fillColor("#64748b").text("CAMPUSQUEST • ACADEMIC NOTES LIBRARY", 50, 52, {
                characterSpacing: 1.5,
                lineBreak: false
            });

            doc.fontSize(9).fillColor("#64748b").text(dateStr, doc.page.width - 150, 52, {
                align: "right",
                width: 100
            });

            // 3. Subject and Unit Badge
            doc.moveDown(1.5);
            doc.fontSize(11).font("Helvetica-Bold").fillColor("#1e40af").text(subject.toUpperCase());
            doc.fontSize(10).font("Helvetica").fillColor("#475569").text(unit);

            // 4. Main Note Title
            doc.moveDown(0.5);
            doc.fontSize(20).font("Helvetica-Bold").fillColor("#0f172a").text(title);

            // 5. Author byline
            doc.moveDown(0.3);
            doc.fontSize(9).font("Helvetica-Oblique").fillColor("#64748b").text(`Curated by: ${author}`);

            // 6. Optional Description Callout Box
            if (description && description.trim().length > 0 && description.trim() !== title.trim()) {
                doc.moveDown(0.6);
                const descY = doc.y;
                const cleanDesc = cleanInlineMarkdown(description);
                const descHeight = doc.heightOfString(cleanDesc, { width: doc.page.width - 130, fontSize: 9.5 });

                doc.roundedRect(50, descY, doc.page.width - 100, descHeight + 16, 6)
                   .fillAndStroke("#f8fafc", "#e2e8f0");

                doc.fontSize(9.5).font("Helvetica-Oblique").fillColor("#334155")
                   .text(cleanDesc, 65, descY + 8, { width: doc.page.width - 130 });
                doc.y = descY + descHeight + 24;
            } else {
                doc.moveDown(0.8);
            }

            // 7. Divider Line
            doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor("#cbd5e1").lineWidth(1).stroke();
            doc.moveDown(1);

            // 8. Body Content Parsing & Rendering
            const lines = String(content).split(/\r?\n/);

            for (let i = 0; i < lines.length; i++) {
                const rawLine = lines[i];
                const trimmed = rawLine.trim();

                // Check page height limit to avoid orphan headings
                if (doc.y > doc.page.height - 80) {
                    doc.addPage();
                }

                if (!trimmed) {
                    doc.moveDown(0.4);
                    continue;
                }

                // Heading 1: # Title or ====
                if (trimmed.startsWith("# ")) {
                    doc.moveDown(0.6);
                    doc.fontSize(14).font("Helvetica-Bold").fillColor("#1e3a8a")
                       .text(cleanInlineMarkdown(trimmed.replace(/^#\s+/, "")), { width: doc.page.width - 100 });
                    doc.moveDown(0.2);
                }
                // Heading 2: ## Subtitle
                else if (trimmed.startsWith("## ")) {
                    doc.moveDown(0.5);
                    doc.fontSize(12).font("Helvetica-Bold").fillColor("#1e40af")
                       .text(cleanInlineMarkdown(trimmed.replace(/^##\s+/, "")), { width: doc.page.width - 100 });
                    doc.moveDown(0.2);
                }
                // Heading 3: ### Sub-topic
                else if (trimmed.startsWith("### ")) {
                    doc.moveDown(0.4);
                    doc.fontSize(11).font("Helvetica-Bold").fillColor("#0f172a")
                       .text(cleanInlineMarkdown(trimmed.replace(/^###\s+/, "")), { width: doc.page.width - 100 });
                    doc.moveDown(0.15);
                }
                // Bullet point: - item or * item
                else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
                    const bulletText = cleanInlineMarkdown(trimmed.replace(/^[-*]\s+/, ""));
                    doc.fontSize(10).font("Helvetica").fillColor("#1e293b");

                    // Print bullet dot
                    const bulletY = doc.y;
                    doc.circle(58, bulletY + 5, 2).fillColor("#2563eb").fill();

                    // Print text with indent
                    doc.fillColor("#1e293b").text(bulletText, 68, bulletY, {
                        width: doc.page.width - 118,
                        lineGap: 3
                    });
                    doc.moveDown(0.2);
                }
                // Numbered list: 1. item
                else if (/^\d+\.\s+/.test(trimmed)) {
                    const match = trimmed.match(/^(\d+\.)\s+(.*)$/);
                    const numPrefix = match ? match[1] : "•";
                    const itemText = cleanInlineMarkdown(match ? match[2] : trimmed);

                    const itemY = doc.y;
                    doc.fontSize(10).font("Helvetica-Bold").fillColor("#2563eb")
                       .text(numPrefix, 52, itemY, { width: 20 });
                    doc.font("Helvetica").fillColor("#1e293b")
                       .text(itemText, 74, itemY, {
                           width: doc.page.width - 124,
                           lineGap: 3
                       });
                    doc.moveDown(0.2);
                }
                // Regular Paragraph Text
                else {
                    doc.fontSize(10).font("Helvetica").fillColor("#1e293b")
                       .text(cleanInlineMarkdown(trimmed), 50, doc.y, {
                           width: doc.page.width - 100,
                           lineGap: 3
                       });
                    doc.moveDown(0.2);
                }
            }

            // 9. Two-pass Page Numbering & Footer
            const range = doc.bufferedPageRange();
            for (let p = range.start; p < range.start + range.count; p++) {
                doc.switchToPage(p);

                // Footer divider
                doc.moveTo(50, doc.page.height - 45)
                   .lineTo(doc.page.width - 50, doc.page.height - 45)
                   .strokeColor("#e2e8f0").lineWidth(0.5).stroke();

                // Footer text
                doc.fontSize(8).font("Helvetica").fillColor("#94a3b8")
                   .text("CampusQuest Engineering Notes • Study & Exam Preparation", 50, doc.page.height - 35, {
                       lineBreak: false
                   });

                doc.fontSize(8).font("Helvetica").fillColor("#94a3b8")
                   .text(`Page ${p + 1} of ${range.count}`, doc.page.width - 150, doc.page.height - 35, {
                       align: "right",
                       width: 100
                   });
            }

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

module.exports = {
    generateNotePdf
};
