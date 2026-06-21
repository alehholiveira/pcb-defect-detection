import pptxgen from "pptxgenjs";
import { ImageDimensions } from "./imageUtils";

const DEFECT_COLOR_MAP: Record<string, string> = {
  missing_hole: "EF4444",
  mouse_bite: "F97316",
  open_circuit: "EAB308",
  short: "22C55E",
  spur: "3B82F6",
  spurious_copper: "8B5CF6",
};

export class PptxGenerator {
  private pres: pptxgen;
  private targetDate: string;

  constructor(targetDate: string) {
    this.targetDate = targetDate;
    this.pres = new pptxgen();
    this.pres.author = "PCB Defect Detection System";
    this.pres.company = "Neural Links";
    this.pres.title = `Relatório de Inspeção - ${targetDate}`;
    this.pres.layout = "LAYOUT_16x9";
  }

  addSummarySlide(
    stats: { totalInferences: number; totalImages: number; totalDefects: number },
    defectSummary: Record<string, number>
  ) {
    const slideSum = this.pres.addSlide();
    slideSum.addText(`Resumo de Inspeções - ${this.targetDate}`, { x: 0.5, y: 0.5, w: "90%", h: 1, fontSize: 32, bold: true, color: "363636" });
    
    slideSum.addText([
      { text: `Total de Inferências: `, options: { bold: true } },
      { text: `${stats.totalInferences}\n` },
      { text: `Imagens Processadas: `, options: { bold: true } },
      { text: `${stats.totalImages}\n` },
      { text: `Total de Defeitos: `, options: { bold: true } },
      { text: `${stats.totalDefects}` },
    ], { x: 0.5, y: 1.5, w: 4, h: 2, fontSize: 18, color: "363636" });

    // Tabela de resumo de defeitos
    const tableRows: any[] = [
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
  }

  addImageSlide(inferenceId: string, imageName: string, totalDetections: number, dimensions: ImageDimensions, detections: any[]) {
    const slide = this.pres.addSlide();
        
    slide.addText(`Inferência: ${inferenceId}`, { x: 0.5, y: 0.2, w: 5, h: 0.5, fontSize: 18, bold: true, color: "363636" });
    slide.addText(`Imagem: ${imageName} | Defeitos: ${totalDetections}`, { x: 5.5, y: 0.2, w: 4, h: 0.5, fontSize: 14, color: "6B7280", align: "right" });

    const slideImgW = 9;
    const slideImgH = 4.3;
    const slideImgX = 0.5;
    const slideImgY = 1.0;

    slide.addImage({
      data: dimensions.base64Data,
      x: slideImgX, y: slideImgY, w: slideImgW, h: slideImgH,
      sizing: { type: "contain", w: slideImgW, h: slideImgH }
    });

    const scaleX = slideImgW / dimensions.width;
    const scaleY = slideImgH / dimensions.height;
    const scale = Math.min(scaleX, scaleY);
    
    const actualDrawW = dimensions.width * scale;
    const actualDrawH = dimensions.height * scale;
    
    const offsetX = slideImgX + (slideImgW - actualDrawW) / 2;
    const offsetY = slideImgY + (slideImgH - actualDrawH) / 2;

    for (const det of detections) {
      const color = DEFECT_COLOR_MAP[det.class_name] || "9CA3AF";
      
      const rectX = offsetX + (det.x1 * scale);
      const rectY = offsetY + (det.y1 * scale);
      const rectW = (det.x2 - det.x1) * scale;
      const rectH = (det.y2 - det.y1) * scale;

      slide.addShape(this.pres.ShapeType.rect, {
        x: rectX,
        y: rectY,
        w: rectW,
        h: rectH,
        fill: { transparency: 100 },
        line: { color: color, width: 2 }
      });

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

  async generateBuffer(): Promise<Buffer> {
    return await this.pres.write({ outputType: "nodebuffer" }) as Buffer;
  }
}
