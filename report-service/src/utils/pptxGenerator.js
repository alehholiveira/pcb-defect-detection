import { createRequire } from "module";
// Hack to import CommonJS 'pptxgenjs' module from within an ESM context
const require = createRequire(import.meta.url);
const pptxgen = require("pptxgenjs");

/**
 * Maps defect class names to their respective hex colors for slide styling (bounding boxes and text).
 */
const DEFECT_COLOR_MAP = {
  missing_hole: "EF4444",
  mouse_bite: "F97316",
  open_circuit: "EAB308",
  short: "22C55E",
  spur: "3B82F6",
  spurious_copper: "8B5CF6",
};

/**
 * Generates PowerPoint (PPTX) reports for PCB defect inspections.
 * Note: The PPTX coordinate system uses inches for all values (x, y, w, h).
 */
export class PptxGenerator {
  /**
   * Initializes a new PPTX presentation.
   * @param {string} targetDate - The date or period string to use in titles
   */
  constructor(targetDate) {
    console.log(`[pptxGenerator.js] constructor - Init`, { targetDate });
    this.targetDate = targetDate;
    this.pres = new pptxgen();
    this.pres.author = "PCB Defect Detection System";
    this.pres.company = "Neural Links";
    this.pres.title = `Relatório de Inspeção - ${targetDate}`;
    this.pres.layout = "LAYOUT_16x9";
  }

  /**
   * Adds the initial summary slide containing total counts and a defect breakdown table.
   * @param {Object} stats - Totals for inferences, images, and defects
   * @param {Object} defectSummary - Key-value map of defect types and their counts
   * @param {string} [logoPath] - Path to the company logo image
   */
  addSummarySlide(stats, defectSummary, logoPath) {
    console.log(`[pptxGenerator.js] addSummarySlide - Init`);
    const slideSum = this.pres.addSlide();
    
    if (logoPath) {
      slideSum.addImage({ path: logoPath, x: 8.0, y: 0.3, w: 1.5, h: 0.5, sizing: { type: "contain", w: 1.5, h: 0.5 } });
    }

    slideSum.addText(`Resumo de Inspeções - ${this.targetDate}`, { x: 0.5, y: 0.5, w: "70%", h: 1, fontSize: 32, bold: true, color: "363636" });
    
    slideSum.addText([
      { text: `Total de Inferências: `, options: { bold: true } },
      { text: `${stats.totalInferences}\n` },
      { text: `Imagens Processadas: `, options: { bold: true } },
      { text: `${stats.totalImages}\n` },
      { text: `Total de Defeitos: `, options: { bold: true } },
      { text: `${stats.totalDefects}` },
    ], { x: 0.5, y: 1.5, w: 4, h: 2, fontSize: 18, color: "363636" });

    // Tabela de resumo de defeitos
    const tableRows = [
      [{ text: "Tipo de Defeito", options: { bold: true, fill: { color: "F3F4F6" } } }, { text: "Quantidade", options: { bold: true, fill: { color: "F3F4F6" } } }]
    ];
    
    for (const [defect, count] of Object.entries(defectSummary)) {
      tableRows.push([{ text: defect }, { text: String(count) }]);
    }

    if (tableRows.length > 1) {
      slideSum.addTable(tableRows, { x: 5.0, y: 1.5, w: 4, rowH: 0.4, border: { pt: 1, color: "D1D5DB" } });
    } else {
      slideSum.addText("Nenhum defeito detectado no período.", { x: 5.0, y: 1.5, w: 4, h: 1, fontSize: 16, color: "10B981" });
    }
    console.log(`[pptxGenerator.js] addSummarySlide - Success`);
  }

  /**
   * Adds a slide showing an image with drawn bounding boxes for each detection.
   * Uses an aspect-ratio-preserving scaling algorithm to fit the image in a 9.0x4.3 inch area,
   * then transforms pixel-space coordinates into PPTX inch-space using the computed scale factor.
   * 
   * @param {string} inferenceId - ID of the inference
   * @param {string} imageName - Name of the image file
   * @param {number} totalDetections - Number of defects in this image
   * @param {Object} dimensions - Object with width, height, and base64Data
   * @param {Array} detections - Array of defect detections with pixel coordinates
   */
  addImageSlide(inferenceId, imageName, totalDetections, dimensions, detections) {
    const slide = this.pres.addSlide();
        
    slide.addText(`Inferência: ${inferenceId}`, { x: 0.5, y: 0.2, w: 5, h: 0.5, fontSize: 18, bold: true, color: "363636" });
    slide.addText(`Imagem: ${imageName} | Defeitos: ${totalDetections}`, { x: 5.5, y: 0.2, w: 4, h: 0.5, fontSize: 14, color: "6B7280", align: "right" });

    const slideImgW = 9.0;
    const slideImgH = 4.3;
    const slideImgX = 0.5;
    const slideImgY = 1.0;

    const scaleX = slideImgW / dimensions.width;
    const scaleY = slideImgH / dimensions.height;
    const scale = Math.min(scaleX, scaleY);
    
    const actualDrawW = dimensions.width * scale;
    const actualDrawH = dimensions.height * scale;
    
    const offsetX = slideImgX + (slideImgW - actualDrawW) / 2;
    const offsetY = slideImgY + (slideImgH - actualDrawH) / 2;

    slide.addImage({
      data: dimensions.base64Data,
      x: offsetX, y: offsetY, w: actualDrawW, h: actualDrawH
    });

    for (const det of detections) {
      const color = DEFECT_COLOR_MAP[det.class_name] || "9CA3AF";
      
      const rectX = offsetX + (det.x1 * scale);
      const rectY = offsetY + (det.y1 * scale);
      const rectW = (det.x2 - det.x1) * scale;
      const rectH = (det.y2 - det.y1) * scale;

      // transparency: 100 means the rectangle fill is fully transparent (no background)
      slide.addShape(this.pres.ShapeType.rect, {
        x: rectX,
        y: rectY,
        w: rectW,
        h: rectH,
        fill: { color: "FFFFFF", transparency: 100 },
        line: { color: color, width: 2 }
      });

      // rectY - 0.2 places the label box 0.2 inches above the bounding box
      slide.addText(`${det.class_name} ${(det.confidence * 100).toFixed(0)}%`, {
        shape: this.pres.ShapeType.rect,
        x: rectX,
        y: rectY - 0.2,
        w: 1.5,
        h: 0.2,
        fill: { color: color },
        color: "FFFFFF",
        fontSize: 8,
        bold: true,
        valign: "middle",
        align: "center"
      });
    }
  }

  /**
   * Generates the final PPTX file buffer.
   * @returns {Promise<Buffer>} The generated PPTX document as a buffer
   */
  async generateBuffer() {
    console.log(`[pptxGenerator.js] generateBuffer - Init`);
    const buffer = await this.pres.write({ outputType: "nodebuffer" });
    console.log(`[pptxGenerator.js] generateBuffer - Success`);
    return buffer;
  }
}
