const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  ImageRun,
  VerticalPositionAlign,
  HorizontalPositionAlign,
  VerticalPositionRelativeFrom,
  HorizontalPositionRelativeFrom,
} = require("docx");
const fs = require("fs");
const path = require("path");

function parseInlineFormatting(text) {
    const runs = [];
    const regex = /(\*\*.*?\*\*)|(\*.*?\*)/g;
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) { runs.push(new TextRun(text.substring(lastIndex, match.index))); }
        const matchedText = match[0];
        if (matchedText.startsWith('**')) { runs.push(new TextRun({ text: matchedText.slice(2, -2), bold: true })); }
        else if (matchedText.startsWith('*')) { runs.push(new TextRun({ text: matchedText.slice(1, -1), italics: true })); }
        lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) { runs.push(new TextRun(text.substring(lastIndex))); }
    return runs;
}

function parseMarkdown(markdown) {
  if (!markdown) return [new Paragraph({ text: "" })];
  const elements = [];
  const lines = markdown.split('\n');
  let inTable = false;
  let tableRows = [];
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine.startsWith('|') && inTable) {
        inTable = false;
        elements.push(new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE }, layout: TableLayoutType.AUTOFIT }));
        tableRows = [];
    }
    if (trimmedLine.startsWith('### ')) { elements.push(new Paragraph({ children: parseInlineFormatting(trimmedLine.substring(4)), heading: HeadingLevel.HEADING_3, spacing: { before: 250, after: 120 } })); }
    else if (trimmedLine.startsWith('## ')) { elements.push(new Paragraph({ children: parseInlineFormatting(trimmedLine.substring(3)), heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 150 } })); }
    else if (trimmedLine.startsWith('* ')) { elements.push(new Paragraph({ children: parseInlineFormatting(trimmedLine.substring(2)), bullet: { level: 0 }, indent: { left: 720 }, style: "ListParagraph" })); }
    else if (trimmedLine.startsWith('|')) {
        if (!inTable) inTable = true;
        if (trimmedLine.match(/^[|\s-:]+$/)) continue;
        const cells = trimmedLine.split('|').slice(1, -1).map(cellText => new TableCell({ children: [new Paragraph({ children: parseInlineFormatting(cellText.trim()) })], verticalAlign: VerticalAlign.CENTER }));
        tableRows.push(new TableRow({ children: cells }));
    } else if (trimmedLine !== '') { elements.push(new Paragraph({ children: parseInlineFormatting(trimmedLine) })); }
    else { elements.push(new Paragraph({ text: "" })); }
  }
  if (inTable) { elements.push(new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE }, layout: TableLayoutType.AUTOFIT })); }
  return elements;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const { formData, aiContent } = JSON.parse(event.body);

    const createSectionTitle = (text) => new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: text.toUpperCase(), bold: true, color: "2E74B5", size: 28 })],
      spacing: { before: 400, after: 200 },
      border: { bottom: { color: "auto", space: 1, value: "single", size: 6 } },
    });

    const createCompetenciasSection = (competencias) => {
        const elements = [createSectionTitle("Competencias y Capacidades a Desarrollar")];
        if (!competencias || competencias.length === 0) {
            elements.push(new Paragraph("No se seleccionaron competencias."));
            return elements;
        }
        competencias.forEach(comp => {
            elements.push(new Paragraph({ children: [new TextRun({ text: comp.nombre, bold: true })], style: "heading2", spacing: { before: 200, after: 100 } }));
            comp.capacidades.forEach(cap => {
                elements.push(new Paragraph({ text: cap, bullet: { level: 0 }, indent: { left: 720 }, style: "ListParagraph" }));
            });
        });
        return elements;
    };
    
    // La ruta correcta: busca el archivo en la misma carpeta que este script
    const imagePath = path.join(__dirname, 'portada_unificada.png');

    const doc = new Document({
      creator: `Generador de Carpetas - ${formData.nombreDocente}`,
      title: `Carpeta de Recuperación - ${formData.nombreAlumno}`,
      styles: {
        default: { document: { run: { size: 22, font: "Calibri" } } },
        paragraphStyles: [{ id: "ListParagraph", name: "List Paragraph", basedOn: "Normal", next: "Normal", run: { size: 22, font: "Calibri" } }],
      },
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [
                new ImageRun({
                    data: fs.readFileSync(imagePath),
                    transformation: { width: 450, height: 525 },
                    floating: {
                        horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, align: HorizontalPositionAlign.CENTER },
                        verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, offset: 914400 },
                    },
                }),
            ],
          }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 7000 }, children: [ new TextRun({ text: "" }) ] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 600 }, children: [ new TextRun({ text: formData.nombreColegio, bold: true, color: "2E74B5", size: 36 }) ] }), // Dejamos el nombre del colegio un poco más grande
          new Paragraph({ spacing: { after: 200 }, children: [ new TextRun({ text: "ÁREA CURRICULAR:", bold: true, size: 52 }), new TextRun({ text: `   ${formData.area}`, size: 52 }) ] }),
          new Paragraph({ spacing: { after: 200 }, children: [ new TextRun({ text: "ESTUDIANTE:", bold: true, size: 52 }), new TextRun({ text: `   ${formData.nombreAlumno}`, size: 52 }) ] }),
          new Paragraph({ spacing: { after: 200 }, children: [ new TextRun({ text: "GRADO Y SECCIÓN:", bold: true, size: 52 }), new TextRun({ text: `   ${formData.grado}`, size: 52 }) ] }),
          new Paragraph({ spacing: { after: 200 }, children: [ new TextRun({ text: "DOCENTE:", bold: true, size: 52 }), new TextRun({ text: `   ${formData.nombreDocente}`, size: 52 }) ] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 400 }, children: [new TextRun({ text: "2025", size: 22 })], pageBreakBefore: true }),
          createSectionTitle("Presentación"),
          ...parseMarkdown(aiContent['Presentación']),
          ...createCompetenciasSection(formData.competencias),
          createSectionTitle("Actividades Propuestas"),
          ...parseMarkdown(aiContent['Actividades Propuestas']),
          createSectionTitle("Criterios de Evaluación"),
          ...parseMarkdown(aiContent['Criterios de Evaluación']),
        ],
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'Content-Disposition': `attachment; filename="Carpeta_Recuperacion_${formData.nombreAlumno.replace(/ /g, '_')}.docx"`, },
      body: buffer.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (error) {
    console.error("Error en la función generate-word:", error);
    return { statusCode: 500, body: JSON.stringify({ error: `Ocurrió un error al generar el documento .docx: ${error.message}` }) };
  }
};